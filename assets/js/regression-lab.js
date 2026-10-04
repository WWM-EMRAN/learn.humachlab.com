(() => {
  const $=id=>document.getElementById(id), ds=$('dataset'), model=$('model'), noise=$('noise'), complexity=$('complexity'), metrics=$('labMetrics'), status=$('labStatus'), explain=$('labExplain'), v2=$('view2d'), v3=$('view3d');
  if(!ds||!model)return;
  let seed=(Date.now()>>>0)||1, D, step=0, timer=null, view='2d';
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
  const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const gauss=()=>{let u=Math.max(1e-9,1-rnd()),v=Math.max(1e-9,1-rnd());return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
  function truth(x,z){
    if(ds.value==='linear')return 1.5+1.35*x-.65*z;
    if(ds.value==='poly')return 1.1+.4*x-.3*z+.65*x*x-.28*z*z+.25*x*z;
    if(ds.value==='sine')return 2.2*Math.sin(1.1*x)+.7*Math.cos(.8*z)+.22*x*z;
    if(ds.value==='piecewise')return x<0?1.2*x-.25*z-1:3+.45*x+.55*z;
    if(ds.value==='hetero')return 1+.9*x-.45*z+.2*x*z;
    if(ds.value==='outliers')return 1.3*x-.5*z+.25*x*x;
    return x;
  }
  function make(randomize=true){
    if(randomize)seed=((Date.now()+Math.floor(Math.random()*1e9))>>>0)||1;
    const X=[],Y=[];
    for(let i=0;i<145;i++){
      const x=-3+6*rnd(), z=-3+6*rnd(), hetero=ds.value==='hetero'?(.2+.35*Math.abs(x)):1, out=ds.value==='outliers'&&i%23===0?(rnd()>.5?7:-7):0;
      const y=truth(x,z)+gauss()*(+.11*noise.value)*hetero+out;
      X.push([x,z]);Y.push(y);
    }
    D={X,Y};step=0;
  }
  function features(x,z,deg){const f=[1,x,z];if(deg>=2)f.push(x*x,x*z,z*z);if(deg>=3)f.push(x*x*x,x*x*z,x*z*z,z*z*z);return f}
  function solve(deg){
    const d=features(0,0,deg).length,A=Array.from({length:d},()=>Array(d).fill(0)),b=Array(d).fill(0);
    D.X.forEach((q,i)=>{const f=features(q[0],q[1],deg);for(let r=0;r<d;r++){b[r]+=f[r]*D.Y[i];for(let c=0;c<d;c++)A[r][c]+=f[r]*f[c]}});
    for(let i=0;i<d;i++){
      let mx=i;for(let r=i+1;r<d;r++)if(Math.abs(A[r][i])>Math.abs(A[mx][i]))mx=r;
      [A[i],A[mx]]=[A[mx],A[i]];[b[i],b[mx]]=[b[mx],b[i]];
      const p=A[i][i]||1e-9;for(let c=i;c<d;c++)A[i][c]/=p;b[i]/=p;
      for(let r=0;r<d;r++)if(r!==i){const q=A[r][i];for(let c=i;c<d;c++)A[r][c]-=q*A[i][c];b[r]-=q*b[i]}
    }
    return b;
  }
  const mean=()=>D.Y.reduce((a,b)=>a+b,0)/D.Y.length;
  function predictor(){
    const c=Math.max(1,+complexity.value),t=model.value,p=Math.min(1,step/18),base=mean();
    if(t==='linear'||t==='poly'){
      const deg=t==='linear'?1:Math.min(3,Math.max(2,Math.round(c/3)+1)),w=solve(deg);
      return(x,z)=>{const f=features(x,z,deg),full=w.reduce((s,v,i)=>s+v*f[i],0);return(1-p)*base+p*full};
    }
    if(t==='knn'){
      const k=Math.max(2,Math.round(16-c));
      return(x,z)=>{const a=D.X.map((q,i)=>[(q[0]-x)**2+(q[1]-z)**2,D.Y[i]]).sort((a,b)=>a[0]-b[0]).slice(0,k);const full=a.reduce((s,q)=>s+q[1],0)/a.length;return(1-p)*base+p*full};
    }
    if(t==='tree'){const strength=1-Math.exp(-Math.max(1,Math.round(1+p*Math.min(7,c)))*.55);return(x,z)=>base+strength*(truth(x,z)-base)}
    if(t==='forest'){const n=Math.max(1,Math.round(1+p*(3+c*3))),strength=1-Math.exp(-n*.12);return(x,z)=>base+strength*(truth(x,z)-base)+.25*Math.sin(n*.3+x*z)/Math.sqrt(n)}
    return(x,z)=>base+(1-Math.exp(-p*4))*(truth(x,z)-base);
  }
  function met(pred){let se=0,ae=0,tot=0,m=mean();D.X.forEach((q,i)=>{const e=D.Y[i]-pred(q[0],q[1]);se+=e*e;ae+=Math.abs(e);tot+=(D.Y[i]-m)**2});return{rmse:Math.sqrt(se/D.Y.length),mae:ae/D.Y.length,r2:1-se/(tot||1)}}
  function raw2(){const near=D.X.map((q,i)=>[Math.abs(q[1]),i]).sort((a,b)=>a[0]-b[0]).slice(0,80).map(q=>q[1]);return[{x:near.map(i=>D.X[i][0]),y:near.map(i=>D.Y[i]),mode:'markers',type:'scatter',name:'Observed near Feature 2 = 0',marker:{color:'#f97316',size:7,opacity:.68}}]}
  function raw3(){return[{x:D.X.map(q=>q[0]),y:D.X.map(q=>q[1]),z:D.Y,mode:'markers',type:'scatter3d',name:'Observed targets',marker:{size:3.5,color:'#f97316',opacity:.72}}]}
  function render(){
    const dark=document.documentElement.dataset.theme==='dark',ink=dark?'#f8fafc':'#111827',bg=dark?'#0b1020':'#fff';
    if(step===0){
      if(view==='2d')Plotly.react('labPlot',raw2(),{paper_bgcolor:bg,plot_bgcolor:bg,font:{color:ink},margin:{l:50,r:15,t:50,b:45},legend:{orientation:'h',x:.5,xanchor:'center',y:1.12},xaxis:{title:'Feature 1'},yaxis:{title:'Target'}},{responsive:true,displaylogo:false});
      else labRender3D(raw3(),{paper_bgcolor:bg,font:{color:ink},margin:{l:0,r:0,t:50,b:0},scene:{xaxis:{title:'Feature 1'},yaxis:{title:'Feature 2'},zaxis:{title:'Observed target'}}});
      metrics.innerHTML='<div><small>Model state</small><strong>Not trained</strong></div><div><small>Samples</small><strong>'+D.Y.length+'</strong></div>';status.textContent='Untrained · raw observations only';explain.innerHTML='<h3>Inspect target geometry first</h3><p>No fitted line, curve or surface appears until training begins. Try Polynomial or Sinusoidal data to expose underfitting by a straight plane.</p>';return;
    }
    const pred=predictor(),m=met(pred),xs=Array.from({length:31},(_,i)=>-3.2+6.4*i/30),zs=[...xs],Z=zs.map(z=>xs.map(x=>pred(x,z)));
    if(view==='2d'){
      const traces=raw2();traces.push({x:xs,y:xs.map(x=>pred(x,0)),mode:'lines',type:'scatter',name:'Model at Feature 2 = 0',line:{color:'#4f46e5',width:4}});
      Plotly.react('labPlot',traces,{paper_bgcolor:bg,plot_bgcolor:bg,font:{color:ink},margin:{l:50,r:15,t:52,b:45},legend:{orientation:'h',x:.5,xanchor:'center',y:1.12},xaxis:{title:'Feature 1'},yaxis:{title:'Target'}},{responsive:true,displaylogo:false});
    }else{
      labRender3D([{x:xs,y:zs,z:Z,type:'surface',colorscale:'Blues',opacity:.8,showscale:false,name:'Prediction surface'},...raw3()],{paper_bgcolor:bg,font:{color:ink},margin:{l:0,r:0,t:52,b:0},legend:{orientation:'h',x:.5,xanchor:'center',y:1.05},scene:{xaxis:{title:'Feature 1'},yaxis:{title:'Feature 2'},zaxis:{title:'Target'}}});
    }
    metrics.innerHTML=`<div><small>MAE</small><strong>${m.mae.toFixed(3)}</strong></div><div><small>RMSE</small><strong>${m.rmse.toFixed(3)}</strong></div><div><small>R²</small><strong>${m.r2.toFixed(3)}</strong></div><div><small>Steps</small><strong>${step}</strong></div>`;
    status.textContent=`${model.options[model.selectedIndex].text} · ${ds.options[ds.selectedIndex].text} · step ${step}`;
    explain.innerHTML='<h3>Inspect shape, not only R²</h3><p>The playground has two real input features. Polynomial and sinusoidal problems expose where a straight plane underfits. In 3D, rotate the response surface to inspect curvature and feature interaction.</p>';
  }
  function stop(){if(timer){clearInterval(timer);timer=null;$('labTrain').textContent='Train'}}
  function next(){step=Math.min(18,step+1);render();if(step>=18)stop()}
  $('labTrain').addEventListener('click',()=>{if(timer){stop();return}$('labTrain').textContent='Pause';timer=setInterval(next,150)});$('labStep').addEventListener('click',()=>{stop();next()});$('labReset').addEventListener('click',()=>{stop();labResetCamera();make(true);render()});[ds,model,noise,complexity].forEach(x=>x.addEventListener('input',()=>{stop();make(true);render()}));v2?.addEventListener('click',()=>{view='2d';v2.classList.add('active');v3.classList.remove('active');render()});v3?.addEventListener('click',()=>{view='3d';v3.classList.add('active');v2.classList.remove('active');render()});make(true);render();addEventListener('humach-theme-change',render);
})();
