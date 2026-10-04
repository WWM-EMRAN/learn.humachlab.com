# HumachLearn release notes

## DV1.1.6

Refinement release built directly from the completed DV1.1.5 package while keeping all unrelated content and functionality unchanged.

### Requested refinements

- Replaced simple five-box concept flows with clickable process-stage inspectors on topics where a sequential mechanism genuinely helps understanding.
- Removed process-flow widgets from topics where a sequence would be artificial or decorative.
- Each retained flow now exposes a topic-specific stage description and a verification/state checkpoint when clicked.
- Expanded all 446 course Textbook walkthroughs with a deeper mechanism-and-evidence layer derived from each lesson's own explanation, worked demonstration and verification guidance.
- Added selected SVG visual demonstrations only where a diagram materially clarifies the topic (for example execution state, joins, regression, classification, missing data, PCA, clustering, cross-validation, neural networks and time-series validation).
- Expanded Explore worked-exploration guidance with prediction, before/after evidence and failure-case prompts; selected Explore topics also receive static orientation diagrams alongside the existing interactive visual.
- Added substantially more step-level comments to Python, SQL and Bash code blocks across the learning site while preserving runnable Python syntax.

### Preserved

- DV1.0.0 baseline structure and design language.
- DV1.1.2 Phase-2 reusable Code ↔ Visualisation and correlation / correlation-feature-selection functionality.
- DV1.1.5 lesson coverage, Explore catalogue, labs, navigation and learner-facing no-reference policy.

## DV1.1.5

Rebuilt instructional release based on the clean DV1.0.0 baseline with the accepted DV1.1.2 Phase-2 functionality carried forward.

### Course content

- Rebuilt all 446 course lessons with substantial, topic-specific instructional content.
- Replaced the earlier repeated “identify/apply/inspect” style filler with book/tutorial-grade explanations and demonstrations.
- Added topic-appropriate mechanism steps, code/output where relevant, interpretation, comparisons, boundary conditions, mistakes, verification and practice.
- Corrected domain misclassification in generated lesson content, including SQL window functions, ML dot products/losses, NumPy aggregations, spreadsheet operations, visualisation lessons, file handling and project/capstone stages.
- Expanded the Python Interpreter / Scripts / Notebooks lesson with interactive execution, runtime state, script mode, notebook kernels/cells, out-of-order execution and reproducibility checks.
- Removed learner-facing source/reference sections and named source references.

### Explore and labs

- Expanded all 36 catalogued Explore experiences with mechanism, technical depth, practitioner guidance, worked exploration and failure/boundary reasoning.
- Preserved the dedicated interactive Correlation Analysis experience from Phase 2 and strengthened its Pearson/Spearman, scatter-plot, outlier and causality guidance.
- Replaced generic lab guidance across all 36 root labs with experiment-specific explanations, failure modes, verification checks and deliberate experiment tasks.

### Phase-2 functionality retained

- Reusable Code ↔ Visualisation Python functions.
- Correlation analysis core and course/Explore integration.
- Correlation-based feature selection with redundancy filtering.

### Quality assurance

- Validated local links and anchors across the complete static site.
- Validated JSON parsing and JavaScript syntax.
- Parsed every learner Python code block with Python AST validation.
- Checked lesson section completeness and source-reference removal.
- Checked Phase-2 feature preservation and DV1.1.5 release identity.

## DV1.1.2

Phase-2 release built from DV1.0.0, adding reusable Python functions to Code ↔ Visualisation and correlation/correlation-feature-selection coverage across the learning environment.

## DV1.0.0

Clean deployment baseline for the DV1 development line.