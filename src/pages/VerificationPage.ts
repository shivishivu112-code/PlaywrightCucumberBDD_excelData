import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

// The screen where the code from the email is typed in.
export class VerificationPage extends BasePage {
  readonly codeInput: Locator;
  readonly verifyButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    // TODO: confirm against the real page.
    this.codeInput = page.getByLabel(/code/i).or(page.getByPlaceholder(/code/i)).first();
    this.verifyButton = page.getByRole('button', { name: /verify|submit|continue|next|log ?in|sign ?in/i });
    this.errorMessage = page.getByRole('alert');
  }

  async submitCode(code: string) {
    await this.codeInput.fill(code);
    await this.verifyButton.click();
  }
}
