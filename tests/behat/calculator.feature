@block @block_scicalc @javascript
Feature: Scientific calculator popup
  In order to do calculations while working in a course
  As a student
  I need a floating calculator that evaluates expressions correctly

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Student   | 1        | student1@example.com |
      | teacher1 | Teacher   | 1        | teacher1@example.com |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1     | student        |
      | teacher1 | C1     | editingteacher |
    And the following "blocks" exist:
      | blockname | contextlevel | reference | pagetypepattern | defaultregion |
      | scicalc   | Course       | C1        | course-view-*   | side-pre      |

  @accessibility
  Scenario: Unary minus binds looser than powers
    Given I am on the "Course 1" course page logged in as student1
    When I click on "Calculator" "button"
    And I set the field "Calculator display" to "-2^2"
    And I press "Equals"
    Then the field "Calculator display" matches value "-4"
    And I should see "-2^2" in the "#scicalc-history" "css_element"
    And the page should meet accessibility standards with "wcag2a, wcag2aa, wcag21a, wcag21aa" extra tests

  Scenario: Operator keys continue from a result, number keys start afresh
    Given I am on the "Course 1" course page logged in as student1
    And I click on "Calculator" "button"
    When I press "3"
    And I press "Squared"
    And I press "Equals"
    Then the field "Calculator display" matches value "9"
    And I press "Squared"
    And I press "Equals"
    And the field "Calculator display" matches value "81"
    And I press "Change sign"
    And the field "Calculator display" matches value "-81"
    And I press "5"
    And the field "Calculator display" matches value "5"

  Scenario: Invalid expressions show an explanation
    Given I am on the "Course 1" course page logged in as student1
    And I click on "Calculator" "button"
    When I set the field "Calculator display" to "2(3)"
    And I press "Equals"
    Then I should see "Put * between numbers and brackets"

  Scenario: The block is only visible to teachers while editing
    Given I am on the "Course 1" course page logged in as teacher1
    Then I should not see "Students see a floating Calculator button"
    And "Calculator" "button" should exist
    When I turn editing mode on
    Then I should see "Students see a floating Calculator button"

