@auth @outlook
Feature: Login with an email verification code
  After the password, the user picks an email address and enters the code sent to it.

  @smoke
  Scenario: Login with a verification code sent to Outlook
    Given the user is on the login page
    When the user logs in with valid credentials
    And the user selects the configured email for the verification code
    And the user requests the verification code
    And the user enters the verification code from Outlook
    Then the dashboard is displayed
