(() => {
  const PG=window.HumachPG;
  if(!PG)return;
  const G3={};
  const sigmoid=z=>1/(1+Math.exp(-Math.max(-35,Math.min(35,z))));
  G3.sigmoid=sigmoid;
  G3.dot=(a,b)=>a.reduce((s,v,i)=>s+v*(b[i]||0),0);
  G3.distance=(a,b)=>Math.sqrt(a.reduce((s,v,i)=>s+(v-b[i])**2,0));
  G3.cloneRows=rows=>rows.map(r=>({x:[...r.x],y:r.y,id:r.id,raw:r.raw?{...r.raw}:undefined}));

  G3.makeClassification=(kind='moons',n=180,noise=.28,seed=42)=>{
    const r=PG.mulberry32(seed),normal=()=>PG.normal(r),rows=[];
    for(let i=0;i<n;i++){
      const y=i%2;
      let x1,x2;
      if(kind==='linear'){
        x1=normal()*1.25+(y?1.15:-1.15); x2=normal()*1.1+(y?.8:-.8);
      } else if(kind==='xor'){
        const q=Math.floor(r()*4),sx=q%2?1:-1,sy=q<2?1:-1;
        x1=sx*(1.25+Math.abs(normal())*.65)+normal()*noise; x2=sy*(1.25+Math.abs(normal())*.65)+normal()*noise; const lab=(sx*sy<0)?1:0; rows.push({x:[x1,x2],y:lab,id:i}); continue;
      } else if(kind==='circles'){
        const a=r()*Math.PI*2,rad=y?2.2:.85;
        x1=Math.cos(a)*rad+normal()*noise; x2=Math.sin(a)*rad+normal()*noise;
      } else {
        const a=r()*Math.PI;
        if(y===0){x1=Math.cos(a)*1.9+normal()*noise; x2=Math.sin(a)*1.2+normal()*noise;}
        else{x1=1-Math.cos(a)*1.9+normal()*noise; x2=-Math.sin(a)*1.2+.55+normal()*noise;}
      }
      rows.push({x:[x1,x2],y,id:i});
    }
    return PG.shuffle(rows,r);
  };

  G3.datasetName=k=>({moons:'Two moons',linear:'Linear-ish',xor:'XOR',circles:'Concentric rings'}[k]||k);
  G3.splitRows=(rows,test=.2,seed=42,stratify=true)=>{
    const s=PG.splitIndices(rows.length,test,seed,rows.map(r=>r.y),stratify);
    return{train:s.train.map(i=>rows[i]),test:s.test.map(i=>rows[i])};
  };
  G3.threeWaySplit=(rows,test=.2,val=.2,seed=42)=>{
    const a=G3.splitRows(rows,test,seed,true),b=G3.splitRows(a.train,val/(1-test),seed+1,true);
    return{train:b.train,val:b.test,test:a.test};
  };

  G3.fitImputer=(rows)=>{
    const p=rows[0]?.x.length||0,fill=[];
    for(let j=0;j<p;j++){const a=rows.map(r=>r.x[j]).filter(Number.isFinite);fill[j]=a.length?PG.median(a):0;}
    return{fill,transform:rs=>rs.map(r=>({...r,x:r.x.map((v,j)=>Number.isFinite(v)?v:fill[j])}))};
  };
  G3.fitScaler=(rows,method='standard')=>{
    const p=rows[0]?.x.length||0,a=[],b=[];
    for(let j=0;j<p;j++){
      const c=rows.map(r=>r.x[j]);
      if(method==='minmax'){a[j]=Math.min(...c);b[j]=Math.max(...c)-a[j]||1;}
      else if(method==='robust'){a[j]=PG.median(c);b[j]=PG.quantile(c,.75)-PG.quantile(c,.25)||1;}
      else{a[j]=PG.mean(c);b[j]=PG.sd(c)||1;}
    }
    return{a,b,method,transform:rs=>rs.map(r=>({...r,x:r.x.map((v,j)=>(v-a[j])/b[j])}))};
  };
  G3.engineerRows=(rows,mode='none')=>rows.map(r=>{
    const [x1=0,x2=0]=r.x;
    let x=[...r.x];
    if(mode==='interaction')x=[...x,x1*x2];
    if(mode==='quadratic')x=[...x,x1*x1,x2*x2,x1*x2];
    if(mode==='radial')x=[...x,Math.sqrt(x1*x1+x2*x2),x1*x2];
    return{...r,x};
  });
  G3.fitVarianceSelector=(rows,k=null)=>{
    const p=rows[0]?.x.length||0;
    if(!k||k>=p)return{indices:Array.from({length:p},(_,i)=>i),transform:rs=>G3.cloneRows(rs)};
    const vars=Array.from({length:p},(_,j)=>({j,v:Math.pow(PG.sd(rows.map(r=>r.x[j])),2)})).sort((a,b)=>b.v-a.v).slice(0,k).map(z=>z.j).sort((a,b)=>a-b);
    return{indices:vars,transform:rs=>rs.map(r=>({...r,x:vars.map(j=>r.x[j])}))};
  };
  G3.injectMissing=(rows,fraction=.08,seed=42)=>{
    if(!fraction)return G3.cloneRows(rows); const r=PG.mulberry32(seed);
    return rows.map(row=>({...row,x:row.x.map(v=>r()<fraction?NaN:v)}));
  };

  G3.fitLogistic=(rows,opt={})=>{
    const p=rows[0]?.x.length||0,steps=opt.steps||500,lr=opt.lr||.08,lambda=opt.lambda??.002;
    let w=Array(p+1).fill(0);
    for(let it=0;it<steps;it++){
      const g=Array(p+1).fill(0);
      for(const r of rows){const z=w[0]+G3.dot(r.x,w.slice(1)),pr=sigmoid(z),e=pr-r.y;g[0]+=e;for(let j=0;j<p;j++)g[j+1]+=e*r.x[j];}
      w[0]-=lr*g[0]/rows.length;for(let j=1;j<w.length;j++)w[j]-=lr*(g[j]/rows.length+lambda*w[j]);
    }
    return{type:'logistic',w,predict:x=>sigmoid(w[0]+G3.dot(x,w.slice(1)))};
  };
  G3.fitKNN=(rows,opt={})=>{const k=Math.max(1,Math.round(opt.k||7));return{type:'knn',k,predict:x=>{const d=rows.map(r=>[G3.distance(r.x,x),r.y]).sort((a,b)=>a[0]-b[0]).slice(0,Math.min(k,rows.length));return PG.mean(d.map(z=>z[1]));}};};
  G3.fitGaussianNB=(rows)=>{
    const p=rows[0]?.x.length||0,stats=[0,1].map(c=>{const a=rows.filter(r=>r.y===c),mu=[],vr=[];for(let j=0;j<p;j++){const col=a.map(r=>r.x[j]);mu[j]=PG.mean(col);vr[j]=Math.pow(PG.sd(col),2)+1e-5;}return{prior:a.length/rows.length,mu,vr};});
    return{type:'naive-bayes',predict:x=>{const logp=stats.map(s=>Math.log(s.prior||1e-9)+x.reduce((q,v,j)=>q-.5*Math.log(2*Math.PI*s.vr[j])-((v-s.mu[j])**2)/(2*s.vr[j]),0));const m=Math.max(...logp),e=logp.map(v=>Math.exp(v-m));return e[1]/(e[0]+e[1]);}};
  };
  const gini=a=>{if(!a.length)return 0;const p=a.reduce((s,r)=>s+r.y,0)/a.length;return 1-p*p-(1-p)*(1-p);};
  const bestSplit=(rows,features,minLeaf=4)=>{
    const parent=gini(rows);let best=null,imp=Infinity;
    for(const j of features){const vals=rows.map(r=>r.x[j]).sort((a,b)=>a-b);const cuts=[];for(let q=1;q<16;q++){const idx=Math.floor(vals.length*q/16);if(idx>0&&idx<vals.length)cuts.push((vals[idx-1]+vals[idx])/2);}for(const th of cuts){const L=rows.filter(r=>r.x[j]<=th),R=rows.filter(r=>r.x[j]>th);if(L.length<minLeaf||R.length<minLeaf)continue;const z=(L.length*gini(L)+R.length*gini(R))/rows.length;if(z<imp){imp=z;best={j,th,L,R,gain:parent-z};}}}
    return best;
  };
  const buildTree=(rows,depth,maxDepth,minLeaf,featureCount,rand)=>{
    const p1=rows.reduce((s,r)=>s+r.y,0)/Math.max(1,rows.length);if(depth>=maxDepth||rows.length<minLeaf*2||gini(rows)<1e-8)return{leaf:true,p:p1,n:rows.length};
    const p=rows[0].x.length,all=Array.from({length:p},(_,i)=>i);let features=all;
    if(featureCount&&featureCount<p)features=PG.shuffle(all,rand).slice(0,featureCount);
    const s=bestSplit(rows,features,minLeaf);if(!s)return{leaf:true,p:p1,n:rows.length};
    return{leaf:false,p:p1,n:rows.length,j:s.j,th:s.th,gain:s.gain,left:buildTree(s.L,depth+1,maxDepth,minLeaf,featureCount,rand),right:buildTree(s.R,depth+1,maxDepth,minLeaf,featureCount,rand)};
  };
  const treeScore=(t,x)=>{let n=t;while(n&&!n.leaf)n=x[n.j]<=n.th?n.left:n.right;return n?.p??.5;};
  G3.fitTree=(rows,opt={})=>{const rand=PG.mulberry32(opt.seed||42),tree=buildTree(rows,0,opt.depth||4,opt.minLeaf||4,null,rand);return{type:'tree',tree,predict:x=>treeScore(tree,x)};};
  G3.fitForest=(rows,opt={})=>{const n=opt.trees||31,depth=opt.depth||5,r=PG.mulberry32(opt.seed||42),trees=[],p=rows[0].x.length,mtry=Math.max(1,Math.round(Math.sqrt(p)));for(let t=0;t<n;t++){const samp=Array.from({length:rows.length},()=>rows[Math.floor(r()*rows.length)]);trees.push(buildTree(samp,0,depth,opt.minLeaf||3,mtry,r));}return{type:'forest',trees,predict:x=>PG.mean(trees.map(t=>treeScore(t,x)))};};
  G3.fitLinearSVM=(rows,opt={})=>{
    const p=rows[0]?.x.length||0,steps=opt.steps||450,lr=opt.lr||.03,C=opt.C||1;let w=Array(p).fill(0),b=0;
    for(let it=0;it<steps;it++)for(const r of rows){const yy=r.y?1:-1,margin=yy*(G3.dot(w,r.x)+b);for(let j=0;j<p;j++)w[j]-=lr*(w[j]/rows.length-(margin<1?C*yy*r.x[j]/rows.length:0));if(margin<1)b+=lr*C*yy/rows.length;}
    return{type:'svm',w,b,predict:x=>sigmoid(G3.dot(w,x)+b)};
  };
  G3.fitModel=(name,rows,opt={})=>{
    if(name==='knn')return G3.fitKNN(rows,opt);if(name==='tree')return G3.fitTree(rows,opt);if(name==='forest')return G3.fitForest(rows,opt);if(name==='svm')return G3.fitLinearSVM(rows,opt);if(name==='nb')return G3.fitGaussianNB(rows);return G3.fitLogistic(rows,opt);
  };
  G3.modelName=n=>({logistic:'Logistic Regression',knn:'KNN',tree:'Decision Tree',forest:'Random Forest',svm:'Linear SVM',nb:'Gaussian Naive Bayes'}[n]||n);
  G3.evaluate=(model,rows,thr=.5)=>{
    const score=rows.map(r=>model.predict(r.x)),m=PG.binaryMetrics(rows.map(r=>r.y),score,thr);return{...m,score};
  };

  G3.pipeline=(config={})=>{
    let rows=G3.makeClassification(config.dataset||'moons',config.n||180,config.noise??.28,config.seed||42);
    rows=G3.injectMissing(rows,config.missing??.06,(config.seed||42)+7);
    const split=G3.threeWaySplit(rows,config.test??.2,config.val??.2,config.seed||42);
    let train=split.train,val=split.val,test=split.test,steps=[];
    if(config.impute!==false){const im=G3.fitImputer(train);train=im.transform(train);val=im.transform(val);test=im.transform(test);steps.push('Median imputation');}
    else{const drop=rs=>rs.filter(r=>r.x.every(Number.isFinite));train=drop(train);val=drop(val);test=drop(test);steps.push('Drop missing rows');}
    if(config.scale&&config.scale!=='none'){const sc=G3.fitScaler(train,config.scale);train=sc.transform(train);val=sc.transform(val);test=sc.transform(test);steps.push(`${config.scale} scaling`);}
    if(config.engineer&&config.engineer!=='none'){train=G3.engineerRows(train,config.engineer);val=G3.engineerRows(val,config.engineer);test=G3.engineerRows(test,config.engineer);steps.push(`${config.engineer} features`);}
    if(config.select&&config.select!=='all'){const k=Math.max(1,Math.min(Number(config.select),train[0]?.x.length||1)),sel=G3.fitVarianceSelector(train,k);train=sel.transform(train);val=sel.transform(val);test=sel.transform(test);steps.push(`Top ${k} variance features`);}
    const t0=performance.now(),model=G3.fitModel(config.model||'logistic',train,config.params||{}),ms=performance.now()-t0;
    const trainM=G3.evaluate(model,train),valM=G3.evaluate(model,val),testM=G3.evaluate(model,test);
    return{config,train,val,test,model,trainM,valM,testM,ms,steps,featureCount:train[0]?.x.length||0};
  };

  G3.makeFolds=(rows,method='stratified',k=5,seed=42)=>{
    const r=PG.mulberry32(seed),n=rows.length;
    if(method==='loo')return Array.from({length:n},(_,i)=>({train:Array.from({length:n},(_,j)=>j).filter(j=>j!==i),test:[i]}));
    if(method==='holdout'){const s=PG.splitIndices(n,1/k,seed,rows.map(r=>r.y),true);return[{train:s.train,test:s.test}];}
    const folds=Array.from({length:k},()=>[]);
    if(method==='stratified'){
      [0,1].forEach(c=>PG.shuffle(rows.map((r,i)=>[r,i]).filter(([x])=>x.y===c).map(([,i])=>i),r).forEach((idx,j)=>folds[j%k].push(idx)));
    } else PG.shuffle(Array.from({length:n},(_,i)=>i),r).forEach((idx,j)=>folds[j%k].push(idx));
    return folds.map(test=>{const set=new Set(test);return{test:[...test].sort((a,b)=>a-b),train:Array.from({length:n},(_,i)=>i).filter(i=>!set.has(i))};});
  };
  G3.crossValidate=(rows,method='stratified',k=5,modelName='logistic',params={},seed=42)=>{
    const folds=G3.makeFolds(rows,method,k,seed),scores=[],oofY=[],oofScore=[];
    folds.forEach((f,i)=>{let tr=f.train.map(j=>rows[j]),te=f.test.map(j=>rows[j]);const sc=G3.fitScaler(tr,'standard');tr=sc.transform(tr);te=sc.transform(te);const model=G3.fitModel(modelName,tr,{...params,seed:seed+i}),m=G3.evaluate(model,te);scores.push({...m,fold:i+1,nTrain:tr.length,nTest:te.length});oofY.push(...te.map(r=>r.y));oofScore.push(...m.score);});
    const pooled=PG.binaryMetrics(oofY,oofScore,.5);
    return{folds,scores,pooled,meanF1:method==='loo'?pooled.f1:PG.mean(scores.map(s=>s.f1)),sdF1:method==='loo'?NaN:PG.sd(scores.map(s=>s.f1)),meanAcc:method==='loo'?pooled.accuracy:PG.mean(scores.map(s=>s.accuracy))};
  };

  G3.paramSpec=model=>({
    knn:{key:'k',label:'k neighbours',min:1,max:25,step:2,default:7,grid:[1,3,5,7,9,11,15,19,25]},
    tree:{key:'depth',label:'max depth',min:1,max:10,step:1,default:4,grid:[1,2,3,4,5,6,8,10]},
    forest:{key:'trees',label:'number of trees',min:5,max:81,step:4,default:31,grid:[5,9,17,25,33,49,65,81]},
    logistic:{key:'lambda',label:'L2 penalty λ',min:0,max:.08,step:.005,default:.005,grid:[0,.001,.003,.005,.01,.02,.04,.08]},
    svm:{key:'C',label:'C',min:.1,max:4,step:.1,default:1,grid:[.1,.25,.5,1,1.5,2,3,4]},
    nb:{key:'none',label:'No tunable parameter',min:0,max:0,step:1,default:0,grid:[0]}
  }[model]||{key:'k',label:'parameter',min:1,max:10,step:1,default:5,grid:[1,3,5,7,9]});
  G3.validationCurve=(rows,modelName,seed=42)=>{
    const spec=G3.paramSpec(modelName),split=G3.threeWaySplit(rows,.2,.2,seed),sc=G3.fitScaler(split.train,'standard'),tr=sc.transform(split.train),va=sc.transform(split.val),te=sc.transform(split.test),points=[];
    spec.grid.forEach(v=>{const params=spec.key==='none'?{}:{[spec.key]:v},m=G3.fitModel(modelName,tr,{...params,seed}),a=G3.evaluate(m,tr),b=G3.evaluate(m,va);points.push({value:v,train:a.f1,val:b.f1});});
    const best=points.reduce((a,b)=>b.val>a.val?b:a,points[0]);
    return{spec,points,best,split:{train:tr,val:va,test:te}};
  };

  G3.makeRegression=(n=120,noise=3.5,seed=42)=>{const r=PG.mulberry32(seed),rows=[];for(let i=0;i<n;i++){const x=-3.4+6.8*r(),y=4+2.1*x+1.8*x*x-.46*x*x*x+PG.normal(r)*noise;rows.push({x,y});}return rows;};
  G3.polyFeatures=(x,d)=>Array.from({length:d},(_,i)=>x**(i+1));
  G3.fitPolynomial=(rows,degree,lambda=1e-8)=>{const beta=PG.fitLinearRegression(rows.map(r=>G3.polyFeatures(r.x,degree)),rows.map(r=>r.y),lambda);return{beta,predict:x=>PG.predictLinear([G3.polyFeatures(x,degree)],beta)[0]};};
  G3.regMetrics=(model,rows)=>{const y=rows.map(r=>r.y),p=rows.map(r=>model.predict(r.x)),rmse=PG.rmse(y,p);return{rmse,r2:PG.r2(y,p)};};
  G3.complexityCurve=(rows,maxDegree=12,seed=42)=>{
    const r=PG.mulberry32(seed),s=PG.shuffle(rows,r),cut=Math.max(10,Math.round(s.length*.68)),train=s.slice(0,cut),val=s.slice(cut),points=[];
    for(let d=1;d<=maxDegree;d++){const m=G3.fitPolynomial(train,d,1e-7),a=G3.regMetrics(m,train),b=G3.regMetrics(m,val);points.push({degree:d,train:a.rmse,val:b.rmse});}
    return{train,val,points};
  };
  G3.learningCurve=(train,val,degree)=>{
    const fracs=[.15,.25,.4,.55,.7,.85,1],points=[];
    for(const f of fracs){const n=Math.max(degree+2,Math.round(train.length*f)),sub=train.slice(0,Math.min(n,train.length));if(sub.length<=degree+1)continue;const m=G3.fitPolynomial(sub,degree,1e-7);points.push({n:sub.length,train:G3.regMetrics(m,sub).rmse,val:G3.regMetrics(m,val).rmse});}
    return points;
  };

  G3.visualClassifier=(rows,modelName='logistic',params={},seed=42)=>{
    const sc=G3.fitScaler(rows,'standard'),tr=sc.transform(rows),model=G3.fitModel(modelName,tr,{...params,seed});
    return{model,sc,predict:(x1,x2)=>model.predict(sc.transform([{x:[x1,x2],y:0}])[0].x)};
  };
  G3.boundaryGrid=(rows,visual,n=48)=>{
    const xs0=rows.map(r=>r.x[0]),ys0=rows.map(r=>r.x[1]),pad=.45,
      xmin=Math.min(...xs0)-pad,xmax=Math.max(...xs0)+pad,ymin=Math.min(...ys0)-pad,ymax=Math.max(...ys0)+pad,
      xs=Array.from({length:n},(_,i)=>xmin+(xmax-xmin)*i/(n-1)),ys=Array.from({length:n},(_,i)=>ymin+(ymax-ymin)*i/(n-1)),
      z=ys.map(y=>xs.map(x=>visual.predict(x,y)));
    return{xs,ys,z,xmin,xmax,ymin,ymax};
  };
  G3.boundaryTraces=(grid,progress=1)=>{
    const p=Math.max(0,Math.min(1,progress)),tr=[];
    if(p>0){
      tr.push({x:grid.xs,y:grid.ys,z:grid.z,type:'contour',name:'Predicted region',showscale:false,hoverinfo:'skip',opacity:.10+.12*p,colorscale:[[0,'#4f7cff'],[.499,'#4f7cff'],[.5,'#ef7d32'],[1,'#ef7d32']],contours:{start:0,end:1,size:1,coloring:'heatmap',showlines:false},showlegend:false});
      tr.push({x:grid.xs,y:grid.ys,z:grid.z,type:'contour',name:'Model separator',showscale:false,hoverinfo:'skip',contours:{start:.5,end:.5,size:1,coloring:'lines'},line:{color:document.documentElement.dataset.theme==='dark'?'#f8fafc':'#111827',width:2+2*p}});
      const ci=Math.min(grid.xs.length-1,Math.max(0,Math.round(p*(grid.xs.length-1)))),x=grid.xs[ci];let bestY=grid.ys[0],best=Infinity;
      grid.ys.forEach((y,j)=>{const d=Math.abs(grid.z[j][ci]-.5);if(d<best){best=d;bestY=y;}});
      tr.push({x:[x],y:[bestY],type:'scatter',mode:'markers',name:'Training indicator',marker:{size:13,symbol:'diamond',color:'#8b5cf6',line:{width:2,color:'#fff'}},hovertemplate:'Model indicator<extra></extra>'});
    }
    return tr;
  };
  G3.createSimulationStrip=(host,onChange,opt={})=>{
    if(!host)return null;const max=opt.maxSteps||10;let step=opt.startAtEnd?max:0,timer=null;
    host.classList.add('pg-sim-strip');host.innerHTML=`<div class="pg-sim-controls"><button class="btn btn-secondary" data-sim-reset type="button">Reset view</button><button class="btn btn-secondary" data-sim-step type="button">Train step</button><button class="btn btn-primary" data-sim-play type="button">Animate</button></div><div class="pg-sim-state"><span data-sim-label>Step ${step} / ${max}</span><div class="pg-sim-track"><span data-sim-fill></span><i data-sim-dot></i></div></div>`;
    const label=host.querySelector('[data-sim-label]'),fill=host.querySelector('[data-sim-fill]'),dot=host.querySelector('[data-sim-dot]'),play=host.querySelector('[data-sim-play]');
    const paint=()=>{const p=step/max;label.textContent=`Step ${step} / ${max}`;fill.style.width=`${p*100}%`;dot.style.left=`calc(${p*100}% - 7px)`;onChange(p,step,max);};
    const stop=()=>{if(timer){clearTimeout(timer);timer=null;}play.textContent='Animate';};
    host.querySelector('[data-sim-reset]').addEventListener('click',()=>{stop();step=0;paint();});
    host.querySelector('[data-sim-step]').addEventListener('click',()=>{stop();step=Math.min(max,step+1);paint();});
    play.addEventListener('click',()=>{if(timer){stop();return;}if(step>=max)step=0;play.textContent='Pause';const tick=()=>{paint();if(step>=max){stop();return;}step++;timer=setTimeout(tick,opt.delay||220);};tick();});
    paint();return{reset(){stop();step=0;paint();},finish(){stop();step=max;paint();},setStep(v){stop();step=Math.max(0,Math.min(max,v));paint();}};
  };

  G3.foldEvaluation=(rows,fold,modelName='logistic',params={},seed=42)=>{
    const rawTrain=fold.train.map(i=>rows[i]),rawTest=fold.test.map(i=>rows[i]),sc=G3.fitScaler(rawTrain,'standard'),train=sc.transform(rawTrain),test=sc.transform(rawTest),model=G3.fitModel(modelName,train,{...params,seed}),metrics=G3.evaluate(model,test);
    return{rawTrain,rawTest,train,test,model,metrics,visual:{predict:(x1,x2)=>model.predict(sc.transform([{x:[x1,x2],y:0}])[0].x)}};
  };

  G3.historyKey='humachlearn-v7-experiment-history';
  G3.loadHistory=()=>{try{const x=JSON.parse(localStorage.getItem(G3.historyKey)||'[]');return Array.isArray(x)?x:[];}catch(e){return[];}};
  G3.saveExperiment=run=>{const h=G3.loadHistory(),entry={id:`exp-${Date.now()}-${Math.floor(Math.random()*9999)}`,createdAt:new Date().toISOString(),...run};h.unshift(entry);localStorage.setItem(G3.historyKey,JSON.stringify(h.slice(0,100)));return entry;};
  G3.deleteExperiment=id=>{const h=G3.loadHistory().filter(x=>x.id!==id);localStorage.setItem(G3.historyKey,JSON.stringify(h));return h;};
  G3.clearHistory=()=>localStorage.removeItem(G3.historyKey);
  G3.download=(name,text,type='text/plain')=>{const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),250);};
  G3.csvEscape=v=>`"${String(v??'').replace(/"/g,'""')}"`;
  G3.exportHistoryCSV=rows=>{const cols=['id','createdAt','source','dataset','model','validation','parameter','trainMetric','validationMetric','testMetric','notes'];return[cols.join(','),...rows.map(r=>cols.map(c=>G3.csvEscape(typeof r[c]==='object'?JSON.stringify(r[c]):r[c])).join(','))].join('\n');};

  window.HumachPG3=G3;
})();
