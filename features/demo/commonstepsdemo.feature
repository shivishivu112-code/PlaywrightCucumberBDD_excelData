@demo
Feature: Reusable step library demo7 A runnable example that uses the common steps against a local test page.

  Background:
    Given the user opens the local page "test-pages/demo.html"

  Scenario: Form fields, dropdown, checkbox and click
    Then the page title should be "Demo Page"
    When the user enters "Asha" into "Full name"
    And the user selects "Green" from the "Favourite colour" dropdown
    And the user checks "I agree to the terms"
    And the user clicks on "Say hello"
    Then the field "Full name" should have value "Asha"
    And the checkbox "I agree to the terms" should be checked
    And the element "#status" should have text "Hello clicked"

  Scenario: Scrolling
    When the user scrolls down by 500 pixels
    And the user scrolls to the bottom of the page
    Then the element "Bottom section" should be visible
    When the user scrolls to the top of the page
    Then the element "Demo Page" should be visible

  Scenario: Switching to a new window and back
    When the user clicks on "Open popup"
    And the user switches to the new window
    Then the page title should be "Popup Window"
    When the user closes the current window
    Then the page title should be "Demo Page"

  Scenario: Alert dialog
    When the user accepts the next dialog
    And the user clicks on "Show alert"
    Then the dialog message should be "Are you sure?"

  Scenario: Working inside an iframe
    When the user switches to the frame "#inner"
    And the user clicks on "Inner button"
    Then the element "#msg" should have text "Inner clicked"
    When the user switches back to the main page
    Then the element "Demo Page" should be visible
