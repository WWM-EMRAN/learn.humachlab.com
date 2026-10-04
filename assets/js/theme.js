(() => {
  const KEY='humachlearn-theme';
  const media=window.matchMedia?.('(prefers-color-scheme: dark)');
  const read=()=>{try{return localStorage.getItem(KEY)||'system'}catch{return 'system'}};
  const write=v=>{try{localStorage.setItem(KEY,v)}catch{}};
  const resolved=choice=>choice==='system'?(media?.matches?'dark':'light'):choice;
  function apply(choice=read()){
    const mode=resolved(choice); document.documentElement.dataset.theme=mode; document.documentElement.dataset.themeChoice=choice;
    document.querySelectorAll('[data-theme-choice]').forEach(b=>{const on=b.dataset.themeChoice===choice;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});
    window.dispatchEvent(new CustomEvent('humach-theme-change',{detail:{choice,resolved:mode}}));
  }
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-theme-choice]');if(!b)return;write(b.dataset.themeChoice);apply(b.dataset.themeChoice)});
  media?.addEventListener?.('change',()=>{if(read()==='system')apply('system')});
  window.HumachTheme={apply,preferred:read,resolved};apply();
})();
