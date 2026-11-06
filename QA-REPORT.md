# UAT workflow verification

Run date: 6 November 2026. Browser: Chrome, using Playwright GUI automation and isolated browser contexts.

**Final result: 8 of 8 GUI suites passed, with no browser JavaScript errors in the covered flows.** The consolidated run finished at 12:56 UTC and tested the final application changes. Every suite exited successfully. The existing app server and the user’s browser session were preserved.

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
