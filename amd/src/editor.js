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
 * Function keys pressed right after a result can fill in that answer (log(12.5)); see
 * isFillable(), fillFunction() and replacesFill().
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

/**
 * Whether a key applies a function that can be filled in with the previous answer:
 * LOG, LN, √x, 1/x, |x| (wrap keys other than ⁿ√, which already continues from a result)
 * and 10ˣ / eˣ (power keys with a base).
 *
 * @param {string} action
 * @param {string} value
 * @returns {boolean}
 */
export const isFillable = (action, value) =>
    (action === 'wrap' && !value.startsWith('^')) || (action === 'power' && value !== '');

/**
 * The display text for a function applied to a previous answer: log(12.5), 1/(12.5), |−3|,
 * 10³ (whole-number exponents as superscripts) or 10^(4.2).
 *
 * @param {string} action "wrap" or "power".
 * @param {string} value The key's value, e.g. "log()" or "10".
 * @param {string} arg The previous answer (or whole previous expression).
 * @returns {string}
 */
export const fillFunction = (action, value, arg) => {
    if (action === 'wrap') {
        return value.slice(0, -1) + arg + value.slice(-1);
    }
    if (/^-?\d+$/.test(arg)) {
        return value + [...arg].map((c) => SUPERSCRIPTS[c]).join('');
    }
    return value + '^(' + arg + ')';
};

/**
 * Whether a key, pressed while a filled-in answer is showing, starts a new argument
 * instead (typing a number after LOG means "log of this number").
 *
 * @param {Object} fill The filled-in function: {action, value, arg}.
 * @param {string} action The key's action.
 * @param {string} value The key's value.
 * @returns {boolean}
 */
export const replacesFill = (fill, action, value) => action === 'ans' ||
    (action === 'insert' && (/^[\d.(]$/.test(value) || (fill.action === 'power' && value === '-')));

/** Characters after which a minus is a sign rather than a subtraction. */
const SIGN_FOLLOWS = '+-−*/×÷^(,%';

/**
 * Where the term at the cursor starts, for +/−: a function call around or just before the
 * cursor (the sign goes outside it: −log(x)), a bracketed group just before it, or a number.
 *
 * @param {string} value
 * @param {number} pos Cursor position.
 * @returns {number|null} Index of the term's first character, or null if there is none.
 */
const termStart = (value, pos) => {
    const isName = (c) => c !== undefined && /[A-Za-z√]/.test(c);
    const nameStart = (i) => {
        while (i > 0 && isName(value[i - 1])) {
            i--;
        }
        return i;
    };
    const numberStart = (end) => {
        const match = /(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.exec(value.slice(0, end));
        return match ? end - match[0].length : null;
    };
    // The start of a bracketed group opening at index q: log(…), 1/(…), 10^(…) or (…).
    const groupStart = (q) => {
        if (isName(value[q - 1])) {
            return nameStart(q - 1);
        }
        if (value[q - 1] === '/' || value[q - 1] === '^') {
            return numberStart(q - 1) ?? q;
        }
        return q;
    };

    // Inside a function call's brackets: log(.0002|).
    let depth = 0;
    for (let i = pos - 1; i >= 0; i--) {
        if (value[i] === ')') {
            depth++;
        } else if (value[i] === '(' && depth-- === 0) {
            if (isName(value[i - 1])) {
                return nameStart(i - 1);
            }
            break;
        }
    }
    // Just after a bracketed group: log(.0002)|.
    if (value[pos - 1] === ')') {
        depth = 0;
        for (let i = pos - 1; i >= 0; i--) {
            if (value[i] === ')') {
                depth++;
            } else if (value[i] === '(' && --depth === 0) {
                return groupStart(i);
            }
        }
        return null;
    }
    // A number or constant (pi, e) just before the cursor.
    return numberStart(pos) ?? (isName(value[pos - 1]) ? nameStart(pos - 1) : null);
};

/**
 * The +/− key: flip the sign of the term at the cursor. A sign minus is removed or added
 * (log(x) ↔ −log(x)), and a subtraction becomes an addition and back (5−log(2) ↔ 5+log(2)).
 * In an exponent it flips the exponent instead, as on a scientific calculator: after EE
 * (1E ↔ 1E−, 1E6 ↔ 1E−6) or a superscript (10⁻⁴ ↔ 10⁴). With no term to flip, it starts
 * a negative number.
 *
 * @param {Object} state
 * @returns {Object}
 */
export const toggleSign = (state) => {
    const {value, start: pos} = state;
    const edit = (at, remove, insert) => {
        const delta = insert.length - remove;
        return {
            value: value.slice(0, at) + insert + value.slice(at + remove),
            start: pos + delta,
            end: pos + delta,
            pending: false,
        };
    };

    // In an E-notation exponent (typed with EE): flip the exponent's sign.
    const exponent = /(?:\d|\.)[eE]([+-]?)(\d*)$/.exec(value.slice(0, pos));
    if (exponent) {
        const at = pos - exponent[2].length - exponent[1].length;
        return exponent[1] ? edit(at, 1, exponent[1] === '-' ? '' : '-') : edit(at, 0, '-');
    }

    if (isSuperscript(value[pos - 1])) {
        let from = pos;
        while (from > 0 && isSuperscript(value[from - 1])) {
            from--;
        }
        return value[from] === SUPERSCRIPTS['-'] ? edit(from, 1, '') : edit(from, 0, SUPERSCRIPTS['-']);
    }

    const at = termStart(value, pos);
    if (at === null) {
        return replaceSelection(state, '-');
    }
    const before = value[at - 1];
    if (before === '-' || before === '−') {
        const isSign = at === 1 || SIGN_FOLLOWS.includes(value[at - 2]);
        return isSign ? edit(at - 1, 1, '') : edit(at - 1, 1, '+');
    }
    if (before === '+') {
        return edit(at - 1, 1, '-');
    }
    return edit(at, 0, '-');
};

/**
 * The ◀ ▶ keys: move the cursor one character, or past a whole function name and its
 * bracket (log(, √() in one step, since the cursor is no use inside one. A selection
 * collapses to its start or end instead.
 *
 * @param {Object} state
 * @param {number} direction -1 for left, 1 for right.
 * @returns {Object}
 */
export const moveCursor = (state, direction) => {
    const {value, start, end} = state;
    let pos;
    if (start !== end) {
        pos = direction < 0 ? start : end;
    } else if (direction < 0) {
        const name = /[A-Za-z√]+\(?$/.exec(value.slice(0, start));
        pos = Math.max(0, start - (name ? name[0].length : 1));
    } else {
        const name = /^[A-Za-z√]+\(?/.exec(value.slice(end));
        pos = Math.min(value.length, end + (name ? name[0].length : 1));
    }
    return {value, start: pos, end: pos, pending: false};
};
