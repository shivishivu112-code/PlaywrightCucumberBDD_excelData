import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly dashboardLabel: Locator;

  constructor(page: Page) {
    super(page);
    this.dashboardLabel = page.locator('//span[text()="Dashboard"]');
  }
}