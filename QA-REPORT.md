# UAT workflow verification

Run date: 6 November 2026. Browser: Chrome, using Playwright GUI automation and isolated browser contexts.

**Previous complete run: 14 of 14 GUI suites passed**, with no browser JavaScript errors in the covered flows. A focused customer-triage rerun also passed after the final action-status refinement. The existing server and the user’s browser data were preserved.

Locally generated evidence is saved in `test-results/gui/`: `summary.json`, `qa-finished-uat.png`, `qa-customer-invitation.png`, and `qa-beta-paused.png`. These artifacts are excluded from Git and are produced when the suite runs.

## Release workflow

The complete lifecycle was exercised through visible buttons, forms, project cards, dialogs, and customer windows. Read-only state checks verified the resulting assignments, test results, notifications, builds, and feedback.

| Stage | Expected behavior checked |
| --- | --- |
| Prepare | Register a finished build in Awaiting UAT, upload requirements, generate mock scenarios, inspect unclear requirements, edit scenarios, choose developers and testers, and approve testing. |
| Accept | Staff enter their assignment keys. Projects stay out of active lists until accepted. Each tester sees only their project’s assigned cases. |
| Execute | Instructions, data, expected results, and expandable code are available. Pass, Fail, and Blocked persist correctly. Failure reports include editable details and screenshot evidence that opens successfully. |
| Fix | The assigned developer receives the report and evidence. A meaningful change description and a different build version are required before submission for retest. |
| Retest | A failed retest reopens the same bug. A blocked retest does not resolve it. A successful retest sends the verified build to the manager. |
| Review | The manager can request changes or approve a tester-verified fix. Requested revisions return through development and retesting. Repeated approval is unavailable. |
| Finish UAT | Passing the checklist alone is insufficient while any finding remains open or awaits approval. After the final verified fix is approved, the project appears under Finished UAT testing and remains there after reload. |
| Invite | The manager moves the finished project to Customer Acceptance. An editable email draft includes that project’s invitation link and credential key. The beta uses the submitted project build. |
| Customer | Invalid and wrong-project keys fail. Setup animation leads to an interactive Windows-style planner with task creation, editing, completion, deletion, search, filters, board/list views, window controls, and saved session data. |
| Feedback | Customers queue and remove notes, retain drafts, and send a single batch to the correct project manager. Reload does not duplicate the batch. |
| Regression after invitation | A new finding immediately returns the project to UAT. Customer submission pauses without losing notes. Retesting, manager approval, and re-invitation allow the saved notes to be submitted once. |
| Shared workspace | Login, role switching, logout, numbered search, themes, profile changes, inbox read states, mock analysis, and all four live role panels work through the GUI. |

## Bugs corrected during this review

- Finished UAT previously ignored findings outside the scenario checklist. All unresolved project findings now block the customer stage.
- The project could retain an old version after a developer submitted a new build. Fix submission now updates the project version.
- Fix notes containing only whitespace could proceed. Required finding fields and fix notes now require meaningful text.
- Finding assignment menus could select developers outside the project, creating work they could not access. Menus and submission checks now use the project’s available developers.
- Manager assignment did not notify the selected developer. It now sends an exact recipient notification; notification IDs are unique even when several updates occur together.
- Invalid scenario fields could be hidden behind the sticky project heading. The offending field now scrolls into view.
- A stale customer window could submit while its project had returned to testing. Submission now checks the current stage and retains the customer’s notes.
- New findings during customer acceptance previously left that stage open until a fix was submitted. The project now returns to UAT immediately and notifies its manager.
- Repeated analysis or feedback triage actions could create duplicate findings. Submission guards now prevent that duplication.

## Reproduce the checks

Run `npm ci --ignore-scripts`, then `npm run test:gui`. Browser setup and optional settings are described in the README.

The eight suites are stored in `tests/gui/`. The latest result is `test-results/gui/summary.json`, with per-suite logs and screenshots beside it. These generated files are ignored by Git.

## Scope

These checks validate the interactive prototype and its browser-local persistence. Requirements generation, AI analysis, setup/download progress, code-analysis results, and email delivery are simulated. The test sends no real customer email. Production authentication, a shared server database, actual software builds, and real AI/email integrations are outside this prototype.

The removed Reports navigation has no visible CSV export action, so hidden report routes were not counted as a passed GUI workflow.

## Empty-workspace reset

The default workspace was subsequently cleared of sample projects, findings, assignments, notifications, feedback and beta tasks. Three generic operational role accounts remain. A separate browser check verified empty startup, no feedback reseeding, reload persistence and creating Project 1. The earlier eight-suite result records the seeded workflow regression run; automated fixtures are now explicitly isolated from normal startup.

## Browser annotation fixes — verified

All nine GUI suites passed after the annotation refinements, with no JavaScript errors in the covered flows. The team popover was checked visually and against viewport bounds. Test data now uses labeled beta-app fields; the missing-requirements panel is absent; stage controls are ordered Ready projects, UAT Testing Stage, Customer Acceptance Stage; and readable type sizes are shared across roles. The customer quarter uses the same key-entry component as login and launches the beta inside its panel. Invalid keys, UAT gating, paused sessions, saved notes and recovery were included in the regression run.

## Latest 28 annotations

- Manager progress review was renamed; acknowledged early beta sharing was added without completing UAT.
- Project and bug labels are larger; Open displays as Waiting to be fixed. Developer waiting states are neutral and show the current handoff.
- Separate developer and scenario progress use actual report/test counts. Arbitrary approval increments were removed.
- AI project summary was removed; bug details and fix-analysis text were enlarged with a clearer heading.
- Selected tester scenarios have a green quick-pass square that retains retest verification and manager approval requirements.
- Resolved bugs leave Active issues and are hidden behind Show resolved bugs in project details.
- The email composer has a ready recipient, Send email and Back, without Copy draft/Open invitation shortcuts. The full message is readable in the pane; delivery remains simulated.
- Planner task dialogs fit within the simulated application, with an internally scrolling form and visible footer.
- Customer preview and feedback banner clutter were removed. Feedback headings match, and batches have review/treatment and acceptance statuses.
- Customer-stage cards show action status, acceptance, report excerpts and review controls. Selected notes become developer findings with exact notifications and duplicate-forward protection. Existing unresolved developer bugs remain actionable when feedback is ignored.

The consolidated runner now includes developer insights, quick pass, email/task layout, early-beta customer triage and resolved views alongside the earlier lifecycle suites. New layouts were also inspected from browser screenshots.

## Home-page refresh and global reset

Focused GUI checks passed for normal staff refresh, iframe refresh, restoring all four panels at home, beta entry and saved work, cancelling reset, confirmed cross-window reset, evidence removal, theme/account preservation, stale-form write rejection, empty-state persistence and creating Project 1. Manager preparation, the full UAT lifecycle and compact desktop layouts also passed. The new runner includes 16 suites; a new complete 16-suite run has not been claimed.

## Optional realistic demo workspace

The Demo data control loads ten numbered projects after confirmation. The dataset includes two testers, accepted and pending invitations, reproducible failures, a likely duplicate from another tester, submitted builds, verified fixes awaiting approval, finished UAT and customer feedback. Dates are relative to the load date. Scenario progress and developer progress use the stored outcomes; passing internal tests alone does not mark customer acceptance complete.

The demo toggle GUI suite passed clean startup, cancelling load, loading, record-link and progress checks, approving a seeded fix, persistence after refresh, clearing from a tester panel, all four panels returning home, retained theme/accounts and rejection of stale writes. Screenshots were inspected for the normal header and four-panel layout.

The seeded-handoff suite passed a real retest and manager approval on the sample build, remaining-scenario gates, sending a finished project to customer acceptance, the prefilled invitation, an interactive beta task, feedback delivery to the exact manager and recording customer acceptance. The full UAT lifecycle, retest/revision workflow, compact layout and refresh/global-reset checks also passed. The runner now contains 18 suites; these focused runs are not a new complete 18-suite result.

Fix reviews now show the submitted build, developer notes, recorded checks and tester verification rather than a fixed confidence percentage or invented test totals. AI remains simulated in this prototype.

In demo mode, code/GUI summaries use the selected project’s recorded reports and approved-scenario counts. They do not introduce unrelated shipment findings or invented file/test totals. Bug details describe the next role’s action rather than a fixed numeric urgency score.
