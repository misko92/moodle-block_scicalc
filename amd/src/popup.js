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
 * Floating calculator popup: renders the UI into document.body, then handles
 * open/close, dragging and remembering position for the browser tab.
 *
 * Keypad (5 columns, chemistry-focused):
 *   |x|  LOG  LN   x²   1/x
 *   ^    10ˣ  eˣ   √x   ⁿ√
 *   (    )    EE   DEL  CLR
 *   7    8    9    ÷    ANS
 *   4    5    6    ×    =
 *   1    2    3    −    =
 *   0    .    +/−  +    =
 *
 * @module     block_scicalc/popup
 * @copyright  2026 Eduardo Kraus {@link https://eduardokraus.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {getStrings} from 'core/str';
import Templates from 'core/templates';
import {init as initCalculator} from 'block_scicalc/calculator';

const STATE_KEY = 'block_scicalc_popup_v1';

/**
 * Keypad in grid order: [label, action, value, style, aria-label string key].
 * "wrap" inserts value and leaves the cursor before its last character.
 */
const BUTTONS = [
    ['|x|', 'wrap', '||', 'func', 'key_abs'],
    ['LOG', 'wrap', 'log()', 'func', 'key_log'],
    ['LN', 'wrap', 'ln()', 'func', 'key_ln'],
    ['x²', 'insert', '^2', 'func', 'key_square'],
    ['1/x', 'wrap', '1/()', 'func', 'key_reciprocal'],
    ['^', 'insert', '^', 'func', 'key_power'],
    ['10ˣ', 'wrap', '10^()', 'func', 'key_tenpower'],
    ['eˣ', 'wrap', 'e^()', 'func', 'key_epower'],
    ['√x', 'wrap', '√()', 'func', 'key_sqrt'],
    ['ⁿ√', 'wrap', '^(1/)', 'func', 'key_nthroot'],
    ['(', 'insert', '(', 'op'],
    [')', 'insert', ')', 'op'],
    ['EE', 'insert', 'E', 'func', 'key_exponent'],
    ['DEL', 'backspace', '', 'warning', 'key_backspace'],
    ['CLR', 'clear', '', 'danger', 'key_clear'],
    ['7', 'insert', '7', 'num'],
    ['8', 'insert', '8', 'num'],
    ['9', 'insert', '9', 'num'],
    ['÷', 'insert', '/', 'op', 'key_divide'],
    ['ANS', 'ans', '', 'func', 'key_ans'],
    ['4', 'insert', '4', 'num'],
    ['5', 'insert', '5', 'num'],
    ['6', 'insert', '6', 'num'],
    ['×', 'insert', '*', 'op', 'key_multiply'],
    ['=', 'equals', '', 'primary', 'key_equals'],
    ['1', 'insert', '1', 'num'],
    ['2', 'insert', '2', 'num'],
    ['3', 'insert', '3', 'num'],
    ['−', 'insert', '-', 'op', 'key_minus'],
    ['0', 'insert', '0', 'num'],
    ['.', 'insert', '.', 'num', 'key_point'],
    ['+/−', 'negate', '', 'op', 'key_negate'],
    ['+', 'insert', '+', 'op', 'key_plus'],
];

const loadState = () => {
    try {
        const state = JSON.parse(window.sessionStorage.getItem(STATE_KEY));
        if (state && Number.isFinite(state.x) && Number.isFinite(state.y)) {
            return state;
        }
    } catch (e) {
        // Fall through to the default.
    }
    // Top right, just below the toggle button (which sits below the navbar).
    return {open: false, x: Math.max(10, window.innerWidth - 400), y: 124};
};

const saveState = (state) => {
    try {
        window.sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch (e) {
        // Position just won't be remembered.
    }
};

/**
 * Keep at least 40px of the popup on screen so it can always be dragged back.
 *
 * @param {HTMLElement} popup
 * @param {number} x
 * @param {number} y
 */
const moveTo = (popup, x, y) => {
    popup.style.left = Math.min(Math.max(x, 40 - popup.offsetWidth), window.innerWidth - 40) + 'px';
    popup.style.top = Math.min(Math.max(y, 0), window.innerHeight - 40) + 'px';
};

/**
 * Render the keypad context, with accessible names for symbol keys.
 *
 * @returns {Promise<Object>}
 */
const buildContext = async() => {
    const keyed = BUTTONS.filter((b) => b[4]);
    const labels = await getStrings(keyed.map((b) => ({key: b[4], component: 'block_scicalc'})));
    const arialabels = new Map(keyed.map((b, i) => [b[4], labels[i]]));
    return {
        buttons: BUTTONS.map(([label, action, value, style, arialabel]) => ({
            label,
            action,
            value,
            style,
            arialabel: arialabel ? arialabels.get(arialabel) : null,
            tall: action === 'equals',
        })),
    };
};

/**
 * Add the calculator to the page.
 *
 * @param {number} userid Used to keep each user's history separate on shared computers.
 * @param {number} instanceid Block instance id.
 */
export const init = async(userid, instanceid) => {
    if (document.getElementById('scicalc-popup')) {
        return;
    }

    const {html, js} = await Templates.renderForPromise('block_scicalc/popup', await buildContext());
    Templates.appendNodeContents(document.body, html, js);

    const toggleBtn = document.getElementById('scicalc-toggle-btn');
    const popup = document.getElementById('scicalc-popup');
    const handle = document.getElementById('scicalc-drag-handle');
    const display = document.getElementById('scicalc-display');

    initCalculator(popup, `block_scicalc_history_v2_${userid}_${instanceid}`);

    const state = loadState();

    const setOpen = (open, focus = true) => {
        popup.hidden = !open;
        toggleBtn.setAttribute('aria-expanded', String(open));
        state.open = open;
        saveState(state);
        if (open) {
            moveTo(popup, state.x, state.y);
            if (focus) {
                display.focus();
            }
        }
    };

    toggleBtn.addEventListener('click', () => setOpen(popup.hidden));
    document.getElementById('scicalc-close-btn').addEventListener('click', () => {
        setOpen(false);
        toggleBtn.focus();
    });
    popup.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
            setOpen(false);
            toggleBtn.focus();
        }
    });

    // Dragging by the title bar (pointer events cover mouse, touch and pen).
    let drag = null;
    handle.addEventListener('pointerdown', (ev) => {
        if (ev.target.closest('button')) {
            return;
        }
        drag = {x: ev.clientX - popup.offsetLeft, y: ev.clientY - popup.offsetTop};
        handle.setPointerCapture(ev.pointerId);
        ev.preventDefault();
    });
    handle.addEventListener('pointermove', (ev) => {
        if (drag) {
            moveTo(popup, ev.clientX - drag.x, ev.clientY - drag.y);
        }
    });
    const endDrag = () => {
        if (drag) {
            drag = null;
            state.x = popup.offsetLeft;
            state.y = popup.offsetTop;
            saveState(state);
        }
    };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);

    window.addEventListener('resize', () => {
        if (!popup.hidden) {
            moveTo(popup, popup.offsetLeft, popup.offsetTop);
        }
    });

    // Reopen after navigation, without pulling focus away from the new page.
    if (state.open) {
        setOpen(true, false);
    }
};
