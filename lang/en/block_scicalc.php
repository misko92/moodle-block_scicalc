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
 * block_scicalc.php — language strings
 *
 * @package   block_scicalc
 * @copyright 2026 Eduardo Kraus {@link https://eduardokraus.com}
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

// Block metadata.
$string['pluginname']             = 'Scientific Calculator';
$string['scicalc:addinstance']    = 'Add a new Scientific Calculator block';
$string['scicalc:myaddinstance']  = 'Add a Scientific Calculator block to My home';

// Calculator UI.
$string['calculator_title']  = 'Calculator';
$string['calculator_help']   = 'Type an expression and press Enter or "=".<br>Supported:';
$string['history_title']     = 'History';
$string['clear_history']     = 'Clear history';
$string['invalid_expression'] = 'Invalid expression';

// Error messages (shown in the JS calculator).
$string['error_generic']                     = 'Error evaluating the expression.';
$string['error_unknown_token']               = 'Unknown token.';
$string['error_misplaced_comma']             = 'Comma in an invalid position.';
$string['error_mismatched_parentheses']      = 'Mismatched parentheses.';
$string['error_zero_argument_function_call'] = 'Function call with no arguments.';
$string['error_invalid_token_flow']          = 'Invalid token flow.';
$string['error_unclosed_function_call']      = 'Unclosed function call.';
$string['error_invalid_factorial']           = 'Invalid factorial.';
$string['error_negative_factorial']          = 'Can\'t compute the factorial of a negative number.';
$string['error_non_integer_factorial']       = 'Factorial is only defined for integers.';
$string['error_factorial_overflow']          = 'Factorial exceeded the numeric limit.';
$string['error_arity_mismatch']              = 'Invalid number of arguments.';
$string['error_unsupported_function']        = 'Unsupported function.';
$string['error_stack_underflow']             = 'A number or argument is missing. '
    . 'E.g.: <code>+2</code>, <code>2*</code>, <code>2 + ( )</code>, <code>2 +</code>, '
    . '<code>sin()</code> with no value, <code>pow(2)</code> missing the 2nd argument.';
$string['error_invalid_number']              = 'Invalid number.';
$string['error_unknown_identifier']          = 'Unknown identifier.';
$string['error_unsupported_operator']        = 'Unsupported operator.';
$string['error_unexpected_token']            = 'Unexpected token.';
$string['error_invalid_expression']          = 'I couldn\'t calculate it because the expression is written '
    . 'in a format the calculator doesn\'t recognize '
    . '(check parentheses, signs, and names like <code>sin</code>/<code>sqrt</code>).';
$string['error_non_finite_result']           = 'The result of this calculation was infinite or not a number (NaN). '
    . 'Check that you are not dividing by zero or using something like the square root of a negative number.';

// Privacy.
$string['privacy:metadata'] = 'The Scientific Calculator block does not store any personal data. '
    . 'Calculation history is kept in the browser\'s localStorage only.';
