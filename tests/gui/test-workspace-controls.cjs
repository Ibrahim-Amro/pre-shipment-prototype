const assert = require('node:assert/strict');
const {launchBrowser, BASE_URL} = require('./support.cjs');

(async () => {
  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({viewport:{width:1280,height:800}});
    const page = await context.newPage();
    const errors = [];
    const observe = target => target.on('pageerror', error => errors.push(error.message));
    observe(page);
    async function signIn(target, remember) {
      await target.goto(BASE_URL);
      await target.locator('.splash').waitFor({state:'hidden'});
      await target.getByRole('button', {name:'Sign In',exact:true}).click();
      await target.getByLabel('Stay signed in on refresh').setChecked(remember);
      await target.getByRole('button', {name:'Sign in to workspace'}).click();
      await target.locator('.topbar').waitFor();
    }
    await signIn(page, false);
    await page.reload();
    await page.getByRole('button', {name:'Sign In',exact:true}).waitFor();
    await signIn(page, true);
    await page.reload();
    await page.getByRole('button', {name:'New project',exact:true}).waitFor();
    const expand = page.getByRole('button', {name:'Expand workspace'});
    await expand.click();
    await page.locator('[data-page=settings]').click();
    await page.locator('.app-window').evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
    const rect = await page.locator('.app-window').boundingBox();
    assert.equal(rect.width,1280);
    assert.equal(rect.height,800);
    await page.getByRole('button', {name:'Restore window'}).click();
    assert.ok((await page.locator('.app-window').boundingBox()).height < 800);
    const profile = page.getByRole('button', {name:'Edit profile'});
    await profile.click();
    await page.keyboard.press('Control+k');
    assert.ok(await page.evaluate(() => document.activeElement.closest('[role=dialog]') !== null));
    await page.keyboard.press('Escape');
    assert.ok(await profile.evaluate(el => el === document.activeElement));
    await page.keyboard.press('Control+k');
    const search = page.getByLabel('Search projects and findings');
    await search.fill(' Project 2 ');
    await search.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.getByRole('dialog', {name:'Project 2',exact:true}).waitFor();
    await page.keyboard.press('Escape');

    const other = await context.newPage();
    observe(other);
    await signIn(other,true);
    assert.equal(await other.locator('.topbar .notify-dot').count(),1);
    await page.getByLabel('Show unread message badges').uncheck();
    await other.locator('.topbar .notify-dot').waitFor({state:'hidden'});
    await other.locator('[data-page=messages]').click();
    await other.getByRole('button').filter({hasText:'Project 1 needs your attention'}).waitFor();
    await page.getByLabel('Show unread message badges').check();
    await other.locator('.topbar .notify-dot').waitFor();

    // Simulate clearing a verification field while the other workspace keeps
    // the same issue object open. Its next save must preserve the deletion.
    await page.evaluate(() => { A.state.issues[0].verifiedAt='test-date'; A.save(); });
    await other.waitForFunction(() => A.state.issues[0].verifiedAt === 'test-date');
    await page.evaluate(() => { delete A.state.issues[0].verifiedAt; A.save(); });
    await other.waitForFunction(() => !Object.hasOwn(A.state.issues[0],'verifiedAt'));
    assert.ok(await other.evaluate(() => {
      A.state.issues[0].category='Updated category'; A.save();
      return !('verifiedAt' in JSON.parse(localStorage.getItem('pre-shipment-v4')).issues[0]);
    }));
    assert.deepEqual(errors,[]);
    console.log('PASS: refresh preference, persistent window sizing, modal keyboard focus, keyboard search, cross-window unread badges and deleted verification fields.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode=1; });
