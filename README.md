> The app now starts with an empty workspace and four operational accounts (manager, developer, and two testers). Reloading once clears the previous saved demo data. New records persist normally afterward. Sample fixtures are loaded only by the automated GUI tests.

# Pre-Shipment · By Pfizer

A polished, interactive desktop-style web prototype. Everything runs in the browser with realistic sample data. AI analysis, tests, emails, credentials, and approvals are simulations. No backend, API keys, email service, ZIP extraction, or real authentication are used.

## Open the prototype

Open `dist/index.html` in a modern browser, or run `node serve.mjs` and visit `http://127.0.0.1:4173`.

Demo manager sign-in uses **admin** / **admin**.

Choose **Sign In** for the manager, developer, and tester workspaces. The employee sign-in page has demo shortcuts, and the profile menu lets you switch between workspaces. Newly assigned employees can sign in with the email and password in their generated job assignment email. They need their assignment key to start work.

The demo contains **Project 1** through **Project 10**. Project lists and findings are ordered by project number. Findings for the same project stay together, with unresolved items before resolved ones. Existing saved projects are renamed consistently, and additional projects keep their data with the next available project number.

The manager’s **Project stages** page has **UAT Testing Stage**, **Customer Acceptance Stage**, and **Awaiting UAT**. Awaiting UAT lists finished development builds that have not started acceptance testing. Open one and select **Generate UAT scenarios ready for the tester**. You can add a requirements document or use the built-in planner requirements. Review the scenarios, choose developers and testers, then select **Approve project and start UAT testing**.

The tester dashboard shows pending invitations separately from accepted projects. Assignment keys are prefilled. Confirm the key to put a project in the active list, then open that project for its own case queue. The project’s team is available beside the work. Findings use larger project labels so the project is clear before opening a bug.

Each case includes instructions, test data, expected results, and an expandable code snippet. Record **Pass**, **Fail**, or **Blocked**. A failed case produces a structured bug report for development. Screenshot and video attachments up to 25 MB stay in this browser profile and can be opened from the developer’s bug view.

Developers submit fixes with a new build version. The original case returns to its tester. Passing sends the verified fix to the manager for approval. Manager approval resolves the bug. A failed retest reopens it. The manager can request another revision.

Once every approved case passes and its linked bug fixes have manager approval, the manager can select **Send to Customer Acceptance Stage**. This creates an editable customer email draft with a beta access key. Email delivery is simulated.

Choose **Open Your Beta Version** and select the customer-stage project. Its access key is already filled in. The beta opens with simulated setup and runs an interactive task planner in a Windows-style window. Create, edit, complete and delete tasks, search, filter priorities, switch between list and board, and try the window controls. Task changes persist in that beta session. Use the adjacent notes panel and **Send Feedback & Finish** to deliver feedback to the project manager.

Use **Open four panels** at the bottom right to work with the manager, developer, tester, and customer on the same project at once. Each window fills a quarter of the screen with one compact row for its portrait, role, account, and actions. Select the shared project beside the customer’s name; these controls follow whichever panel you expand. **Normal view** returns to the regular layout and preserves the live panels. Theme, notifications, and settings remain available in each staff header.

The customer panel shows the beta entry form used at login. After the manager’s customer-acceptance handoff, its key is prefilled; choose Open to run setup and use the beta inside the panel. Staff still accept project invitations. Notifications go to the assigned developer, the case’s tester, or the project manager. Open tester cases update when a new build arrives.

A project’s urgency comes from unfinished work. **Finished UAT testing** requires every approved case to pass and every project finding to be resolved after tester verification and manager approval. This includes exploratory findings outside the original checklist. The badge then becomes **UAT complete**, and the manager can send the customer invitation.

Submitted fix builds become the current project version. A new finding during customer acceptance returns the project to UAT immediately. Customer submission pauses, and existing beta notes stay saved until the manager approves the new testing cycle and reopens customer acceptance.

Staff handoffs, evidence, and customer feedback use the same browser profile and app address. AI document analysis and bug summaries use mock data. TXT, Markdown, and CSV text can shape the sample scenario suggestions.

## Suggested demonstration

1. Sign in as the manager with **admin / admin**.
2. Select **New project** to register **Project 1** in Awaiting UAT.
3. Generate scenarios, review them, and select the Developer and Tester accounts.
4. Approve testing, then switch roles and accept the generated assignments.
5. Execute the cases, report findings, submit fixes, retest, and approve verified fixes.
6. Send the finished UAT project to Customer Acceptance and open its generated invitation.
7. Create tasks in the empty beta planner, collect notes, and send feedback to the manager.

Settings → **Reset workspace** clears project activity without restoring sample records.

**New project** registers another finished build in Awaiting UAT with the next project number.

Light and dark themes, project filters, search, notifications, editable profiles, team roles, CSV exports, and reset controls are included. Changes persist in this browser’s local storage. Settings → Reset demo data restores the original samples.

## Files

- `dist/index.html`: entry point
- `dist/styles.css`: app shell, login, customer beta
- `dist/app.js`: navigation, shared state, manager tools
- `dist/beta.js`, `dist/beta.css`: entry choices, beta access, simulated setup, and customer session notes
- `dist/data.js`: fictional demo projects, employees, issues, and feedback
- `dist/uat-workflow.js`: test results, linked bugs, retesting, stage gates, and local evidence storage
- `dist/uat-manager.js`, `dist/uat-manager.css`: requirements, scenarios, assignments, and project stages
- `dist/uat-tester.js`, `dist/uat-tester.css`: assigned case checklist and reporting
- `dist/uat-overview.js`, `dist/uat-overview.css`: stacked projects and the right dashboard
- `dist/four-view.js`, `dist/four-view.css`: four live role panels, focus controls, and normal-view toggle
- `dist/project-priority.js`, `dist/project-priority.css`: priority sorting and colors
- `dist/workspaces.js`, `dist/workspaces.css`: employee workspaces and workflows
- `dist/pfizer.svg`: Pfizer logo from an official Pfizer website
- `dist/avatars/`: illustrative profile portraits
- `dist/fonts/`: local fonts and their open font licenses
- `dist/asset-sources.json`: asset source notes

All interface fonts, images, and code are bundled locally. This is a concept demonstration and does not imply an official Pfizer product or affiliation. Role permissions and preview windows are UI simulations, not security controls. Customer links for newly created projects share this browser’s saved demo state; a different browser starts with the sample portfolio.

## Verification

Run the browser regression suite with Node.js 20 or later:

```sh
npm ci --ignore-scripts
npm run test:gui
```

The runner uses installed Chrome on Windows or Playwright Chromium. If neither is available, run `npx playwright install chromium`. Set `CHROME_PATH` to choose a browser, `BASE_URL` to test another running instance, or `GUI_HEADLESS=0` to watch the browser. Tests use isolated browser contexts and preserve your demo session. The runner reuses the running local server; when it starts its own server, it stops only that process afterward.

Eight GUI suites cover preparation, the complete UAT lifecycle, retest/revision gates, finding routing, customer interactions, paused beta sessions, common workspace controls, and the compact four-panel layout. Logs, screenshots, and a machine-readable summary are saved in `test-results/gui/`. See [QA-REPORT.md](QA-REPORT.md) for the tested workflow and fixes.

Compact four-panel layouts were checked at 1280×800, 1600×1050, and 2560×1240. Each pane fills its screen quarter with a single-line header; account photos, unread counts, theme/settings/messages controls, focus mode, and normal-view profile sizes were verified.

Four-panel Chrome checks covered independent manager/developer/tester/customer identities, live updates inside an open retest window, exact notification destinations, customer stage handoff, isolated beta sessions, account switching, and returning to normal view. Numeric grouping and urgency updates were checked against resolved findings and completed UAT.

Chrome checks covered all ten numbered projects, the simplified navigation, large project labels, Awaiting UAT preparation, selected developers and testers, project acceptance and team rosters, and scenario assignment. Customer checks covered prefilled beta keys, Windows-style planner interactions, task persistence, and feedback delivery. Direct HTML entry, the visible taskbar, and project identification while scrolling were checked visually. Saved-state checks covered renaming, stable assignment keys and project IDs, preserved results, and the tester-to-manager approval lifecycle.

### Tester workspace and duplicate analysis

The tester checklist is the primary right panel. The square people button opens the project roster on demand. Two tester accounts are available; select both during preparation and assign scenarios individually. Existing clean workspaces gain Tester 2 without losing their projects or results.

Test failures and exploratory reports are compared against reports in the same project using mock AI text similarity. Potential duplicates keep their own IDs, evidence, results, and approvals, and link to the original finding. The developer receives a duplicate notification and an analysis panel with the similarity score and original report. Matches are suggestions for review, not automatic merges.

The added `test-duplicates.cjs` covers the team toggle, checklist prominence, two tester availability, duplicate reporting and developer delivery. Matching across reporter identities and exclusion of other projects are checked with controlled records. It is included as the ninth suite; the previously recorded eight-suite run remains historical.

### Annotation refinements

Ready projects, UAT Testing Stage, and Customer Acceptance Stage are ordered from left to right. The missing-requirements panel has been removed. Body copy and controls share a readable 14px baseline across roles, with larger headings. Test input examples use labeled lists. The team menu opens above the modal content and stays within the frame viewport.

### Progress, early beta, and customer follow-up

Developer progress is the share of that developer’s reported bugs submitted for retest, awaiting manager approval, or resolved. A reopened/revision-requested bug becomes pending developer work again. Testing progress is passed approved scenarios divided by all approved scenarios. These replace the old illustrative increments.

Active issues exclude resolved bugs; history lives in the Resolved tab and the project’s Show resolved bugs disclosure. The selected tester case has a green quick-pass square, using the same verified retest workflow as the main Pass button.

Managers can explicitly Share early beta after acknowledging unfinished UAT. This keeps internal testing active, records the acknowledgement, and marks the invitation/customer environment as unfinished. Standard customer acceptance still requires all scenarios and findings to be complete.

Customer project cards show acceptance, action status, treatment status and a report excerpt. Review feedback to record Passed/Failed and Ignored/Under treatment by Devs, or send selected notes to assigned project developers. Forwarded notes create linked, nonduplicated findings; ignoring feedback does not cancel unresolved developer work.

The email composer now fills the panel, provides an example recipient, and has Back and Send email controls. Delivery remains simulated. Planner task dialogs stay within the simulated application. The GUI runner includes 14 suites covering these workflows.

### Refresh and reset

Refreshing a staff page returns to the signed-in role’s home dashboard, without reopening a project, dialog or previous tab. Refreshing the four-panel workspace restores all four roles at home. A customer refresh returns to beta entry; choosing Open with the correct key resumes its saved tasks and notes.

The small Reset mock data icon sits beside the theme control in normal and four-panel staff headers. Confirm Reset workspace to clear projects, tests, bugs, invitations, messages, feedback, beta sessions and evidence across open app windows. The four operational accounts and theme remain. A reset revision prevents old tabs or unsaved forms from restoring deleted data. Reset does not run until confirmed.

The GUI runner now includes 16 suites. Focused refresh/reset, beta refresh, manager preparation, the complete UAT lifecycle, and compact layout checks passed after this change; the earlier full 14-suite result is historical.

### Optional demo data

Use **Demo data** beside the theme and reset controls to load ten projects. In four-panel mode, use the database icon in any staff header. Loading replaces the current workspace after confirmation. The demo stays loaded after a refresh, and you can continue its assignments, tests, bug fixes, retests, approvals and customer reviews.

The sample projects use dated, reproducible reports with named teammates and customer notes. Testing progress comes from passed scenarios; developer progress comes from submitted fixes. Some projects need work, some are waiting on another role, and others have finished UAT. AI summaries are simulated from those records, with possible causes kept separate from confirmed behavior.

Turn **Demo data** off and confirm **Start from zero** to clear the demo and your changes to it across open windows. Four empty role accounts and your theme remain. Loading it again creates a fresh demo. Two new GUI suites cover this toggle and its seeded handoffs, bringing the runner to 18 suites.
