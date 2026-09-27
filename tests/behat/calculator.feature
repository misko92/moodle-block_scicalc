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
  Scenario: A negative number raised to a power is bracketed
    Given I am on the "Course 1" course page logged in as student1
    When I click on "Calculator" "button"
    And I set the field "Calculator display" to "-2^2"
    Then the field "Calculator display" matches value "(-2)²"
    And I press "Equals"
    And the field "Calculator display" matches value "4"
    And I should see "(-2)²" in the "#scicalc-history" "css_element"
    And I press "CLR"
    And I set the field "Calculator display" to "5-3^2"
    And I press "Equals"
    And the field "Calculator display" matches value "-4"
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

  Scenario: Exponents are shown as superscripts
    Given I am on the "Course 1" course page logged in as student1
    And I click on "Calculator" "button"
    When I press "Ten to the power of"
    And I press "Minus"
    And I press "4"
    Then the field "Calculator display" matches value "10⁻⁴"
    And I press "Equals"
    And the field "Calculator display" matches value "0.0001"
    And I press "Ten to the power of"
    And I press "Minus"
    And I press "4"
    And I press "Decimal point"
    And I press "2"
    And the field "Calculator display" matches value "10^(-4.2)"
    And I press "Equals"
    And the field "Calculator display" matches value "0.0000630957344480193"
    And I press "Squared"
    And the field "Calculator display" matches value "0.0000630957344480193²"
    And I press "CLR"
    And I set the field "Calculator display" to "2^3*4"
    And the field "Calculator display" matches value "2³*4"
    And I press "Equals"
    And the field "Calculator display" matches value "32"

  Scenario: History lasts for the login session only
    Given I am on the "Course 1" course page logged in as student1
    And I click on "Calculator" "button"
    And I set the field "Calculator display" to "12*3"
    And I press "Equals"
    And I should see "12*3" in the "#scicalc-history" "css_element"
    When I reload the page
    Then I should see "12*3" in the "#scicalc-history" "css_element"
    And I log out
    And I am on the "Course 1" course page logged in as student1
    And I click on "Calculator" "button"
    And I should not see "12*3" in the "#scicalc-history" "css_element"

  Scenario: Function keys after an answer apply to that answer
    Given I am on the "Course 1" course page logged in as student1
    And I click on "Calculator" "button"
    And I set the field "Calculator display" to "100*10"
    And I press "Equals"
    When I press "Logarithm base 10"
    Then the field "Calculator display" matches value "log(1000)"
    And I press "Equals"
    And the field "Calculator display" matches value "3"
    # Typing a number after the function key replaces the answer.
    And I press "Logarithm base 10"
    And I click on "[data-action='insert'][data-value='1']" "css_element"
    And I click on "[data-action='insert'][data-value='0']" "css_element"
    And I click on "[data-action='insert'][data-value='0']" "css_element"
    And the field "Calculator display" matches value "log(100)"
    And I press "Equals"
    And the field "Calculator display" matches value "2"
    # An operator builds on the filled-in answer.
    And I press "Square root"
    And I press "Multiply"
    And I press "3"
    And the field "Calculator display" matches value "√(2)*3"
    # pH to [H+]: answer 4.2, then 10ˣ and +/− gives 10^(-4.2).
    And I press "CLR"
    And I set the field "Calculator display" to "4.2"
    And I press "Equals"
    And I press "Ten to the power of"
    And the field "Calculator display" matches value "10^(4.2)"
    And I press "Change sign"
    And the field "Calculator display" matches value "10^(-4.2)"
    And I press "Equals"
    And the field "Calculator display" matches value "0.0000630957344480193"
    # After 10ˣ, a minus starts a new negative exponent.
    And I press "Ten to the power of"
    And I press "Minus"
    And I press "4"
    And the field "Calculator display" matches value "10⁻⁴"
    # With nothing calculated yet, function keys work as before.
    And I press "CLR"
    And I press "Logarithm base 10"
    And the field "Calculator display" matches value "log()"

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

