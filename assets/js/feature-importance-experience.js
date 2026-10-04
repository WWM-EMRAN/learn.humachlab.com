(() => {
  const PG=window.HumachPG,G3=window.HumachPG3,G4=window.HumachPG4,FI=window.HumachFeatureImportance;
  if(!PG||!G3||!G4||!FI||!PG.$('fiExpRun'))return;
  const $=PG.$,names=['Signal A','Signal B','Noise feature','Redundant A'],opts={logistic:{lambda:.004},tree:{depth:4},forest:{trees:41,depth:5}};
  function render(){
    const seed=+$('fiExpSeed').value||42,name=$('fiExpModel').value,rows=G4.explainData(220,seed),sp=G3.splitRows(rows,.28,seed,true),sc=G3.fitScaler(sp.train,'standard'),tr=sc.transform(sp.train),te=sc.transform(sp.test),model=G3.fitModel(name,tr,{...opts[name],seed}),screen=FI.featureScreen(sp.train,names),perm=FI.permutation(model,te,names,seed+5),rfeSplit=G3.splitRows(sp.train,.25,seed+8,true),rsc=G3.fitScaler(rfeSplit.train,'standard'),rfe=FI.rfe(rsc.transform(rfeSplit.train),rsc.transform(rfeSplit.test),names,{lambda:.004}),bestP=[...screen].sort((a,b)=>a.p-b.p)[0],bestA=[...screen].sort((a,b)=>b.aucAdjusted-a.aucAdjusted)[0];
    $('fiExpSummary').innerHTML=`<div><small>Smallest p-value</small><strong>${PG.esc(bestP.name)}</strong><span>${bestP.p<.0001?bestP.p.toExponential(2):PG.fmt(bestP.p,4)}</span></div><div><small>Best feature AUC</small><strong>${PG.esc(bestA.name)}</strong><span>${PG.fmt(bestA.aucAdjusted,3)}</span></div><div><small>Top AUC reliance</small><strong>${PG.esc(perm[0].name)}</strong><span>ΔAUC ${PG.fmt(perm[0].aucDrop,3)}</span></div><div><small>Best RFE subset</small><strong>${rfe.best?.features.length||0} feature${rfe.best?.features.length===1?'':'s'}</strong><span>Val F1 ${PG.fmt(rfe.best?.score,3)}</span></div>`;
    const pv=screen.map(s=>Math.min(12,-Math.log10(Math.max(1e-12,s.p))));
    PG.plot($('fiExpP'),[{x:pv,y:screen.map(s=>s.name),type:'bar',orientation:'h'}],{margin:{l:120},xaxis:{title:'−log10(p)'},shapes:[{type:'line',x0:-Math.log10(.05),x1:-Math.log10(.05),y0:-.5,y1:screen.length-.5,line:{dash:'dash'}}]});
    PG.plot($('fiExpAuc'),[{x:screen.map(s=>s.aucAdjusted),y:screen.map(s=>s.name),type:'bar',orientation:'h'}],{margin:{l:120},xaxis:{title:'Adjusted ROC-AUC',range:[.5,1]}});
    PG.plot($('fiExpPerm'),[{x:perm.map(z=>Math.max(0,z.aucDrop)),y:perm.map(z=>z.name),type:'bar',orientation:'h',name:'Δ ROC-AUC'},{x:perm.map(z=>Math.max(0,z.drop)),y:perm.map(z=>z.name),type:'bar',orientation:'h',name:'Δ F1'}],{barmode:'group',margin:{l:120},xaxis:{title:'Held-out performance drop'}});
    const steps=[...rfe.steps].reverse();PG.plot($('fiExpRfe'),[{x:steps.map(z=>z.features.length),y:steps.map(z=>z.score),type:'scatter',mode:'lines+markers'}],{xaxis:{title:'Features retained',dtick:1},yaxis:{title:'Validation F1',range:[0,1]}});
  }
  $('fiExpRun').addEventListener('click',render);$('fiExpModel').addEventListener('change',render);render();
})();
