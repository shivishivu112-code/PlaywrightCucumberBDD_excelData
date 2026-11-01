import { setWorldConstructor, setDefaultTimeout, World, IWorldOptions } from '@cucumber/cucumber';
import { BrowserContext, FrameLocator, Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { MfaPage } from '../pages/MfaPage';
import { DashboardPage } from '../pages/DashboardPage';
import { EmailSelectionPage } from '../pages/EmailSelectionPage';
import { VerificationPage } from '../pages/VerificationPage';
import { TestRow } from '../data/testData';

// One World object is created per scenario. Steps use it through `this`.
export class CustomWorld extends World {
  context!: BrowserContext;

  // The window (tab) the steps currently act on. Window steps change this.
  page!: Page;

  // Set while the user is "inside" an iframe. Element steps then search the iframe.
  frame?: FrameLocator;

  // Dialog (alert/confirm) handling used by the dialog steps.
  dialogAction: 'accept' | 'dismiss' = 'accept';
  lastDialogMessage = '';

  // When the verification code was requested. The mailbox is searched from this moment on.
  otpRequestedAt?: Date;

  excelTestData?: TestRow;

  constructor(options: IWorldOptions) {
    super(options);
  }

  // Where element steps look: the active iframe if there is one, otherwise the page.
  get scope(): Page | FrameLocator {
    return this.frame ?? this.page;
  }

  // Page objects are created on demand, so they always follow the current window.
  get loginPage() { return new LoginPage(this.page); }
  get mfaPage() { return new MfaPage(this.page); }
  get dashboardPage() { return new DashboardPage(this.page); }
  get emailSelectionPage() { return new EmailSelectionPage(this.page); }
  get verificationPage() { return new VerificationPage(this.page); }

  async switchToPage(target: Page) {
    this.page = target;
    this.frame = undefined;
    await target.bringToFront();
  }
}

setWorldConstructor(CustomWorld);
setDefaultTimeout(60_000);
