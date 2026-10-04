(() => {
  const KEY='humachlearn-course-progress';
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
  const save=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}};
  function update(){const p=load();document.querySelectorAll('[data-course-lesson]').forEach(a=>a.classList.toggle('completed',!!p[a.dataset.courseLesson]));document.querySelectorAll('[data-course-card]').forEach(card=>{const ids=[...new Set([...card.querySelectorAll('[data-course-lesson]')].map(x=>x.dataset.courseLesson).filter(Boolean))],done=ids.filter(id=>p[id]).length,bar=card.querySelector('.course-progress>div'),txt=card.querySelector('[data-progress-text]');if(bar)bar.style.width=(ids.length?done/ids.length*100:0)+'%';if(txt)txt.textContent=`${done}/${ids.length} lessons complete`;});}
  document.getElementById('courseExpandAll')?.addEventListener('click',()=>document.querySelectorAll('.course-module').forEach(d=>d.open=true));
  document.getElementById('courseCollapseAll')?.addEventListener('click',()=>document.querySelectorAll('.course-module').forEach(d=>d.open=false));
  const mark=document.getElementById('markComplete');if(mark){const id=mark.dataset.lessonId;const sync=()=>{const on=!!load()[id];mark.textContent=on?'Completed ✓':'Mark lesson complete';mark.classList.toggle('completed',on)};mark.addEventListener('click',()=>{const p=load();p[id]=!p[id];save(p);sync();update()});sync()}
  document.querySelectorAll('[data-hint-toggle]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.hintToggle)?.classList.toggle('show')));
  document.querySelectorAll('[data-check-answer]').forEach(btn=>btn.addEventListener('click',()=>{const box=btn.closest('.knowledge-check'),answer=String(box.dataset.answer??'0'),chosen=box.querySelector('input[type=radio]:checked'),feedback=box.querySelector('.knowledge-feedback');feedback.classList.remove('correct','incorrect');if(!chosen){feedback.textContent='Choose an answer first.';return}const good=chosen.value===answer;feedback.textContent=good?'Correct — the workflow emphasises reasoning and verification.':'Not quite. Return to the concept walkthrough and focus on inspectable reasoning.';feedback.classList.add(good?'correct':'incorrect')}));
  update();
})();
