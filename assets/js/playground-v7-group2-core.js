(() => {
  const PG=window.HumachPG, G2={};
  if(!PG)return;
  const sigmoid=z=>1/(1+Math.exp(-PG.clamp(z,-35,35)));
  G2.sigmoid=sigmoid;
  G2.makeClassData=(kind='linear',n=160,noise=.12,seed=42)=>{
    const r=PG.mulberry32(seed),g=()=>PG.normal(r),rows=[];
    for(let i=0;i<n;i++){
      let x,y,label;
      if(kind==='moons'){
        const c=i%2,t=r()*Math.PI;
        if(c===0){x=2*Math.cos(t)-.65;y=1.35*Math.sin(t)-.2;}else{x=.65-2*Math.cos(t);y=.62-1.35*Math.sin(t);} label=c;
        x+=g()*(.12+noise*.75);y+=g()*(.12+noise*.75);
      }else if(kind==='circles'){
        const c=i%2,t=r()*Math.PI*2,rad=(c?2.55:1.2)+g()*(.12+noise*.55);x=rad*Math.cos(t);y=rad*Math.sin(t);label=c;
      }else if(kind==='xor'){
        x=(r()*2-1)*3.3;y=(r()*2-1)*3.3;label=x*y>0?1:0;x+=g()*noise*.5;y+=g()*noise*.5;
      }else if(kind==='blobs'){
        const c=i%2,mu=c?[1.25,1.05]:[-1.15,-.95];x=mu[0]+g()*(.75+noise);y=mu[1]+g()*(.72+noise);label=c;
      }else{
        x=(r()*2-1)*3.4;y=(r()*2-1)*3.4;label=(.95*x-.62*y+.22*Math.sin(x*1.4)+g()*(.45+noise))>0?1:0;
      }
      if(r()<noise*.12)label=1-label;rows.push({x,y,label});
    }
    return rows;
  };
  G2.classRanges=data=>{const xs=data.map(d=>d.x),ys=data.map(d=>d.y),pad=.65;return{x0:Math.min(...xs)-pad,x1:Math.max(...xs)+pad,y0:Math.min(...ys)-pad,y1:Math.max(...ys)+pad};};
  G2.fitLogistic=(data,steps=220,lr=.08,lambda=.002)=>{
    let w=[0,0,0];for(let s=0;s<steps;s++){let g=[0,0,0];for(const d of data){const p=sigmoid(w[0]+w[1]*d.x+w[2]*d.y),e=p-d.label;g[0]+=e;g[1]+=e*d.x;g[2]+=e*d.y;}w[0]-=lr*g[0]/data.length;w[1]-=lr*(g[1]/data.length+lambda*w[1]);w[2]-=lr*(g[2]/data.length+lambda*w[2]);}return{type:'logistic',w,predict:(x,y)=>sigmoid(w[0]+w[1]*x+w[2]*y)};
  };
  G2.fitLinearSVM=(data,steps=360,lr=.018,C=1)=>{
    let w=[0,0,0];for(let s=0;s<steps;s++){let g0=0,g1=w[1],g2=w[2];for(const d of data){const yy=d.label?1:-1,m=yy*(w[0]+w[1]*d.x+w[2]*d.y);if(m<1){g0+=-C*yy;g1+=-C*yy*d.x;g2+=-C*yy*d.y;}}w[0]-=lr*g0/data.length;w[1]-=lr*g1/data.length;w[2]-=lr*g2/data.length;}return{type:'svm',w,predict:(x,y)=>sigmoid(1.7*(w[0]+w[1]*x+w[2]*y))};
  };
  const gini=rows=>{if(!rows.length)return 0;const p=rows.reduce((s,d)=>s+d.label,0)/rows.length;return 2*p*(1-p)};
  G2.gini=gini;
  G2.bestSplit=(rows,features=['x','y'],minLeaf=4)=>{
    let best=null,bestImp=Infinity;const parent=gini(rows);
    for(const f of features){const vals=[...new Set(rows.map(d=>d[f]))].sort((a,b)=>a-b);const candidates=[];for(let i=1;i<vals.length;i++){if(i%Math.max(1,Math.floor(vals.length/22))!==0&&i!==Math.floor(vals.length/2))continue;candidates.push((vals[i-1]+vals[i])/2);}for(const th of candidates){const L=rows.filter(d=>d[f]<=th),R=rows.filter(d=>d[f]>th);if(L.length<minLeaf||R.length<minLeaf)continue;const imp=(L.length*gini(L)+R.length*gini(R))/rows.length;if(imp<bestImp){bestImp=imp;best={feature:f,threshold:th,left:L,right:R,gain:parent-imp,impurity:imp};}}}
    return best;
  };
  G2.buildTree=(rows,depth=0,maxDepth=3,minLeaf=5,featureSubset=null,rand=Math.random)=>{
    const p=rows.reduce((s,d)=>s+d.label,0)/Math.max(1,rows.length);if(depth>=maxDepth||rows.length<minLeaf*2||gini(rows)<1e-6)return{leaf:true,p,n:rows.length};let feats=['x','y'];if(featureSubset===1)feats=[rand()<.5?'x':'y'];const b=G2.bestSplit(rows,feats,minLeaf);if(!b)return{leaf:true,p,n:rows.length};return{leaf:false,p,n:rows.length,feature:b.feature,threshold:b.threshold,gain:b.gain,left:G2.buildTree(b.left,depth+1,maxDepth,minLeaf,featureSubset,rand),right:G2.buildTree(b.right,depth+1,maxDepth,minLeaf,featureSubset,rand)};
  };
  G2.treePredict=(t,x,y)=>{let n=t;while(n&&!n.leaf)n=(n.feature==='x'?x:y)<=n.threshold?n.left:n.right;return n?.p??.5;};
  G2.fitTree=(data,maxDepth=4)=>{const tree=G2.buildTree(data,0,maxDepth,5);return{type:'tree',tree,predict:(x,y)=>G2.treePredict(tree,x,y)}};
  G2.fitForest=(data,nTrees=25,maxDepth=4,seed=42)=>{const rand=PG.mulberry32(seed),trees=[];for(let t=0;t<nTrees;t++){const sample=Array.from({length:data.length},()=>data[Math.floor(rand()*data.length)]),tree=G2.buildTree(sample,0,maxDepth,4,1,rand);trees.push(tree);}return{type:'forest',trees,predict:(x,y)=>PG.mean(trees.map(t=>G2.treePredict(t,x,y)))}};
  G2.fitKNN=(data,k=7)=>({type:'knn',k,predict:(x,y)=>{const a=data.map(d=>[(d.x-x)**2+(d.y-y)**2,d.label]).sort((a,b)=>a[0]-b[0]).slice(0,Math.min(k,data.length));return PG.mean(a.map(z=>z[1]));}});
  G2.metrics=(data,predict,thr=.5)=>PG.binaryMetrics(data.map(d=>d.label),data.map(d=>predict(d.x,d.y)),thr);
  G2.grid=(data,predict,n=43)=>{const q=G2.classRanges(data),xs=Array.from({length:n},(_,i)=>q.x0+(q.x1-q.x0)*i/(n-1)),ys=Array.from({length:n},(_,i)=>q.y0+(q.y1-q.y0)*i/(n-1)),z=ys.map(y=>xs.map(x=>predict(x,y)));return{...q,xs,ys,z};};
  G2.classTraces=(data,size=8)=>[0,1].map(c=>{const a=data.filter(d=>d.label===c);return{x:a.map(d=>d.x),y:a.map(d=>d.y),type:'scatter',mode:'markers',name:`Class ${c}`,marker:{size,opacity:.76,line:{width:.5,color:'#fff'},color:c?'#ef7d32':'#4f7cff'},customdata:a.map(d=>data.indexOf(d)),hovertemplate:`Class ${c}<br>x=%{x:.2f}<br>y=%{y:.2f}<extra></extra>`};});
  G2.boundaryTraces=(data,predict)=>{const g=G2.grid(data,predict);return[{x:g.xs,y:g.ys,z:g.z,type:'contour',colorscale:[[0,'#dbeafe'],[.5,'#f8fafc'],[1,'#ffedd5']],opacity:.55,showscale:false,contours:{coloring:'heatmap',showlines:false},hoverinfo:'skip'},{x:g.xs,y:g.ys,z:g.z,type:'contour',contours:{start:.5,end:.5,size:1,coloring:'none'},line:{color:PG.theme().ink,width:3},showscale:false,name:'p = 0.5',hoverinfo:'skip'},...G2.classTraces(data)];};
  G2.euclid=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  G2.kmeansInit=(data,k=3,seed=42)=>{const rand=PG.mulberry32(seed),ids=PG.shuffle(Array.from({length:data.length},(_,i)=>i),rand).slice(0,k);return{centroids:ids.map(i=>({x:data[i].x,y:data[i].y})),labels:Array(data.length).fill(-1),iteration:0,phase:'assign'};};
  G2.kmeansAssign=(data,state)=>{state.labels=data.map(d=>{let bi=0,bd=Infinity;state.centroids.forEach((c,i)=>{const q=(d.x-c.x)**2+(d.y-c.y)**2;if(q<bd){bd=q;bi=i;}});return bi;});state.phase='update';return state;};
  G2.kmeansUpdate=(data,state)=>{state.centroids=state.centroids.map((c,j)=>{const a=data.filter((_,i)=>state.labels[i]===j);return a.length?{x:PG.mean(a.map(d=>d.x)),y:PG.mean(a.map(d=>d.y))}:c;});state.iteration++;state.phase='assign';return state;};
  G2.kmeansRun=(data,k=3,seed=42,maxIter=40)=>{const s=G2.kmeansInit(data,k,seed);for(let i=0;i<maxIter;i++){const old=s.centroids.map(c=>({...c}));G2.kmeansAssign(data,s);G2.kmeansUpdate(data,s);if(s.centroids.every((c,j)=>G2.euclid(c,old[j])<1e-5))break;}G2.kmeansAssign(data,s);return s;};
  G2.dbscan=(data,eps=.7,minPts=5)=>{const n=data.length,labels=Array(n).fill(undefined),neighbors=i=>{const a=[];for(let j=0;j<n;j++)if(G2.euclid(data[i],data[j])<=eps)a.push(j);return a;};let cluster=0;for(let i=0;i<n;i++){if(labels[i]!==undefined)continue;const N=neighbors(i);if(N.length<minPts){labels[i]=-1;continue;}labels[i]=cluster;const queue=[...N.filter(j=>j!==i)],seen=new Set(queue);while(queue.length){const j=queue.shift();if(labels[j]===-1)labels[j]=cluster;if(labels[j]!==undefined)continue;labels[j]=cluster;const Nj=neighbors(j);if(Nj.length>=minPts)for(const q of Nj)if(!seen.has(q)){seen.add(q);queue.push(q);}}cluster++;}return{labels,clusters:cluster,noise:labels.filter(x=>x===-1).length};};
  G2.agglomerative=(data,k=3,linkage='average',maxSteps=Infinity)=>{let clusters=data.map((_,i)=>[i]),steps=0,history=[];const dist=(A,B)=>{const ds=[];for(const i of A)for(const j of B)ds.push(G2.euclid(data[i],data[j]));return linkage==='single'?Math.min(...ds):linkage==='complete'?Math.max(...ds):PG.mean(ds);};while(clusters.length>k&&steps<maxSteps){let bi=0,bj=1,bd=Infinity;for(let i=0;i<clusters.length;i++)for(let j=i+1;j<clusters.length;j++){const d=dist(clusters[i],clusters[j]);if(d<bd){bd=d;bi=i;bj=j;}}const merged=[...clusters[bi],...clusters[bj]];history.push({a:clusters[bi].length,b:clusters[bj].length,distance:bd});clusters=clusters.filter((_,i)=>i!==bi&&i!==bj);clusters.push(merged);steps++;}const labels=Array(data.length).fill(-1);clusters.forEach((c,j)=>c.forEach(i=>labels[i]=j));return{labels,clusters,history,steps};};
  G2.clusterInertia=(data,labels)=>{const labs=[...new Set(labels.filter(x=>x>=0))];let s=0;for(const l of labs){const a=data.filter((_,i)=>labels[i]===l),cx=PG.mean(a.map(d=>d.x)),cy=PG.mean(a.map(d=>d.y));s+=a.reduce((q,d)=>q+(d.x-cx)**2+(d.y-cy)**2,0);}return s;};
  G2.silhouette=(data,labels)=>{const labs=[...new Set(labels.filter(x=>x>=0))];if(labs.length<2)return 0;let vals=[];data.forEach((d,i)=>{const li=labels[i];if(li<0)return;const same=data.map((x,j)=>[x,j]).filter(([,j])=>labels[j]===li&&j!==i);const a=same.length?PG.mean(same.map(([x])=>G2.euclid(d,x))):0;let b=Infinity;for(const l of labs)if(l!==li){const other=data.map((x,j)=>[x,j]).filter(([,j])=>labels[j]===l);if(other.length)b=Math.min(b,PG.mean(other.map(([x])=>G2.euclid(d,x))));}vals.push((b-a)/Math.max(a,b,1e-9));});return PG.mean(vals);};
  G2.clusterTraces=(data,labels,centroids=[])=>{const labs=[...new Set(labels)],palette=['#4f7cff','#ef7d32','#13b8c8','#8b5cf6','#16a34a','#e11d48','#ca8a04','#64748b'];const traces=labs.map(l=>{const a=data.filter((_,i)=>labels[i]===l);return{x:a.map(d=>d.x),y:a.map(d=>d.y),type:'scatter',mode:'markers',name:l<0?'Noise':`Cluster ${l+1}`,marker:{size:8,opacity:.78,color:l<0?'#94a3b8':palette[l%palette.length],symbol:l<0?'x':'circle'}};});if(centroids.length)traces.push({x:centroids.map(c=>c.x),y:centroids.map(c=>c.y),mode:'markers',type:'scatter',name:'Centroids',marker:{size:16,symbol:'x',color:'#111827',line:{width:2,color:'#fff'}}});return traces;};
  G2.makeRegressionData=(kind='linear',n=90,noise=8,seed=42)=>{const r=PG.mulberry32(seed),g=()=>PG.normal(r),rows=[];for(let i=0;i<n;i++){const x=-4+8*i/(n-1)+g()*.05;let truth=kind==='quadratic'?5+2*x+3.4*x*x:kind==='cubic'?8-4*x+1.3*x*x+.72*x*x*x:kind==='sine'?18+9*Math.sin(1.2*x)+2*x:18+7.2*x;let sd=noise;if(kind==='hetero')sd=noise*(.25+Math.abs(x)/2.4);let y=truth+g()*sd;if(kind==='outliers'&&i%19===0)y+=g()*noise*5.8;rows.push({x,y,custom:false});}return rows;};
  G2.polyRow=(x,d)=>Array.from({length:d},(_,i)=>x**(i+1));
  G2.fitRidge=(data,degree=1,lambda=0)=>{const X=data.map(d=>G2.polyRow(d.x,degree)),y=data.map(d=>d.y),b=PG.fitLinearRegression(X,y,lambda);return{beta:b,predict:x=>PG.predictLinear([G2.polyRow(x,degree)],b)[0]};};
  G2.fitLasso=(data,degree=1,lambda=.08,iterations=240)=>{const Xraw=data.map(d=>G2.polyRow(d.x,degree)),p=degree,n=data.length,mu=[],sd=[];for(let j=0;j<p;j++){const c=Xraw.map(r=>r[j]);mu[j]=PG.mean(c);sd[j]=PG.sd(c)||1;}const X=Xraw.map(r=>r.map((v,j)=>(v-mu[j])/sd[j])),ym=PG.mean(data.map(d=>d.y)),y=data.map(d=>d.y-ym),w=Array(p).fill(0),soft=(z,g)=>Math.sign(z)*Math.max(0,Math.abs(z)-g);for(let it=0;it<iterations;it++)for(let j=0;j<p;j++){let rho=0,z=0;for(let i=0;i<n;i++){let pred=0;for(let k=0;k<p;k++)if(k!==j)pred+=X[i][k]*w[k];rho+=X[i][j]*(y[i]-pred);z+=X[i][j]*X[i][j];}w[j]=soft(rho,lambda*n)/(z||1);}return{w,mu,sd,intercept:ym,predict:x=>ym+G2.polyRow(x,degree).reduce((s,v,j)=>s+((v-mu[j])/sd[j])*w[j],0)};};
  G2.regMetrics=(data,predict)=>{const y=data.map(d=>d.y),p=data.map(d=>predict(d.x)),e=y.map((v,i)=>v-p[i]),mse=PG.mean(e.map(x=>x*x));return{mae:PG.mean(e.map(Math.abs)),mse,rmse:Math.sqrt(mse),r2:PG.r2(y,p),errors:e,pred:p};};
  G2.fitStumpWeighted=(data,weights)=>{let best=null,bErr=Infinity;for(const feature of ['x','y']){const vals=data.map(d=>d[feature]).sort((a,b)=>a-b);for(let q=1;q<18;q++){const th=vals[Math.floor(vals.length*q/18)];for(const polarity of [1,-1]){let er=0;data.forEach((d,i)=>{const pr=(d[feature]>th?1:0)^(polarity<0?1:0);if(pr!==d.label)er+=weights[i];});if(er<bErr){bErr=er;best={feature,threshold:th,polarity,error:er};}}}}return best;};
  G2.stumpPredict=(s,x,y)=>{const v=s.feature==='x'?x:y;return ((v>s.threshold?1:0)^(s.polarity<0?1:0))?1:0;};
  G2.adaboost=(data,n=12)=>{let weights=Array(data.length).fill(1/data.length),stumps=[];for(let t=0;t<n;t++){const s=G2.fitStumpWeighted(data,weights);if(!s||s.error>=.5)break;const er=PG.clamp(s.error,1e-6,.499999),alpha=.5*Math.log((1-er)/er);let Z=0;data.forEach((d,i)=>{const yy=d.label?1:-1,hh=G2.stumpPredict(s,d.x,d.y)?1:-1;weights[i]*=Math.exp(-alpha*yy*hh);Z+=weights[i];});weights=weights.map(w=>w/Z);stumps.push({...s,alpha});}const predict=(x,y)=>{let z=0,a=0;for(const s of stumps){z+=s.alpha*(G2.stumpPredict(s,x,y)?1:-1);a+=Math.abs(s.alpha);}return sigmoid(2*z/Math.max(a,.1));};return{stumps,predict};};
  G2.fitBagging=(data,n=15,depth=2,seed=42)=>G2.fitForest(data,n,depth,seed);
  window.HumachPG2=G2;
})();
