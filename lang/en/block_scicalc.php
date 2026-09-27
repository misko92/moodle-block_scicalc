<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Language strings for block_scicalc.
 *
 * @package   block_scicalc
 * @copyright 2026 Eduardo Kraus {@link https://eduardokraus.com}
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$string['calculator'] = 'Calculator';
$string['clear_history'] = 'Clear history';
$string['close'] = 'Close calculator';
$string['display'] = 'Calculator display';
$string['displayplaceholder'] = 'e.g. 6.02E23';
$string['editinghint'] = 'Students see a floating Calculator button at the top right of this page. This note is only shown while editing.';
$string['error_arity_mismatch'] = 'Invalid number of arguments.';
$string['error_factorial_overflow'] = 'Factorial exceeded the numeric limit.';
$string['error_generic'] = 'Error evaluating the expression.';
$string['error_invalid_expression'] = 'I couldn\'t calculate it because the expression is written '
    . 'in a format the calculator doesn\'t recognize '
    . '(check parentheses, signs, and names like <code>sin</code>/<code>sqrt</code>). '
    . 'Put <code>*</code> between numbers and brackets, e.g. <code>2*(3+4)</code>.';
$string['error_mismatched_parentheses'] = 'Mismatched parentheses.';
$string['error_misplaced_comma'] = 'Comma in an invalid position.';
$string['error_negative_factorial'] = 'Can\'t compute the factorial of a negative number.';
$string['error_non_finite_result'] = 'The result of this calculation was infinite or not a number (NaN). '
    . 'Check that you are not dividing by zero or using something like the square root of a negative number.';
$string['error_non_integer_factorial'] = 'Factorial is only defined for integers.';
$string['error_stack_underflow'] = 'A number or argument is missing. '
    . 'E.g.: <code>2*</code>, <code>2 + ( )</code>, <code>2 +</code>, '
    . '<code>sin()</code> with no value, <code>pow(2)</code> missing the 2nd argument.';
$string['error_unclosed_function_call'] = 'Unclosed function call.';
$string['error_unknown_identifier'] = 'Unknown name. Use lower-case <code>e</code> for Euler\'s number and <code>E</code> only for powers of ten, e.g. <code>6.02E23</code>.';
$string['error_unknown_token'] = 'Unknown symbol.';
$string['error_unsupported_function'] = 'Unsupported function.';
$string['error_zero_argument_function_call'] = 'Function call with no arguments.';
$string['history_title'] = 'History';
$string['invalid_expression'] = 'Invalid expression';
$string['key_abs'] = 'Absolute value';
$string['key_ans'] = 'Previous answer';
$string['key_backspace'] = 'Delete last character';
$string['key_clear'] = 'Clear';
$string['key_divide'] = 'Divide';
$string['key_epower'] = 'e to the power of';
$string['key_equals'] = 'Equals';
$string['key_exponent'] = 'Times ten to the power of';
$string['key_ln'] = 'Natural logarithm';
$string['key_log'] = 'Logarithm base 10';
$string['key_minus'] = 'Minus';
$string['key_multiply'] = 'Multiply';
$string['key_negate'] = 'Change sign';
$string['key_nthroot'] = 'Nth root';
$string['key_plus'] = 'Plus';
$string['key_point'] = 'Decimal point';
$string['key_power'] = 'To the power of';
$string['key_reciprocal'] = 'Reciprocal';
$string['key_sqrt'] = 'Square root';
$string['key_square'] = 'Squared';
$string['key_tenpower'] = 'Ten to the power of';
$string['pluginname'] = 'Scientific Calculator';
$string['privacy:metadata'] = 'The Scientific Calculator block does not store any personal data on the server. '
    . 'Calculation history is kept in the browser\'s localStorage only.';
$string['scicalc:addinstance'] = 'Add a new Scientific Calculator block';
$string['scicalc:myaddinstance'] = 'Add a Scientific Calculator block to My home';
