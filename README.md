# HumachLearn

HumachLearn is a static-first learning environment for programming, data analytics, data science and machine learning. It combines structured courses, book-style topic walkthroughs, interactive Explore experiences, model visualisations, practice labs and case-study projects in a GitHub Pages-ready package.

**Public release:** DV1.1.6  
**Clean baseline:** DV1.0.0  
**Phase-2 functionality carried forward:** DV1.1.2

## What is new in DV1.1.6

DV1.1.6 is a focused refinement of the completed DV1.1.5 site. It keeps the DV1.1.5 structure, lesson catalogue, Explore catalogue, labs, model visualisers and Phase-2 functionality unchanged except for the three requested presentation improvements below.

- **Dynamic process explanations:** course process flows are now retained only where a sequential mechanism is useful. The retained flows are clickable and reveal a topic-specific stage explanation plus a checkpoint describing what state/evidence to inspect.
- **Deeper textbook walkthroughs:** all 446 course lessons now add a deeper mechanism-and-evidence layer inside the Textbook walkthrough. Selected topics also include a purpose-built static SVG demonstration where a diagram materially improves understanding; diagrams are not added to every topic.
- **More explanatory code:** parseable Python examples now include step-level comments that explain what each meaningful statement is doing and what state/result it creates. SQL and Bash examples are similarly annotated where present.
- **Explore refinements:** Explore experiences receive the same evidence-first reasoning prompts; process flows are dynamic only where useful, and selected experiences include static orientation diagrams alongside the existing interactive visual.
- All unrelated DV1.1.5 content and behaviour remain unchanged. Learner-facing course/Explore/lab pages continue to omit source-reference and bibliography blocks.

## DV1.1.2 features preserved

- Reusable Python functions in **Code ↔ Visualisation**.
- Correlation analysis integrated across course, Explore and playground surfaces.
- Correlation-based feature selection with feature-target association and redundancy filtering.

## Main areas

- `learn/` — curated learning paths
- `courses/` — guided courses and 446 detailed lesson pages
- `explore/` — flagship concept experiences and the Concept Atlas
- `reference/` and `learning-hub/` — deeper reference material
- `models/` — interactive model visualisations
- `labs/` — experiment-oriented analytics, data-science and machine-learning playgrounds
- `projects/` — case-study projects
- `assets/logos/` — ten learning-themed icon-only HumachLearn marks
- `VALIDATION.json` — machine-readable release validation results

## Deployment

Extract the package into the root of a GitHub Pages repository. `index.html` is at the project root and `.nojekyll` is included. No server-side runtime is required for the core site.

## Release identity

Learner-facing pages identify this deployment as **DV1.1.6**.
