const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');

const BASE_URL = new URL(process.env.BASE_URL || 'http://127.0.0.1:4173/').href;
const RESULTS_DIR = path.resolve(__dirname, '../../test-results/gui');
fs.mkdirSync(RESULTS_DIR, {recursive:true});

function chromePath() {
  if (process.env.CHROME_PATH) {
    if (!fs.existsSync(process.env.CHROME_PATH)) throw new Error('CHROME_PATH does not point to an existing browser executable.');
    return process.env.CHROME_PATH;
  }
  if (process.platform !== 'win32') return undefined;
  return [
    path.join(process.env.ProgramFiles || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)', 'Google/Chrome/Application/chrome.exe'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe')
  ].find(candidate => candidate && fs.existsSync(candidate));
}

async function launchBrowser() {
  const executablePath = chromePath();
  return chromium.launch({
    ...(executablePath ? {executablePath} : {}),
    headless:process.env.GUI_HEADLESS !== '0'
  });
}

module.exports = {BASE_URL, RESULTS_DIR, launchBrowser};
