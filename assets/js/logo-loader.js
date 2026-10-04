(() => {
  const cfg=window.HUMACHLEARN_CONFIG?.brand?.logo||{};const opts=cfg.options||['open-book'];let id=cfg.fixed||opts[0];
  const pick=()=>opts[Math.floor(Math.random()*opts.length)];
  try{if(cfg.mode==='random')id=pick();else if(cfg.mode==='daily'){const n=Math.floor(Date.now()/86400000);id=opts[n%opts.length]}else if(cfg.mode==='session'){id=sessionStorage.getItem('humachlearn-logo')||pick();sessionStorage.setItem('humachlearn-logo',id)}}catch(e){if(cfg.mode!=='fixed')id=pick()}
  const script=[...document.scripts].find(s=>s.src.includes('/assets/js/logo-loader.js'));const root=script?script.src.replace(/assets\/js\/logo-loader\.js.*$/,''):'';const src=root+'assets/logos/'+id+'.svg';
  document.documentElement.dataset.logo=id;
  document.querySelectorAll('.brand-mark').forEach(mark=>{mark.innerHTML=`<img alt="" class="brand-logo-svg" src="${src}">`;mark.classList.add('brand-mark-svg')});
  const fav=document.querySelector('link[rel="icon"]');if(fav)fav.href=src;
})();