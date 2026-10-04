(() => {
 const q=document.getElementById('hubSearch'),root=document.getElementById('hubDirectory'),status=document.getElementById('hubSearchStatus');if(!root)return;
 const all=()=>[...root.querySelectorAll('details')];
 document.getElementById('hubExpandAll')?.addEventListener('click',()=>all().forEach(d=>d.open=true));
 document.getElementById('hubCollapseAll')?.addEventListener('click',()=>all().forEach(d=>d.open=false));
 function filter(){const term=(q?.value||'').toLowerCase().trim();let shown=0;root.querySelectorAll('[data-hub-search]').forEach(el=>{const hit=!term||el.dataset.hubSearch.toLowerCase().includes(term);el.classList.toggle('hidden',!hit);if(hit){shown++;if(term){let p=el.parentElement;while(p&&p!==root){if(p.tagName==='DETAILS')p.open=true;p=p.parentElement}}}});root.querySelectorAll('.hub-topic').forEach(t=>t.classList.toggle('hidden',!!term&&!t.querySelector('[data-hub-search]:not(.hidden)')));root.querySelectorAll('.hub-stage').forEach(s=>s.classList.toggle('hidden',!!term&&!s.querySelector('[data-hub-search]:not(.hidden)')));if(status)status.textContent=term?`${shown} matching lessons`:'Browse by workflow stage or search a concept.'}
 q?.addEventListener('input',filter);
})();
