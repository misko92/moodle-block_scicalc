@block @block_scicalc @mod_quiz @javascript
Feature: Calculator during quiz attempts
  In order to do calculations in a quiz without my own calculator
  As a student
  I need the calculator on quiz attempt pages in courses that have the block

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Student   | 1        | student1@example.com |
      | teacher1 | Teacher   | 1        | teacher1@example.com |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
      | Course 2 | C2        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
      | student1 | C2     | student |
      | teacher1 | C1     | editingteacher |
    And the following "activities" exist:
      | activity | name        | course | idnumber | showblocks |
      | quiz     | Quiz noblk  | C1     | quiz1    | 0          |
      | quiz     | Quiz blocks | C1     | quiz2    | 1          |
      | quiz     | Quiz other  | C2     | quiz3    | 0          |
    And the following "question categories" exist:
      | contextlevel | reference | name           |
      | Course       | C1        | Test questions |
      | Course       | C2        | Other questions |
    And the following "questions" exist:
      | questioncategory | qtype       | name | questiontext   |
      | Test questions   | truefalse   | TF1  | First question |
      | Other questions  | truefalse   | TF2  | Other question |
    And quiz "Quiz noblk" contains the following questions:
      | question | page |
      | TF1      | 1    |
    And quiz "Quiz blocks" contains the following questions:
      | question | page |
      | TF1      | 1    |
    And quiz "Quiz other" contains the following questions:
      | question | page |
      | TF2      | 1    |
    And the following "blocks" exist:
      | blockname | contextlevel | reference | pagetypepattern | defaultregion |
      | scicalc   | Course       | C1        | course-view-*   | side-pre      |

  Scenario: The calculator appears in a quiz even when blocks are hidden during attempts
    Given I am on the "Quiz noblk" "mod_quiz > View" page logged in as "student1"
    When I press "Attempt quiz"
    Then I should see "First question"
    And I click on "Calculator" "button"
    And I set the field "Calculator display" to "-log(1E-3)"
    And I press "Equals"
    And the field "Calculator display" matches value "3"

  Scenario: Only one calculator appears when the quiz also shows blocks
    Given I am on the "Quiz blocks" "mod_quiz > View" page logged in as "student1"
    When I press "Attempt quiz"
    Then I should see "First question"
    And "Calculator" "button" should exist
    And "(//div[@id='scicalc-popup'])[2]" "xpath_element" should not exist

  Scenario: Quizzes in courses without the block have no calculator
    Given I am on the "Quiz other" "mod_quiz > View" page logged in as "student1"
    When I press "Attempt quiz"
    Then I should see "Other question"
    And "Calculator" "button" should not exist

  Scenario: Teachers can turn the calculator off for one quiz
    Given I am on the "Quiz noblk" "quiz activity editing" page logged in as "teacher1"
    And I expand all fieldsets
    And the field "Show calculator during attempts" matches value "1"
    When I set the field "Show calculator during attempts" to "0"
    And I press "Save and display"
    And I log out
    And I am on the "Quiz noblk" "mod_quiz > View" page logged in as "student1"
    And I press "Attempt quiz"
    Then I should see "First question"
    And "Calculator" "button" should not exist
