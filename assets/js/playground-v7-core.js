(() => {
  const PG = {};
  PG.$ = id => document.getElementById(id);
  PG.esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  PG.fmt = (v, d=3) => Number.isFinite(Number(v)) ? Number(v).toFixed(d).replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1') : '—';
  PG.clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  PG.mean = a => a.length ? a.reduce((s,v)=>s+v,0)/a.length : 0;
  PG.median = a => { if(!a.length)return 0; const x=[...a].sort((p,q)=>p-q),m=Math.floor(x.length/2); return x.length%2?x[m]:(x[m-1]+x[m])/2; };
  PG.quantile = (a,q) => { if(!a.length)return 0; const x=[...a].sort((p,q)=>p-q),p=(x.length-1)*q,b=Math.floor(p),r=p-b; return x[b+1]===undefined?x[b]:x[b]+r*(x[b+1]-x[b]); };
  PG.sd = a => { if(a.length<2)return 0; const m=PG.mean(a); return Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/(a.length-1)); };
  PG.mulberry32 = seed => () => { let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296; };
  PG.normal = rand => { let u=0,v=0; while(!u)u=rand(); while(!v)v=rand(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
  PG.shuffle = (arr,rand=Math.random) => { const x=[...arr]; for(let i=x.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[x[i],x[j]]=[x[j],x[i]];} return x; };
  PG.theme = () => { const d=document.documentElement.dataset.theme==='dark'; return {dark:d,bg:d?'#0b1020':'#fff',panel:d?'#111827':'#f8fafc',ink:d?'#f8fafc':'#111827',muted:d?'#94a3b8':'#64748b',grid:d?'#243042':'#e5e7eb'}; };
  PG.plot = (el,traces,layout={},config={}) => { if(!el)return; if(!window.Plotly){el.innerHTML='<div class="pg-empty">This visualisation needs Plotly.js. Check the internet connection and reload.</div>';return;} const t=PG.theme(); Plotly.react(el,traces,{paper_bgcolor:t.bg,plot_bgcolor:t.bg,font:{color:t.ink},autosize:true,margin:{l:55,r:20,t:48,b:50,...(layout.margin||{})},...layout},{responsive:true,displaylogo:false,...config}); };
  PG.inferType = values => { const present=values.filter(v=>v!==null&&v!==undefined&&String(v).trim()!==''); if(!present.length)return 'empty'; const nums=present.filter(v=>Number.isFinite(Number(v))).length; if(nums/present.length>.9)return 'numeric'; const dates=present.filter(v=>!Number.isNaN(Date.parse(String(v)))&&/[\-\/]/.test(String(v))).length; if(dates/present.length>.9)return 'date'; return 'categorical'; };
  PG.mode = a => { const m=new Map(); let best=null,n=-1; a.forEach(v=>{const k=String(v);const c=(m.get(k)||0)+1;m.set(k,c);if(c>n){best=v;n=c;}});return best; };
  PG.parseCSV = text => {
    const rows=[]; let row=[],field='',quote=false;
    for(let i=0;i<text.length;i++){
      const c=text[i],n=text[i+1];
      if(quote){ if(c==='"'&&n==='"'){field+='"';i++;} else if(c==='"')quote=false; else field+=c; }
      else if(c==='"')quote=true;
      else if(c===','){row.push(field);field='';}
      else if(c==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}
      else field+=c;
    }
    if(field.length||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
    if(rows.length<2)return [];
    const headers=rows[0].map((h,i)=>String(h||`column_${i+1}`).trim());
    return rows.slice(1).filter(r=>r.some(v=>String(v).trim()!=='')).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
  };
  PG.renderTable = (el,rows,columns,limit=12) => {
    if(!el)return; if(!rows.length){el.innerHTML='<div class="pg-empty">No rows to display.</div>';return;}
    const cols=columns&&columns.length?columns:Object.keys(rows[0]);
    el.innerHTML=`<table class="pg-table"><thead><tr>${cols.map(c=>`<th>${PG.esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0,limit).map(r=>`<tr>${cols.map(c=>`<td>${PG.esc(r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  };
  PG.splitIndices = (n,testFraction=.2,seed=42,labels=null,stratify=false) => {
    const rand=PG.mulberry32(seed); let train=[],test=[];
    if(stratify&&labels){ const groups=new Map(); labels.forEach((y,i)=>{const k=String(y);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(i);}); groups.forEach(g=>{const s=PG.shuffle(g,rand),nt=Math.max(1,Math.round(g.length*testFraction));test.push(...s.slice(0,nt));train.push(...s.slice(nt));}); }
    else { const s=PG.shuffle(Array.from({length:n},(_,i)=>i),rand),nt=Math.max(1,Math.round(n*testFraction));test=s.slice(0,nt);train=s.slice(nt); }
    return {train:train.sort((a,b)=>a-b),test:test.sort((a,b)=>a-b)};
  };
  PG.solveLinear = (A,b) => {
    const n=A.length,M=A.map((r,i)=>[...r,b[i]]);
    for(let i=0;i<n;i++){
      let p=i; for(let r=i+1;r<n;r++)if(Math.abs(M[r][i])>Math.abs(M[p][i]))p=r; [M[i],M[p]]=[M[p],M[i]];
      if(Math.abs(M[i][i])<1e-10)M[i][i]+=1e-8;
      const d=M[i][i]; for(let c=i;c<=n;c++)M[i][c]/=d;
      for(let r=0;r<n;r++)if(r!==i){const f=M[r][i];for(let c=i;c<=n;c++)M[r][c]-=f*M[i][c];}
    }
    return M.map(r=>r[n]);
  };
  PG.fitLinearRegression = (X,y,lambda=1e-6) => {
    const XX=X.map(r=>[1,...r]),p=XX[0]?.length||1,A=Array.from({length:p},()=>Array(p).fill(0)),b=Array(p).fill(0);
    XX.forEach((r,i)=>{for(let a=0;a<p;a++){b[a]+=r[a]*y[i];for(let c=0;c<p;c++)A[a][c]+=r[a]*r[c];}}); for(let i=1;i<p;i++)A[i][i]+=lambda;
    return PG.solveLinear(A,b);
  };
  PG.predictLinear = (X,beta) => X.map(r=>beta[0]+r.reduce((s,v,i)=>s+v*beta[i+1],0));
  PG.r2 = (y,p) => { const m=PG.mean(y),ss=y.reduce((s,v)=>s+(v-m)**2,0)||1,se=y.reduce((s,v,i)=>s+(v-p[i])**2,0);return 1-se/ss; };
  PG.rmse = (y,p) => Math.sqrt(PG.mean(y.map((v,i)=>(v-p[i])**2)));
  PG.binaryMetrics = (y,score,thr=.5) => {
    let tp=0,tn=0,fp=0,fn=0; y.forEach((v,i)=>{const p=score[i]>=thr?1:0;if(v===1&&p===1)tp++;else if(v===0&&p===0)tn++;else if(v===0)fp++;else fn++;});
    const div=(a,b)=>b?a/b:0,precision=div(tp,tp+fp),recall=div(tp,tp+fn),specificity=div(tn,tn+fp),accuracy=div(tp+tn,y.length),balanced=(recall+specificity)/2,f1=div(2*precision*recall,precision+recall);
    return {tp,tn,fp,fn,precision,recall,specificity,accuracy,balanced,f1};
  };
  PG.prCurve = (y,score) => {
    const pairs=score.map((s,i)=>[s,y[i]]).sort((a,b)=>b[0]-a[0]); let tp=0,fp=0,total=y.reduce((s,v)=>s+v,0),pts=[[0,1]];
    pairs.forEach(([s,v])=>{if(v)tp++;else fp++;pts.push([total?tp/total:0,(tp+fp)?tp/(tp+fp):1]);});
    pts.sort((a,b)=>a[0]-b[0]); let auc=0;for(let i=1;i<pts.length;i++)auc+=(pts[i][0]-pts[i-1][0])*(pts[i][1]+pts[i-1][1])/2;
    return {recall:pts.map(p=>p[0]),precision:pts.map(p=>p[1]),auc};
  };
  PG.knnScores = (trainX,trainY,testX,k=7) => testX.map(x=>{const d=trainX.map((r,i)=>[r.reduce((s,v,j)=>s+(v-x[j])**2,0),trainY[i]]).sort((a,b)=>a[0]-b[0]).slice(0,Math.min(k,trainX.length));return d.length?d.reduce((s,z)=>s+z[1],0)/d.length:.5;});
  PG.standardize = (train,test) => {
    if(!train.length)return {train,test,mu:[],sd:[]}; const p=train[0].length,mu=[],sd=[]; for(let j=0;j<p;j++){const c=train.map(r=>r[j]);mu[j]=PG.mean(c);sd[j]=PG.sd(c)||1;}
    const tr=a=>a.map(r=>r.map((v,j)=>(v-mu[j])/sd[j])); return {train:tr(train),test:tr(test),mu,sd};
  };
  PG.covariance = X => { const n=X.length,p=X[0].length,C=Array.from({length:p},()=>Array(p).fill(0));for(let i=0;i<p;i++)for(let j=i;j<p;j++){let s=0;for(let r=0;r<n;r++)s+=X[r][i]*X[r][j];const v=s/Math.max(1,n-1);C[i][j]=C[j][i]=v;}return C; };
  PG.matVec = (A,v)=>A.map(r=>r.reduce((s,x,i)=>s+x*v[i],0));
  PG.dot = (a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  PG.norm = a=>Math.sqrt(PG.dot(a,a))||1;
  PG.topEigen = (C,k=3) => {
    const A=C.map(r=>[...r]),vals=[],vecs=[]; const p=A.length;
    for(let q=0;q<Math.min(k,p);q++){
      let v=Array.from({length:p},(_,i)=>i===q%p?1:1/(i+2));
      for(let it=0;it<120;it++){let nv=PG.matVec(A,v);const n=PG.norm(nv);nv=nv.map(x=>x/n); if(PG.norm(nv.map((x,i)=>x-v[i]))<1e-9){v=nv;break;}v=nv;}
      const Av=PG.matVec(A,v),val=PG.dot(v,Av); vals.push(Math.max(0,val));vecs.push(v);
      for(let i=0;i<p;i++)for(let j=0;j<p;j++)A[i][j]-=val*v[i]*v[j];
    }
    return {values:vals,vectors:vecs};
  };
  window.HumachPG=PG;
})();
