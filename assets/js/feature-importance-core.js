(() => {
  const PG=window.HumachPG,G3=window.HumachPG3;
  if(!PG||!G3)return;
  const FI={};

  const logGamma=z=>{
    const c=[676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.984369578019571e-6,1.5056327351493116e-7];
    if(z<.5)return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);
    z-=1;let x=.9999999999998099;for(let i=0;i<c.length;i++)x+=c[i]/(z+i+1);const t=z+c.length-.5;return .5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(x);
  };
  const betaCF=(a,b,x)=>{
    const MAX=220,EPS=3e-12,FPMIN=1e-30;let qab=a+b,qap=a+1,qam=a-1,c=1,d=1-qab*x/qap;if(Math.abs(d)<FPMIN)d=FPMIN;d=1/d;let h=d;
    for(let m=1;m<=MAX;m++){
      const m2=2*m;let aa=m*(b-m)*x/((qam+m2)*(a+m2));d=1+aa*d;if(Math.abs(d)<FPMIN)d=FPMIN;c=1+aa/c;if(Math.abs(c)<FPMIN)c=FPMIN;d=1/d;h*=d*c;
      aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2));d=1+aa*d;if(Math.abs(d)<FPMIN)d=FPMIN;c=1+aa/c;if(Math.abs(c)<FPMIN)c=FPMIN;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<EPS)break;
    }return h;
  };
  FI.regularizedBeta=(x,a,b)=>{if(x<=0)return 0;if(x>=1)return 1;const bt=Math.exp(logGamma(a+b)-logGamma(a)-logGamma(b)+a*Math.log(x)+b*Math.log(1-x));return x<(a+1)/(a+b+2)?bt*betaCF(a,b,x)/a:1-bt*betaCF(b,a,1-x)/b;};
  FI.tTwoSidedP=(t,df)=>{if(!Number.isFinite(t)||!Number.isFinite(df)||df<=0)return 1;const x=df/(df+t*t);return Math.max(0,Math.min(1,FI.regularizedBeta(x,df/2,.5)));};
  FI.welch=(a,b)=>{
    a=a.filter(Number.isFinite);b=b.filter(Number.isFinite);if(a.length<2||b.length<2)return{t:0,df:0,p:1,mean0:PG.mean(a),mean1:PG.mean(b),effect:0};
    const m0=PG.mean(a),m1=PG.mean(b),v0=PG.sd(a)**2,v1=PG.sd(b)**2,se2=v0/a.length+v1/b.length,t=se2?((m1-m0)/Math.sqrt(se2)):0,df=se2?se2*se2/((v0*v0)/(a.length*a.length*(a.length-1))+(v1*v1)/(b.length*b.length*(b.length-1))):0,p=FI.tTwoSidedP(Math.abs(t),df),pooled=Math.sqrt(((a.length-1)*v0+(b.length-1)*v1)/Math.max(1,a.length+b.length-2))||1;
    return{t,df,p,mean0:m0,mean1:m1,effect:(m1-m0)/pooled};
  };
  FI.rocAuc=(labels,scores)=>{
    const pairs=scores.map((s,i)=>({s:Number(s),y:Number(labels[i]),i})).filter(z=>Number.isFinite(z.s)&&(z.y===0||z.y===1)).sort((a,b)=>a.s-b.s);if(!pairs.length)return .5;
    let rank=1,sumPos=0,nPos=0,nNeg=0;
    for(let i=0;i<pairs.length;){let j=i+1;while(j<pairs.length&&pairs[j].s===pairs[i].s)j++;const avg=(rank+(rank+(j-i)-1))/2;for(let k=i;k<j;k++){if(pairs[k].y===1){sumPos+=avg;nPos++;}else nNeg++;}rank+=j-i;i=j;}
    if(!nPos||!nNeg)return .5;return (sumPos-nPos*(nPos+1)/2)/(nPos*nNeg);
  };
  FI.featureScreen=(rows,names=[])=>{
    const p=rows[0]?.x.length||0,labels=rows.map(r=>r.y),out=[];
    for(let j=0;j<p;j++){
      const a=rows.filter(r=>r.y===0).map(r=>r.x[j]),b=rows.filter(r=>r.y===1).map(r=>r.x[j]),w=FI.welch(a,b),auc=FI.rocAuc(labels,rows.map(r=>r.x[j])),adj=Math.max(auc,1-auc);
      out.push({feature:j,name:names[j]||`Feature ${j+1}`,...w,auc,aucAdjusted:adj,aucImportance:Math.max(0,(adj-.5)*2),significant:w.p<.05});
    }
    return out;
  };
  FI.coefficientImportance=(model,names=[])=>{
    if(!model?.w||model.w.length<2)return[];const vals=model.w.slice(1).map((v,j)=>({feature:j,name:names[j]||`Feature ${j+1}`,coefficient:v,importance:Math.abs(v)}));return vals.sort((a,b)=>b.importance-a.importance);
  };
  FI.permutation=(model,rows,names=[],seed=42)=>{
    const labels=rows.map(r=>r.y),baseEval=G3.evaluate(model,rows),base=baseEval.f1,baseAuc=FI.rocAuc(labels,baseEval.score),r=PG.mulberry32(seed),p=rows[0]?.x.length||0,out=[];
    for(let j=0;j<p;j++){
      const vals=PG.shuffle(rows.map(x=>x.x[j]),r),sh=rows.map((row,i)=>({...row,x:row.x.map((v,k)=>k===j?vals[i]:v)})),ev=G3.evaluate(model,sh),auc=FI.rocAuc(labels,ev.score);
      out.push({feature:j,name:names[j]||`Feature ${j+1}`,base,score:ev.f1,drop:base-ev.f1,baseAuc,auc,aucDrop:baseAuc-auc});
    }
    return out.sort((a,b)=>b.aucDrop-a.aucDrop||b.drop-a.drop);
  };
  const subsetRows=(rows,idx)=>rows.map(r=>({...r,x:idx.map(j=>r.x[j])}));
  FI.rfe=(train,val,names=[],opt={})=>{
    let active=Array.from({length:train[0]?.x.length||0},(_,i)=>i),steps=[],rank=Array(active.length).fill(null),round=1;
    while(active.length){
      const tr=subsetRows(train,active),va=subsetRows(val,active),model=G3.fitLogistic(tr,{steps:opt.steps||500,lr:opt.lr||.08,lambda:opt.lambda??.003}),metric=G3.evaluate(model,va),coef=model.w.slice(1).map(Math.abs),min=Math.min(...coef),dropLocal=coef.indexOf(min),dropFeature=active[dropLocal];
      steps.push({round,features:[...active],names:active.map(j=>names[j]||`Feature ${j+1}`),score:metric.f1,dropFeature,dropName:names[dropFeature]||`Feature ${dropFeature+1}`,dropImportance:min});
      rank[dropFeature]=active.length;active=active.filter((_,i)=>i!==dropLocal);round++;
    }
    const best=[...steps].sort((a,b)=>b.score-a.score||a.features.length-b.features.length)[0]||null;
    return{steps,rank,best};
  };
  FI.methodSummary=(screen,perm,rfe)=>screen.map(s=>({
    ...s,
    permutation:perm.find(p=>p.feature===s.feature)?.drop??0,
    rfeRank:rfe?.rank?.[s.feature]??null
  }));
  window.HumachFeatureImportance=FI;
})();
