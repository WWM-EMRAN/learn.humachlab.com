(() => {
  const header=document.querySelector('[data-site-header]');
  let back=document.getElementById('backToTop');
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function onScroll(){
    back=back||document.getElementById('backToTop');
    const y=window.scrollY||document.documentElement.scrollTop||0;
    const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);
    const pct=Math.min(100,Math.max(0,y/max*100));
    header?.classList.toggle('is-scrolled',y>8);
    header?.style.setProperty('--page-progress',pct+'%');
    if(back){
      back.style.setProperty('--scroll-pct',pct+'%');
      back.classList.toggle('visible',y>520);
    }
  }
  addEventListener('scroll',onScroll,{passive:true}); onScroll();
  function wireBack(){back=back||document.getElementById('backToTop');if(back&&!back.dataset.wired){back.dataset.wired='1';back.addEventListener('click',()=>scrollTo({top:0,behavior:reduced?'auto':'smooth'}));}}
  wireBack();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{wireBack();onScroll()},{once:true});

  // Responsive navigation: keeps the desktop header compact and prevents link overlap.
  if(header){
    const topbar=header.querySelector('.topbar');
    const nav=header.querySelector('.main-nav');
    const actions=header.querySelector('.header-actions');
    if(topbar&&nav&&actions&&!header.querySelector('.mobile-nav-toggle')){
      const toggle=document.createElement('button');
      toggle.className='mobile-nav-toggle'; toggle.type='button'; toggle.innerHTML='☰';
      toggle.setAttribute('aria-label','Open navigation'); toggle.setAttribute('aria-expanded','false');
      actions.insertBefore(toggle,actions.firstChild);
      const panel=document.createElement('div'); panel.className='mobile-nav-panel';
      const shell=document.createElement('div'); shell.className='page-shell mobile-nav-inner';
      [...nav.querySelectorAll('a')].forEach(a=>shell.appendChild(a.cloneNode(true)));
      panel.appendChild(shell); header.appendChild(panel);
      const close=()=>{panel.classList.remove('open');toggle.setAttribute('aria-expanded','false');toggle.innerHTML='☰';toggle.setAttribute('aria-label','Open navigation')};
      toggle.addEventListener('click',()=>{const open=!panel.classList.contains('open');panel.classList.toggle('open',open);toggle.setAttribute('aria-expanded',String(open));toggle.innerHTML=open?'×':'☰';toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation')});
      panel.addEventListener('click',e=>{if(e.target.closest('a'))close()});
      addEventListener('resize',()=>{if(innerWidth>900)close()},{passive:true});
      addEventListener('keydown',e=>{if(e.key==='Escape')close()});
    }
  }

  // Progressive reveal adds motion without changing document flow, so it cannot create overlap.
  if(!reduced&&'IntersectionObserver' in window){
    const selectors=['main > section','.section-card','.course-card','.course-module','.hub-stage','.topic-card','.info-card','.live-preview-card','.pathway-card','.why-grid article','.method-timeline > div','.quiz-question','.resource-card','.topic-lesson-card'];
    const nodes=[...new Set(selectors.flatMap(s=>[...document.querySelectorAll(s)]))].filter(el=>!el.closest('.simulation-plot')&&!el.closest('.concept-stage'));
    nodes.forEach((el,i)=>{el.classList.add('reveal-ready');el.style.setProperty('--reveal-delay',Math.min(i%5,4)*35+'ms')});
    const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('reveal-visible');io.unobserve(entry.target)}}),{rootMargin:'0px 0px -7% 0px',threshold:.06});
    nodes.forEach(el=>io.observe(el));
  }

  // Small pointer parallax on the homepage learning map only; transforms are bounded to avoid layout shifts.
  const constellation=document.querySelector('.learning-constellation');
  if(constellation&&!reduced&&matchMedia('(pointer:fine)').matches){
    constellation.addEventListener('pointermove',e=>{
      const r=constellation.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
      constellation.classList.add('is-parallax');
      constellation.style.transform=`perspective(900px) rotateX(${(-y*2.4).toFixed(2)}deg) rotateY(${(x*3.2).toFixed(2)}deg) translateY(-2px)`;
    });
    constellation.addEventListener('pointerleave',()=>{constellation.classList.remove('is-parallax');constellation.style.transform=''})
  }

  // Score end-of-section quizzes.
  document.querySelector('[data-score-quiz]')?.addEventListener('click',()=>{
    const quiz=document.querySelector('[data-module-quiz]'); if(!quiz)return;
    const qs=[...quiz.querySelectorAll('.quiz-question')]; let score=0,answered=0;
    qs.forEach(q=>{const chosen=q.querySelector('input:checked');const correct=Number(q.dataset.answer);q.querySelectorAll('.quiz-options label').forEach((lab,i)=>{lab.classList.toggle('quiz-correct',i===correct);lab.classList.toggle('quiz-wrong',!!chosen&&i===Number(chosen.value)&&i!==correct)});if(chosen){answered++;if(Number(chosen.value)===correct)score++}q.querySelector('.quiz-explanation').hidden=false});
    const out=quiz.querySelector('.quiz-score');
    if(answered<qs.length){out.textContent=`Answered ${answered}/${qs.length}. Complete every question to finish the checkpoint.`;return}
    const pct=Math.round(score/qs.length*100);out.textContent=`Score: ${score}/${qs.length} (${pct}%). ${pct>=80?'Ready to continue.':'Review the linked lessons, then try again.'}`;
    try{const key='humachlearn-section-tests',saved=JSON.parse(localStorage.getItem(key)||'{}');saved[quiz.dataset.quizId||location.pathname]={score,total:qs.length,pct,passed:pct>=80,updated:new Date().toISOString()};localStorage.setItem(key,JSON.stringify(saved))}catch{}
    quiz.querySelector('.quiz-next').hidden=false;
  });
})();


;(() => {
  // Preserve the exact course lesson when a learner opens Explore, Learning Hub or a Project.
  const script=[...document.scripts].find(s=>/assets\/js\/site\.js/.test(s.src));
  const siteRoot=script?.src.replace(/assets\/js\/site\.js.*$/,'')||'';
  const path=location.pathname.replace(/^.*?(?=courses\/|learning-hub\/|projects\/|explore\/)/,'');
  const isCourse=path.startsWith('courses/') && !/\/index\.html$/.test(path);
  const title=(document.querySelector('h1')?.textContent||document.title.replace(/\s*[—-]\s*HumachLearn.*$/,'')).trim();
  if(isCourse){
    document.addEventListener('click',ev=>{
      const a=ev.target.closest('a[href]'); if(!a)return;
      let u; try{u=new URL(a.href,location.href)}catch{return}
      if(u.origin!==location.origin && location.protocol!=='file:')return;
      const target=u.pathname.replace(/^.*?(?=learning-hub\/|projects\/|explore\/)/,'');
      if(!/^(learning-hub\/|projects\/|explore\/experiences\/)/.test(target))return;
      u.searchParams.set('from',path);
      u.searchParams.set('fromTitle',title);
      a.href=u.href;
    },true);
  }
  const qs=new URLSearchParams(location.search),from=qs.get('from'),fromTitle=qs.get('fromTitle');
  const onReturnable=/\/(learning-hub|projects)\//.test(location.pathname)||/^(learning-hub\/|projects\/)/.test(path);
  if(from&&onReturnable&&!document.querySelector('.course-origin-return')){
    const main=document.getElementById('main-content')||document.querySelector('main');
    const hero=main?.querySelector('.lesson-hero,.mode-hero,.hero,.project-hero,.directory-hero,section:first-child');
    if(hero){
      const bar=document.createElement('div');bar.className='course-origin-return experience-origin-return';
      const safe=(fromTitle||'course lesson').replace(/[<>]/g,'');
      let href=siteRoot+from;
      if(location.protocol==='file:'){try{href=new URL('../../'+from,location.href).href}catch{}}
      bar.innerHTML=`<span>Opened from <strong>${safe}</strong></span><a href="${href}">← Return to course lesson</a>`;
      hero.insertAdjacentElement('afterend',bar);
    }
  }
})();


;(() => {
  // Every static range control exposes its current value. Dynamic model controls
  // already contain their own <output>, so they are intentionally left untouched.
  const decimals=(el)=>{const s=String(el.step||'1');return s.includes('.')?s.split('.')[1].length:0};
  const valueText=(el)=>{
    const label=(el.closest('label')?.textContent||'').toLowerCase();
    const d=decimals(el), n=Number(el.value), base=Number.isFinite(n)?n.toFixed(d):el.value;
    if(/noise|prevalence|threshold|percentage|percent/.test(label)) return base+'%';
    return base;
  };
  function wireRanges(){
    document.querySelectorAll('input[type="range"]').forEach((el,i)=>{
      const label=el.closest('label,.control-block');
      if(label?.querySelector('output:not(.range-live-value)')) return;
      let out=label?.querySelector('.range-live-value');
      if(!out){out=document.createElement('output');out.className='range-live-value';out.id=el.id?`${el.id}Value`:`rangeValue${i}`;el.insertAdjacentElement('afterend',out);if(el.id)out.setAttribute('for',el.id)}
      const update=()=>{out.textContent=valueText(el);el.setAttribute('aria-valuetext',out.textContent)};
      el.addEventListener('input',update);el.addEventListener('change',update);update();
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wireRanges,{once:true});else wireRanges();
})();


// DV1.1.6 dynamic process-stage inspector
(() => {
  document.querySelectorAll('[data-dynamic-flow]').forEach(flow => {
    const shell = flow.closest('.dv116-flow-shell');
    const panel = shell?.querySelector('[data-flow-detail]');
    const payloadNode = shell?.querySelector('[data-flow-payload]');
    if (!panel || !payloadNode) return;
    let payload = [];
    try { payload = JSON.parse(payloadNode.textContent || '[]'); } catch (_) { return; }
    const buttons = [...flow.querySelectorAll('[data-flow-index]')];
    const render = (index) => {
      const item = payload[index];
      if (!item) return;
      buttons.forEach((b, i) => {
        const active = i === index;
        b.classList.toggle('active', active);
        b.setAttribute('aria-expanded', active ? 'true' : 'false');
      });
      panel.replaceChildren();
      const eyebrow = document.createElement('span'); eyebrow.className='eyebrow'; eyebrow.textContent=`Stage ${index+1}`;
      const heading = document.createElement('h3'); heading.textContent=item.label;
      const detail = document.createElement('p'); detail.className='body-copy'; detail.textContent=item.detail;
      const note = document.createElement('div'); note.className='dv116-flow-check'; note.textContent=item.note;
      panel.append(eyebrow, heading, detail, note);
    };
    buttons.forEach((b,i)=>b.addEventListener('click',()=>render(i)));
    render(0);
  });
})();
