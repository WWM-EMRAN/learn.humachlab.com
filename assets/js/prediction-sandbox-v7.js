(() => {
  const PG=window.HumachPG,G3=window.HumachPG3,G4=window.HumachPG4;
  if(!PG||!G3||!G4||!PG.$('psTrain'))return;
  const $=PG.$,names=['Signal A','Signal B','Noise feature','Redundant A'];
  const defaults={logistic:{lambda:.004},knn:{k:9},tree:{depth:4},forest:{trees:41,depth:5},svm:{C:1}};
  let state=null;
  const setOut=()=>names.forEach((_,i)=>{$(`psF${i+1}Out`).textContent=PG.fmt(+$(`psF${i+1}`).value,2)});
  function train(){
    const seed=+$('psSeed').value||42,modelName=$('psModel').value,rows=G4.explainData(300,seed),sp=G3.splitRows(rows,.24,seed,true),sc=G3.fitScaler(sp.train,'standard'),tr=sc.transform(sp.train),te=sc.transform(sp.test),model=G3.fitModel(modelName,tr,{...defaults[modelName],seed}),met=G3.evaluate(model,te);
    state={seed,modelName,rows,sp,sc,tr,te,model,met};
    const med=Array.from({length:4},(_,j)=>PG.median(sp.train.map(r=>r.x[j])));med.forEach((v,j)=>{$(`psF${j+1}`).value=PG.clamp(v,-3,3)});setOut();renderPrediction();
    $('psStatus').textContent=`${G3.modelName(modelName)} trained on ${sp.train.length} observations. The ${te.length}-row evaluation set was not used for fitting.`;
  }
  function renderPrediction(){
    if(!state)return;const raw=names.map((_,i)=>+$(`psF${i+1}`).value),thr=+$('psThreshold').value,$out=$('psThresholdOut');$out.textContent=PG.fmt(thr,2);setOut();
    const scaled=state.sc.transform([{x:raw,y:0}])[0],prob=state.model.predict(scaled.x),pred=prob>=thr?1:0,loc=G4.localEffects(state.model,state.tr,scaled),dists=state.tr.map((r,i)=>({i,d:G3.distance(r.x,scaled.x),y:r.y,raw:state.sp.train[i].x})).sort((a,b)=>a.d-b.d).slice(0,6);
    $('psSummary').innerHTML=`<div><small>Predicted class</small><strong>${pred}</strong><span>Threshold ${PG.fmt(thr,2)}</span></div><div><small>Probability class 1</small><strong>${PG.fmt(prob,3)}</strong><span>${prob>=thr?'Above':'Below'} threshold</span></div><div><small>Model</small><strong>${PG.esc(G3.modelName(state.modelName))}</strong><span>Held-out F1 ${PG.fmt(state.met.f1,3)}</span></div><div><small>Nearest training class</small><strong>${dists[0]?.y??'—'}</strong><span>Distance ${PG.fmt(dists[0]?.d,3)}</span></div>`;
    const mx=Math.max(.01,...loc.effects.map(e=>Math.abs(e.effect)));$('psLocal').innerHTML=loc.effects.map(e=>`<div class="pg-explain-row"><strong>${PG.esc(names[e.feature])}</strong><div class="pg-importance-bar"><span style="width:${100*Math.abs(e.effect)/mx}%;margin-left:${e.effect<0?'auto':'0'}"></span></div><span>${e.effect>=0?'+':''}${PG.fmt(e.effect,3)}</span></div>`).join('');
    const nearRows=dists.map(z=>({Class:z.y,Distance:PG.fmt(z.d,3),...Object.fromEntries(names.map((n,j)=>[n,PG.fmt(z.raw[j],2)]))}));PG.renderTable($('psNearest'),nearRows,Object.keys(nearRows[0]||{}),8);
    const visual={predict:(x1,x2)=>state.model.predict(state.sc.transform([{x:[x1,x2,raw[2],raw[3]],y:0}])[0].x)},grid=G3.boundaryGrid(state.sp.train,visual,52);
    PG.plot($('psBoundary'),[...G3.boundaryTraces(grid,1),{x:state.sp.train.map(r=>r.x[0]),y:state.sp.train.map(r=>r.x[1]),type:'scatter',mode:'markers',name:'Training evidence',marker:{size:6,opacity:.42,color:state.sp.train.map(r=>r.y),colorscale:[[0,'#4f7cff'],[1,'#ef7d32']],cmin:0,cmax:1}},{x:[raw[0]],y:[raw[1]],type:'scatter',mode:'markers',name:'New case',marker:{size:19,symbol:'star',color:'#8b5cf6',line:{width:2,color:'#fff'}}}],{title:'Prediction sandbox — move the star, keep the trained separator fixed',xaxis:{title:'Signal A',range:[grid.xmin,grid.xmax]},yaxis:{title:'Signal B',range:[grid.ymin,grid.ymax]}});
    $('psExplain').innerHTML=`<h3>How to read this prediction</h3><p>The probability comes from the already-trained model. The local bars replace one standardised feature with its training median and measure the probability change. The nearest rows are examples, not explanations or causal evidence. Move one feature at a time and observe whether the star crosses the separator.</p>`;
  }
  $('psTrain').addEventListener('click',train);$('psModel').addEventListener('change',train);$('psThreshold').addEventListener('input',renderPrediction);names.forEach((_,i)=>$(`psF${i+1}`).addEventListener('input',renderPrediction));$('psMedian').addEventListener('click',()=>{if(!state)return;Array.from({length:4},(_,j)=>PG.median(state.sp.train.map(r=>r.x[j]))).forEach((v,j)=>{$(`psF${j+1}`).value=PG.clamp(v,-3,3)});renderPrediction();});train();
})();
