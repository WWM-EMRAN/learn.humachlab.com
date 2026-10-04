(() => {
  const PG=window.HumachPG,G3=window.HumachPG3;if(!PG||!G3)return;
  const $=PG.$;let last=null,visual=null,simProgress=1;
  const sync=()=>{$('plMissingOut').textContent=`${Math.round(Number($('plMissing').value)*100)}%`;};
  const config=()=>({dataset:$('plData').value,missing:Number($('plMissing').value),impute:$('plImpute').value==='median',scale:$('plScale').value,engineer:$('plEngineer').value,select:$('plSelect').value,model:$('plModel').value,seed:Number($('plSeed').value)||42,test:.2,val:.2,params:{k:7,depth:4,trees:31,lambda:.005,C:1}});
  const pipeSteps=c=>[['Data',G3.datasetName(c.dataset),true],['Clean',c.impute?'Median impute':'Drop rows',true],['Scale',c.scale==='none'?'Skipped':c.scale,c.scale!=='none'],['Engineer',c.engineer==='none'?'Skipped':c.engineer,c.engineer!=='none'],['Select',c.select==='all'?'All features':`Top ${c.select}`,c.select!=='all'],['Model',G3.modelName(c.model),true],['Evaluate','Validation → test',true]];
  const renderPipeline=c=>{$('plPipeline').innerHTML=pipeSteps(c).map(([a,b,on])=>`<div class="pg-pipe-step ${on?'active':''}"><small>${PG.esc(a)}</small><strong>${PG.esc(b)}</strong></div>`).join('');};
  const metricCard=(label,m)=>`<div><small>${label} F1</small><strong>${PG.fmt(m.f1,3)}</strong><span>Accuracy ${PG.fmt(m.accuracy,3)} · Balanced ${PG.fmt(m.balanced,3)}</span></div>`;
  const renderSplit=()=>{
    if(!visual)return;const {split,grid}=visual,colors={train:'#4f7cff',val:'#13b8c8',test:'#ef7d32'};
    const points=Object.entries(split).map(([name,rows])=>({x:rows.map(r=>r.x[0]),y:rows.map(r=>r.x[1]),type:'scatter',mode:'markers',name:name[0].toUpperCase()+name.slice(1),marker:{size:7,opacity:.76,color:colors[name],line:{width:.5,color:'#fff'}},text:rows.map(r=>`Class ${r.y}`),hovertemplate:'x1=%{x:.2f}<br>x2=%{y:.2f}<br>%{text}<extra></extra>'}));
    PG.plot($('plSplitPlot'),[...G3.boundaryTraces(grid,simProgress),...points],{title:'Split Geometry with Model',xaxis:{title:'Feature 1',range:[grid.xmin,grid.xmax]},yaxis:{title:'Feature 2',range:[grid.ymin,grid.ymax]},legend:{orientation:'h',x:.5,xanchor:'center',y:1.1}});
  };
  const sim=G3.createSimulationStrip($('plSim'),p=>{simProgress=p;renderSplit();},{maxSteps:10,startAtEnd:true});
  const run=()=>{
    const c=config();$('plStatus').textContent='Building leakage-safe pipeline…';
    try{
      last=G3.pipeline(c);renderPipeline(c);
      $('plMetrics').innerHTML=metricCard('Train',last.trainM)+metricCard('Validation',last.valM)+metricCard('Final test',last.testM)+`<div><small>Features after pipeline</small><strong>${last.featureCount}</strong><span>${last.steps.length} preparation step(s)</span></div><div><small>Training time</small><strong>${PG.fmt(last.ms,2)} ms</strong><span>Browser-side estimate</span></div><div><small>Rows used</small><strong>${last.train.length}/${last.val.length}/${last.test.length}</strong><span>train / validation / test</span></div>`;
      const raw=G3.makeClassification(c.dataset,180,.28,c.seed),split=G3.threeWaySplit(raw,.2,.2,c.seed),vmodel=G3.visualClassifier(split.train,c.model,c.params,c.seed),grid=G3.boundaryGrid(raw,vmodel,50);visual={split,grid};simProgress=1;sim.finish();renderSplit();
      const names=['Train','Validation','Test'];PG.plot($('plScorePlot'),[{x:names,y:[last.trainM.f1,last.valM.f1,last.testM.f1],type:'bar',name:'F1'},{x:names,y:[last.trainM.balanced,last.valM.balanced,last.testM.balanced],type:'bar',name:'Balanced accuracy'}],{barmode:'group',yaxis:{range:[0,1],title:'Score'},title:'Evidence by split'});
      const gap=last.trainM.f1-last.valM.f1;$('plExplain').innerHTML=`<h3>What this run shows</h3><p><strong>${PG.esc(G3.modelName(c.model))}</strong> was fitted after ${last.steps.map(PG.esc).join(' → ')||'no preparation'}. Validation F1 is <strong>${PG.fmt(last.valM.f1,3)}</strong>; the train–validation gap is <strong>${PG.fmt(gap,3)}</strong>. The final held-out test F1 is <strong>${PG.fmt(last.testM.f1,3)}</strong>.</p><p>The left plot deliberately keeps every split observation fixed. The coloured region and separator are a two-feature visual fit for the selected model; the moving diamond is the model-progress indicator. Reset/step/animate changes only the simulation state, not the data points.</p>`;
      $('plStatus').textContent='Pipeline complete. The model separator is shown over the unchanged split geometry.';$('plSave').disabled=false;
    }catch(e){console.error(e);$('plStatus').textContent=`Pipeline error: ${e.message}`;}
  };
  $('plSave').addEventListener('click',()=>{if(!last)return;const c=last.config;G3.saveExperiment({source:'Pipeline Builder',dataset:G3.datasetName(c.dataset),model:G3.modelName(c.model),validation:'Train/validation/test',parameter:{scale:c.scale,engineer:c.engineer,select:c.select,missing:c.missing},trainMetric:last.trainM.f1,validationMetric:last.valM.f1,testMetric:last.testM.f1,notes:`${last.featureCount} final feature(s)`});$('plStatus').textContent='Run saved to Experiment History.';});
  $('plRun').addEventListener('click',run);$('plMissing').addEventListener('input',sync);['plData','plImpute','plScale','plEngineer','plSelect','plModel','plSeed'].forEach(id=>$(id).addEventListener('change',()=>renderPipeline(config())));addEventListener('humach-theme-change',renderSplit);sync();renderPipeline(config());run();
})();
