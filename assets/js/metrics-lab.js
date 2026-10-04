(() => {
  const $=id=>document.getElementById(id),sep=$('separation'),prev=$('prevalence'),thr=$('threshold'),status=$('labStatus'),metrics=$('labMetrics'),explain=$('labExplain'),v2=$('view2d'),v3=$('view3d');
  if(!sep||!prev||!thr)return;let view='2d',timer=null;
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
  function vals(t=+thr.value/100,p=+prev.value/100,s=+sep.value/20){const N=1000,pos=N*p,neg=N-pos,tpr=1/(1+Math.exp(-(s*2.5-(t-.5)*7))),fpr=1/(1+Math.exp(-(-s*1.6-(t-.5)*7))),tp=pos*tpr,fn=pos-tp,fp=neg*fpr,tn=neg-fp,precision=tp/(tp+fp||1),recall=tp/(tp+fn||1),specificity=tn/(tn+fp||1),npv=tn/(tn+fn||1),acc=(tp+tn)/N,bal=(recall+specificity)/2,f1=2*precision*recall/(precision+recall||1),fprate=fp/(fp+tn||1),fnrate=fn/(fn+tp||1);return{tp,fn,fp,tn,precision,recall,specificity,npv,acc,bal,f1,fprate,fnrate}}
  function render(){const m=vals(),dark=document.documentElement.dataset.theme==='dark',ink=dark?'#f8fafc':'#111827',bg=dark?'#0b1020':'#fff',ts=Array.from({length:101},(_,i)=>i/100);
    if(view==='2d')Plotly.react('labPlot',[{x:ts,y:ts.map(t=>vals(t).precision),mode:'lines',name:'Precision'},{x:ts,y:ts.map(t=>vals(t).recall),mode:'lines',name:'Recall'},{x:ts,y:ts.map(t=>vals(t).specificity),mode:'lines',name:'Specificity'},{x:ts,y:ts.map(t=>vals(t).f1),mode:'lines',name:'F1'},{x:[+thr.value/100],y:[m.f1],mode:'markers',name:'Current threshold',marker:{size:13,color:'#f97316'}}],{paper_bgcolor:bg,plot_bgcolor:bg,font:{color:ink},margin:{l:50,r:15,t:48,b:45},legend:{orientation:'h',x:.5,xanchor:'center',y:1.14},xaxis:{title:'Decision threshold',range:[0,1]},yaxis:{title:'Metric',range:[0,1]}},{responsive:true,displaylogo:false});
    else{const ps=Array.from({length:26},(_,i)=>.02+i*.96/25),Z=ps.map(p=>ts.filter((_,i)=>i%4===0).map(t=>vals(t,p,+sep.value/20).f1)),t2=ts.filter((_,i)=>i%4===0);labRender3D([{x:t2,y:ps,z:Z,type:'surface',colorscale:'Viridis',showscale:true}],{paper_bgcolor:bg,font:{color:ink},margin:{l:0,r:0,t:42,b:0},scene:{xaxis:{title:'Threshold'},yaxis:{title:'Positive prevalence'},zaxis:{title:'F1',range:[0,1]}}})}
    const cm=[[m.tn,m.fp],[m.fn,m.tp]];Plotly.react('confusionPlot',[{z:cm,x:['Predicted 0','Predicted 1'],y:['Actual 0','Actual 1'],type:'heatmap',colorscale:'Blues',showscale:false,text:cm.map(r=>r.map(v=>Math.round(v))),texttemplate:'%{text}',hovertemplate:'%{y}<br>%{x}<br>Count=%{z:.0f}<extra></extra>'}],{paper_bgcolor:bg,plot_bgcolor:bg,font:{color:ink},margin:{l:72,r:12,t:38,b:55},xaxis:{side:'bottom'},yaxis:{autorange:'reversed'},title:{text:'Confusion matrix',font:{size:15}}},{responsive:true,displaylogo:false});
    const arr=[['TP',m.tp],['TN',m.tn],['FP',m.fp],['FN',m.fn],['Accuracy',m.acc],['Balanced accuracy',m.bal],['Precision / PPV',m.precision],['Recall / sensitivity',m.recall],['Specificity / TNR',m.specificity],['NPV',m.npv],['F1',m.f1],['False positive rate',m.fprate],['False negative rate',m.fnrate]];metrics.innerHTML=arr.map(([a,b])=>`<div><small>${a}</small><strong>${['TP','TN','FP','FN'].includes(a)?Math.round(b):b.toFixed(3)}</strong></div>`).join('');status.textContent=`Threshold ${thr.value}% · prevalence ${prev.value}% · separation ${sep.value}`;explain.innerHTML='<h3>Confusion counts are the source of the metrics</h3><p>Changing the threshold moves observations between TP, TN, FP and FN. Precision, recall, specificity, F1 and the error rates are all calculated from those four cells. Use 3D to inspect how F1 changes jointly with prevalence and threshold.</p>';
  }
  function stop(){if(timer){clearInterval(timer);timer=null;$('labTrain').textContent='Train'}}
  ['input','change'].forEach(ev=>[sep,prev,thr].forEach(x=>x.addEventListener(ev,render)));$('labReset')?.addEventListener('click',()=>{stop();labResetCamera();sep.value=12;prev.value=35;thr.value=50;render()});$('labStep')?.addEventListener('click',()=>{stop();thr.value=Math.min(95,+thr.value+5);render()});$('labTrain')?.addEventListener('click',()=>{if(timer){stop();return}let t=5;$('labTrain').textContent='Pause';timer=setInterval(()=>{thr.value=t;render();t+=5;if(t>95)stop()},120)});v2?.addEventListener('click',()=>{view='2d';v2.classList.add('active');v3.classList.remove('active');render()});v3?.addEventListener('click',()=>{view='3d';v3.classList.add('active');v2.classList.remove('active');render()});render();addEventListener('humach-theme-change',render);
})();
