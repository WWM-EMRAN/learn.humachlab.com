(() => {
  const a = document.getElementById('compareA');
  const b = document.getElementById('compareB');
  const grid = document.getElementById('compareGrid');
  if (!a || !b || !grid) return;

  const script = [...document.scripts].find(s => s.src.includes('/assets/js/compare.js'));
  const root = script?.src.replace(/assets\/js\/compare\.js.*$/, '') || '../';
  let models = [];

  const comparisonPairs = {
    'decision-tree': ['decision_tree_classifier', 'random_forest_classifier'],
    'decision_tree_classifier': ['decision_tree_classifier', 'random_forest_classifier'],
    'random-forest': ['random_forest_classifier', 'xgboost_classifier'],
    'random_forest_classifier': ['random_forest_classifier', 'xgboost_classifier'],
    'knn': ['knn_classifier', 'support_vector_classifier'],
    'knn_classifier': ['knn_classifier', 'support_vector_classifier'],
    'svm': ['support_vector_classifier', 'logistic_regression'],
    'support_vector_classifier': ['support_vector_classifier', 'logistic_regression'],
    'logistic-regression': ['logistic_regression', 'support_vector_classifier'],
    'logistic_regression': ['logistic_regression', 'support_vector_classifier'],
    'boosting': ['xgboost_classifier', 'random_forest_classifier'],
    'xgboost': ['xgboost_classifier', 'random_forest_classifier'],
    'xgboost_classifier': ['xgboost_classifier', 'random_forest_classifier'],
    'decision-tree-regression': ['decision_tree_regressor', 'random_forest_regressor'],
    'random-forest-regression': ['random_forest_regressor', 'xgboost_regressor'],
    'svr': ['support_vector_regressor', 'knn_regressor']
  };

  function indexBySlug(slug) {
    return models.findIndex(m => m.slug === slug);
  }

  function resolveInitialPair() {
    const params = new URLSearchParams(window.location.search);
    const q = (params.get('q') || '').trim().toLowerCase();
    const explicitA = (params.get('a') || '').trim();
    const explicitB = (params.get('b') || '').trim();

    let slugs = null;
    if (explicitA && explicitB) slugs = [explicitA, explicitB];
    else if (comparisonPairs[q]) slugs = comparisonPairs[q];
    else if (q) {
      const slugCandidate = q.replace(/-/g, '_');
      const found = models.find(m => m.slug === q || m.slug === slugCandidate || m.name.toLowerCase().includes(q.replace(/-/g, ' ')));
      if (found) {
        const sameTask = /regress/i.test(found.name) ? 'regressor' : 'classifier';
        const fallback = models.find(m => m.slug !== found.slug && m.slug.includes(sameTask)) || models.find(m => m.slug !== found.slug);
        slugs = [found.slug, fallback?.slug];
      }
    }

    if (!slugs) slugs = ['random_forest_classifier', 'xgboost_classifier'];
    let ia = indexBySlug(slugs[0]);
    let ib = indexBySlug(slugs[1]);
    if (ia < 0) ia = 0;
    if (ib < 0 || ib === ia) ib = Math.min(ia === 0 ? 1 : 0, models.length - 1);
    return [ia, ib];
  }

  fetch(root + 'content/models.json')
    .then(r => r.json())
    .then(d => {
      models = d.filter(m => m.description && m.slug);
      const opts = models.map((m, i) => `<option value="${i}">${m.name}</option>`).join('');
      a.innerHTML = opts;
      b.innerHTML = opts;
      const [ia, ib] = resolveInitialPair();
      a.value = String(ia);
      b.value = String(ib);
      render();
    })
    .catch(() => {
      grid.innerHTML = '<div class="visual-fallback">Model comparison data could not be loaded. Open this page through a static web server or GitHub Pages.</div>';
    });

  const pill = s => `<span class="compare-pill">${s || '—'}</span>`;

  function card(m, label) {
    return `<article class="compare-model"><span class="eyebrow">${label}</span><h2>${m.name}</h2><div class="compare-taxonomy"><span><b>Paradigm</b>${m.paradigm||'—'}</span><span><b>Task</b>${m.taskLabel||m.task||'—'}</span><span><b>Family</b>${m.subcategory||m.family||'—'}</span></div><div class="compare-tags">${pill(m.paradigm)}${pill(m.subcategory)}</div><p>${m.description}</p><dl><dt>Mechanism</dt><dd>${m.mechanism || '—'}</dd><dt>Strengths</dt><dd>${m.strengths || '—'}</dd><dt>Limitations</dt><dd>${m.limitations || '—'}</dd><dt>Typical use</dt><dd>${m.useCases || '—'}</dd></dl><a class="btn btn-secondary" href="../models/${m.slug}.html">Open full model page</a></article>`;
  }

  function render() {
    const A = models[Number(a.value)];
    const B = models[Number(b.value)];
    if (!A || !B) return;
    grid.innerHTML = card(A, 'Model A') + `<div class="compare-axis"><span>Mechanism</span><span>Bias / variance</span><span>Interpretability</span><span>Tuning</span><span>Inference</span></div>` + card(B, 'Model B');
  }

  a.addEventListener('change', render);
  b.addEventListener('change', render);
  document.getElementById('swapModels')?.addEventListener('click', () => {
    const x = a.value;
    a.value = b.value;
    b.value = x;
    render();
  });
})();
