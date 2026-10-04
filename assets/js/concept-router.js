(() => {
  const script=[...document.scripts].find(s=>s.src.includes('/assets/js/concept-router.js')); if(!script)return;
  const root=script.src.replace(/assets\/js\/concept-router\.js.*$/,'');
  function apply(data){
    const rel=location.href.startsWith(root)?location.href.slice(root.length).split(/[?#]/)[0]:'';
    let route=data.pages?.[rel];
    if(!route){const cfg=document.getElementById('experienceConfig');if(cfg)try{const e=JSON.parse(cfg.textContent);route=data.experiences?.[e.slug]}catch{}}
    if(!route)return;
    document.querySelectorAll('[data-concept-route]').forEach(a=>{const key=a.dataset.conceptRoute,target=route[key];if(target){let href=root+target;if(key==='explore'&&rel.startsWith('courses/')&&target.includes('explore/experiences/')){const u=new URL(href,location.href);u.searchParams.set('from',rel);u.searchParams.set('fromTitle',document.title.replace(/ — HumachLearn$/,''));href=u.href}a.href=href;a.hidden=false}else a.hidden=true});
    const dock=document.querySelector('.connection-dock'); if(!dock)return;
    const acts=dock.querySelector('.connection-actions'); if(acts){acts.innerHTML='';[['explore','Explore visually'],['reference','Go deeper'],['practice','Practise this'],['model','Open model'],['project','Use in project']].forEach(([k,label])=>{if(!route[k])return;const a=document.createElement('a');let href=root+route[k];if(k==='explore'&&rel.startsWith('courses/')&&route[k].includes('explore/experiences/')){const u=new URL(href,location.href);u.searchParams.set('from',rel);u.searchParams.set('fromTitle',document.title.replace(/ — HumachLearn$/,''));href=u.href}a.href=href;a.textContent=label;acts.appendChild(a)})}
    const p=dock.querySelector('p');if(p)p.textContent='These actions are resolved from the canonical concept map. Generic Reference/Lab-home fallbacks are intentionally not used.';
  }
  const embedded=window.HUMACHLEARN_ROUTES||window.HUMACHLEARN_CONCEPT_ROUTES;if(embedded){apply(embedded);return}
  fetch(root+'content/concept-routes.json').then(r=>r.json()).then(apply).catch(()=>{});
})();
