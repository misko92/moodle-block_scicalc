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
 * Calculator behaviour: keypad, display editing, evaluation and history.
 *
 * @module     block_scicalc/calculator
 * @copyright  2026 Eduardo Kraus {@link https://eduardokraus.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {evaluate, formatResult, isSuperscript} from 'block_scicalc/evaluator';
import {type, startExponent, backspace, isFillable, fillFunction, replacesFill} from 'block_scicalc/editor';

const MAX_HISTORY_ITEMS = 50;

/** Start of every history key in localStorage (older versions used ..._v1_ and ..._v2_ keys). */
export const HISTORY_PREFIX = 'block_scicalc_history_';

/** Keys that continue from a displayed result instead of starting a new expression. */
const CHAINING_KEYS = '+-*/^%!';

/**
 * Whether typed or inserted text continues from a displayed result.
 *
 * @param {string} text
 * @returns {boolean}
 */
const chains = (text) => text !== '' && (CHAINING_KEYS.includes(text[0]) || isSuperscript(text[0]));

/** A display holding just one number, whose sign the +/− key can flip. */
const SINGLE_NUMBER = /^-?(\d+\.?\d*|\.\d+)(E[+-]?\d+)?$/i;

/**
 * Read stored history, tolerating missing or corrupt storage.
 *
 * @param {string} key
 * @returns {Array<{expr: string, result: string}>}
 */
const loadHistory = (key) => {
    try {
        const parsed = JSON.parse(window.localStorage.getItem(key));
        if (Array.isArray(parsed)) {
            return parsed
                .filter((h) => h && typeof h.expr === 'string' && typeof h.result === 'string')
                .slice(0, MAX_HISTORY_ITEMS);
        }
    } catch (e) {
        // Storage blocked or unreadable: start empty.
    }
    return [];
};

/**
 * Delete calculator history left by earlier login sessions (any user), keeping only keepKey.
 *
 * @param {Storage} storage
 * @param {string} keepKey
 */
export const pruneHistory = (storage, keepKey) => {
    try {
        const stale = [];
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key.startsWith(HISTORY_PREFIX) && key !== keepKey) {
                stale.push(key);
            }
        }
        stale.forEach((key) => storage.removeItem(key));
    } catch (e) {
        // Storage blocked: there is nothing stored to clear.
    }
};

/**
 * Persist history, ignoring quota and privacy-mode errors.
 *
 * @param {string} key
 * @param {Array} items
 */
const saveHistory = (key, items) => {
    try {
        if (items.length) {
            window.localStorage.setItem(key, JSON.stringify(items));
        } else {
            window.localStorage.removeItem(key);
        }
    } catch (e) {
        // Not fatal: history just won't survive a reload.
    }
};

/**
 * Wire up the calculator inside the rendered popup.
 *
 * @param {HTMLElement} root The #scicalc-popup element.
 * @param {string} historyKey localStorage key for this login session's history.
 */
export const init = (root, historyKey) => {
    const display = root.querySelector('#scicalc-display');
    const errorBox = root.querySelector('#scicalc-error');
    const historyList = root.querySelector('#scicalc-history');

    try {
        pruneHistory(window.localStorage, historyKey);
    } catch (e) {
        // Accessing localStorage itself can throw when site data is blocked.
    }
    let history = loadHistory(historyKey);
    let lastAnswer = null;
    // True while the display shows a result; the next key decides whether to chain or start afresh.
    let showingResult = false;

    const showError = (message) => {
        errorBox.innerHTML = message;
        errorBox.hidden = !message;
    };

    // A ^ was pressed and its exponent hasn't been typed yet (see block_scicalc/editor).
    let pending = false;
    const powerKey = root.querySelector('[data-action="power"][data-value=""]');

    const getState = () => ({
        value: display.value,
        start: display.selectionStart ?? display.value.length,
        end: display.selectionEnd ?? display.value.length,
        pending,
    });

    const setState = (state) => {
        display.value = state.value;
        display.setSelectionRange(state.start, state.end);
        pending = state.pending;
        powerKey.classList.toggle('scicalc-btn-active', pending);
        powerKey.setAttribute('aria-pressed', String(pending));
    };

    const setValue = (value) => setState({value, start: value.length, end: value.length, pending: false});

    // A function key filled in with the previous answer, e.g. log(12.5): {action, value, arg}.
    // It's a suggestion until the next key: typing a number replaces the answer instead.
    let fill = null;

    const showFill = () => setValue(fillFunction(fill.action, fill.value, fill.arg));

    /**
     * Apply a function or power key the normal way, to an empty display: log(|) or 10 then ^.
     *
     * @param {string} action
     * @param {string} value
     */
    const startFunction = (action, value) => {
        setState(action === 'wrap' ? type(getState(), value, 1) : startExponent(type(getState(), value)));
    };

    /**
     * Handle a key while a filled-in answer is showing. Returns true if the key was used up.
     *
     * @param {string} action
     * @param {string} value
     * @returns {boolean}
     */
    const keyOnFill = (action, value) => {
        const current = fill;
        fill = null;
        if (replacesFill(current, action, value)) {
            // "LOG 0.002" means log(0.002): drop the answer and let the key start the argument.
            setValue('');
            startFunction(current.action, current.value);
            return false;
        }
        if (action === 'negate') {
            // Flip the filled-in answer's sign: 10ˣ, +/− gives 10^(−4.2) from a pH of 4.2.
            fill = {...current, arg: current.arg.startsWith('-') ? current.arg.slice(1) : '-' + current.arg};
            showFill();
            return true;
        }
        return false;
    };

    /**
     * Before a key is applied to a displayed result: keep the result for operator keys
     * (the editor brackets a negative one before a power), else clear it.
     *
     * @param {boolean} continues
     */
    const leaveResult = (continues) => {
        showingResult = false;
        if (!continues) {
            setValue('');
        }
    };

    const renderHistory = () => {
        historyList.replaceChildren(...history.map((h) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'list-group-item list-group-item-action';
            const expr = document.createElement('div');
            expr.className = 'small text-muted text-truncate';
            expr.textContent = h.expr;
            const result = document.createElement('div');
            result.className = 'fw-semibold';
            result.textContent = h.result;
            item.append(expr, result);
            item.addEventListener('click', () => {
                setValue(h.expr);
                showingResult = false;
                display.focus();
            });
            return item;
        }));
    };

    const calculate = () => {
        showError('');
        const expr = display.value.trim();
        if (!expr) {
            return;
        }
        try {
            const result = formatResult(evaluate(expr));
            history.unshift({expr: expr, result: result});
            history = history.slice(0, MAX_HISTORY_ITEMS);
            saveHistory(historyKey, history);
            renderHistory();
            lastAnswer = result;
            setValue(result);
            showingResult = true;
        } catch (e) {
            const key = String(e.message).startsWith('error_') ? e.message : 'error_generic';
            showError(M.util.get_string('invalid_expression', 'block_scicalc') + ': ' +
                M.util.get_string(key, 'block_scicalc'));
        }
    };

    const negate = () => {
        const value = display.value.trim();
        if (!pending && SINGLE_NUMBER.test(value)) {
            setValue(value.startsWith('-') ? value.slice(1) : '-' + value);
        } else {
            setState(type(getState(), '-'));
        }
    };

    root.querySelector('.scicalc-grid').addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-action]');
        if (!btn) {
            return;
        }
        const action = btn.dataset.action;
        const value = btn.dataset.value;
        const wasResult = showingResult;

        // LOG, LN, √x, 1/x, |x|, 10ˣ, eˣ straight after an answer apply to that answer.
        if (isFillable(action, value) && (showingResult || fill) && display.value.trim() !== '') {
            fill = {action, value, arg: display.value.trim()};
            showingResult = false;
            showError('');
            showFill();
            display.focus();
            return;
        }
        if (fill && keyOnFill(action, value)) {
            display.focus();
            return;
        }

        if (showingResult && ['insert', 'wrap', 'ans', 'power'].includes(action)) {
            // The bare ^ key continues from a result; 10ˣ and eˣ start a new calculation.
            const continues = action === 'power' ? value === '' : chains(value);
            leaveResult(continues);
        }
        if (action !== 'equals') {
            showingResult = false;
            showError('');
        }

        switch (action) {
            case 'insert':
                setState(type(getState(), value));
                break;
            case 'wrap':
                // Functions like log() insert both parens and leave the cursor between them.
                setState(type(getState(), value, 1));
                break;
            case 'power':
                // ^ starts an exponent; 10ˣ and eˣ type their base first.
                setState(startExponent(value ? type(getState(), value) : getState()));
                break;
            case 'ans':
                if (lastAnswer !== null) {
                    setState(type(getState(), lastAnswer));
                }
                break;
            case 'negate':
                negate();
                // A negated result is still a result: the next digit starts a new calculation.
                showingResult = wasResult;
                break;
            case 'backspace':
                setState(backspace(getState()));
                break;
            case 'clear':
                setValue('');
                break;
            case 'equals':
                // A repeat press on a result (e.g. a double-tap) would only add a duplicate history entry.
                if (!showingResult) {
                    setState({...getState(), pending: false});
                    calculate();
                }
                break;
        }
        display.focus();
    });

    // Typing goes through the same rules as the keypad, so ^ then 3 gives ³.
    display.addEventListener('keydown', (ev) => {
        if (ev.ctrlKey || ev.metaKey || ev.altKey) {
            return;
        }
        if (ev.key !== 'Shift') {
            // Any key other than a printable one (handled below) accepts the filled-in answer.
            fill = ev.key.length === 1 ? fill : null;
        }
        if (ev.key === 'Enter') {
            ev.preventDefault();
            setState({...getState(), pending: false});
            calculate();
            return;
        }
        if (ev.key === 'Backspace') {
            ev.preventDefault();
            showingResult = false;
            setState(backspace(getState()));
            return;
        }
        if (ev.key.length !== 1) {
            // Arrows, Home, Tab etc.: moving away abandons a pending ^.
            if (ev.key !== 'Shift') {
                setState({...getState(), pending: false});
            }
            return;
        }
        ev.preventDefault();
        showError('');
        if (fill) {
            keyOnFill('insert', ev.key);
        }
        if (showingResult) {
            leaveResult(chains(ev.key));
        }
        setState(ev.key === '^' ? startExponent(getState()) : type(getState(), ev.key));
    });
    display.addEventListener('click', () => {
        fill = null;
        setState({...getState(), pending: false});
    });

    root.querySelector('#scicalc-clear-history').addEventListener('click', () => {
        history = [];
        saveHistory(historyKey, history);
        renderHistory();
    });

    renderHistory();
};
