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

import {evaluate, formatResult} from 'block_scicalc/evaluator';

const MAX_HISTORY_ITEMS = 50;

/** Keys that continue from a displayed result instead of starting a new expression. */
const CHAINING_KEYS = '+-*/^%!';

/**
 * Whether typed or inserted text continues from a displayed result.
 *
 * @param {string} text
 * @returns {boolean}
 */
const chains = (text) => text !== '' && CHAINING_KEYS.includes(text[0]);

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
 * @param {string} historyKey localStorage key for this user's history.
 */
export const init = (root, historyKey) => {
    const display = root.querySelector('#scicalc-display');
    const errorBox = root.querySelector('#scicalc-error');
    const historyList = root.querySelector('#scicalc-history');

    let history = loadHistory(historyKey);
    let lastAnswer = null;
    // True while the display shows a result; the next key decides whether to chain or start afresh.
    let showingResult = false;

    const showError = (message) => {
        errorBox.innerHTML = message;
        errorBox.hidden = !message;
    };

    const insert = (text, cursorBack = 0) => {
        const start = display.selectionStart ?? display.value.length;
        const end = display.selectionEnd ?? display.value.length;
        display.value = display.value.slice(0, start) + text + display.value.slice(end);
        const pos = start + text.length - cursorBack;
        display.setSelectionRange(pos, pos);
    };

    const setValue = (value) => {
        display.value = value;
        display.setSelectionRange(value.length, value.length);
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
        if (SINGLE_NUMBER.test(value)) {
            setValue(value.startsWith('-') ? value.slice(1) : '-' + value);
        } else {
            insert('-');
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

        // After a result, operator keys build on it; anything that starts an operand replaces it.
        if (showingResult && ['insert', 'wrap', 'ans'].includes(action) && !chains(value)) {
            setValue('');
        }
        if (action !== 'equals') {
            showingResult = false;
            showError('');
        }

        switch (action) {
            case 'insert':
                insert(value);
                break;
            case 'wrap':
                // Functions like log() insert both parens and leave the cursor between them.
                insert(value, 1);
                break;
            case 'ans':
                if (lastAnswer !== null) {
                    insert(lastAnswer);
                }
                break;
            case 'negate':
                negate();
                // A negated result is still a result: the next digit starts a new calculation.
                showingResult = wasResult;
                break;
            case 'backspace': {
                const start = display.selectionStart ?? display.value.length;
                const end = display.selectionEnd ?? display.value.length;
                if (start !== end) {
                    insert('');
                } else if (start > 0) {
                    display.setSelectionRange(start - 1, start);
                    insert('');
                }
                break;
            }
            case 'clear':
                setValue('');
                break;
            case 'equals':
                // A repeat press on a result (e.g. a double-tap) would only add a duplicate history entry.
                if (!showingResult) {
                    calculate();
                }
                break;
        }
        display.focus();
    });

    display.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
            ev.preventDefault();
            calculate();
            return;
        }
        // Only printable characters and deletions end result mode; Shift, arrows, Ctrl+C etc. don't.
        if (!showingResult || ev.ctrlKey || ev.metaKey || ev.altKey) {
            return;
        }
        if (ev.key.length === 1) {
            if (!chains(ev.key)) {
                setValue('');
            }
            showingResult = false;
        } else if (ev.key === 'Backspace' || ev.key === 'Delete') {
            showingResult = false;
        }
    });

    root.querySelector('#scicalc-clear-history').addEventListener('click', () => {
        history = [];
        saveHistory(historyKey, history);
        renderHistory();
    });

    renderHistory();
};
