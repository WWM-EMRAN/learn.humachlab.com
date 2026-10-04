(() => {
  const $=id=>document.getElementById(id), ds=$('dataset'), modelSel=$('model'), noise=$('noise'), complexity=$('complexity'), status=$('labStatus'), metrics=$('labMetrics'), explain=$('labExplain'), v2=$('view2d'), v3=$('view3d');
  if(!ds||!modelSel)return;
  let seed=(Date.now()>>>0)||1, data=[], trained=null, step=0, timer=null, view='2d';
  let labCamera=null;
  const LAB_DEFAULT_CAMERA={eye:{x:1.35,y:1.35,z:1.05},center:{x:0,y:0,z:0},up:{x:0,y:0,z:1}};
  function labCaptureCamera(ev){
    if(ev&&ev['scene.camera']){labCamera=ev['scene.camera'];return}
    const keys=['eye','center','up'];let changed=false;
    const next=JSON.parse(JSON.stringify(labCamera||LAB_DEFAULT_CAMERA));
    keys.forEach(part=>['x','y','z'].forEach(axis=>{const k=`scene.camera.${part}.${axis}`;if(ev&&Object.prototype.hasOwnProperty.call(ev,k)){next[part]=next[part]||{};next[part][axis]=ev[k];changed=true}}));
    if(changed)labCamera=next;
  }
  function labRender3D(traces,layout={}){
    const plot=$('labPlot');
    const requested=layout.scene||{};
    const scene={
      aspectmode:requested.aspectmode||'cube',
      domain:requested.domain||{x:[.04,.96],y:[.04,.90]},
      ...requested,
      uirevision:'humach-playground-camera',
      camera:labCamera||requested.camera||LAB_DEFAULT_CAMERA
    };
    const next={
      ...layout,
      autosize:true,
      margin:{l:8,r:8,t:72,b:8,...(layout.margin||{})},
      legend:{orientation:'h',x:.5,xanchor:'center',y:1.08,yanchor:'bottom',...(layout.legend||{})},
      scene
    };
    return Promise.resolve(Plotly.react(plot,traces,next,{responsive:true,displaylogo:false})).then(()=>{
      if(plot&&plot.on&&!plot.dataset.cameraBound){plot.dataset.cameraBound='1';plot.on('plotly_relayout',labCaptureCamera)}
    });
  }
  function labResetCamera(){labCamera=null}
  const COLORS=['#4f46e5','#f97316'];
  const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const gauss=()=>{let u=Math.max(1e-9,1-rnd()),v=Math.max(1e-9,1-rnd());return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
  const sigmoid=z=>1/(1+Math.exp(-Math.max(-35,Math.min(35,z))));
  const dark=()=>document.documentElement.dataset.theme==='dark';
  function latent(x,y,z,type){
    if(type==='xor') return (x*y>0?1:-1)*1.25 + .32*z;
    if(type==='circles') return (Math.hypot(x,y)-2.05) + .36*z + .12*Math.sin(2*z);
    if(type==='moons') return y-(.68*Math.sin(1.15*x)+.12*x)+.45*z;
    if(type==='imbalanced') return .95*x-.42*y+.72*z-.8;
    return .9*x-.52*y+.68*z+.33*Math.sin(.8*x*y);
  }
  function make(randomize=true){
    if(randomize) seed=((Date.now()+Math.floor(Math.random()*1e9))>>>0)||1;
    data=[]; const n=170, nn=+noise.value/100;
    for(let i=0;i<n;i++){
      let x,y,z,label;
      if(ds.value==='circles'){
        const c=i%2, t=rnd()*Math.PI*2, r=(c?2.65:1.25)+gauss()*.23;
        x=r*Math.cos(t)+gauss()*.12; y=r*Math.sin(t)+gauss()*.12; z=gauss()*1.25; label=c;
      }else if(ds.value==='moons'){
        const c=i%2,t=rnd()*Math.PI;
        if(!c){x=2*Math.cos(t)-1;y=1.7*Math.sin(t)-.7}else{x=1-2*Math.cos(t);y=.7-1.7*Math.sin(t)}
        z=gauss()*1.2; label=c;
      }else{
        x=(rnd()*2-1)*3.5; y=(rnd()*2-1)*3.5; z=(rnd()*2-1)*3.5;
        const l=latent(x,y,z,ds.value)+gauss()*.28;
        label=l>0?1:0;
        if(ds.value==='imbalanced'&&label===1&&rnd()<.62) label=0;
      }
      if(rnd()<nn*.28) label=1-label;
      data.push({x,y,z,label});
    }
    trained=null;step=0;
  }
  const gini=rows=>{if(!rows.length)return 0;const p=rows.reduce((s,r)=>s+r.label,0)/rows.length;return 2*p*(1-p)};
  function buildTree(rows,depth,maxDepth,featureSubset=false){
    if(depth>=maxDepth||rows.length<10||gini(rows)<1e-5){const p=rows.reduce((s,r)=>s+r.label,0)/Math.max(1,rows.length);return{leaf:true,p}}
    let best=null,bScore=1e9; let feats=[0,1,2]; if(featureSubset) feats=[Math.floor(rnd()*3),Math.floor(rnd()*3)];
    for(const f of [...new Set(feats)]){
      const key=['x','y','z'][f], vals=rows.map(r=>r[key]).sort((a,b)=>a-b);
      for(let qi=2;qi<=8;qi++){
        const th=vals[Math.floor(vals.length*qi/10)],L=rows.filter(r=>r[key]<=th),R=rows.filter(r=>r[key]>th); if(L.length<5||R.length<5)continue;
        const sc=(L.length*gini(L)+R.length*gini(R))/rows.length; if(sc<bScore){bScore=sc;best={f,th,L,R}}
      }
    }
    if(!best){const p=rows.reduce((s,r)=>s+r.label,0)/rows.length;return{leaf:true,p}}
    return{leaf:false,f:best.f,th:best.th,left:buildTree(best.L,depth+1,maxDepth,featureSubset),right:buildTree(best.R,depth+1,maxDepth,featureSubset)};
  }
  function treeP(t,x){while(!t.leaf)t=x[t.f]<=t.th?t.left:t.right;return t.p}
  function init(){
    const c=Math.max(1,+complexity.value), kind=modelSel.value;
    if(kind==='logistic')trained={w:[0,0,0,0],epochs:0};
    else if(kind==='tree')trained={tree:null,depth:0,maxDepth:Math.min(7,Math.max(1,c))};
    else if(kind==='forest')trained={trees:[],target:Math.min(30,3+c*3)};
    else if(kind==='boosting')trained={stumps:[],weights:Array(data.length).fill(1/data.length),target:Math.min(28,2+c*3)};
    else trained={k:Math.max(1,Math.round(15-c)),active:false};
  }
  function trainStep(){
    if(!trained)init(); const kind=modelSel.value;
    if(kind==='logistic'){
      for(let e=0;e<10;e++){const g=[0,0,0,0];for(const d of data){const p=sigmoid(trained.w[0]+trained.w[1]*d.x+trained.w[2]*d.y+trained.w[3]*d.z),er=p-d.label;g[0]+=er;g[1]+=er*d.x;g[2]+=er*d.y;g[3]+=er*d.z}for(let j=0;j<4;j++)trained.w[j]-=.065*g[j]/data.length;trained.epochs++}step++;
    }else if(kind==='tree'){
      trained.depth=Math.min(trained.maxDepth,trained.depth+1);trained.tree=buildTree(data,0,trained.depth,false);step++;
    }else if(kind==='forest'){
      if(trained.trees.length<trained.target){const sample=Array.from({length:data.length},()=>data[Math.floor(rnd()*data.length)]);trained.trees.push(buildTree(sample,0,Math.min(6,2+Math.round(+complexity.value/2)),true))}step=trained.trees.length;
    }else if(kind==='boosting'){
      if(trained.stumps.length<trained.target){let best=null,bErr=Infinity;for(let f=0;f<3;f++){const key=['x','y','z'][f];for(let th=-3.5;th<=3.5;th+=.45)for(const dir of [-1,1]){let er=0;data.forEach((d,i)=>{const pr=((d[key]<=th?0:1)^(dir<0?1:0));if(pr!==d.label)er+=trained.weights[i]});if(er<bErr){bErr=er;best={f,th,dir}}}}bErr=Math.max(1e-6,Math.min(.499,bErr));const alpha=.5*Math.log((1-bErr)/bErr);let Z=0;data.forEach((d,i)=>{const key=['x','y','z'][best.f],pr=((d[key]<=best.th?0:1)^(best.dir<0?1:0)),yy=d.label?1:-1,hh=pr?1:-1;trained.weights[i]*=Math.exp(-alpha*yy*hh);Z+=trained.weights[i]});trained.weights=trained.weights.map(w=>w/Z);trained.stumps.push({...best,alpha})}step=trained.stumps.length;
    }else{trained.active=true;step=1}
    render();
  }
  function score(x,y,z){
    if(!trained)return .5; const kind=modelSel.value;
    if(kind==='logistic')return sigmoid(trained.w[0]+trained.w[1]*x+trained.w[2]*y+trained.w[3]*z);
    if(kind==='knn'){if(!trained.active)return .5;const a=data.map(d=>[(d.x-x)**2+(d.y-y)**2+(d.z-z)**2,d.label]).sort((a,b)=>a[0]-b[0]).slice(0,trained.k);return a.reduce((s,q)=>s+q[1],0)/a.length}
    if(kind==='tree')return trained.tree?treeP(trained.tree,[x,y,z]):.5;
    if(kind==='forest')return trained.trees.length?trained.trees.reduce((s,t)=>s+treeP(t,[x,y,z]),0)/trained.trees.length:.5;
    if(kind==='boosting'){if(!trained.stumps.length)return .5;let q=0;trained.stumps.forEach(s=>{const v=[x,y,z][s.f],pr=((v<=s.th?0:1)^(s.dir<0?1:0));q+=s.alpha*(pr?1:-1)});return sigmoid(2*q)}
    return .5;
  }
  function met(){let tp=0,tn=0,fp=0,fn=0;for(const d of data){const p=score(d.x,d.y,d.z)>=.5;if(p&&d.label)tp++;else if(p)fp++;else if(d.label)fn++;else tn++}const acc=(tp+tn)/data.length,pr=tp/(tp+fp||1),re=tp/(tp+fn||1),f1=2*pr*re/(pr+re||1);return{tp,tn,fp,fn,acc,pr,re,f1}}
  function rawTraces(dim3=false){return [0,1].map(k=>{const a=data.filter(d=>d.label===k);return dim3?{x:a.map(d=>d.x),y:a.map(d=>d.y),z:a.map(d=>d.z),mode:'markers',type:'scatter3d',name:`Class ${k}`,marker:{size:4,color:COLORS[k],opacity:.72}}:{x:a.map(d=>d.x),y:a.map(d=>d.y),mode:'markers',type:'scatter',name:`Class ${k}`,marker:{size:8,color:COLORS[k],opacity:.72,line:{color:'#fff',width:.5}}}})}
  function separatorSurface(){const xs=Array.from({length:27},(_,i)=>-3.8+7.6*i/26),ys=[...xs],zs=ys.map(y=>xs.map(x=>{let bz=0,be=Infinity;for(let i=0;i<=36;i++){const z=-3.8+7.6*i/36,e=Math.abs(score(x,y,z)-.5);if(e<be){be=e;bz=z}}return bz}));return{x:xs,y:ys,z:zs,type:'surface',name:'p = 0.5 separator',opacity:.48,showscale:false,colorscale:[[0,'#111827'],[1,'#111827']],hoverinfo:'skip'} }
  function render(){
    const d=dark(),ink=d?'#f8fafc':'#111827',bg=d?'#0b1020':'#fff';
    let traces=rawTraces(view==='3d');
    if(trained&&step>0){
      if(view==='2d'){
        const xs=Array.from({length:39},(_,i)=>-4+8*i/38),ys=[...xs],Z=ys.map(y=>xs.map(x=>score(x,y,0)));
        traces=[{x:xs,y:ys,z:Z,type:'contour',colorscale:[[0,'#dbeafe'],[.5,'#f8fafc'],[1,'#fed7aa']],opacity:.5,showscale:false,contours:{coloring:'heatmap',showlines:false},hoverinfo:'skip'},{x:xs,y:ys,z:Z,type:'contour',contours:{start:.5,end:.5,size:1,coloring:'none'},line:{color:d?'#f8fafc':'#111827',width:4},showscale:false,name:'Decision boundary',hoverinfo:'skip'},...traces];
      }else traces=[separatorSurface(),...traces];
    }
    if(view==='2d')Plotly.react('labPlot',traces,{paper_bgcolor:bg,plot_bgcolor:bg,font:{color:ink},margin:{l:48,r:18,t:48,b:46},legend:{orientation:'h',x:.5,xanchor:'center',y:1.14},xaxis:{range:[-4.2,4.2],title:'Feature 1'},yaxis:{range:[-4.2,4.2],title:'Feature 2',scaleanchor:'x'}},{responsive:true,displaylogo:false});
    else labRender3D(traces,{paper_bgcolor:bg,font:{color:ink},margin:{l:0,r:0,t:52,b:0},legend:{orientation:'h',x:.5,xanchor:'center',y:1.05},scene:{xaxis:{title:'Feature 1',range:[-4,4]},yaxis:{title:'Feature 2',range:[-4,4]},zaxis:{title:'Feature 3',range:[-4,4]},aspectmode:'cube'}});
    if(!trained||step===0){status.textContent='Untrained · raw observations only';metrics.innerHTML='<div><small>Model state</small><strong>Not trained</strong></div><div><small>Samples</small><strong>'+data.length+'</strong></div>';explain.innerHTML='<h3>Start with the data</h3><p>No decision boundary or separator is shown until you click <strong>Train</strong> or <strong>Train step</strong>. In 3D, Feature 3 is a genuine input feature; colour represents the class.</p>';return}
    const m=met();metrics.innerHTML=`<div><small>Accuracy</small><strong>${m.acc.toFixed(3)}</strong></div><div><small>Precision</small><strong>${m.pr.toFixed(3)}</strong></div><div><small>Recall</small><strong>${m.re.toFixed(3)}</strong></div><div><small>F1</small><strong>${m.f1.toFixed(3)}</strong></div>`;status.textContent=`${modelSel.options[modelSel.selectedIndex].text} · training step ${step}`;explain.innerHTML=`<h3>${view==='3d'?'A separator in feature space':'Decision boundary at Feature 3 = 0'}</h3><p>${view==='3d'?'The translucent surface is where the current model is closest to p = 0.5. The classes overlap along all three feature axes; they are not placed on class-labelled z levels.':'The line is a 2D slice through the same three-feature classifier.'}</p>`;
  }
  function stop(){if(timer){clearInterval(timer);timer=null;$('labTrain').textContent='Train'}}
  $('labTrain').addEventListener('click',()=>{if(timer){stop();return}if(!trained)init();$('labTrain').textContent='Pause';timer=setInterval(()=>{trainStep();if(step>=24||modelSel.value==='knn')stop()},180)});
  $('labStep').addEventListener('click',()=>{stop();trainStep()});
  $('labReset').addEventListener('click',()=>{stop();labResetCamera();make(true);render()});
  [ds,modelSel,noise,complexity].forEach(x=>x.addEventListener('input',()=>{stop();make(true);render()}));
  v2?.addEventListener('click',()=>{view='2d';v2.classList.add('active');v3.classList.remove('active');render()});
  v3?.addEventListener('click',()=>{view='3d';v3.classList.add('active');v2.classList.remove('active');render()});
  make(true);render();addEventListener('humach-theme-change',render);
})();
