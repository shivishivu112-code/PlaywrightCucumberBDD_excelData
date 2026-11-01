import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { getTotp } from '../utils/totp';

export class MfaPage extends BasePage {
  readonly codeInput: Locator;

  constructor(page: Page) {
    super(page);
    this.codeInput = page.locator('#app_totp');
  }

  async submitTotp(secret: string) {
    await this.codeInput.fill(await getTotp(secret));
  }
}

export const locators: Record<string, string> = {
  'Username field'          : '#login_field',
  'Password field'          : '#password',
  'Sign in button'          : 'input[name="commit"]',
  'Authenticator code field': '#app_totp',
  'Dashboard label'         : '//span[text()="Dashboard"]',
  'Signbutton'              : 'role=button[name="Sign in"]',
};