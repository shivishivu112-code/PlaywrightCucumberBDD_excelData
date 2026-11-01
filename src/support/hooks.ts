import { Before, After, BeforeAll, AfterAll, Status, ITestCaseHookParameter } from '@cucumber/cucumber';
import { chromium, Browser, Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CustomWorld } from './world';
import { env } from '../config/env';
import { loadRows } from '../data/testData';

let browser: Browser;

// Launch one browser for the whole run.
BeforeAll(async function () {
  browser = await chromium.launch({ headless: env.headless });
});

// Fresh, isolated browser context (like a new incognito window) per scenario.
Before(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  const scenarioTags = new Set(scenario.pickle.tags.map((tag) => tag.name.slice(1)));
  const excelTestData = loadRows({ resolveSecrets: false }).find(
    (row) => row.run && scenarioTags.has(row.testID),
  );
  this.excelTestData = excelTestData;
  this.context = await browser.newContext({ baseURL: env.baseUrl });

  // Every window opened in this scenario gets the same dialog handling.
  this.context.on('page', (newPage: Page) => {
    newPage.on('dialog', async (dialog) => {
      this.lastDialogMessage = dialog.message();
      const action = this.dialogAction;
      this.dialogAction = 'accept'; // back to the default after each dialog
      if (action === 'dismiss') {
        await dialog.dismiss();
      } else {
        await dialog.accept();
      }
    });
  });

  this.page = await this.context.newPage();
});

// Attach a screenshot to the report when a scenario fails, then clean up.
After(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  try {
    if (scenario.result?.status === Status.FAILED && this.page && !this.page.isClosed()) {
      const image = await this.page.screenshot({ fullPage: true });
      const screenshotsDir = path.resolve(process.cwd(), 'reports', 'failed-screenshots');
      const runId = (process.env.REPORT_RUN_ID ?? new Date().toISOString()).replace(/[^a-zA-Z0-9-]/g, '-');
      const scenarioName = scenario.pickle.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80) || 'scenario';
      const screenshotPath = path.join(
        screenshotsDir,
        `${runId}-${scenarioName}-${scenario.testCaseStartedId}.png`,
      );

      await mkdir(screenshotsDir, { recursive: true });
      await writeFile(screenshotPath, image);
      this.attach(image, 'image/png');
      console.log(`Failed scenario screenshot saved: ${screenshotPath}`);
    }
  } finally {
    if (this.context) {
      await this.context.close();
    }
  }
});

AfterAll(async function () {
  await browser.close();
});
