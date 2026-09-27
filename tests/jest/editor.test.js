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
 * Tests for block_scicalc/editor.
 *
 * @copyright  2026 Eduardo Kraus {@link https://eduardokraus.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {type, startExponent, backspace, inExponent} from '../../amd/src/editor';
import {evaluate, formatResult} from '../../amd/src/evaluator';

const empty = {value: '', start: 0, end: 0, pending: false};

/**
 * Press a sequence of keys, where "^" is the power key and "<" is backspace.
 *
 * @param {string[]} keys
 * @param {Object} state
 * @returns {Object}
 */
const press = (keys, state = empty) => keys.reduce((s, key) => {
    if (key === '^') {
        return startExponent(s);
    }
    if (key === '<') {
        return backspace(s);
    }
    return type(s, key);
}, state);

/**
 * Show the cursor as | for readable assertions.
 *
 * @param {Object} state
 * @returns {string}
 */
const shown = (state) => state.value.slice(0, state.start) + '|' + state.value.slice(state.end);

describe('typing exponents', () => {
    test.each([
        [['2', '^', '3'], '2³|'],
        [['1', '0', '^', '-', '4'], '10⁻⁴|'],
        [['1', '0', '^', '−', '4'], '10⁻⁴|'],
        [['2', '^', '1', '0'], '2¹⁰|'],
        [['2', '^', '3', '*', '4'], '2³*4|'],
        [['2', '^', '3', '-', '1'], '2³-1|'],
        [['2', '^', '3', '+', '1'], '2³+1|'],
        [['2', '²'], '2²|'],
        [['1', '0', '^', '-', '4', '.', '2'], '10^(-4.2|)'],
        [['1', '0', '^', '.', '5'], '10^(.5|)'],
        [['2', '7', '^', '(', '1', '/', '3', ')'], '27^(1/3)|'],
        [['2', '^', 'log()'], '2^log()|'],
        [['2', '^', '*'], '2^*|'],
        [['2', '^', '<', '5'], '25|'],
        [['2', '^', '3', '4', '<'], '2³|'],
        [['2', '^', '3', '<', '<'], '|'],
    ])('%j → %s', (keys, expected) => {
        expect(shown(press(keys))).toBe(expected);
    });

    test('keys after ^ with a function leave the cursor inside it', () => {
        expect(shown(type(startExponent({value: '2', start: 1, end: 1, pending: false}), 'log()', 1))).toBe('2^log(|)');
    });

    test('digits typed after an existing superscript continue the exponent', () => {
        expect(shown(type({value: '2³', start: 2, end: 2, pending: false}, '4'))).toBe('2³⁴|');
    });

    test('a decimal point in the middle of an exponent keeps both halves', () => {
        expect(shown(type({value: '10⁻⁴⁵', start: 4, end: 4, pending: false}, '.'))).toBe('10^(-4.|5)');
    });

    test('typing replaces a selection', () => {
        expect(shown(type({value: '123', start: 0, end: 3, pending: false}, '9'))).toBe('9|');
    });

    test('inExponent', () => {
        expect(inExponent({value: '2', start: 1, end: 1, pending: true})).toBe(true);
        expect(inExponent({value: '2³', start: 2, end: 2, pending: false})).toBe(true);
        expect(inExponent({value: '2³', start: 1, end: 1, pending: false})).toBe(false);
        expect(inExponent({value: '23', start: 2, end: 2, pending: false})).toBe(false);
    });
});

describe('negative numbers raised to a power are bracketed', () => {
    test.each([
        [['-', '3', '²'], '(-3)²|'],
        [['−', '3', '²'], '(−3)²|'],
        [['-', '3', '^', '2'], '(-3)²|'],
        [['-', '2', '.', '5', '²'], '(-2.5)²|'],
        [['-', '3', '^', '-', '2'], '(-3)⁻²|'],
        [['2', '*', '-', '3', '²'], '2*(-3)²|'],
        [['5', '-', '-', '3', '²'], '5-(-3)²|'],
        [['(', '-', '3', '²'], '((-3)²|'],
        [['-', '6', '.', '0', '2', 'E', '2', '3', '²'], '(-6.02E23)²|'],
        // Not negative numbers: subtraction, E-notation, brackets the student typed.
        [['5', '-', '3', '²'], '5-3²|'],
        [['1', 'E', '-', '3', '²'], '1E-3²|'],
        [['(', '-', '3', ')', '²'], '(-3)²|'],
        [['2', '³', '-', '3', '²'], '2³-3²|'],
    ])('%j → %s', (keys, expected) => {
        expect(shown(press(keys))).toBe(expected);
    });

    test('a negative result is bracketed before squaring it', () => {
        expect(shown(type({value: '-81', start: 3, end: 3, pending: false}, '²'))).toBe('(-81)²|');
    });
});

describe('typed expressions evaluate as expected', () => {
    test.each([
        [['1', '0', '^', '-', '4', '.', '2'], '0.0000630957344480193'],
        [['2', '^', '3', '*', '4'], '32'],
        [['-', '2', '²'], '4'],
        [['-', '3', '^', '2'], '9'],
        [['5', '-', '3', '²'], '-4'],
        [['2', '*', '-', '3', '²'], '18'],
        [['-', '3', '^', '3'], '-27'],
        [['6', '.', '0', '2', 'E', '2', '3', '*', '2'], '1.204E24'],
    ])('%j = %s', (keys, expected) => {
        expect(formatResult(evaluate(press(keys).value))).toBe(expected);
    });
});
