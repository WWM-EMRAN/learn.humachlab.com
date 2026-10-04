(() => {
  const PG=window.HumachPG,G3=window.HumachPG3;
  if(!PG||!G3||!PG.$('csApply'))return;const $=PG.$;let updating=false,step=0,timer=null;
  const steps=[
    ['make_demo_dataset','Generate X and y from the selected demonstration dataset.'],
    ['prepare_data','Split first, then fit the scaler on training data only.'],
    ['build_model','Construct the selected estimator and its hyperparameters.'],
    ['train_model','Fit the estimator using only the prepared training data.'],
    ['evaluate_model','Calculate predictions and held-out F1/accuracy.'],
    ['plot_decision_boundary','Evaluate the fitted model over a feature-space mesh and draw the separator.'],
    ['run_experiment','Orchestrate the reusable functions into one complete experiment.']
  ];
  const modelParams=()=>({k:+$('csK').value||7,depth:+$('csDepth').value||4,trees:41,C:1,lambda:.003});
  function scriptText(){const d=$('csDataset').value,m=$('csModel').value,n=+$('csNoise').value,s=+$('csSeed').value,k=+$('csK').value,depth=+$('csDepth').value;return `# HumachLearn · reusable Python version of the visual experiment
# Edit the configuration assignments, then click "Apply code".

import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_moons, make_circles, make_classification
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import f1_score, accuracy_score
from sklearn.neighbors import KNeighborsClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.naive_bayes import GaussianNB

# -----------------------------
# Experiment configuration
# -----------------------------
dataset = "${d}"
model_name = "${m}"
noise = ${n.toFixed(2)}
seed = ${s}
k = ${k}
max_depth = ${depth}


def make_demo_dataset(dataset, noise=0.28, random_state=42, n_samples=200):
    """Return a two-feature binary classification dataset."""
    rng = np.random.default_rng(random_state)
    if dataset == "moons":
        X, y = make_moons(n_samples=n_samples, noise=noise, random_state=random_state)
    elif dataset == "circles":
        X, y = make_circles(
            n_samples=n_samples, noise=noise * 0.55,
            factor=0.45, random_state=random_state
        )
    elif dataset == "xor":
        X = rng.uniform(-1.2, 1.2, size=(n_samples, 2))
        y = ((X[:, 0] > 0) ^ (X[:, 1] > 0)).astype(int)
        X += rng.normal(0, noise * 0.22, size=X.shape)
    elif dataset == "linear":
        X, y = make_classification(
            n_samples=n_samples, n_features=2, n_redundant=0,
            n_informative=2, n_clusters_per_class=1,
            class_sep=max(0.35, 1.8 - noise), random_state=random_state
        )
    else:
        raise ValueError(f"Unknown dataset: {dataset}")
    return X, y


def prepare_data(X, y, test_size=0.25, random_state=42):
    """Split first; fit StandardScaler on training data only."""
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, stratify=y, random_state=random_state
    )
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    return X_train, X_test, X_train_scaled, X_test_scaled, y_train, y_test, scaler


def build_model(model_name, k=7, max_depth=4, random_state=42):
    """Construct a classifier from a short model name."""
    models = {
        "knn": KNeighborsClassifier(n_neighbors=k),
        "logistic": LogisticRegression(max_iter=2000, random_state=random_state),
        "tree": DecisionTreeClassifier(max_depth=max_depth, random_state=random_state),
        "forest": RandomForestClassifier(
            n_estimators=100, max_depth=max_depth, random_state=random_state
        ),
        "svm": SVC(kernel="linear", C=1.0, random_state=random_state),
        "nb": GaussianNB(),
    }
    if model_name not in models:
        raise ValueError(f"Unknown model: {model_name}")
    return models[model_name]


def train_model(model, X_train, y_train):
    """Fit and return the model."""
    model.fit(X_train, y_train)
    return model


def evaluate_model(model, X_test, y_test):
    """Return held-out predictions and standard classification metrics."""
    y_pred = model.predict(X_test)
    metrics = {
        "f1": f1_score(y_test, y_pred),
        "accuracy": accuracy_score(y_test, y_pred),
    }
    return y_pred, metrics


def plot_decision_boundary(model, scaler, X_raw, y, resolution=220):
    """Draw the learned class separator in original feature coordinates."""
    pad = 0.55
    x_min, x_max = X_raw[:, 0].min() - pad, X_raw[:, 0].max() + pad
    y_min, y_max = X_raw[:, 1].min() - pad, X_raw[:, 1].max() + pad
    xx, yy = np.meshgrid(
        np.linspace(x_min, x_max, resolution),
        np.linspace(y_min, y_max, resolution)
    )
    grid_raw = np.c_[xx.ravel(), yy.ravel()]
    grid_scaled = scaler.transform(grid_raw)
    zz = model.predict(grid_scaled).reshape(xx.shape)

    plt.figure(figsize=(7, 5.5))
    plt.contourf(xx, yy, zz, alpha=0.22)
    plt.contour(xx, yy, zz, levels=[0.5], linewidths=2)
    plt.scatter(X_raw[:, 0], X_raw[:, 1], c=y, edgecolor="white", s=34)
    plt.xlabel("Feature 1")
    plt.ylabel("Feature 2")
    plt.title("Decision geometry")
    plt.tight_layout()
    return plt.gca()


def run_experiment(
    dataset="moons", model_name="knn", noise=0.28,
    seed=42, k=7, max_depth=4, show_plot=True
):
    """Run the complete reusable workflow and return its artifacts."""
    X, y = make_demo_dataset(dataset, noise=noise, random_state=seed)
    X_train, X_test, X_train_s, X_test_s, y_train, y_test, scaler = prepare_data(
        X, y, test_size=0.25, random_state=seed
    )
    model = build_model(model_name, k=k, max_depth=max_depth, random_state=seed)
    model = train_model(model, X_train_s, y_train)
    y_pred, metrics = evaluate_model(model, X_test_s, y_test)

    print(f"Held-out F1: {metrics['f1']:.3f}")
    print(f"Held-out accuracy: {metrics['accuracy']:.3f}")

    if show_plot:
        plot_decision_boundary(model, scaler, X, y)
        plt.show()

    return {
        "model": model, "scaler": scaler,
        "X_train": X_train, "X_test": X_test,
        "y_train": y_train, "y_test": y_test,
        "y_pred": y_pred, "metrics": metrics,
    }


if __name__ == "__main__":
    artifacts = run_experiment(
        dataset=dataset,
        model_name=model_name,
        noise=noise,
        seed=seed,
        k=k,
        max_depth=max_depth,
    )
`}
  function readAssign(text,name){const re=new RegExp(`^\\s*${name}\\s*=\\s*(?:["']([^"']+)["']|([-+]?\\d*\\.?\\d+))\\s*$`,'m'),m=text.match(re);return m?(m[1]??m[2]):null;}
  function updateOutputs(){$('csNoiseOut').textContent=PG.fmt(+$('csNoise').value,2);$('csKOut').textContent=$('csK').value;$('csDepthOut').textContent=$('csDepth').value;}
  function updateFunctionMap(){document.querySelectorAll('[data-cs-function]').forEach((el,i)=>el.classList.toggle('active',i===step));const info=steps[step];$('csFunctionName').textContent=info[0]+'()';$('csFunctionExplain').textContent=info[1];$('csStepCount').textContent=`${step+1}/${steps.length}`;}
  function applyCode(){const t=$('csCode').value,vals={dataset:readAssign(t,'dataset'),model:readAssign(t,'model_name'),noise:readAssign(t,'noise'),seed:readAssign(t,'seed'),k:readAssign(t,'k'),depth:readAssign(t,'max_depth')};
    if(vals.dataset&&[...$('csDataset').options].some(o=>o.value===vals.dataset))$('csDataset').value=vals.dataset;
    if(vals.model&&[...$('csModel').options].some(o=>o.value===vals.model))$('csModel').value=vals.model;
    if(vals.noise!==null)$('csNoise').value=PG.clamp(+vals.noise,.05,.8);if(vals.seed!==null)$('csSeed').value=Math.max(1,Math.round(+vals.seed));if(vals.k!==null)$('csK').value=PG.clamp(Math.round(+vals.k),1,31);if(vals.depth!==null)$('csDepth').value=PG.clamp(Math.round(+vals.depth),1,9);
    updateOutputs();render(false);$('csStatus').textContent='Configuration assignments were read from the full reusable Python script and applied to the visual.';
  }
  function render(rewrite=true){if(updating)return;updating=true;updateOutputs();const seed=+$('csSeed').value||42,kind=$('csDataset').value,noise=+$('csNoise').value,modelName=$('csModel').value,rows=G3.makeClassification(kind,200,noise,seed),sp=G3.splitRows(rows,.25,seed,true),sc=G3.fitScaler(sp.train,'standard'),tr=sc.transform(sp.train),te=sc.transform(sp.test),model=G3.fitModel(modelName,tr,{...modelParams(),seed}),met=G3.evaluate(model,te),visual={predict:(x1,x2)=>model.predict(sc.transform([{x:[x1,x2],y:0}])[0].x)},grid=G3.boundaryGrid(sp.train,visual,52);
    if(rewrite)$('csCode').value=scriptText();$('csSummary').innerHTML=`<div><small>Dataset</small><strong>${PG.esc(G3.datasetName(kind))}</strong><span>${rows.length} observations</span></div><div><small>Model</small><strong>${PG.esc(G3.modelName(modelName))}</strong><span>functions + visual aligned</span></div><div><small>Held-out F1</small><strong>${PG.fmt(met.f1,3)}</strong><span>Accuracy ${PG.fmt(met.accuracy,3)}</span></div><div><small>Noise</small><strong>${PG.fmt(noise,2)}</strong><span>Seed ${seed}</span></div>`;
    PG.plot($('csBoundary'),[...G3.boundaryTraces(grid,1),{x:sp.train.map(r=>r.x[0]),y:sp.train.map(r=>r.x[1]),type:'scatter',mode:'markers',name:'Training',marker:{size:7,opacity:.55,color:sp.train.map(r=>r.y),colorscale:[[0,'#4f7cff'],[1,'#ef7d32']],cmin:0,cmax:1}},{x:sp.test.map(r=>r.x[0]),y:sp.test.map(r=>r.x[1]),type:'scatter',mode:'markers',name:'Held-out',marker:{size:8,symbol:'diamond-open',color:sp.test.map(r=>r.y),colorscale:[[0,'#4f7cff'],[1,'#ef7d32']],cmin:0,cmax:1}}],{title:'Code ↔ visual decision geometry',xaxis:{title:'Feature 1',range:[grid.xmin,grid.xmax]},yaxis:{title:'Feature 2',range:[grid.ymin,grid.ymax]}});$('csStatus').textContent='Controls updated the full Python script and rebuilt the model visual.';updating=false;}
  function nextStep(){step=(step+1)%steps.length;updateFunctionMap();$('csStatus').textContent=`Step ${step+1}: ${steps[step][0]}() — ${steps[step][1]}`;}
  function runSteps(){if(timer){clearInterval(timer);timer=null;$('csRunSteps').textContent='Animate functions';return}step=0;updateFunctionMap();$('csRunSteps').textContent='Stop animation';timer=setInterval(()=>{if(step>=steps.length-1){clearInterval(timer);timer=null;$('csRunSteps').textContent='Animate functions';return}step++;updateFunctionMap();$('csStatus').textContent=`Function ${step+1}/${steps.length}: ${steps[step][0]}()`;},900)}
  function download(){const blob=new Blob([$('csCode').value],{type:'text/x-python'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='humachlearn_code_visual_experiment.py';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  async function copy(){try{await navigator.clipboard.writeText($('csCode').value);$('csStatus').textContent='Full Python script copied to clipboard.'}catch(e){$('csCode').select();document.execCommand('copy');$('csStatus').textContent='Full Python script copied.'}}
  ['csDataset','csModel','csNoise','csSeed','csK','csDepth'].forEach(id=>$(id).addEventListener(id==='csNoise'||id==='csK'||id==='csDepth'?'input':'change',()=>render(true)));
  $('csApply').addEventListener('click',applyCode);$('csReset').addEventListener('click',()=>{$('csDataset').value='moons';$('csModel').value='knn';$('csNoise').value=.28;$('csSeed').value=42;$('csK').value=7;$('csDepth').value=4;step=0;updateFunctionMap();render(true)});$('csNextFunction').addEventListener('click',nextStep);$('csRunSteps').addEventListener('click',runSteps);$('csDownload').addEventListener('click',download);$('csCopy').addEventListener('click',copy);updateFunctionMap();render(true);
})();
