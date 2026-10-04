(() => {
  function rng(seed=42){let s=(seed>>>0)||1;return()=>((s=(1664525*s+1013904223)>>>0)/4294967296)}
  function gaussian(rand){let u=0,v=0;while(!u)u=rand();while(!v)v=rand();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
  const mean=a=>a.reduce((s,v)=>s+v,0)/Math.max(1,a.length);
  function pearson(a,b){const n=Math.min(a.length,b.length);if(n<2)return NaN;const aa=a.slice(0,n),bb=b.slice(0,n),ma=mean(aa),mb=mean(bb);let num=0,da=0,db=0;for(let i=0;i<n;i++){const x=aa[i]-ma,y=bb[i]-mb;num+=x*y;da+=x*x;db+=y*y}return da>0&&db>0?num/Math.sqrt(da*db):0}
  function ranks(a){const idx=a.map((v,i)=>({v,i})).sort((x,y)=>x.v-y.v);const out=Array(a.length);let i=0;while(i<idx.length){let j=i;while(j+1<idx.length&&idx[j+1].v===idx[i].v)j++;const r=(i+j)/2+1;for(let k=i;k<=j;k++)out[idx[k].i]=r;i=j+1}return out}
  const spearman=(a,b)=>pearson(ranks(a),ranks(b));
  function lineFit(x,y){const mx=mean(x),my=mean(y);let num=0,den=0;for(let i=0;i<x.length;i++){num+=(x[i]-mx)*(y[i]-my);den+=(x[i]-mx)**2}const slope=den?num/den:0,intercept=my-slope*mx;return{slope,intercept}}
  function makeData(n=180,noise=.42,seed=42,outlier=false){const rand=rng(seed),rows=[];for(let i=0;i<n;i++){const latent=gaussian(rand),e=()=>gaussian(rand);const target=1.4*latent+noise*e();const f1=latent+.35*noise*e();const f2=.92*f1+.22*noise*e();const f3=-.78*latent+.55*noise*e();const f4=latent*latent+.55*noise*e();const f5=e();rows.push({f1,f2,f3,f4,f5,target})}if(outlier&&rows.length){const i=Math.floor(rows.length*.78);rows[i]={...rows[i],f1:rows[i].f1+7,target:rows[i].target-7}}return rows}
  function patternData(kind='positive',n=60,noise=.35,seed=42,outlier=false){const rand=rng(seed),x=[],y=[];for(let i=0;i<n;i++){const xv=-3+6*i/(n-1)+.18*gaussian(rand);let yv;if(kind==='positive')yv=1.1*xv+noise*gaussian(rand);else if(kind==='negative')yv=-1.1*xv+noise*gaussian(rand);else if(kind==='none')yv=noise*2.1*gaussian(rand);else if(kind==='nonlinear')yv=xv*xv+noise*1.4*gaussian(rand);else yv=xv+noise*gaussian(rand);x.push(xv);y.push(yv)}if(outlier){x.push(4.8);y.push(kind==='negative'?7:-7)}return{x,y}}
  const features=['f1','f2','f3','f4','f5'];
  const labels={f1:'Signal A',f2:'Signal A copy',f3:'Signal B (negative)',f4:'Nonlinear signal',f5:'Noise',target:'Target'};
  function corr(a,b,method='pearson'){return method==='spearman'?spearman(a,b):pearson(a,b)}
  function vector(rows,key){return rows.map(r=>+r[key])}
  function matrix(rows,keys=[...features,'target'],method='pearson'){return keys.map(a=>keys.map(b=>corr(vector(rows,a),vector(rows,b),method)))}
  function targetScores(rows,method='pearson'){const y=vector(rows,'target');return features.map(feature=>({feature,label:labels[feature],r:corr(vector(rows,feature),y,method)})).sort((a,b)=>Math.abs(b.r)-Math.abs(a.r))}
  function selectFeatures(rows,{method='pearson',minTarget=.25,maxRedundancy=.85}={}){const scores=targetScores(rows,method),selected=[],steps=[];for(const s of scores){let reason='',keep=true;if(Math.abs(s.r)<minTarget){keep=false;reason=`|r(target)| ${Math.abs(s.r).toFixed(2)} < ${minTarget.toFixed(2)}`}else{for(const kept of selected){const rff=corr(vector(rows,s.feature),vector(rows,kept.feature),method);if(Math.abs(rff)>=maxRedundancy){keep=false;reason=`redundant with ${kept.label} (|r|=${Math.abs(rff).toFixed(2)})`;break}}}if(keep){selected.push(s);reason='kept'}steps.push({...s,keep,reason,selected:selected.map(x=>x.feature)})}return{scores,selected,steps}}
  window.HumachCorr={rng,gaussian,mean,pearson,spearman,corr,lineFit,makeData,patternData,features,labels,vector,matrix,targetScores,selectFeatures};
})();
