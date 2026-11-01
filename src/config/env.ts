import * as dotenv from 'dotenv';
import path from 'path';

// Load .env once, from the project root.
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Check your .env file.`);
  }
  return value;
}

// Getters so a missing variable only fails the scenarios that actually need it.
export const env = {
  baseUrl: process.env.BASE_URL ?? 'https://github.com',
  headless: process.env.HEADLESS !== 'false',
  get username() { return required('APP_USERNAME'); },
  get password() { return required('PASSWORD'); },
  get totpSecret() { return required('TOTP_SECRET'); },

  // Outlook verification code (read through Microsoft Graph)
  get tenantId() { return required('GRAPH_TENANT_ID'); },
  get clientId() { return required('GRAPH_CLIENT_ID'); },
  get clientSecret() { return required('GRAPH_CLIENT_SECRET'); },
  get otpMailbox() { return required('OTP_MAILBOX'); },          // the test mailbox that receives the code
  get otpEmailHint() { return required('OTP_EMAIL_HINT'); },     // how that address appears on the "choose email" screen
  otpSender: process.env.OTP_SENDER ?? '',                        // optional: only read mail from this sender
  otpRegex: process.env.OTP_REGEX ?? '\\b(\\d{6})\\b',            // optional: how to find the code in the email
};
