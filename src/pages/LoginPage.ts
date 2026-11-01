import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.locator('#login_field');
    this.passwordInput = page.locator('#password');
    this.signInButton = page.locator('input[name="commit"]');
    this.errorMessage = page.getByText(/incorrect username or password/i);
  }

  async open(url?: string) {
    if (!url) {
      await this.goto('/login');
      return;
    }

    const loginUrl = new URL(url);
    if (loginUrl.pathname === '/') loginUrl.pathname = '/login';
    await this.goto(loginUrl.toString());
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }
}