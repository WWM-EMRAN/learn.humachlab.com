(() => {
  const PG=window.HumachPG,G3=window.HumachPG3,G4=window.HumachPG4,FI=window.HumachFeatureImportance;
  if(!PG||!G3||!G4||!FI)return;
  const $=PG.$;let state=null;
  const names=['Signal A','Signal B','Noise feature','Redundant A'];
  const defaults={logistic:{lambda:.004},tree:{depth:4},forest:{trees:41,depth:5}};

  function featureEvidenceTable(screen,imp,rfe,coef){
    const permMap=new Map(imp.map(z=>[z.feature,{f1:z.drop,auc:z.aucDrop}])),coefMap=new Map((coef||[]).map(z=>[z.feature,z.importance]));
    const rows=screen.map(s=>({
      Feature:names[s.feature],
      'Welch t':PG.fmt(s.t,3),
      'p-value':s.p<.0001?s.p.toExponential(2):PG.fmt(s.p,4),
      Significant:s.p<.05?'Yes':'No',
      'Adj. AUC':PG.fmt(s.aucAdjusted,3),
      'AUC importance':PG.fmt(s.aucImportance,3),
      'Permutation ΔF1':PG.fmt(permMap.get(s.feature)?.f1??0,3),'Permutation ΔAUC':PG.fmt(permMap.get(s.feature)?.auc??0,3),
      'Std. |coef|':coefMap.has(s.feature)?PG.fmt(coefMap.get(s.feature),3):'—',
      'RFE rank':rfe.rank[s.feature]
    }));
    PG.renderTable($('xaFeatureTable'),rows,Object.keys(rows[0]||{}),20);
  }

  function render(){
    const seed=+$('xaSeed').value||42,modelName=$('xaModel').value,rows=G4.explainData(240,seed),sp=G3.splitRows(rows,.28,seed,true),sc=G3.fitScaler(sp.train,'standard'),tr=sc.transform(sp.train),te=sc.transform(sp.test),model=G3.fitModel(modelName,tr,{...defaults[modelName],seed}),met=G3.evaluate(model,te),imp=FI.permutation(model,te,names,seed+2),idx=Math.min(te.length-1,+$('xaRow').value),row=te[idx],rawRow=sp.test[idx],loc=G4.localEffects(model,tr,row),screen=FI.featureScreen(sp.train,names),coef=modelName==='logistic'?FI.coefficientImportance(model,names):[];
    const rfeSplit=G3.splitRows(sp.train,.25,seed+11,true),rfeScaler=G3.fitScaler(rfeSplit.train,'standard'),rfeTrain=rfeScaler.transform(rfeSplit.train),rfeVal=rfeScaler.transform(rfeSplit.test),rfe=FI.rfe(rfeTrain,rfeVal,names,{lambda:.004});
    $('xaRow').max=te.length-1;$('xaRowOut').textContent=idx;state={rows,sp,sc,tr,te,model,met,imp,idx,row,rawRow,loc,modelName,seed,screen,rfe,coef};

    const bestP=[...screen].sort((a,b)=>a.p-b.p)[0],bestA=[...screen].sort((a,b)=>b.aucAdjusted-a.aucAdjusted)[0],bestRfe=rfe.best;
    $('xaSummary').innerHTML=`<div><small>Model</small><strong>${PG.esc(G3.modelName(modelName))}</strong><span>Held-out F1 ${PG.fmt(met.f1,3)}</span></div><div><small>Prediction</small><strong>${loc.base>=.5?'Class 1':'Class 0'}</strong><span>Probability ${PG.fmt(loc.base,3)}</span></div><div><small>Smallest p-value</small><strong>${PG.esc(names[bestP.feature])}</strong><span>${bestP.p<.0001?bestP.p.toExponential(2):PG.fmt(bestP.p,4)}</span></div><div><small>Best univariate AUC</small><strong>${PG.esc(names[bestA.feature])}</strong><span>Adjusted AUC ${PG.fmt(bestA.aucAdjusted,3)}</span></div><div><small>Top AUC reliance</small><strong>${PG.esc(names[imp[0].feature])}</strong><span>ΔAUC ${PG.fmt(imp[0].aucDrop,3)}</span></div><div><small>Best RFE subset</small><strong>${bestRfe?.features.length||0} feature${bestRfe?.features.length===1?'':'s'}</strong><span>Validation F1 ${PG.fmt(bestRfe?.score,3)}</span></div>`;

    featureEvidenceTable(screen,imp,rfe,coef);
    const pv=screen.map(s=>Math.min(12,-Math.log10(Math.max(1e-12,s.p))));
    PG.plot($('xaPValues'),[{x:pv,y:screen.map(s=>s.name),type:'bar',orientation:'h',text:screen.map(s=>s.p<.0001?s.p.toExponential(1):s.p.toFixed(4)),textposition:'auto'}],{xaxis:{title:'−log10(p-value)'},margin:{l:120},title:'Welch t-test evidence',shapes:[{type:'line',x0:-Math.log10(.05),x1:-Math.log10(.05),y0:-.5,y1:screen.length-.5,line:{dash:'dash',width:2}}],annotations:[{x:-Math.log10(.05),y:screen.length-.15,text:'p = 0.05',showarrow:false,xanchor:'left'}]});
    PG.plot($('xaAuc'),[{x:screen.map(s=>s.aucAdjusted),y:screen.map(s=>s.name),type:'bar',orientation:'h',text:screen.map(s=>s.aucAdjusted.toFixed(3)),textposition:'auto'}],{xaxis:{title:'Direction-adjusted ROC-AUC',range:[.5,1]},margin:{l:120},title:'One-feature discrimination',shapes:[{type:'line',x0:.5,x1:.5,y0:-.5,y1:screen.length-.5,line:{dash:'dash',width:2}}]});
    const rfeSteps=[...rfe.steps].reverse();
    PG.plot($('xaRfe'),[{x:rfeSteps.map(z=>z.features.length),y:rfeSteps.map(z=>z.score),type:'scatter',mode:'lines+markers',name:'Validation F1',text:rfeSteps.map(z=>z.names.join(', ')),hovertemplate:'%{x} feature(s)<br>Validation F1 %{y:.3f}<br>%{text}<extra></extra>'}],{xaxis:{title:'Features retained',dtick:1},yaxis:{title:'Validation F1',range:[0,1]},title:'RFE subset path'});
    const rfeRows=rfe.steps.map(z=>({Round:z.round,'Features retained':z.names.join(', '),'Validation F1':PG.fmt(z.score,3),'Removed next':z.dropName,'RFE rank':rfe.rank[z.dropFeature]}));
    PG.renderTable($('xaRfeTable'),rfeRows,Object.keys(rfeRows[0]||{}),20);

    PG.plot($('xaImportance'),[{x:imp.map(z=>Math.max(0,z.aucDrop)),y:imp.map(z=>names[z.feature]),type:'bar',orientation:'h',name:'Δ ROC-AUC',text:imp.map(z=>z.aucDrop.toFixed(3)),textposition:'auto'},{x:imp.map(z=>Math.max(0,z.drop)),y:imp.map(z=>names[z.feature]),type:'bar',orientation:'h',name:'Δ F1'}],{barmode:'group',xaxis:{title:'Held-out performance drop after permutation'},margin:{l:120},title:'Permutation importance — AUC and F1 reliance'});
    const mx=Math.max(...loc.effects.map(e=>Math.abs(e.effect)),.01);$('xaLocal').innerHTML=loc.effects.map(e=>`<div class="pg-explain-row"><strong>${PG.esc(names[e.feature])}</strong><div class="pg-importance-bar"><span style="width:${100*Math.abs(e.effect)/mx}%;margin-left:${e.effect<0?'auto':'0'}"></span></div><span>${e.effect>=0?'+':''}${PG.fmt(e.effect,3)}</span></div>`).join('')+`<div class="pg-note"><strong>Local baseline:</strong> each feature is replaced by its training median one at a time. Effect = original probability − counterfactual probability.</div>`;
    const rawTrain=sp.train,med3=PG.median(rawTrain.map(r=>r.x[2])),med4=PG.median(rawTrain.map(r=>r.x[3])),visual={predict:(x1,x2)=>model.predict(sc.transform([{x:[x1,x2,med3,med4],y:0}])[0].x)},grid=G3.boundaryGrid(rawTrain,visual,50);
    PG.plot($('xaBoundary'),[...G3.boundaryTraces(grid,1),{x:rawTrain.map(r=>r.x[0]),y:rawTrain.map(r=>r.x[1]),type:'scatter',mode:'markers',name:'Training',marker:{size:7,opacity:.5,color:rawTrain.map(r=>r.y),colorscale:[[0,'#4f7cff'],[1,'#ef7d32']],cmin:0,cmax:1}},{x:[rawRow.x[0]],y:[rawRow.x[1]],type:'scatter',mode:'markers',name:'Explained observation',marker:{size:18,symbol:'star',color:'#8b5cf6',line:{width:2,color:'#fff'}}}],{title:'2D separator slice (other features held at training medians)',xaxis:{title:'Signal A',range:[grid.xmin,grid.xmax]},yaxis:{title:'Signal B',range:[grid.ymin,grid.ymax]}});
    $('xaExplain').innerHTML=`<h3>Interpret the methods together</h3><p><strong>p-values</strong> test a distributional question, <strong>univariate AUC</strong> tests one-feature ranking ability, <strong>permutation importance</strong> tests model reliance, <strong>RFE</strong> searches a model-specific subset, and the <strong>local counterfactual</strong> describes one prediction. Agreement strengthens a story; disagreement is often more informative. None of these alone establishes causality.</p>`;
    $('xaStatus').textContent='Feature screening, AUC importance, model reliance, RFE and local explanation rebuilt from the same data-generating process.';
  }
  $('xaRun').addEventListener('click',render);$('xaModel').addEventListener('change',render);$('xaRow').addEventListener('input',()=>{if(state)render();});$('xaNext').addEventListener('click',()=>{$('xaRow').value=(+$('xaRow').value+1)%(+$('xaRow').max+1);render();});render();
})();
