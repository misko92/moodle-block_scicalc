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
 * Display editing rules (pure, no DOM access): typing exponents as superscripts.
 *
 * Pressing ^ doesn't insert anything; it makes the exponent "pending", and the digits
 * (and a leading minus) typed next come out as superscripts: 2³, 10⁻⁴. Typing a digit
 * straight after a superscript continues the exponent. Anything that can't be written
 * in superscript falls back to caret form: a decimal point turns 10⁻⁴ into 10^(-4.),
 * "(" gives ^(, and any other key after a bare ^ just inserts the ^.
 *
 * Raising a negative number to a power brackets it first, so −3 then x² shows (−3)² = 9
 * rather than −3² = −9 (the minus applying after the power), which is rarely what a
 * student means. A minus that subtracts (5−3²) is left alone.
 *
 * State: {value: string, start: number, end: number, pending: boolean}, where start/end
 * are the display's selection.
 *
 * @module     block_scicalc/editor
 * @copyright  2026 Eduardo Kraus {@link https://eduardokraus.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {SUPERSCRIPTS, isSuperscript, fromSuperscript} from 'block_scicalc/evaluator';

/**
 * Replace the selection with text and put the cursor after it (or cursorBack before its end).
 *
 * @param {Object} state
 * @param {string} text
 * @param {number} cursorBack
 * @returns {Object}
 */
const replaceSelection = (state, text, cursorBack = 0) => {
    const pos = state.start + text.length - cursorBack;
    return {
        value: state.value.slice(0, state.start) + text + state.value.slice(state.end),
        start: pos,
        end: pos,
        pending: false,
    };
};

/** A negative number at the cursor whose minus is a sign, not a subtraction: -3, 2*-0.5, (−6.02E23. */
const NEGATIVE_BASE = /(^|[-−+*/×÷^(,%])([-−](?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)$/;

/**
 * Put brackets round a negative number just before the cursor, ready to raise it to a power.
 *
 * @param {Object} state
 * @returns {Object}
 */
const bracketNegativeBase = (state) => {
    if (state.start !== state.end) {
        return state;
    }
    const before = state.value.slice(0, state.start);
    const match = NEGATIVE_BASE.exec(before);
    if (!match) {
        return state;
    }
    const at = before.length - match[2].length;
    const value = before.slice(0, at) + '(' + match[2] + ')' + state.value.slice(state.start);
    return {...state, value, start: state.start + 2, end: state.start + 2};
};

/**
 * Whether the next digit typed belongs to an exponent.
 *
 * @param {Object} state
 * @returns {boolean}
 */
export const inExponent = (state) => state.pending ||
    (state.start === state.end && isSuperscript(state.value[state.start - 1]));

/**
 * Rewrite the superscript exponent around the cursor in caret form with a decimal point,
 * e.g. 10⁻⁴| → 10^(-4.|).
 *
 * @param {Object} state
 * @returns {Object}
 */
const decimalExponent = (state) => {
    const {value, start: pos} = state;
    let from = pos;
    while (from > 0 && isSuperscript(value[from - 1])) {
        from--;
    }
    let to = pos;
    while (to < value.length && isSuperscript(value[to])) {
        to++;
    }
    const before = '^(' + fromSuperscript(value.slice(from, pos)) + '.';
    return {
        value: value.slice(0, from) + before + fromSuperscript(value.slice(pos, to)) + ')' + value.slice(to),
        start: from + before.length,
        end: from + before.length,
        pending: false,
    };
};

/**
 * Type text at the cursor, applying the exponent rules.
 *
 * @param {Object} state
 * @param {string} text A key's text, e.g. "7", "-", "log()".
 * @param {number} cursorBack Leave the cursor this many characters before the end of text.
 * @returns {Object}
 */
export const type = (state, text, cursorBack = 0) => {
    if (isSuperscript(text)) {
        return replaceSelection(bracketNegativeBase(state), text);
    }
    if (text.length === 1 && inExponent(state)) {
        if (text >= '0' && text <= '9') {
            return replaceSelection(state, SUPERSCRIPTS[text]);
        }
        if (text === '.') {
            return decimalExponent(state);
        }
        if (state.pending && (text === '-' || text === '−')) {
            return replaceSelection(state, SUPERSCRIPTS['-']);
        }
        if (state.pending && text === '(') {
            return replaceSelection(state, '^(');
        }
    }
    return replaceSelection(state, (state.pending ? '^' : '') + text, cursorBack);
};

/**
 * The ^ key: start an exponent.
 *
 * @param {Object} state
 * @returns {Object}
 */
export const startExponent = (state) => ({...bracketNegativeBase(state), pending: true});

/**
 * Delete the selection or the character before the cursor; cancels a pending ^ first.
 *
 * @param {Object} state
 * @returns {Object}
 */
export const backspace = (state) => {
    if (state.pending) {
        return {...state, pending: false};
    }
    if (state.start === state.end) {
        if (state.start === 0) {
            return state;
        }
        return replaceSelection({...state, start: state.start - 1}, '');
    }
    return replaceSelection(state, '');
};
