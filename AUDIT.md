# HumachLearn DV1.1.6 production audit

**Public release:** DV1.1.6  
**Baseline:** DV1.0.0  
**Phase-2 functionality preserved from:** DV1.1.2

DV1.1.6 is a refinement release built directly from the completed DV1.1.5 package. It preserves the DV1.0.0 baseline lineage and the accepted DV1.1.2 Phase-2 features while changing only the requested explanatory presentation.

## Instructional-content audit

- Course metadata defines **446 lesson topics**, and all 446 corresponding lesson files are present.
- Every course lesson contains the required concept, mechanism, worked demonstration, practice, knowledge-check and quick-reference sections.
- The shortest course lesson contains more than 600 words of main learning content; average lesson length is approximately 790 words.
- Generic fallback markers from the rejected content pattern were removed from course, Explore and lab teaching surfaces.
- Topic-specific material was strengthened for Python execution and state, files/environments, NumPy, pandas, SQL, spreadsheets, statistics, EDA, visualisation, preprocessing, validation/leakage, predictive modelling, evaluation, interpretation and capstone/project stages.
- **36 catalogued Explore experiences** are present. A dedicated additional Correlation Analysis experience from Phase 2 is also retained, giving 37 non-index experience pages in the package.
- All **36 root labs/playgrounds** include experiment-specific concept guidance, mechanism, failure mode, verification and deliberate-experiment instructions.
- Learner-facing course, Explore and lab teaching surfaces contain no resource/reference sections or named source references.

## Phase-2 preservation audit

Verified present and connected:

- `assets/js/correlation-core.js`
- `assets/js/code-visual-sync-v7.js`
- `labs/correlation-feature-selection.html`
- Data Analytics correlation demonstration
- Data Science correlation-feature-selection integration

## Structural and code validation

The final automated validation checks:

- **1,385 HTML files** in the complete site
- zero broken local file/anchor references
- zero duplicate-ID pages
- all JSON files parse successfully
- all **63 JavaScript files under `assets/js`** pass `node --check`
- all **446 course lessons** contain the new deeper Textbook walkthrough layer
- **321 course lessons** retain a dynamic process inspector and **125 lessons** intentionally omit a process flow because a sequential widget would be artificial
- **144 course lessons** and **18 Explore experiences** include selected visual demonstrations; the rest intentionally remain text/interactive-only
- all **849 Python code blocks that were syntactically parseable in DV1.1.5 remain parseable in DV1.1.6**, with zero syntax regressions
- all 849 of those parseable Python blocks contain step-level explanatory comments
- zero learner-facing old-version labels in HTML pages
- zero learner-facing source-reference markers in course lessons
- all required Phase-2 preservation checks pass

Exact final counts and diagnostic details are stored in `VALIDATION.json`.

## Deployment smoke-test targets

The release is intended to serve directly from a static HTTP server or GitHub Pages. Final smoke checks cover the home page, the detailed Python interpreter lesson, SQL window-functions lesson, correlation course/Explore/lab surfaces and representative Explore pages.


## DV1.1.6 refinement audit

DV1.1.6 intentionally preserves the DV1.1.5 site structure and feature set. The release changes only the requested explanatory presentation: conditional dynamic flows, deeper textbook walkthroughs, selected topic diagrams, and more detailed code comments. Automated validation is recorded in `VALIDATION.json`.
