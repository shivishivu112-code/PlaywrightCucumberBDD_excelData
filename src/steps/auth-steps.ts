import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { env } from '../config/env';
import { waitForVerificationCode } from '../utils/outlook';


Given('the user is on the login page', async function (this: CustomWorld) {
  await this.loginPage.open(this.excelTestData?.url);
});

When('the user logs in with valid credentials', async function (this: CustomWorld) {
  await this.loginPage.login(env.username, env.password);
});

When('the user logs in with username {string} and password {string}', async function (
  this: CustomWorld,
  username: string,
  password: string,
) {
  await this.loginPage.login(username, password);
});

When('the user enters a valid TOTP code', async function (this: CustomWorld) {
  await this.mfaPage.submitTotp(env.totpSecret);
});

Then('the dashboard is displayed', async function (this: CustomWorld) {
  await expect(this.page).not.toHaveURL(/login|two-factor/);
  await expect(this.dashboardPage.dashboardLabel).toBeVisible();
});

Then('an invalid credentials error is displayed', async function (this: CustomWorld) {
  await expect(this.loginPage.errorMessage).toBeVisible();
});


When(  'the user selects the email {string} for the verification code',
  async function (this: CustomWorld, email: string) {
    await this.emailSelectionPage.selectEmail(email);
  },
);

// Uses OTP_EMAIL_HINT from .env, so the address stays out of feature files.
When('the user selects the configured email for the verification code', async function (this: CustomWorld) {
  await this.emailSelectionPage.selectEmail(env.otpEmailHint);
});

// The time is recorded BEFORE the click, so only the email this click triggers is accepted.
When('the user requests the verification code', async function (this: CustomWorld) {
  this.otpRequestedAt = new Date();
  await this.emailSelectionPage.requestCode();
});

// Waits for the email in the test mailbox (up to 90 s), then types the code in and submits.
When(
  'the user enters the verification code from Outlook',
  { timeout: 120_000 },
  async function (this: CustomWorld) {
    if (!this.otpRequestedAt) {
      throw new Error('Request the verification code first, so the mailbox search knows where to start.');
    }
    const code = await waitForVerificationCode({ since: this.otpRequestedAt });
    await this.verificationPage.submitCode(code);
  },
);