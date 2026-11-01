import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

// The screen that lists email addresses and asks where to send the verification code.
export class EmailSelectionPage extends BasePage {
  readonly heading: Locator;
  readonly sendCodeButton: Locator;

  constructor(page: Page) {
    super(page);
    // TODO: confirm against the real page.
    this.heading = page.getByRole('heading', { name: /verif|send.*code|choose|select/i });
    this.sendCodeButton = page.getByRole('button', { name: /send|continue|next/i });
  }

  // A radio button, a labelled option, or plain text. Substring match, so a masked
  // address such as "j***@outlook.com" can be matched with "@outlook.com" or "j***".
  emailOption(email: string): Locator {
    return this.page
      .getByRole('radio', { name: email })
      .or(this.page.getByLabel(email))
      .or(this.page.getByText(email))
      .first();
  }

  async selectEmail(email: string) {
    await this.emailOption(email).click();
  }

  async requestCode() {
    await this.sendCodeButton.click();
  }
}
