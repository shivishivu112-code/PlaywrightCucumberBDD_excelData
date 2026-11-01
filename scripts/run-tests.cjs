const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const reportsDir = path.join(root, 'reports');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const jsonPath = path.join(reportsDir, `cucumber-results-${runId}.json`);
const detailsPath = `cucumber-details-${runId}.html`;
const cucumberCli = path.join(root, 'node_modules', '@cucumber', 'cucumber', 'bin', 'cucumber.js');

fs.mkdirSync(reportsDir, { recursive: true });

const startedAt = new Date();
const child = spawn(process.execPath, [cucumberCli, ...process.argv.slice(2)], {
  cwd: root,
  env: { ...process.env, REPORT_RUN_ID: runId },
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error('Unable to start Cucumber:', error);
  process.exitCode = 1;
});

child.on('close', (exitCode) => {
  const finishedAt = new Date();
  try {
    const features = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const result = exitCode === 0 ? 'pass' : 'failed';
    const summaryPath = path.join(reportsDir, `test-report-${result}.html`);
    fs.writeFileSync(
      summaryPath,
      createSummaryHtml(features, startedAt, finishedAt, detailsPath, process.env.HEADLESS !== 'false', result),
      'utf8',
    );
    console.log(`\nReadable test report: ${summaryPath}`);
    console.log(`Detailed Cucumber report: ${path.join(reportsDir, detailsPath)}`);
    openReport(summaryPath);
  } catch (error) {
    console.error('Unable to create the readable test report:', error);
    process.exitCode = 1;
  }
  if (exitCode !== 0) process.exitCode = exitCode ?? 1;
});

function openReport(reportPath) {
  if (process.env.CI) return;

  const command = process.platform === 'win32'
    ? 'explorer.exe'
    : process.platform === 'darwin'
      ? 'open'
      : 'xdg-open';
  const opener = spawn(command, [reportPath], { detached: true, stdio: 'ignore' });
  opener.on('error', (error) => {
    console.error(`Unable to open the test report automatically: ${error.message}`);
  });
  opener.unref();
}

function createSummaryHtml(features, startedAt, finishedAt, detailsFile, headless, result) {
  const scenarios = features.flatMap((feature) =>
    (feature.elements ?? [])
      .filter((element) => element.type !== 'background')
      .map((scenario) => {
        const steps = (scenario.steps ?? []).filter((step) => !step.hidden);
        const statuses = steps.map((step) => step.result?.status ?? 'unknown');
        const status = statuses.includes('failed')
          ? 'failed'
          : statuses.includes('undefined')
            ? 'undefined'
            : statuses.includes('pending')
              ? 'pending'
              : statuses.includes('skipped')
                ? 'skipped'
                : 'passed';
        const duration = steps.reduce((total, step) => total + (step.result?.duration ?? 0), 0);
        const failures = steps
          .filter((step) => step.result?.status === 'failed')
          .map((step) => `<pre>${escapeHtml(step.result.error_message ?? 'Step failed')}</pre>`)
          .join('');
        return {
          feature: feature.name ?? 'Feature',
          name: scenario.name ?? 'Unnamed scenario',
          status,
          duration,
          failures,
          tags: (scenario.tags ?? []).map((tag) => tag.name).join(', '),
        };
      }),
  );
  const totals = scenarios.reduce((counts, scenario) => {
    counts[scenario.status] = (counts[scenario.status] ?? 0) + 1;
    return counts;
  }, {});
  const durationMs = finishedAt.getTime() - startedAt.getTime();
  const scenarioRows = scenarios
    .map(
      (scenario) => `<tr>
        <td><strong>${escapeHtml(scenario.name)}</strong><small>${escapeHtml(scenario.feature)}</small></td>
        <td><span class="status ${escapeHtml(scenario.status)}">${escapeHtml(scenario.status)}</span></td>
        <td>${formatDuration(scenario.duration / 1e6)}</td>
        <td>${escapeHtml(scenario.tags || '-')}</td>
      </tr>${scenario.failures ? `<tr class="failure"><td colspan="4">${scenario.failures}</td></tr>` : ''}`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Test run report - ${result.toUpperCase()}</title>
  <style>
    :root { color-scheme: light; font-family: "Segoe UI", Arial, sans-serif; color: #172033; background: #f3f5f9; }
    body { max-width: 1100px; margin: 36px auto; padding: 0 20px; }
    header, .card { background: white; border: 1px solid #e1e6ef; border-radius: 10px; padding: 22px; }
    h1 { margin: 0 0 8px; font-size: 26px; } .muted, small { color: #657187; }
    .meta { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 18px; }
    .meta span { display: block; margin-top: 4px; font-weight: 600; }
    .cards { display: flex; flex-wrap: wrap; gap: 12px; margin: 18px 0; }
    .card { min-width: 110px; padding: 14px 18px; } .count { display: block; font-size: 23px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; }
    th, td { padding: 13px 15px; text-align: left; border-bottom: 1px solid #e8ebf1; vertical-align: top; }
    th { background: #f8f9fb; font-size: 13px; color: #657187; }
    small { display: block; margin-top: 4px; } .status { font-weight: 700; text-transform: capitalize; }
    .passed { color: #167447; } .failed, .undefined { color: #b42318; } .pending, .skipped { color: #8a5a00; }
    .failure td { padding-top: 0; } pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #fff3f2; color: #7a271a; padding: 12px; border-radius: 6px; }
    a { color: #175cd3; } .empty { padding: 20px; text-align: center; color: #657187; }
  </style>
</head>
<body>
  <header>
    <h1>Test run report - ${result.toUpperCase()}</h1>
    <div class="muted">Scenario results and run metadata</div>
    <div class="meta">
      <div>Started<span>${escapeHtml(startedAt.toLocaleString())}</span></div>
      <div>Finished<span>${escapeHtml(finishedAt.toLocaleString())}</span></div>
      <div>Total duration<span>${formatDuration(durationMs)}</span></div>
      <div>Browser mode<span>${headless ? 'Headless' : 'Headed'}</span></div>
      <div>Detailed report<span><a href="${escapeHtml(detailsFile)}">Open Cucumber report</a></span></div>
    </div>
  </header>
  <section class="cards">
    ${['passed', 'failed', 'skipped', 'pending', 'undefined']
      .map((status) => `<div class="card"><span class="count ${status}">${totals[status] ?? 0}</span>${status}</div>`)
      .join('')}
    <div class="card"><span class="count">${scenarios.length}</span>total scenarios</div>
  </section>
  <table>
    <thead><tr><th>Test / scenario</th><th>Result</th><th>Duration</th><th>Tags</th></tr></thead>
    <tbody>${scenarioRows || '<tr><td class="empty" colspan="4">No scenarios were run.</td></tr>'}</tbody>
  </table>
</body>
</html>`;
}

function formatDuration(milliseconds) {
  if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`;
  const seconds = milliseconds / 1000;
  return seconds < 60 ? `${seconds.toFixed(2)} s` : `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(1)}s`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}
