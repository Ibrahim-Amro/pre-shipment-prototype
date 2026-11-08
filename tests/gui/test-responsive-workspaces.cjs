const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {launchBrowser, BASE_URL, RESULTS_DIR} = require('./support.cjs');

(async () => {
  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({viewport: {width: 320, height: 568}});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.stack));
    await page.goto(BASE_URL);
    await page.locator('.splash').waitFor({state: 'hidden'});
    await page.getByRole('button', {name: 'Sign In', exact: true}).click();
    const roleShortcut = page.locator('.login-window').getByRole('button', {name: /tester/i}).first();
    await roleShortcut.scrollIntoViewIfNeeded();
    const shortcutBox = await roleShortcut.boundingBox();
    assert.ok(shortcutBox.y >= 0 && shortcutBox.y + shortcutBox.height <= 569, 'Role shortcuts can be scrolled into view on short phones');
    await page.getByRole('button', {name: 'Sign in to workspace'}).click();
    await page.locator('.topbar').waitFor();
    for (const width of [320, 390, 768, 1024]) {
      await page.setViewportSize({width, height: 820});
      assert.ok(await page.locator('.topbar').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Header fits at ' + width);
      const profile = page.locator('.profile-trigger');
      await profile.click();
      await page.locator('#profile-menu').waitFor();
      await page.keyboard.press('Escape');
    }
    await page.setViewportSize({width: 390, height: 844});
    const search = page.getByLabel('Search projects and findings');
    await search.click();
    await search.fill('Project 1');
    const results = page.locator('#global-results');
    await results.getByRole('button', {name: /Project 1/}).first().waitFor();
    const resultsBox = await results.boundingBox();
    assert.ok(resultsBox.x >= 0 && resultsBox.x + resultsBox.width <= 391, 'Search results fit the phone');
    await page.screenshot({path: path.join(RESULTS_DIR, 'phone-search.png'), animations: 'disabled'});
    await page.keyboard.press('Escape');
    const menu = page.getByRole('button', {name: 'Toggle navigation'});
    await menu.click();
    await page.locator('.sidebar.open').waitFor();
    await menu.click();
    await page.locator('.sidebar.open').waitFor({state: 'hidden'});
    await page.getByRole('button', {name: 'New project', exact: true}).click();
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.locator('#four-view-toggle').isVisible(), false, 'Floating toggle cannot block a modal action');
    await page.keyboard.press('Escape');

    await page.getByRole('button', {name: 'Toggle staff workspace'}).click();
    await page.waitForFunction(() => [...document.querySelectorAll('iframe')].every(frame => frame.contentWindow.A?.state.role === frame.dataset.role));
    const shell = page.locator('.four-view-shell');
    for (const role of ['manager', 'developer', 'tester']) {
      await shell.locator('[data-show-role="' + role + '"]').click();
      assert.equal(await shell.locator('.four-panel:visible').count(), 1);
      assert.equal(await shell.locator('.four-panel:visible').getAttribute('data-role'), role);
      const header = shell.locator('.four-panel:visible .four-panel-header');
      assert.ok(await header.evaluate(el => el.scrollWidth <= el.clientWidth + 1), role + ' header fits');
      assert.equal(await shell.locator('.four-view-close').isVisible(), true);
      await page.frameLocator('iframe[data-role="' + role + '"]').locator('main,.beta-entry-panel').first().waitFor();
    }
    const developer = page.frameLocator('iframe[data-role=developer]');
    await shell.locator('[data-show-role=developer]').click();
    await shell.locator('[data-panel-role=developer][data-panel-action=settings]').click();
    await developer.locator('[data-page=settings].active').waitFor({state: 'attached'});
    await shell.locator('[data-show-role=manager]').click();
    await shell.locator('[data-show-role=developer]').click();
    await developer.locator('[data-page=settings].active').waitFor({state: 'attached'});
    await shell.locator('[data-show-role=manager]').click();
    await shell.locator('#four-project').selectOption('');
    await page.waitForFunction(() => [...document.querySelectorAll('iframe')].every(frame =>
      frame.contentWindow.A && !new URL(frame.contentWindow.location.href).searchParams.has('project')));
    await page.frameLocator('iframe[data-role=manager]').getByRole('button', {name: 'New project', exact: true}).waitFor();
    await page.screenshot({path: path.join(RESULTS_DIR, 'phone-four-workspaces.png'), animations: 'disabled'});
    await page.setViewportSize({width: 1280, height: 800});
    await shell.locator('.four-panel[data-role=tester]').waitFor();
    assert.equal(await shell.locator('.four-panel:visible').count(), 3);
    await shell.locator('[data-focus-role=tester]').click();
    await page.setViewportSize({width: 320, height: 568});
    assert.equal(await shell.locator('.four-panel:visible').getAttribute('data-role'), 'tester');
    await shell.getByRole('button', {name: 'Close staff workspace'}).click();
    await page.locator('.topbar').waitFor();
    await page.screenshot({path: path.join(RESULTS_DIR, 'phone-manager.png'), animations: 'disabled'});

    const localIndex = path.resolve(__dirname, '../../dist/index.html');
    await page.goto(pathToFileURL(localIndex).href);
    await page.locator('.splash').waitFor({state: 'hidden'});
    await page.getByRole('button', {name: 'Toggle staff workspace'}).click();
    const prompt = page.getByRole('dialog', {name: 'Open the shared workspace'});
    assert.equal(await prompt.getByRole('link', {name: 'Open local prototype'}).getAttribute('href'), 'http://127.0.0.1:4173/');
    await prompt.getByRole('button', {name: 'Stay here'}).click();
    assert.equal(await page.locator('iframe').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: short-phone sign-in, tablet account menu, mobile search/navigation, modal actions, compact role switching, shared project selection, desktop resizing and direct-file launch guidance.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
