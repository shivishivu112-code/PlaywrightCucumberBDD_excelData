import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import path from 'path';
import { pathToFileURL } from 'url';
import { CustomWorld } from '../support/world';
import { clickable, field, dropdown, element, frameSelector, escapeRegExp } from '../utils/locator-helper';

/**
 * Reusable steps. Use them in any feature file, no new code needed.
 *
 * {string} targets can be:
 *   - visible text, label or placeholder:  "Sign in", "Full name"
 *   - a name from src/locators/locators.ts: "Sign in button"
 *   - a selector:                           "#login_field", "//span[text()='Hi']"
 */

// ---------------------------------------------------------------- Navigation

Given('the user navigates to {string}', async function (this: CustomWorld, url: string) {
  // A full URL is used as is. A path like "/login" is added to BASE_URL.
  await this.page.goto(url);
});

Given('the user opens the local page {string}', async function (this: CustomWorld, file: string) {
  await this.page.goto(pathToFileURL(path.resolve(process.cwd(), file)).href);
});

When('the user refreshes the page', async function (this: CustomWorld) {
  await this.page.reload();
});

When('the user goes back', async function (this: CustomWorld) {
  await this.page.goBack();
});

When('the user goes forward', async function (this: CustomWorld) {
  await this.page.goForward();
});

// --------------------------------------------------------------------- Click

When('the user clicks on {string}', async function (this: CustomWorld, target: string) {
  await clickable(this.scope, target).click();
});

When('the user double clicks on {string}', async function (this: CustomWorld, target: string) {
  await clickable(this.scope, target).dblclick();
});

When('the user right clicks on {string}', async function (this: CustomWorld, target: string) {
  await clickable(this.scope, target).click({ button: 'right' });
});

When('the user hovers over {string}', async function (this: CustomWorld, target: string) {
  await clickable(this.scope, target).hover();
});

// --------------------------------------------------------------------- Input

When('the user enters {string} into {string}', async function (this: CustomWorld, value: string, target: string) {
  await field(this.scope, target).fill(value);
});

// Keeps secrets out of feature files: only the variable NAME appears in the report.
When('the user enters the value of environment variable {string} into {string}',async function (this: CustomWorld, variable: string, target: string) {
    const value = process.env[variable];
    if (value === undefined) throw new Error(`Environment variable ${variable} is not set. Check your .env file.`);
    await field(this.scope, target).fill(value);
  },
);

When('the user types {string} into {string}', async function (this: CustomWorld, value: string, target: string) {
  await field(this.scope, target).pressSequentially(value); // key by key, for fields with key listeners
});

When('the user clears {string}', async function (this: CustomWorld, target: string) {
  await field(this.scope, target).clear();
});

When('the user presses the {string} key', async function (this: CustomWorld, key: string) {
  await this.page.keyboard.press(key); // e.g. Enter, Tab, Escape, Control+A
});

When('the user checks {string}', async function (this: CustomWorld, target: string) {
  await field(this.scope, target).check();
});

When('the user unchecks {string}', async function (this: CustomWorld, target: string) {
  await field(this.scope, target).uncheck();
});

When('the user uploads the file {string} to {string}', async function (this: CustomWorld, file: string, target: string) {
  await field(this.scope, target).setInputFiles(path.resolve(process.cwd(), file));
});

// ------------------------------------------------------------------ Dropdown

When('the user selects {string} from the {string} dropdown', async function (this: CustomWorld, option: string, target: string) {
  await dropdown(this.scope, target).selectOption({ label: option });
});

When('the user selects the value {string} from the {string} dropdown', async function (this: CustomWorld, value: string, target: string) {
  await dropdown(this.scope, target).selectOption({ value });
});

When('the user selects option number {int} from the {string} dropdown', async function (this: CustomWorld, position: number, target: string) {
  await dropdown(this.scope, target).selectOption({ index: position - 1 }); // 1 = first option
});

// -------------------------------------------------------------------- Scroll

When('the user scrolls down', async function (this: CustomWorld) {
  await this.page.evaluate(() => window.scrollBy(0, window.innerHeight));
});

When('the user scrolls up', async function (this: CustomWorld) {
  await this.page.evaluate(() => window.scrollBy(0, -window.innerHeight));
});

When('the user scrolls down by {int} pixels', async function (this: CustomWorld, pixels: number) {
  await this.page.evaluate((y) => window.scrollBy(0, y), pixels);
});

When('the user scrolls up by {int} pixels', async function (this: CustomWorld, pixels: number) {
  await this.page.evaluate((y) => window.scrollBy(0, -y), pixels);
});

When('the user scrolls to the top of the page', async function (this: CustomWorld) {
  await this.page.evaluate(() => window.scrollTo(0, 0));
});

When('the user scrolls to the bottom of the page', async function (this: CustomWorld) {
  await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
});

When('the user scrolls to {string}', async function (this: CustomWorld, target: string) {
  await element(this.scope, target).scrollIntoViewIfNeeded();
});

// ----------------------------------------------------- Windows (tabs), frames

// Use right after the click that opens the window. Waits up to 10 seconds for it.
When('the user switches to the new window', async function (this: CustomWorld) {
  await expect
    .poll(() => this.context.pages().filter((p) => p !== this.page).length, { timeout: 10_000 })
    .toBeGreaterThan(0);
  const others = this.context.pages().filter((p) => p !== this.page);
  const target = others[others.length - 1];
  await target.waitForLoadState();
  await this.switchToPage(target);
});

When('the user switches to window number {int}', async function (this: CustomWorld, position: number) {
  const target = this.context.pages()[position - 1]; // 1 = the first window opened
  if (!target) throw new Error(`Window number ${position} does not exist. Open windows: ${this.context.pages().length}`);
  await this.switchToPage(target);
});

When('the user switches to the window with title {string}', async function (this: CustomWorld, title: string) {
  for (const candidate of this.context.pages()) {
    if ((await candidate.title()).includes(title)) {
      await this.switchToPage(candidate);
      return;
    }
  }
  throw new Error(`No open window has a title containing "${title}".`);
});

When('the user switches to the window with URL containing {string}', async function (this: CustomWorld, text: string) {
  const target = this.context.pages().find((p) => p.url().includes(text));
  if (!target) throw new Error(`No open window has a URL containing "${text}".`);
  await this.switchToPage(target);
});

When('the user closes the current window', async function (this: CustomWorld) {
  await this.page.close();
  const remaining = this.context.pages();
  if (remaining.length === 0) throw new Error('No window left open after closing the current one.');
  await this.switchToPage(remaining[0]); // back to the first remaining window
});

When('the user switches to the frame {string}', async function (this: CustomWorld, target: string) {
  this.frame = this.page.frameLocator(frameSelector(target));
});

When('the user switches back to the main page', async function (this: CustomWorld) {
  this.frame = undefined;
});

// ---------------------------------------------------------------------- Waits

When('the user waits for {int} seconds', async function (this: CustomWorld, seconds: number) {
  await this.page.waitForTimeout(seconds * 1000); // prefer the waits below when possible
});

When('the user waits for the page to load', async function (this: CustomWorld) {
  await this.page.waitForLoadState('load');
});

When('the user waits for {string} to be visible', async function (this: CustomWorld, target: string) {
  await element(this.scope, target).waitFor({ state: 'visible' });
});

When('the user waits for {string} to disappear', async function (this: CustomWorld, target: string) {
  await element(this.scope, target).waitFor({ state: 'hidden' });
});

// ------------------------------------------------- Dialogs (alert / confirm)
// Say what to do BEFORE the click that opens the dialog. The default is accept.

When('the user accepts the next dialog', async function (this: CustomWorld) {
  this.dialogAction = 'accept';
});

When('the user dismisses the next dialog', async function (this: CustomWorld) {
  this.dialogAction = 'dismiss';
});

Then('the dialog message should be {string}', async function (this: CustomWorld, message: string) {
  expect(this.lastDialogMessage).toBe(message);
});

Then('the dialog message should contain {string}', async function (this: CustomWorld, text: string) {
  expect(this.lastDialogMessage).toContain(text);
});

// ---------------------------------------------------------------- Screenshots

When('the user takes a screenshot named {string}', async function (this: CustomWorld, name: string) {
  const image = await this.page.screenshot({ fullPage: true });
  this.attach(image, { mediaType: 'image/png', fileName: `${name}.png` });
});

// ----------------------------------------------------------------- Assertions

Then('the element {string} should be visible', async function (this: CustomWorld, target: string) {
  await expect(element(this.scope, target)).toBeVisible();
});

Then('the element {string} should not be visible', async function (this: CustomWorld, target: string) {
  await expect(element(this.scope, target)).toBeHidden();
});

Then('the element {string} should be enabled', async function (this: CustomWorld, target: string) {
  await expect(clickable(this.scope, target)).toBeEnabled();
});

Then('the element {string} should be disabled', async function (this: CustomWorld, target: string) {
  await expect(clickable(this.scope, target)).toBeDisabled();
});

// For text checks, identify the element by a locator name or a selector, not by its own text.
Then('the element {string} should have text {string}', async function (this: CustomWorld, target: string, text: string) {
  await expect(element(this.scope, target)).toHaveText(text);
});

Then('the element {string} should contain text {string}', async function (this: CustomWorld, target: string, text: string) {
  await expect(element(this.scope, target)).toContainText(text);
});

Then('the field {string} should have value {string}', async function (this: CustomWorld, target: string, value: string) {
  await expect(field(this.scope, target)).toHaveValue(value);
});

Then('the checkbox {string} should be checked', async function (this: CustomWorld, target: string) {
  await expect(field(this.scope, target)).toBeChecked();
});

Then('the checkbox {string} should be unchecked', async function (this: CustomWorld, target: string) {
  await expect(field(this.scope, target)).not.toBeChecked();
});

Then('the page should contain the text {string}', async function (this: CustomWorld, text: string) {
  await expect(this.scope.getByText(text).first()).toBeVisible();
});

Then('the page URL should contain {string}', async function (this: CustomWorld, text: string) {
  await expect(this.page).toHaveURL(new RegExp(escapeRegExp(text)));
});

Then('the page title should be {string}', async function (this: CustomWorld, title: string) {
  await expect(this.page).toHaveTitle(title);
});

Then('the page title should contain {string}', async function (this: CustomWorld, text: string) {
  await expect(this.page).toHaveTitle(new RegExp(escapeRegExp(text)));
});
