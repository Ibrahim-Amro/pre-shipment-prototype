
# Pre-Shipment | Pfizer Hackathon

Built for the **Pfizer Hackathon**, Pre-Shipment is an all-in-one user acceptance testing (UAT) prototype designed for Pfizer. It brings UAT managers, developers, testers and customers into one platform, with simulated AI assistance across test preparation, feedback review and defect resolution.

- **UAT managers** approve scenarios, assign work, review verified fixes and coordinate customer acceptance.
- **Testers** execute scenarios, record evidence and retest developer fixes.
- **Developers** investigate structured reports and submit new builds for verification.
- **Customers** try the beta application and share feedback with the manager.

Project activity is saved in your browser. AI analysis, credentials and email delivery are simulated for the hackathon demonstration.

## Open the prototype

Download and extract the project, open the **dist** folder, and double-click **index.html** to explore the application. No installation is needed for single-window exploration.

For the shared workspace with three live staff panes and the movable customer beta overlay, use **Start Prototype.cmd** in the project folder (requires Node.js 20 or later). It opens [127.0.0.1:4173](http://127.0.0.1:4173). Keep the launcher running. You can also run `npm start`. Browser restrictions prevent the full shared workspace from running directly from a local HTML file.

Keep using the same browser profile and address to reopen saved projects.

## Presentation

[Download the animated Pre-Shipment PowerPoint](presentations/PreShipment_Centered_Animated_Overview_v2.pptx). Open it in PowerPoint and use Slide Show mode for the click-through animations.

Demo manager sign-in uses **admin** / **admin**.

Choose **Sign In** for the manager, developer, and tester workspaces. The employee sign-in page has demo shortcuts, and the profile menu lets you switch between workspaces. Newly assigned employees can sign in with the email and password in their generated job assignment email. They need their assignment key to start work.

For a populated walkthrough, use **Demo data** in the staff header. Confirming loads **Project 1** through **Project 10** and replaces the current workspace. Active project cards show urgent work first and use project number to break ties. Related findings stay together. A new project receives the next project number.

The manager’s **Project stages** page groups builds under **Ready projects**, **UAT Testing Stage** and **Customer Acceptance Stage**. Open a ready project and select **Generate UAT scenarios ready for the tester**. Add a requirements document or use the built-in planner requirements. Review the scenarios, choose developers and testers, then select **Approve project and start UAT testing**.

The tester dashboard shows pending invitations separately from accepted projects. Assignment keys are prefilled. Confirm the key to put a project in the active list, then open that project for its own case queue. The project’s team is available beside the work. Findings use larger project labels so the project is clear before opening a bug.

Each case includes instructions, test data, expected results, and an expandable code snippet. Record **Pass**, **Fail**, or **Blocked**. A failed case produces a structured bug report for development. Screenshot and video attachments up to 25 MB stay in this browser profile and can be opened from the developer’s bug view.

Developers submit fixes with a new build version. The original case returns to its tester. Passing sends the verified fix to the manager for approval. Manager approval resolves the bug. A failed retest reopens it. The manager can request another revision.

Once every approved case passes and its linked bug fixes have manager approval, the manager can select **Send to Customer Acceptance Stage**. This creates an editable customer email draft with a beta access key. Email delivery is simulated.

Choose **Open Your Beta Version** and select the customer-stage project. Its access key is already filled in. The beta opens with simulated setup and runs an interactive task planner in a Windows-style window. Create, edit, complete and delete tasks, search, filter priorities, switch between list and board, and try the window controls. Task changes persist in that beta session. Use the adjacent notes panel and **Send Feedback & Finish** to deliver feedback to the project manager.

Choose **Open staff workspace** to see Manager, Developer and Tester in three equal side-by-side panes. On small screens, switch staff roles using the toolbar. **Customer beta** opens a floating window. When a manager sends an invitation, the customer entry opens that project with its access key filled in. The customer can choose another available beta using the window’s project selector. Drag its title bar or focus the title bar and use the arrow keys to move it. Close and reopen it to return to the same customer session. **Normal view** returns to the single workspace.

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

Settings includes light and dark themes, editable profiles, unread message badges and a workspace reset. Turning badges off keeps messages available in the inbox. To restore the ten sample projects, use **Demo data**.

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

All interface fonts, images and code are bundled locally. This concept demonstration does not imply an official Pfizer product or affiliation. Customer links use the project saved at the same address in the same browser profile. A fresh profile starts empty.

## Verification

Run the browser regression suite with Node.js 20 or later:

```sh
npm ci --ignore-scripts
npm run test:gui
```

The runner uses installed Chrome on Windows or Playwright Chromium. If neither is available, run `npx playwright install chromium`. Set `CHROME_PATH` to choose a browser, `BASE_URL` to test another running instance, or `GUI_HEADLESS=0` to watch the browser. Tests use isolated browser contexts and preserve your demo session. The runner reuses the running local server; when it starts its own server, it stops only that process afterward.

The browser suites cover preparation, the UAT lifecycle, revision gates, finding routing, customer sessions, workspace controls and responsive layouts. Logs, screenshots and a machine-readable summary are saved in `test-results/gui/`. See [QA-REPORT.md](QA-REPORT.md) for the tested workflow and fixes.

Compact four-panel layouts were checked at 1280×800, 1600×1050, and 2560×1240. Each pane fills its screen quarter with a single-line header; account photos, unread counts, theme/settings/messages controls, focus mode, and normal-view profile sizes were verified.

Four-panel Chrome checks covered independent manager/developer/tester/customer identities, live updates inside an open retest window, exact notification destinations, customer stage handoff, isolated beta sessions, account switching, and returning to normal view. Numeric grouping and urgency updates were checked against resolved findings and completed UAT.

Chrome checks covered all ten numbered projects, the simplified navigation, large project labels, Awaiting UAT preparation, selected developers and testers, project acceptance and team rosters, and scenario assignment. Customer checks covered prefilled beta keys, Windows-style planner interactions, task persistence, and feedback delivery. Direct HTML entry, the visible taskbar, and project identification while scrolling were checked visually. Saved-state checks covered renaming, stable assignment keys and project IDs, preserved results, and the tester-to-manager approval lifecycle.

### Tester workspace and duplicate analysis

The tester checklist is the primary right panel. The square people button opens the project roster on demand. Two tester accounts are available; select both during preparation and assign scenarios individually. Existing clean workspaces gain Tester 2 without losing their projects or results.

Test failures and exploratory reports are compared against reports in the same project using mock AI text similarity. Potential duplicates keep their own IDs, evidence, results, and approvals, and link to the original finding. The developer receives a duplicate notification and an analysis panel with the similarity score and original report. Matches are suggestions for review, not automatic merges.

The duplicate-finding suite covers the team toggle, two tester accounts, cross-reporter matching and the exclusion of other projects.

### Annotation refinements

Ready projects, UAT Testing Stage, and Customer Acceptance Stage are ordered from left to right. The missing-requirements panel has been removed. Body copy and controls share a readable 14px baseline across roles, with larger headings. Test input examples use labeled lists. The team menu opens above the modal content and stays within the frame viewport.

### Progress, early beta, and customer follow-up

Developer progress is the share of that developer’s reported bugs submitted for retest, awaiting manager approval, or resolved. A reopened/revision-requested bug becomes pending developer work again. Testing progress is passed approved scenarios divided by all approved scenarios. These replace the old illustrative increments.

Active issues exclude resolved bugs; history lives in the Resolved tab and the project’s Show resolved bugs disclosure. The selected tester case has a green quick-pass square, using the same verified retest workflow as the main Pass button.

Managers can explicitly Share early beta after acknowledging unfinished UAT. This keeps internal testing active, records the acknowledgement, and marks the invitation/customer environment as unfinished. Standard customer acceptance still requires all scenarios and findings to be complete.

Customer project cards show acceptance, action status, treatment status and a report excerpt. Review feedback to record Passed/Failed and Ignored/Under treatment by Devs, or send selected notes to assigned project developers. Forwarded notes create linked, nonduplicated findings; ignoring feedback does not cancel unresolved developer work.

The email composer now fills the panel, provides an example recipient, and has Back and Send email controls. Delivery remains simulated. Planner task dialogs stay within the simulated application.

### Refresh and reset

With **Stay signed in on refresh** selected, refreshing a staff page opens the signed-in role’s home dashboard. Clearing it returns you to sign-in choices on refresh. Refreshing the four-panel workspace restores its roles at home. A customer refresh returns to beta entry. Opening with the correct key resumes the saved tasks and notes.

The small Reset mock data icon sits beside the theme control in normal and four-panel staff headers. Confirm Reset workspace to clear projects, tests, bugs, invitations, messages, feedback, beta sessions and evidence across open app windows. The four operational accounts and theme remain. A reset revision prevents old tabs or unsaved forms from restoring deleted data. Reset does not run until confirmed.


### Optional demo data

Use **Demo data** beside the theme and reset controls to load ten projects. In four-panel mode, use the database icon in any staff header. Loading replaces the current workspace after confirmation. The demo stays loaded after a refresh, and you can continue its assignments, tests, bug fixes, retests, approvals and customer reviews.

The sample projects use dated, reproducible reports with named teammates and customer notes. Testing progress comes from passed scenarios; developer progress comes from submitted fixes. Some projects need work, some are waiting on another role, and others have finished UAT. AI summaries are simulated from those records, with possible causes kept separate from confirmed behavior.

Turn **Demo data** off and confirm **Start from zero** to clear the demo and your changes to it across open windows. Four empty role accounts and your theme remain. Loading it again creates a fresh demo.

Active project cards follow the priority shown on their badges, with project number breaking ties. Developer cards put bugs needing that developer's fix above work waiting for retest or approval. Project numbers and titles stay prominent; descriptions use the shared 14px body size. The project-order suite checks ordering, typography and reordering after a submitted fix.
