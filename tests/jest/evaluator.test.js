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
 * Tests for block_scicalc/evaluator.
 *
 * @copyright  2026 Eduardo Kraus {@link https://eduardokraus.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {evaluate, formatResult} from '../../amd/src/evaluator';

const calc = (expr) => formatResult(evaluate(expr));

describe('operator precedence', () => {
    test.each([
        ['-2^2', '-4'],
        ['−3^2', '-9'],
        ['(-2)^2', '4'],
        ['-(2)^2', '-4'],
        ['2^-2', '0.25'],
        ['10^-3', '0.001'],
        ['2^-3^2', '0.001953125'],
        ['2^3^2', '512'],
        ['-2*3', '-6'],
        ['2*-3', '-6'],
        ['-3*-2', '6'],
        ['--5', '5'],
        ['+5', '5'],
        ['2*+3', '6'],
        ['1-2-3', '-4'],
        ['8/4/2', '1'],
        ['2+3*4', '14'],
        ['-3!', '-6'],
        ['3!-2', '4'],
        ['7%3', '1'],
    ])('%s = %s', (expr, expected) => {
        expect(calc(expr)).toBe(expected);
    });
});

describe('chemistry-style calculations', () => {
    test.each([
        ['6.02E23*2', '1.204E24'],
        ['6.02E-23', '6.02E-23'],
        ['1.0E-14/1E-7', '1E-7'],
        ['-log(1E-3)', '3'],
        ['-log(2.5E-4)', '3.60205999132796'],
        ['10^(-4.2)', '0.0000630957344480193'],
        ['ln(e^(2))', '2'],
        ['0.1+0.2', '0.3'],
        ['√(16)', '4'],
        ['27^(1/3)', '3'],
        ['5^2', '25'],
        ['1/(4)', '0.25'],
        ['3×4÷2', '6'],
    ])('%s = %s', (expr, expected) => {
        expect(calc(expr)).toBe(expected);
    });
});

describe('functions and constants', () => {
    test.each([
        ['sin(90)', '1'],
        ['cos(60)', '0.5'],
        ['asin(1)', '90'],
        ['pi', String(Number(Math.PI.toPrecision(15)))],
        ['π', String(Number(Math.PI.toPrecision(15)))],
        ['PI', String(Number(Math.PI.toPrecision(15)))],
        ['e', String(Number(Math.E.toPrecision(15)))],
        ['LOG(100)', '2'],
        ['pow(2,10)', '1024'],
        ['max(1,(2),3)', '3'],
        ['min(4,max(1,2))', '2'],
        ['round(2.5)', '3'],
    ])('%s = %s', (expr, expected) => {
        expect(calc(expr)).toBe(expected);
    });
});

describe('absolute value bars', () => {
    test.each([
        ['|-3|', '3'],
        ['|15-17|', '2'],
        ['|2-|3-5||', '0'],
        ['2*|-4|+1', '9'],
    ])('%s = %s', (expr, expected) => {
        expect(calc(expr)).toBe(expected);
    });
});

describe('errors', () => {
    test.each([
        ['2(3)', 'error_invalid_expression'],
        ['2pi', 'error_invalid_expression'],
        ['E', 'error_unknown_identifier'],
        ['6.02E', 'error_unknown_identifier'],
        ['foo', 'error_unknown_identifier'],
        ['foo(1)', 'error_unsupported_function'],
        ['2 # 3', 'error_unknown_token'],
        ['(2', 'error_mismatched_parentheses'],
        ['2)', 'error_mismatched_parentheses'],
        ['log(2', 'error_unclosed_function_call'],
        ['log()', 'error_zero_argument_function_call'],
        ['pow(2)', 'error_arity_mismatch'],
        ['1,2', 'error_misplaced_comma'],
        ['(1,2)', 'error_misplaced_comma'],
        ['2*', 'error_stack_underflow'],
        ['1/0', 'error_non_finite_result'],
        ['sqrt(-1)', 'error_non_finite_result'],
        ['(-1)!', 'error_negative_factorial'],
        ['2.5!', 'error_non_integer_factorial'],
        ['200!', 'error_factorial_overflow'],
    ])('%s throws %s', (expr, key) => {
        expect(() => evaluate(expr)).toThrow(key);
    });
});

describe('formatResult', () => {
    test.each([
        [1.204e24, '1.204E24'],
        [1e-7, '1E-7'],
        [0.30000000000000004, '0.3'],
        [123456789012345, '123456789012345'],
        [-4, '-4'],
    ])('%s → %s', (value, expected) => {
        expect(formatResult(value)).toBe(expected);
    });
});
