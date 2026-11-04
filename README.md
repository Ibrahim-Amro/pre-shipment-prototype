# Pre-Shipment · By Pfizer

A polished, interactive desktop-style web prototype. Everything runs in the browser with realistic sample data. AI analysis, tests, emails, credentials, and approvals are simulations. No backend, API keys, email service, ZIP extraction, or real authentication are used.

## Open the prototype

Open `dist/index.html` in a modern browser, or run `node serve.mjs` and visit `http://127.0.0.1:4173`.

Owner username: **admin**  
Owner password: **admin**

Use the profile menu at the top right to switch between Owner, Manager, Developer, Tester, and Customer. The sign-in page also has employee demo shortcuts. For newly assigned employees, use the email and password shown in their generated job assignment email. Their assignment key is required to start work.

## Suggested demonstration

1. Sign in as the owner. Click **New project**, then **Use sample project**.
2. Watch the animated sample AI analysis or skip its animation. Explore the urgent developer reassessment option.
3. Choose one manager, several developers, and testers. People on holiday are unavailable.
4. Review and edit every personalized job assignment email, credentials, and customer invitation. Launch the simulated assignments.
5. Sign out and use a generated employee login, or switch to a demo role. Preview the invitation and accept the assignment using its key.
6. As a tester, run sample code/GUI tests, route findings to developers, report a detailed bug, and triage customer feedback.
7. As a developer, open a priority finding, propose a fix, review its simulated resilience score, and submit it for approval.
8. As a manager, review and approve a fix, inspect release risk, and request available staff from the owner.
9. As the owner, open Messages to approve or decline staffing requests. Approval creates additional employee invitations.
10. Open a customer preview from a project, try the sample application, and submit feedback. It appears in the tester queue in this browser.

Light and dark themes, project filters, search, notifications, editable profiles, team roles, CSV exports, and reset controls are included. Changes persist in this browser’s local storage. Settings → Reset demo data restores the original samples.

## Files

- `dist/index.html`: entry point
- `dist/styles.css`: app shell, owner dashboard, login, customer preview
- `dist/app.js`: navigation, shared state, owner management, customer interactions
- `dist/data.js`: fictional demo projects, employees, issues, and feedback
- `dist/owner.js`, `dist/owner.css`: project creation and assignment wizard
- `dist/workspaces.js`, `dist/workspaces.css`: employee workspaces and workflows
- `dist/pfizer.svg`: Pfizer logo from an official Pfizer website
- `dist/avatars/`: illustrative profile portraits
- `dist/fonts/`: local fonts and their open font licenses
- `dist/asset-sources.json`: asset source notes

All interface fonts, images, and code are bundled locally. This is a concept demonstration and does not imply an official Pfizer product or affiliation. Role permissions and preview windows are UI simulations, not security controls. Customer links for newly created projects share this browser’s saved demo state; a different browser starts with the sample portfolio.

## Verification

JavaScript syntax, local asset paths, inline event handlers, role/page rendering, and the primary state-changing workflows were checked with an isolated JavaScript test harness. Browser visual verification could not be completed because the connected preview browser failed to load.
