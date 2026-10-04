(() => {
  const key='humachlearn-playground-mode',valid=['learn','experiment','challenge'];
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const contextual=()=>{
    if(page.includes('dataset')||page.includes('preprocessing')||page.includes('feature-engineering'))return 'Prepare the data without leakage, then explain why each transformation belongs in the pipeline.';
    if(page.includes('imbalance')||page.includes('metrics')||page.includes('threshold'))return 'Improve the decision metric without hiding minority-class errors behind accuracy.';
    if(page.includes('regression'))return 'Change model complexity or data points and reduce validation error without chasing noise.';
    if(page.includes('clustering'))return 'Find stable groups and explain how the grouping changes when the algorithm assumptions change.';
    if(page.includes('neural')||page.includes('gradient'))return 'Reach a lower loss while keeping the learning process stable and interpretable.';
    if(page.includes('boundary')||page.includes('comparison')||page.includes('hyperparameter')||page.includes('pipeline'))return 'Improve validation performance while keeping the learned separator explainable and the final test untouched.';
    if(page.includes('cross-validation')||page.includes('overfitting'))return 'Reduce variability or the train–validation gap without using the final test to make choices.';
    if(page.includes('explainable'))return 'Compare p-value, AUC, permutation importance and RFE, then explain why their rankings can disagree.';
    if(page.includes('robustness')||page.includes('shift'))return 'Preserve useful performance as the data become noisier or move away from the training distribution.';
    if(page.includes('time-series'))return 'Improve the forecast while preserving chronological validation.';
    if(page.includes('prediction'))return 'Move a new case across the fixed model boundary and explain which features change its probability most.';
    if(page.includes('code-visual'))return 'Make a code change, predict the visual effect before applying it, then verify the result.';
    return 'Change one assumption, predict the outcome, test it, and explain the evidence.';
  };
  function apply(mode){
    if(!valid.includes(mode))mode='learn';document.body.dataset.playgroundMode=mode;try{localStorage.setItem(key,mode)}catch(e){}
    document.querySelectorAll('[data-pg-mode-choice]').forEach(b=>b.classList.toggle('active',b.dataset.pgModeChoice===mode));
    const banner=document.getElementById('pgModeBanner');if(!banner)return;
    if(mode==='learn')banner.innerHTML='<strong>Learn mode</strong><span>Use the explanations, plots and intermediate states to connect each control with the model behaviour it changes.</span>';
    else if(mode==='experiment')banner.innerHTML='<strong>Experiment mode</strong><span>Manipulate the controls freely. Predict the result before each change and compare the evidence rather than chasing one score.</span>';
    else banner.innerHTML=page==='challenge-mode.html'?`<strong>Challenge mode</strong><span>You are in the scored challenge workbench. Use validation evidence to meet the goal before opening the final test.</span>`:`<strong>Challenge mode</strong><span>${contextual()}</span><a href="challenge-mode.html">Open scored challenges →</a>`;
  }
  function init(){
    const hero=document.querySelector('.mode-hero');if(!hero||document.getElementById('pgModeSwitcher'))return;
    const wrap=document.createElement('div');wrap.className='pg-mode-shell';wrap.id='pgModeSwitcher';wrap.innerHTML='<div class="pg-mode-switch" role="group" aria-label="Playground mode"><button type="button" data-pg-mode-choice="learn">Learn</button><button type="button" data-pg-mode-choice="experiment">Experiment</button><button type="button" data-pg-mode-choice="challenge">Challenge</button></div><div class="pg-mode-banner" id="pgModeBanner"></div>';hero.appendChild(wrap);
    wrap.querySelectorAll('[data-pg-mode-choice]').forEach(b=>b.addEventListener('click',()=>apply(b.dataset.pgModeChoice)));
    let mode='learn';try{mode=localStorage.getItem(key)||'learn'}catch(e){}apply(mode);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
