@auth
Feature: MFA login

  @smoke @TC001
  Scenario: Login with username, password and TOTP
//if in case feautefile steps in grey color that means you need to install the cucumber(Gherkin) full support in extenstion search cucumber
//if in case steps are not linked or jump to steps again add the setting.json file in the .vscode folder and add the below code
    Given the user is on the login page
    When the user logs in with valid credentials
    And the user enters a valid TOTP code
    Then the dashboard is displayed

  @regression @TC003
  Scenario Outline: Login is rejected for invalid credentials
    Given the user is on the login page
    When the user logs in with username "<username>" and password "<password>"
    Then an invalid credentials error is displayed

    Examples:
      | username        | password      |
      | not.a.real.user | WrongPass#123 |