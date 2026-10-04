(() => {
  const $=id=>document.getElementById(id), ds=$('dataset'), alg=$('algorithm'), complexity=$('complexity'), noise=$('noise'), status=$('labStatus'), metrics=$('labMetrics'), explain=$('labExplain'), v2=$('view2d'), v3=$('view3d');
  if(!ds||!alg)return;
  let seed=(Date.now()>>>0)||1,data=[],view='2d',timer=null,step=0,phase='raw',centroids=[],labels=[],dbLabels=[],dbIndex=0,regions=[];
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
  const COLORS=['#2563eb','#f97316','#10b981','#8b5cf6','#eab308','#06b6d4'];
  const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const gauss=()=>{let u=Math.max(1e-9,1-rnd()),v=Math.max(1e-9,1-rnd());return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
  function make(randomize=true){
    if(randomize)seed=((Date.now()+Math.floor(Math.random()*1e9))>>>0)||1;
    data=[];
    for(let i=0;i<135;i++){
      let x,y,z,t=rnd()*2*Math.PI;
      if(ds.value==='moons'){const c=i%2;if(!c){x=2*Math.cos(t)-1;y=1.7*Math.sin(t)-.6}else{x=1-2*Math.cos(t);y=.7-1.7*Math.sin(t)}z=.55*Math.sin(t)+gauss()*.45}
      else if(ds.value==='circles'){const c=i%2,r=(c?2.65:1.15)+gauss()*.18;x=r*Math.cos(t);y=r*Math.sin(t);z=(c?.65:-.65)+.35*Math.cos(2*t)+gauss()*.42}
      else{const base=alg.value==='dbscan'?[[-2.7,-1.7,-1.4],[2.6,-1.6,1.35],[-1.6,2.55,1.6],[2.2,2.45,-1.55],[.1,.25,2.65]]:[[-2.2,-1.2,-.8],[2.1,1.2,1.25],[-.1,2.55,-1.25]],cs=ds.value==='anisotropic'?base.map(([a,b,c],k)=>[a+(k%2?.3:-.2),b,c]):base,c=cs[i%cs.length];x=c[0]+gauss()*(alg.value==='dbscan'?.42:.55);y=c[1]+gauss()*(alg.value==='dbscan'?.42:.55);z=c[2]+gauss()*(alg.value==='dbscan'?.42:.55);if(ds.value==='anisotropic')x+=.55*y;if(ds.value==='outliers'&&i>119){x=(rnd()*2-1)*4.5;y=(rnd()*2-1)*4.5;z=(rnd()*2-1)*3.6}}
      const n=+noise.value/100;x+=gauss()*n*.45;y+=gauss()*n*.45;z+=gauss()*n*.35;data.push({x,y,z});
    }
    step=0;phase='raw';centroids=[];labels=Array(data.length).fill(-1);dbLabels=Array(data.length).fill(-1);dbIndex=0;regions=[];
  }
  const dims=()=>view==='3d'?['x','y','z']:['x','y'];
  const distance=(a,b)=>Math.sqrt(dims().reduce((s,k)=>s+(a[k]-(Array.isArray(b)?b[['x','y','z'].indexOf(k)]:b[k]))**2,0));
  function initCentroids(){const k=Math.max(2,Math.min(6,Math.round(+complexity.value)));centroids=[];const picks=[];for(let j=0;j<k;j++){let idx=Math.floor((j+.35)*data.length/k + rnd()*data.length/(2*k))%data.length;while(picks.includes(idx))idx=(idx+7)%data.length;picks.push(idx);centroids.push([data[idx].x,data[idx].y,data[idx].z])}phase='initialised';step++}
  function assign(){labels=data.map(p=>{let best=0,bd=Infinity;centroids.forEach((c,j)=>{const d=Math.sqrt((p.x-c[0])**2+(p.y-c[1])**2+(view==='3d'?(p.z-c[2])**2:0));if(d<bd){bd=d;best=j}});return best});phase='distance';step++}
  function updateMeans(){centroids=centroids.map((c,j)=>{const pts=data.filter((_,i)=>labels[i]===j);if(!pts.length)return c;return [pts.reduce((s,p)=>s+p.x,0)/pts.length,pts.reduce((s,p)=>s+p.y,0)/pts.length,pts.reduce((s,p)=>s+p.z,0)/pts.length]});phase='mean';step++}
  function kstep(){if(!centroids.length)return initCentroids();if(phase==='initialised'||phase==='mean')assign();else updateMeans()}
  function dbstep(){
    const eps=.55+(+complexity.value-2)*.13,minPts=5;if(dbIndex>=data.length){phase='complete';return}
    const i=dbIndex++,p=data[i],nb=data.map((q,j)=>Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z)<=eps?j:-1).filter(j=>j>=0);
    let cluster=-1;
    if(nb.length>=minPts){cluster=nb.map(j=>dbLabels[j]).find(c=>c>=0);if(cluster===undefined)cluster=-1;if(cluster<0)cluster=Math.max(-1,...dbLabels)+1;nb.forEach(j=>{if(dbLabels[j]<0)dbLabels[j]=cluster});regions.push({x:p.x,y:p.y,z:p.z,eps,cluster});phase='core'}else{if(dbLabels[i]<0)dbLabels[i]=-2;phase='border/noise'}
    step++;
  }
  function kDistanceTraces(dim3){if(!centroids.length||phase!=='distance')return[];const sample=data.filter((_,i)=>i%Math.max(1,Math.floor(data.length/34))===0).slice(0,34),x=[],y=[],z=[];sample.forEach(p=>{let best=0,bd=Infinity;centroids.forEach((c,j)=>{const dd=(p.x-c[0])**2+(p.y-c[1])**2+(dim3?(p.z-c[2])**2:0);if(dd<bd){bd=dd;best=j}});const c=centroids[best];x.push(p.x,c[0],null);y.push(p.y,c[1],null);if(dim3)z.push(p.z,c[2],null)});return[dim3?{x,y,z,mode:'lines',type:'scatter3d',name:'Point → centroid distance',line:{color:'#94a3b8',width:2},hoverinfo:'skip'}:{x,y,mode:'lines',type:'scatter',name:'Point → centroid distance',line:{color:'#94a3b8',width:1},hoverinfo:'skip'}]}
  function sphere(r){const x=[],y=[],z=[];for(let a=0;a<=9;a++){const xr=[],yr=[],zr=[];for(let b=0;b<=14;b++){const th=Math.PI*a/9,ph=2*Math.PI*b/14;xr.push(r.x+r.eps*Math.sin(th)*Math.cos(ph));yr.push(r.y+r.eps*Math.sin(th)*Math.sin(ph));zr.push(r.z+r.eps*Math.cos(th))}x.push(xr);y.push(yr);z.push(zr)}return{x,y,z,type:'surface',opacity:.13,showscale:false,hoverinfo:'skip',surfacecolor:z.map(row=>row.map(()=>r.cluster+1)),colorscale:[[0,COLORS[r.cluster%COLORS.length]],[1,COLORS[r.cluster%COLORS.length]]],name:`ε region C${r.cluster+1}`,showlegend:false}}
  function render(){
    const dark=document.documentElement.dataset.theme==='dark',ink=dark?'#f8fafc':'#111827',bg=dark?'#0b1020':'#fff';let traces=[],shapes=[];const activeLabels=alg.value==='kmeans'?labels:dbLabels;
    const hasModel=step>0;
    if(!hasModel){
      traces=[view==='3d'?{x:data.map(p=>p.x),y:data.map(p=>p.y),z:data.map(p=>p.z),mode:'markers',type:'scatter3d',name:'Raw observations',marker:{size:4,color:'#64748b',opacity:.72}}:{x:data.map(p=>p.x),y:data.map(p=>p.y),mode:'markers',type:'scatter',name:'Raw observations',marker:{size:8,color:'#64748b',opacity:.72}}];
    }else{
      const unique=[...new Set(activeLabels.filter(x=>x>=0))];
      traces=unique.map(j=>{const pts=data.filter((_,i)=>activeLabels[i]===j);return view==='3d'?{x:pts.map(p=>p.x),y:pts.map(p=>p.y),z:pts.map(p=>p.z),mode:'markers',type:'scatter3d',name:`C${j+1}`,marker:{size:4,color:COLORS[j%COLORS.length],opacity:.8}}:{x:pts.map(p=>p.x),y:pts.map(p=>p.y),mode:'markers',type:'scatter',name:`C${j+1}`,marker:{size:8,color:COLORS[j%COLORS.length],opacity:.8}}});
      const un=data.filter((_,i)=>activeLabels[i]<0);if(un.length)traces.push(view==='3d'?{x:un.map(p=>p.x),y:un.map(p=>p.y),z:un.map(p=>p.z),mode:'markers',type:'scatter3d',name:'Unassigned / noise',marker:{size:3.5,color:'#94a3b8',opacity:.5}}:{x:un.map(p=>p.x),y:un.map(p=>p.y),mode:'markers',type:'scatter',name:'Unassigned / noise',marker:{size:7,color:'#94a3b8',opacity:.5}});
      if(alg.value==='kmeans'&&centroids.length){traces.unshift(...kDistanceTraces(view==='3d'));traces.push(view==='3d'?{x:centroids.map(c=>c[0]),y:centroids.map(c=>c[1]),z:centroids.map(c=>c[2]),mode:'markers',type:'scatter3d',name:'Centroids',marker:{size:7,symbol:'diamond',color:'#111827',line:{color:'#fff',width:1}}}:{x:centroids.map(c=>c[0]),y:centroids.map(c=>c[1]),mode:'markers',type:'scatter',name:'Centroids',marker:{size:16,symbol:'x',color:'#111827',line:{color:'#fff',width:2}}})}
      if(alg.value==='dbscan'){
        if(view==='2d') regions.forEach(r=>shapes.push({type:'circle',x0:r.x-r.eps,x1:r.x+r.eps,y0:r.y-r.eps,y1:r.y+r.eps,line:{color:COLORS[r.cluster%COLORS.length],width:2},fillcolor:COLORS[r.cluster%COLORS.length]+'18'}));
        else{const byCluster=new Map();regions.forEach(r=>{if(r.cluster<0)return;if(!byCluster.has(r.cluster))byCluster.set(r.cluster,[]);byCluster.get(r.cluster).push(r)});const balanced=[];[...byCluster.keys()].sort((a,b)=>a-b).forEach(c=>{const rr=byCluster.get(c),take=Math.min(5,rr.length);for(let i=0;i<take;i++)balanced.push(rr[Math.floor(i*Math.max(1,rr.length-1)/Math.max(1,take-1))])});traces.unshift(...balanced.map(sphere));}
      }
    }
    const legend={orientation:'h',x:.5,xanchor:'center',y:1.16,yanchor:'bottom',font:{size:11},traceorder:'normal'};
    if(view==='2d')Plotly.react('labPlot',traces,{paper_bgcolor:bg,plot_bgcolor:bg,font:{color:ink},margin:{l:46,r:15,t:88,b:45},legend,xaxis:{range:[-5,5],title:'Feature 1'},yaxis:{range:[-5,5],title:'Feature 2',scaleanchor:'x'},shapes},{responsive:true,displaylogo:false});
    else labRender3D(traces,{paper_bgcolor:bg,font:{color:ink},margin:{l:0,r:0,t:88,b:0},legend,scene:{xaxis:{title:'Feature 1',range:[-5,5]},yaxis:{title:'Feature 2',range:[-5,5]},zaxis:{title:'Feature 3',range:[-4,4]},aspectmode:'cube'}});
    const clusters=new Set(activeLabels.filter(x=>x>=0)).size;metrics.innerHTML=`<div><small>Training step</small><strong>${step}</strong></div><div><small>Clusters visible</small><strong>${clusters}</strong></div><div><small>ε regions</small><strong>${regions.length}</strong></div><div><small>State</small><strong>${hasModel?phase:'Untrained'}</strong></div>`;
    if(!hasModel){status.textContent='Untrained · raw observations only';explain.innerHTML='<h3>Start with geometry</h3><p>No centroid, distance assignment or density region is shown until training begins.</p>';return}
    if(alg.value==='kmeans'){
      status.textContent=`K-Means · ${phase} · step ${step}`;
      explain.innerHTML=phase==='distance'?'<h3>Assign by distance</h3><p>Each visible connector represents a Euclidean point→centroid comparison: <code>d(x,c)=√Σ(xⱼ−cⱼ)²</code>. The same calculation is shown in 2D and 3D.</p>':phase==='mean'?'<h3>Move to the mean</h3><p>For every cluster, K-Means replaces its centroid by the coordinate-wise mean of its assigned points. The next step recomputes distances from that new location.</p>':'<h3>Initialise centroids</h3><p>Training begins by placing candidate centroids. The next Train Step calculates point→centroid distances.</p>';
    }else{
      const eps=.55+(+complexity.value-2)*.13;status.textContent=`DBSCAN · inspected ${dbIndex}/${data.length} points · ε=${eps.toFixed(2)}`;
      explain.innerHTML=`<h3>Grow density-connected regions</h3><p>Every coloured ${view==='3d'?'sphere':'circle'} is a retained ε-neighbourhood from a discovered core point. Regions of the same colour belong to the same growing cluster, so you can see density connectivity accumulate instead of watching one generic neighbourhood move.</p>`;
    }
  }
  function one(){alg.value==='kmeans'?kstep():dbstep();render()}
  function stop(){if(timer){clearInterval(timer);timer=null;$('labTrain').textContent='Train'}}
  $('labTrain').addEventListener('click',()=>{if(timer){stop();return}$('labTrain').textContent='Pause';timer=setInterval(()=>{one();if((alg.value==='kmeans'&&step>=18)||(alg.value==='dbscan'&&dbIndex>=data.length))stop()},alg.value==='dbscan'?150:480)});
  $('labStep').addEventListener('click',()=>{stop();one()});$('labReset').addEventListener('click',()=>{stop();labResetCamera();make(true);render()});
  [ds,alg,complexity,noise].forEach(x=>x.addEventListener('input',()=>{stop();make(true);render()}));
  v2?.addEventListener('click',()=>{view='2d';v2.classList.add('active');v3.classList.remove('active');render()});v3?.addEventListener('click',()=>{view='3d';v3.classList.add('active');v2.classList.remove('active');render()});
  make(true);render();addEventListener('humach-theme-change',render);
})();
