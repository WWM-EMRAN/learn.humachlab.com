(() => {
  const PG = window.HumachPG;
  const G2 = window.HumachPG2;
  const $ = PG.$;
  const ds = $('nnData');
  const layersEl = $('nnLayers');
  const neuronsEl = $('nnNeurons');
  const actEl = $('nnActivation');
  const lrEl = $('nnLR');
  const seedEl = $('nnSeed');
  if (!ds || !G2) return;

  let data = [];
  let net = null;
  let epoch = 0;
  let history = [];
  let timer = null;
  const sigmoid = G2.sigmoid;

  function hiddenAct(z) {
    if (actEl.value === 'relu') return Math.max(0, z);
    if (actEl.value === 'sigmoid') return sigmoid(z);
    return Math.tanh(z);
  }

  function hiddenDeriv(z) {
    if (actEl.value === 'relu') return z > 0 ? 1 : 0;
    if (actEl.value === 'sigmoid') {
      const a = sigmoid(z);
      return a * (1 - a);
    }
    const a = Math.tanh(z);
    return 1 - a * a;
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
      $('nnTrain').textContent = 'Train 100 epochs';
    }
  }

  function init() {
    stop();
    const seed = +seedEl.value || 42;
    const rand = PG.mulberry32(seed);
    const normal = () => PG.normal(rand);
    const sizes = [2, ...Array(+layersEl.value).fill(+neuronsEl.value), 1];
    const W = [];
    const b = [];
    for (let l = 1; l < sizes.length; l++) {
      const scale = Math.sqrt(2 / (sizes[l - 1] + sizes[l]));
      W.push(Array.from({length: sizes[l]}, () =>
        Array.from({length: sizes[l - 1]}, () => normal() * scale)
      ));
      b.push(Array(sizes[l]).fill(0));
    }
    net = {sizes, W, b};
    epoch = 0;
    history = [];
    data = G2.makeClassData(ds.value, 160, 0.075, seed + 7);
    evaluateAndRender('Network initialised with random weights.');
  }

  function forward(x, y) {
    const A = [[x, y]];
    const Z = [];
    for (let l = 0; l < net.W.length; l++) {
      const prev = A[A.length - 1];
      const z = net.W[l].map((row, j) =>
        row.reduce((sum, w, i) => sum + w * prev[i], net.b[l][j])
      );
      const last = l === net.W.length - 1;
      const a = last ? z.map(sigmoid) : z.map(hiddenAct);
      Z.push(z);
      A.push(a);
    }
    return {A, Z, p: A[A.length - 1][0]};
  }

  function trainEpoch() {
    const gW = net.W.map(M => M.map(row => row.map(() => 0)));
    const gb = net.b.map(v => v.map(() => 0));
    let totalLoss = 0;

    for (const d of data) {
      const f = forward(d.x, d.y);
      const p = PG.clamp(f.p, 1e-7, 1 - 1e-7);
      totalLoss += -(d.label * Math.log(p) + (1 - d.label) * Math.log(1 - p));
      let delta = [p - d.label];

      for (let l = net.W.length - 1; l >= 0; l--) {
        const prev = f.A[l];
        for (let j = 0; j < delta.length; j++) {
          gb[l][j] += delta[j];
          for (let i = 0; i < prev.length; i++) {
            gW[l][j][i] += delta[j] * prev[i];
          }
        }

        if (l > 0) {
          const next = Array(prev.length).fill(0);
          for (let i = 0; i < prev.length; i++) {
            let sum = 0;
            for (let j = 0; j < delta.length; j++) {
              sum += net.W[l][j][i] * delta[j];
            }
            next[i] = sum * hiddenDeriv(f.Z[l - 1][i]);
          }
          delta = next;
        }
      }
    }

    const lr = +lrEl.value / 1000;
    const n = data.length;
    for (let l = 0; l < net.W.length; l++) {
      for (let j = 0; j < net.W[l].length; j++) {
        net.b[l][j] -= lr * gb[l][j] / n;
        for (let i = 0; i < net.W[l][j].length; i++) {
          net.W[l][j][i] -= lr * gW[l][j][i] / n;
        }
      }
    }
    epoch++;
    return totalLoss / n;
  }

  function metrics() {
    const probs = data.map(d => forward(d.x, d.y).p);
    const m = PG.binaryMetrics(data.map(d => d.label), probs, 0.5);
    const loss = PG.mean(data.map((d, i) => {
      const p = PG.clamp(probs[i], 1e-7, 1 - 1e-7);
      return -(d.label * Math.log(p) + (1 - d.label) * Math.log(1 - p));
    }));
    return {...m, loss};
  }

  function renderBoundary() {
    const predict = (x, y) => forward(x, y).p;
    PG.plot($('nnBoundary'), G2.boundaryTraces(data, predict), {
      xaxis: {title: 'Input x₁', gridcolor: PG.theme().grid},
      yaxis: {title: 'Input x₂', gridcolor: PG.theme().grid, scaleanchor: 'x'},
      legend: {orientation: 'h', x: 0.5, xanchor: 'center', y: 1.1},
      uirevision: 'nn-boundary'
    });
  }

  function renderNetwork(px = +$('nnProbeX').value, py = +$('nnProbeY').value) {
    const f = forward(px, py);
    const names = ['Input', ...Array(+layersEl.value).fill(0).map((_, i) => `Hidden ${i + 1}`), 'Output'];
    const layers = f.A.map((a, l) => {
      const nodes = a.map((v, i) => `<span class="pg-neuron" title="${names[l]} ${i + 1}">${PG.fmt(v, 2)}</span>`).join('');
      const arrow = l < f.A.length - 1 ? '<span class="pg-network-arrow">→</span>' : '';
      return `<div class="pg-network-layer"><small>${names[l]}</small><div>${nodes}</div></div>${arrow}`;
    }).join('');
    $('nnNetwork').innerHTML = layers + `<div class="pg-network-result"><strong>p(class 1) = ${PG.fmt(f.p, 3)}</strong><small>probe (${PG.fmt(px, 2)}, ${PG.fmt(py, 2)})</small></div>`;
  }

  function evaluateAndRender(status) {
    const m = metrics();
    renderBoundary();
    PG.plot($('nnLoss'), [{
      x: history.map((_, i) => i + 1),
      y: history,
      type: 'scatter',
      mode: 'lines',
      name: 'Binary cross-entropy',
      line: {color: '#8b5cf6', width: 3}
    }], {
      xaxis: {title: 'Epoch', gridcolor: PG.theme().grid},
      yaxis: {title: 'Loss', gridcolor: PG.theme().grid},
      showlegend: false,
      margin: {t: 20}
    });
    renderNetwork();
    const params = net.W.reduce((sum, M, l) => sum + M.reduce((q, row) => q + row.length, 0) + net.b[l].length, 0);
    $('nnMetrics').innerHTML = `<div><small>Epoch</small><strong>${epoch}</strong></div><div><small>Loss</small><strong>${PG.fmt(m.loss,4)}</strong></div><div><small>Accuracy</small><strong>${PG.fmt(m.accuracy,3)}</strong></div><div><small>F1</small><strong>${PG.fmt(m.f1,3)}</strong></div><div><small>Hidden layers</small><strong>${layersEl.value}</strong></div><div><small>Parameters</small><strong>${params}</strong></div>`;
    $('nnStatus').textContent = status || `Epoch ${epoch} · loss ${m.loss.toFixed(4)}.`;
    $('nnExplain').innerHTML = `<h3>From weighted sums to a nonlinear boundary</h3><p>Each hidden neuron computes a weighted sum and applies <strong>${actEl.value}</strong>. The output neuron uses a sigmoid to produce a probability. Backpropagation propagates the output error through the same weights and updates every parameter by gradient descent.</p><p>The probe panel exposes intermediate activations for one input. Change the probe coordinates to see which hidden units respond.</p>`;
  }

  function oneEpoch() {
    history.push(trainEpoch());
    evaluateAndRender(`Completed epoch ${epoch}.`);
  }

  function run() {
    if (timer) {
      stop();
      return;
    }
    let remaining = 100;
    $('nnTrain').textContent = 'Pause';
    timer = setInterval(() => {
      for (let i = 0; i < 5 && remaining > 0; i++) {
        history.push(trainEpoch());
        remaining--;
      }
      evaluateAndRender(`Training… epoch ${epoch}.`);
      if (remaining <= 0) stop();
    }, 80);
  }

  $('nnReset').addEventListener('click', init);
  $('nnStep').addEventListener('click', () => { stop(); oneEpoch(); });
  $('nnTrain').addEventListener('click', run);
  $('nnProbe').addEventListener('click', () => renderNetwork());
  [ds, layersEl, neuronsEl, actEl, seedEl].forEach(el => el.addEventListener('change', init));
  lrEl.addEventListener('input', () => { $('nnLROut').textContent = (+lrEl.value / 1000).toFixed(3); });
  layersEl.addEventListener('input', () => { $('nnLayersOut').textContent = layersEl.value; });
  neuronsEl.addEventListener('input', () => { $('nnNeuronsOut').textContent = neuronsEl.value; });
  addEventListener('humach-theme-change', () => evaluateAndRender());
  init();
})();
