const assert = require('node:assert/strict');
const {join} = require('node:path');
const {launchBrowser, BASE_URL, RESULTS_DIR} = require('./support.cjs');

const ROLES = ['manager', 'developer', 'tester', 'customer'];
const STAFF = ROLES.slice(0, 3);
const BASE = BASE_URL;
const near = (actual, expected, label, tolerance = 2) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} (expected ${expected} ± ${tolerance})`);

(async () => {
  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({viewport:{width:1600, height:1050}});
    context.setDefaultTimeout(12000);
    const errors = [];
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    const page = await context.newPage();
    await page.goto(BASE);
    await page.locator('.splash').waitFor({state:'hidden'});
    await page.getByRole('button', {name:'Sign In', exact:true}).click();
    await page.getByRole('button', {name:'Sign in to workspace'}).click();
    await page.locator('.topbar .profile-trigger .avatar').waitFor({state:'visible'});
    const normalPortrait = async () => {
      await page.locator('#app .app-window').evaluate(async el => {
        await Promise.all(el.getAnimations().map(animation => animation.finished.catch(() => {})));
      });
      return page.locator('#app .topbar .profile-trigger .avatar').evaluate(el => el.getBoundingClientRect().width);
    };
    near(await normalPortrait(), 64, 'normal-mode portrait', 0.5);
    await page.getByRole('button', {name:'Toggle four-panel workspace'}).click();
    assert.equal(await page.locator('.four-panel iframe').count(), 4);
    const frames = {};
    const panel = role => page.locator(`.four-panel[data-role="${role}"]`);
    const header = role => panel(role).locator('.four-panel-header');
    const action = (role, name) => panel(role).locator(`[data-panel-action="${name}"]`);
    const getFrame = async role => {
      const element = await page.locator(`iframe[data-role="${role}"]`).elementHandle();
      return element.contentFrame();
    };
    for (const role of ROLES) {
      frames[role] = await getFrame(role);
      await frames[role].waitForFunction(role => window.A?.state.role === role, role);
      await frames[role].evaluate(() => window.compactFramePersistence = crypto.randomUUID());
    }

    // These node identities must survive moves between headers; controls must not be cloned.
    await page.evaluate(() => {
      window.compactSharedControls = {project:document.querySelector('#four-project'), close:document.querySelector('.four-view-close')};
    });

    async function assertOneLineHeader(role) {
      const geometry = await header(role).evaluate(el => {
        const rect = el.getBoundingClientRect();
        const visible = node => {
          const bounds = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return style.display !== 'none' && style.visibility !== 'hidden' && bounds.width > 0 && bounds.height > 0;
        };
        const controls = [...el.querySelectorAll('img, select, button, h2')].filter(visible).map(node => {
          const box = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return {tag:node.tagName, text:node.getAttribute('aria-label') || node.textContent.trim(), left:box.left, right:box.right, top:box.top, bottom:box.bottom, center:box.top+box.height/2, height:box.height, whiteSpace:style.whiteSpace};
        });
        const image = [...el.querySelectorAll('img')].find(visible);
        return {left:rect.left, right:rect.right, top:rect.top, bottom:rect.bottom, height:rect.height, scrollWidth:el.scrollWidth, width:el.clientWidth, controls, image:image ? {width:image.getBoundingClientRect().width, height:image.getBoundingClientRect().height, alt:image.alt, src:image.src} : null};
      });
      assert.ok(geometry.height <= 52, `${role} header is ${geometry.height}px; needs one compact line`);
      assert.ok(geometry.scrollWidth <= geometry.width + 1, `${role} header overflows horizontally`);
      assert.ok(geometry.image, `${role} header has a portrait`);
      near(geometry.image.width, 36, `${role} portrait width`, 0.5);
      near(geometry.image.height, 36, `${role} portrait height`, 0.5);
      const centers = geometry.controls.map(control => control.center);
      assert.ok(Math.max(...centers)-Math.min(...centers) <= 5, `${role} header controls wrap onto another line`);
      for (const control of geometry.controls) {
        assert.ok(control.left >= geometry.left-1 && control.right <= geometry.right+1, `${role} ${control.text || control.tag} leaves header width`);
        assert.ok(control.top >= geometry.top-1 && control.bottom <= geometry.bottom+1, `${role} ${control.text || control.tag} leaves header height`);
      }
      if (STAFF.includes(role)) {
        const selected = await header(role).locator('[data-person-role]').evaluate(el => ({id:el.value, name:el.selectedOptions[0].textContent}));
        assert.equal(geometry.image.alt, selected.name, `${role} portrait identifies selected full name`);
        assert.equal(await frames[role].evaluate(() => A.state.user.id), selected.id);
        assert.match(await header(role).locator('h2').innerText(), new RegExp(role, 'i'));
        const nameFits = await header(role).locator('[data-person-role]').evaluate(el => {
          const style = getComputedStyle(el);
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          return {needed:ctx.measureText(el.selectedOptions[0].textContent).width+24, width:el.clientWidth};
        });
        assert.ok(nameFits.width+1 >= nameFits.needed, `${role} full selected name is clipped (${nameFits.width}px for ${nameFits.needed}px)`);
      }
    }

    async function assertGrid(width, height) {
      await page.setViewportSize({width, height});
      for (let index = 0; index < ROLES.length; index++) {
        const role = ROLES[index];
        const box = await panel(role).boundingBox();
        near(box.x, index % 2 ? width/2 : 0, `${role} quarter x`);
        near(box.y, index >= 2 ? height/2 : 0, `${role} quarter y`);
        near(box.width, width/2, `${role} quarter width`);
        near(box.height, height/2, `${role} quarter height`);
        await assertOneLineHeader(role);
        const child = frames[role];
        assert.equal(await child.locator('.topbar:visible').count(), 0, `${role} duplicate topbar hidden`);
        assert.ok(await child.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1), `${role} child page has no horizontal overflow`);
        if (STAFF.includes(role)) {
          const nav = await child.locator('.sidebar').boundingBox();
          assert.ok(nav && nav.height <= 42, `${role} bottom navigation is compact`);
          const frameBox = await panel(role).locator('iframe').boundingBox();
          const headerBox = await header(role).boundingBox();
          near(frameBox.y, headerBox.y+headerBox.height, `${role} content begins after single header`);
          near(frameBox.height, box.height-headerBox.height, `${role} content fills remaining quarter`);
        }
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1), 'parent page has no horizontal overflow');
      assert.equal(await page.locator('#four-project').count(), 1);
      assert.equal(await page.locator('.four-view-close').count(), 1);
      assert.equal(await page.locator('#four-project').evaluate(el => el.closest('.four-panel').dataset.role), 'customer');
      assert.equal(await page.locator('.four-view-close').evaluate(el => el.closest('.four-panel').dataset.role), 'customer');
      await page.screenshot({path:join(RESULTS_DIR, `four-compact-${width}x${height}.png`), animations:'disabled'});
    }

    for (const size of [[1600,1050],[2560,1240],[1280,800]]) await assertGrid(...size);

    // Focus uses the whole viewport, while all frame documents and shared controls survive.
    const sentinels = {};
    for (const role of ROLES) sentinels[role] = await frames[role].evaluate(() => window.compactFramePersistence);
    for (const role of ROLES) {
      await panel(role).locator('[data-focus-role]').click();
      assert.equal(await page.locator('.four-panel:visible').count(), 1);
      const box = await panel(role).boundingBox();
      near(box.x, 0, `${role} focused x`); near(box.y, 0, `${role} focused y`);
      near(box.width, 1280, `${role} focused width`); near(box.height, 800, `${role} focused height`);
      await assertOneLineHeader(role);
      assert.equal(await page.locator('#four-project').evaluate(el => el.closest('.four-panel').dataset.role), role);
      assert.equal(await page.locator('.four-view-close').evaluate(el => el.closest('.four-panel').dataset.role), role);
      assert.ok(await page.evaluate(() => compactSharedControls.project === document.querySelector('#four-project') && compactSharedControls.close === document.querySelector('.four-view-close')));
      await panel(role).locator('[data-focus-role]').click();
      assert.equal(await page.locator('.four-panel:visible').count(), 4);
      for (const other of ROLES) assert.equal(await frames[other].evaluate(() => window.compactFramePersistence), sentinels[other], `${other} document persists through focus`);
    }

    await page.setViewportSize({width:1600, height:1050});
    for (const role of STAFF) {
      const frame = frames[role];
      await frame.evaluate(() => {
        window.compactApiCalls = [];
        for (const method of ['navigate', 'setTheme']) {
          const original = A[method];
          A[method] = function (...args) { window.compactApiCalls.push([method, ...args]); return original.apply(this, args); };
        }
      });
      await action(role, 'messages').click();
      await frame.waitForFunction(() => A.state.page === 'messages');
      assert.ok(await frame.evaluate(() => compactApiCalls.some(call => call[0] === 'navigate' && call[1] === 'messages')), `${role} header opens its child's messages API`);
      await action(role, 'settings').click();
      await frame.waitForFunction(() => A.state.page === 'settings');
      assert.ok(await frame.evaluate(() => compactApiCalls.some(call => call[0] === 'navigate' && call[1] === 'settings')), `${role} header opens its child's settings API`);
      const beforeTheme = await frame.evaluate(() => document.documentElement.dataset.theme);
      const beforeHeader = await header(role).evaluate(el => [getComputedStyle(el).backgroundColor, getComputedStyle(el.parentElement).backgroundColor, getComputedStyle(el).getPropertyValue('--surface')].join('|'));
      await action(role, 'theme').click();
      await frame.waitForFunction(before => document.documentElement.dataset.theme !== before, beforeTheme);
      assert.ok(await frame.evaluate(() => compactApiCalls.some(call => call[0] === 'setTheme')), `${role} header calls its child's theme API`);
      const afterTheme = await frame.evaluate(() => document.documentElement.dataset.theme);
      const afterHeader = await header(role).evaluate(el => [getComputedStyle(el).backgroundColor, getComputedStyle(el.parentElement).backgroundColor, getComputedStyle(el).getPropertyValue('--surface')].join('|'));
      assert.notEqual(afterHeader, beforeHeader, `${role} header follows child theme`);
      assert.ok(['light','dark'].includes(afterTheme));
    }

    // Controlled fixtures test destination filtering independently of sample notification counts.
    const recipients = {};
    for (const role of STAFF) recipients[role] = await header(role).locator('[data-person-role]').inputValue();
    await page.evaluate(recipients => {
      const fixture = Object.entries(recipients).map(([role, employeeId]) => ({id:`compact-selected-${role}`, employeeId, role, title:`Compact selected ${role} notice`, body:'Only the selected recipient should see this update.', time:'Just now', read:false, page:'messages', type:'bell'}));
      const alternate = A.state.employees.find(person => person.role === 'manager' && person.id !== recipients.manager);
      fixture.push({id:'compact-other-manager', employeeId:alternate.id, role:'manager', title:'Compact alternate manager notice', read:false, page:'messages', type:'bell'});
      fixture.push({id:'compact-wrong-role', employeeId:recipients.manager, role:'tester', title:'Compact mismatched role notice', read:false, page:'messages', type:'bell'});
      A.state.notifications = fixture; A.save(); FourView.onWorkspaceSync();
    }, recipients);
    for (const role of STAFF) {
      await frames[role].waitForFunction(role => A.visibleNotifications().some(note => note.id === `compact-selected-${role}`), role);
      await action(role, 'messages').click();
      await frames[role].getByText(`Compact selected ${role} notice`, {exact:true}).waitFor();
      assert.equal(await frames[role].getByText('Compact alternate manager notice', {exact:true}).count(), 0);
      assert.equal(await frames[role].getByText('Compact mismatched role notice', {exact:true}).count(), 0);
      const notificationButton = await action(role, 'messages').evaluate(el => ({label:el.getAttribute('aria-label') || '', title:el.title, text:el.textContent, unread:el.dataset.unread}));
      assert.match([notificationButton.label, notificationButton.title, notificationButton.text, notificationButton.unread].join(' '), /\b1\b/, `${role} header exposes its one unread fixture notification`);
    }

    const previousPhoto = await header('manager').locator('img').first().getAttribute('src');
    const alternate = await header('manager').locator('[data-person-role]').evaluate(el => [...el.options].find(option => option.value !== el.value).value);
    await header('manager').locator('[data-person-role]').selectOption(alternate);
    frames.manager = await getFrame('manager');
    await frames.manager.waitForFunction(id => window.A?.state.user.id === id, alternate);
    await page.waitForFunction(() => {
      const panel = document.querySelector('.four-panel[data-role="manager"]');
      return panel.querySelector('img').alt === panel.querySelector('[data-person-role]').selectedOptions[0].textContent;
    });
    assert.notEqual(await header('manager').locator('img').first().getAttribute('src'), previousPhoto, 'account switching updates header photograph');
    await action('manager', 'messages').click();
    await frames.manager.getByText('Compact alternate manager notice', {exact:true}).waitFor();
    assert.equal(await frames.manager.getByText('Compact selected manager notice', {exact:true}).count(), 0);
    assert.equal(await frames.manager.getByText('Compact mismatched role notice', {exact:true}).count(), 0);
    await assertOneLineHeader('manager');

    await page.locator('.four-view-close').click();
    assert.equal(await page.locator('.four-view-shell').isVisible(), false);
    near(await normalPortrait(), 64, 'normal-mode portrait remains large', 0.5);
    assert.deepEqual(errors, []);
    console.log('PASS: full viewport quarters at 1600/2560/1280; one-line identities; hidden duplicate headers; compact navigation; live focused frames/shared controls; per-user notifications; working messages/settings/theme; account portrait switching; normal profile size retained.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
