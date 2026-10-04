(() => {
  const names={python:'Python',sql:'SQL',excel:'Excel formula / steps',powerquery:'Power Query M',bash:'Shell',text:'Text'};
  function attachCopyButtons(){
    document.querySelectorAll('.code-wrap').forEach(wrap=>{
      if(wrap.querySelector('.code-toolbar')) return;
      const code=wrap.querySelector('pre code'); if(!code)return;
      const lang=wrap.dataset.codeLanguage||(/language-([\w-]+)/.exec(code.className)||[])[1]||'code';
      const bar=document.createElement('div');bar.className='code-toolbar';
      const label=document.createElement('span');label.textContent=names[lang]||lang.toUpperCase();
      const btn=document.createElement('button');btn.type='button';btn.className='copy-code-btn';btn.textContent='Copy code';
      btn.addEventListener('click',async()=>{let ok=false;try{await navigator.clipboard.writeText(code.innerText);ok=true}catch{}if(!ok){try{const range=document.createRange();range.selectNodeContents(code);const sel=getSelection();sel.removeAllRanges();sel.addRange(range);document.execCommand('copy');sel.removeAllRanges();ok=true}catch{}}btn.textContent=ok?'Copied ✓':'Select and copy';btn.classList.toggle('copied',ok);setTimeout(()=>{btn.textContent='Copy code';btn.classList.remove('copied')},1600)});
      bar.append(label,btn);wrap.prepend(bar);
    });
    document.querySelectorAll('.output-card').forEach(o=>{if(o.querySelector('.output-label'))return;const first=o.querySelector('span');if(!first)return;const row=document.createElement('div');row.className='output-label';first.before(row);row.append(first);const badge=document.createElement('span');badge.className='output-badge';badge.textContent='Output';row.append(badge)});
  }
  window.addEventListener('DOMContentLoaded',attachCopyButtons);window.HumachCode={attachCopyButtons};
})();
