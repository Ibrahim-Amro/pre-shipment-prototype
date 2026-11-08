const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {BASE_URL, RESULTS_DIR} = require('./support.cjs');

const root = path.resolve(__dirname, '../..');
const suites = [
  ['Phone, tablet and direct-file workspaces', 'test-responsive-workspaces.cjs'],
  ['Project assignment and UAT handoff integrity', 'test-workflow-scope.cjs'],
  ['Customer entry and interrupted session recovery', 'test-beta-entry-recovery.cjs'],
  ['Workspace preferences, keyboard controls and shared state', 'test-workspace-controls.cjs'],
  ['Project priority order and consistent card sizes', 'test-project-order.cjs'],
  ['Demo data toggle and realistic project states', 'test-demo-toggle.cjs'],
  ['Demo retest and customer acceptance handoffs', 'test-demo-handoffs.cjs'],
  ['Refresh home and global reset', 'test-refresh-reset.cjs'],
  ['Beta refresh home and saved work', 'test-beta-refresh-home.cjs'],
  ['Developer handoff insights', 'test-developer-insights.cjs'],
  ['Selected task quick pass', 'test-quick-pass.cjs'],
  ['Email composer and bounded task dialog', 'test-email-layout.cjs'],
  ['Early beta and customer triage', 'test-customer-triage.cjs'],
  ['Resolved bug views', 'test-resolved-views.cjs'],
  ['Tester checklist and duplicate findings', 'test-duplicates.cjs'],
  ['Login, settings and shared navigation', 'test-gui-shell-smoke.cjs'],
  ['Manager preparation', 'test-gui-manager-preparation.cjs'],
  ['Full four-role UAT lifecycle', 'test-qa-full.cjs'],
  ['Failure, retest and revision gates', 'test-qa-retest.cjs'],
  ['Finding assignment and notification routing', 'test-qa-finding-routing.cjs'],
  ['Customer beta and feedback', 'qa-beta-full.cjs'],
  ['Customer acceptance regression and recovery', 'qa-beta-stale.cjs'],
  ['Three staff panes and customer overlay', 'test-four-compact.cjs']
];
let ownedServer;
let activeSuite;
let stopping = false;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function serverHealthy() {
  try {
    const response = await fetch(BASE_URL, {signal:AbortSignal.timeout(1500)});
    return response.ok && /<title>Pre-Shipment/.test(await response.text());
  } catch { return false; }
}

async function ensureServer() {
  if (await serverHealthy()) {
    console.log(`Using existing app server at ${BASE_URL}`);
    return;
  }
  const target = new URL(BASE_URL);
  if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.protocol !== 'http:' || target.port !== '4173') {
    throw new Error(`BASE_URL is unavailable: ${BASE_URL}. Start that server before running the GUI suite.`);
  }
  console.log('Starting the local prototype server for this test run.');
  ownedServer = spawn(process.execPath, ['serve.mjs'], {cwd:root, windowsHide:true, stdio:['ignore','pipe','pipe']});
  let startupError = '';
  ownedServer.on('error', error => {startupError = error.message;});
  ownedServer.stderr.on('data', chunk => {startupError += chunk;});
  for (let attempt=0; attempt<30; attempt++) {
    if (await serverHealthy()) return;
    if (startupError || ownedServer.exitCode !== null) break;
    await delay(250);
  }
  throw new Error(`The local prototype server did not become ready. ${startupError.trim()}`);
}

function runSuite(filename) {
  return new Promise(resolve => {
    const logFile = filename.replace(/\.cjs$/, '.log');
    const log = fs.createWriteStream(path.join(RESULTS_DIR, logFile));
    activeSuite = spawn(process.execPath, [path.join(__dirname, filename)], {
      cwd:root, windowsHide:true, stdio:['ignore','pipe','pipe'], env:{...process.env, BASE_URL}
    });
    activeSuite.stdout.on('data', chunk => {process.stdout.write(chunk); log.write(chunk);});
    activeSuite.stderr.on('data', chunk => {process.stderr.write(chunk); log.write(chunk);});
    let spawnError;
    activeSuite.on('error', error => {spawnError = error.message;});
    activeSuite.on('close', (code, signal) => {
      activeSuite = undefined;
      log.end(() => resolve({passed:code === 0 && !spawnError, code, signal, logFile, ...(spawnError ? {error:spawnError} : {})}));
    });
  });
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode) return;
  const closed = new Promise(resolve => child.once('close', resolve));
  child.kill();
  await Promise.race([closed, delay(3000)]);
  if (child.exitCode === null && !child.signalCode) child.kill('SIGKILL');
}

async function stopOwnedProcesses() {
  if (stopping) return;
  stopping = true;
  await stopChild(activeSuite);
  await stopChild(ownedServer);
}

for (const [signal, exitCode] of [['SIGINT',130],['SIGTERM',143]]) {
  process.once(signal, () => {
    stopOwnedProcesses().finally(() => process.exit(exitCode));
  });
}

(async () => {
  const report = {startedAt:new Date().toISOString(), baseUrl:BASE_URL, suites:[]};
  try {
    await ensureServer();
    for (const [name, filename] of suites) {
      console.log(`\n--- ${name} ---`);
      const started = Date.now();
      const outcome = await runSuite(filename);
      report.suites.push({name, filename, ...outcome, durationMs:Date.now()-started});
      console.log(`${outcome.passed ? 'PASS' : 'FAIL'}: ${name}`);
    }
    report.passed = report.suites.every(suite => suite.passed);
    const passed = report.suites.filter(suite => suite.passed).length;
    console.log(`\nGUI result: ${passed}/${report.suites.length} suites passed. Artifacts: ${RESULTS_DIR}`);
    if (!report.passed) process.exitCode = 1;
  } catch (error) {
    report.passed = false;
    report.error = error.message;
    console.error(error);
    process.exitCode = 1;
  } finally {
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(RESULTS_DIR, 'summary.json'), JSON.stringify(report, null, 2));
    await stopOwnedProcesses();
  }
})();
