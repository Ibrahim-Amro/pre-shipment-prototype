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

The customer panel waits for the manager’s customer-acceptance handoff, then opens the beta automatically. Staff still accept project invitations. Notifications go to the assigned developer, the case’s tester, or the project manager. Open tester cases update when a new build arrives.

A project’s urgency comes from unfinished work. **Finished UAT testing** requires every approved case to pass and every project finding to be resolved after tester verification and manager approval. This includes exploratory findings outside the original checklist. The badge then becomes **UAT complete**, and the manager can send the customer invitation.

Submitted fix builds become the current project version. A new finding during customer acceptance returns the project to UAT immediately. Customer submission pauses, and existing beta notes stay saved until the manager approves the new testing cycle and reopens customer acceptance.

Staff handoffs, evidence, and customer feedback use the same browser profile and app address. AI document analysis and bug summaries use mock data. TXT, Markdown, and CSV text can shape the sample scenario suggestions.

## Suggested demonstration

1. Sign in as the manager with **admin** / **admin**.
2. Open **Awaiting UAT**, select **Project 2**, and generate its UAT scenarios.
3. Select developers and testers, review case assignments, and approve the project’s UAT start.
4. Switch to a selected tester and accept the invitation using the prefilled key.
5. Open the active project to see its team and test-case queue. Report a failure with evidence.
6. Switch to the assigned developer, submit a new build, then have the tester retest it.
7. Have the manager approve the verified fix and later send the finished checklist to customer acceptance.
8. For an immediate customer demo, open beta access for **Project 7** or **Project 8**. Confirm its prefilled key and try the task planner.
9. Submit session notes and review them in the assigned manager’s **Feedback** page.

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
