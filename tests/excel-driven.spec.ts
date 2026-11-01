import { expect, test } from '@playwright/test';
import { loadRows } from '../src/data/testData';

const enabledTestCases = loadRows().filter((testCase) => testCase.run);

if (enabledTestCases.length === 0) {
  throw new Error('No enabled Excel test cases found. Set flag=Y for at least one row in testdata.xlsx.');
}

for (const testCase of enabledTestCases) {
  test(`${testCase.testID} - ${testCase.testName}`, async ({ page }) => {
    const response = await page.goto(testCase.url);

    expect(response?.ok(), `Expected ${testCase.url} to return a successful HTTP response`).toBeTruthy();
    await expect(page.locator('body')).toBeVisible();
  });
}
