/**
 * Optional "locator repository". *
 * Give an element a friendly name here, then use that name in feature files:
 *   When the user clicks on "Sign in button"
 *
 * Names are matched exactly. Any CSS or XPath selector works as the value.
 * Elements that are not listed here can still be found by their visible text,
 * label or placeholder, or by writing a selector straight in the feature file.
 */
export const locators: Record<string, string> = {
  'Username field'          : '#login_field',
  'Password field'          : '#password',
  'Sign in button'          : 'input[name="commit"]',
  'Authenticator code field': '#app_totp',
  'Dashboard label'         : '//span[text()="Dashboard"]',
  'Signbutton'              : 'role=button[name="Sign in"]',
};
// page.getByRole('button', { name: 'Sign in' }).click();