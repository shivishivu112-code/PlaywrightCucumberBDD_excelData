const runId = process.env.REPORT_RUN_ID || new Date().toISOString().replace(/[:.]/g, '-');
const path = require('node:path');
const fs = require('node:fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '.env'), quiet: true });

let tags = '';

if (process.env.CUCUMBER_EXCEL_FILTER === 'false') {
  console.log('[excel] Cucumber Excel filtering is disabled; running the configured feature suite.');
} else {
  require('ts-node/register');

  const { loadRows } = require('./src/data/testData');
  const enabledRows = loadRows({ resolveSecrets: false }).filter((row) => row.run);
  const featureFiles = [];

  function collectFeatureFiles(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) collectFeatureFiles(entryPath);
      else if (entry.isFile() && entry.name.endsWith('.feature')) featureFiles.push(entryPath);
    }
  }

  collectFeatureFiles(path.resolve(__dirname, 'features'));

  const featureText = featureFiles
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');
  const mappedRows = [];
  const unmappedRows = [];

  for (const row of enabledRows) {
    if (!/^[A-Za-z0-9_-]+$/.test(row.testID)) {
      throw new Error(`Excel testID "${row.testID}" must contain only letters, numbers, "_" or "-".`);
    }
    const tagPattern = new RegExp(
      `^[\\t ]*(?:@[A-Za-z0-9_-]+[\\t ]+)*@${row.testID}(?=[\\t \\r]|$)`,
      'm',
    );
    if (tagPattern.test(featureText)) {
      mappedRows.push(row);
    } else {
      unmappedRows.push(row);
    }
  }

  if (unmappedRows.length > 0) {
    console.warn(
      `[excel] Enabled testID(s) have no matching Cucumber feature tag and will not run: ${
        unmappedRows.map((row) => row.testID).join(', ')
      }`,
    );
  }

  if (mappedRows.length === 0) {
    throw new Error(
      'No enabled Excel testIDs are mapped to Cucumber scenarios. Add each testID as a feature/scenario tag (for example @TC001).',
    );
  }

  tags = mappedRows.map((row) => `@${row.testID}`).join(' or ');
  console.log(`[excel] Cucumber will run scenarios tagged: ${tags}`);
}

module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['src/support/**/*.ts', 'src/steps/**/*.ts'],
    paths: ['features/**/*.feature'],
    tags,
    format: [
      'pretty',
      'summary',
      `html:reports/cucumber-details-${runId}.html`,
      `json:reports/cucumber-results-${runId}.json`,
    ],
  },
};