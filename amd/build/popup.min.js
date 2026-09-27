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
 * popup.js — Floating popup for block_scicalc.
 *
 * Builds the entire UI, appends it to document.body, then initialises
 * calculator.js — guaranteeing #calculator-area exists before calc JS runs.
 *
 * Button layout (5-column grid, chemistry-focused):
 *   7    8    9    ÷    log
 *   4    5    6    ×    ln
 *   1    2    3    −    10ˣ
 *   0    .    E    +    eˣ
 *   ±    (    )    ⌫    C
 *   [  =  — full width  ]
 *
 * @package   block_scicalc
 * @copyright 2026 Eduardo Kraus {@link https://eduardokraus.com}
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define(["block_scicalc/calculator"], function(calculator) {
    "use strict";

    const SESSION_KEY = "block_scicalc_popup_v1";

    // ── State persistence ────────────────────────────────────────────────

    const loadState = () => {
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);
            if (raw) {
                return JSON.parse(raw);
            }
        } catch (e) { /* ignore */ }
        return {
            open: false,
            x: Math.max(10, window.innerWidth - 400),
            y: 70,  // below the toggle button at top: 24px
        };
    };

    const saveState = (state) => {
        try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
        } catch (e) { /* ignore */ }
    };

    // ── Position helpers ─────────────────────────────────────────────────

    const clamp = (x, y, popup) => ({
        x: Math.min(Math.max(x, -(popup.offsetWidth - 40)), window.innerWidth - 40),
        y: Math.min(Math.max(y, 0), window.innerHeight - 40),
    });

    const applyPosition = (popup, x, y) => {
        popup.style.left   = x + "px";
        popup.style.top    = y + "px";
        popup.style.right  = "auto";
        popup.style.bottom = "auto";
    };

    // ── Button definitions ───────────────────────────────────────────────
    //
    // Each entry: [label, data-action, data-value-or-func]
    // action "insert"  → inserts data-value into the display
    // action "func"    → inserts data-func + "(" into the display
    // action special   → clear | backspace | toggle-sign | equals

    // 7-row layout: [label, action, value, secondLabel|null]
    // "=" is tall (spans rows 4+5+6 in col 5). Rows 5+6 col 5 occupied by tall =.
    const BUTTONS = [
        // Row 0: function row
        ["|x|",  "autoclosed", "||",         null],
        ["LOG",  "autoclosed", "log()",      null],
        ["LN",   "autoclosed", "ln()",       null],
        ["x²",   "xsq",        "",           null],
        ["1/x",  "autoclosed", "1/()",       null],
        // Row 1: power functions
        ["^",    "insert",     "^",          null],
        ["10ˣ",  "autoclosed", "10^()",      null],
        ["eˣ",   "autoclosed", "e^()",       null],
        ["√x",   "autoclosed", "√()",        null],
        ["ⁿ√",   "nthroot",    "",           null],
        // Row 2: brackets / EE / del / clr
        ["(",    "insert",     "(",          null],
        [")",    "insert",     ")",          null],
        ["EE",   "insert",     "E",          null],
        ["DEL",  "backspace",  "",           null],
        ["CLR",  "clear",      "",           null],
        // Row 3: 7 8 9 ÷ ANS
        ["7",    "insert",  "7",      null],
        ["8",    "insert",  "8",      null],
        ["9",    "insert",  "9",      null],
        ["÷",    "insert",  "/",      null],
        ["ANS",  "ans",     "",       null],
        // Row 4: 4 5 6 × = (tall, spans rows 4+5+6)
        ["4",    "insert",  "4",      null],
        ["5",    "insert",  "5",      null],
        ["6",    "insert",  "6",      null],
        ["×",    "insert",  "*",      null],
        ["=",    "equals",  "",       null],   // tall: grid-row span 3
        // Row 5: 1 2 3 −   (col 5 occupied by tall =)
        ["1",    "insert",  "1",      null],
        ["2",    "insert",  "2",      null],
        ["3",    "insert",  "3",      null],
        ["−",    "insert",  "-",      null],
        // Row 6: 0 . +/− +   (col 5 occupied by tall =)
        ["0",    "insert",  "0",      null],
        [".",    "insert",  ".",      null],
        ["+/−",  "negate",  "",       null],
        ["+",    "insert",  "+",      null],
    ];

    // ── Build a single button element ────────────────────────────────────

    const makeBtn = (label, action, value, secondLabel) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.setAttribute("data-action", action);
        btn.appendChild(document.createTextNode(label));

        if (secondLabel) {
            const s = document.createElement("span");
            s.className = "scicalc-second-label";
            s.textContent = secondLabel;
            btn.appendChild(s);
        }

        const numericLabels = ["0","1","2","3","4","5","6","7","8","9","."];
        const dangerLabels  = ["C", "CLR"];
        const warningLabels = ["DEL"];
        const primaryLabels = ["="];
        const funcLabels    = ["LOG","LN","x²","1/x","π","ANS","EE","10ˣ","eˣ","√x","ⁿ√","^"];

        if (label === "|x|") {
            btn.className = "scicalc-btn scicalc-btn-func";
        } else if (dangerLabels.includes(label)) {
            btn.className = "scicalc-btn scicalc-btn-danger";
        } else if (warningLabels.includes(label)) {
            btn.className = "scicalc-btn scicalc-btn-warning";
        } else if (primaryLabels.includes(label)) {
            btn.className = "scicalc-btn scicalc-btn-primary scicalc-btn-tall";
        } else if (funcLabels.includes(label)) {
            btn.className = "scicalc-btn scicalc-btn-func";
        } else if (numericLabels.includes(label)) {
            btn.className = "scicalc-btn scicalc-btn-num";
        } else {
            btn.className = "scicalc-btn scicalc-btn-op";
        }

        if (action === "insert" || action === "autoclosed") { btn.setAttribute("data-value", value); }
        else if (action === "func") { btn.setAttribute("data-func", value); }
        return btn;
    };

    // ── Build the full UI and inject into document.body ──────────────────

    const buildUI = () => {
        const str = (key) => {
            try { return M.util.get_string(key, "block_scicalc") || key; }
            catch (e) { return key; }
        };

        // Toggle button
        const toggleBtn = document.createElement("button");
        toggleBtn.id = "scicalc-toggle-btn";
        toggleBtn.type = "button";
        toggleBtn.setAttribute("aria-label", "Open scientific calculator");
        toggleBtn.setAttribute("aria-expanded", "false");
        toggleBtn.setAttribute("aria-controls", "scicalc-popup");
        toggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff8c00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="12" y1="10" x2="14" y2="10"/><line x1="16" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="12" y1="14" x2="14" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/><line x1="12" y1="18" x2="14" y2="18"/><line x1="16" y1="18" x2="16" y2="18"/></svg>Calculator`;
        document.body.appendChild(toggleBtn);

        // Popup shell
        const popup = document.createElement("div");
        popup.id = "scicalc-popup";
        popup.setAttribute("role", "dialog");
        popup.setAttribute("aria-label", "Scientific Calculator");
        popup.style.display = "none";

        // Drag handle
        const handle = document.createElement("div");
        handle.id = "scicalc-drag-handle";

        const title = document.createElement("span");
        title.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff8c00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="12" y1="10" x2="14" y2="10"/><line x1="16" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="12" y1="14" x2="14" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/><line x1="12" y1="18" x2="14" y2="18"/><line x1="16" y1="18" x2="16" y2="18"/></svg>Scientific Calculator`;
        handle.appendChild(title);

        const closeBtn = document.createElement("button");
        closeBtn.id = "scicalc-close-btn";
        closeBtn.type = "button";
        closeBtn.setAttribute("aria-label", "Close calculator");
        closeBtn.textContent = "×";
        handle.appendChild(closeBtn);
        popup.appendChild(handle);

        // Body
        const body = document.createElement("div");
        body.id = "scicalc-popup-body";

        // Display input + DEG/RAD
        body.innerHTML = `
            <div class="scicalc-input-row">
                <input type="text" id="scicalc-display"
                       aria-label="Calculator display"
                       autocomplete="off" spellcheck="false"
                       inputmode="none"
                       placeholder="e.g. 6.02E23">
            </div>
            <div id="scicalc-error" class="scicalc-error d-none" role="alert">
                ${str("invalid_expression")}<span></span>
            </div>`;

        // Button grid wrapper (calculator.js looks for #calculator-area)
        const calcArea = document.createElement("div");
        calcArea.id = "calculator-area";

        // 5-column grid
        const grid = document.createElement("div");
        grid.className = "scicalc-grid calculator-controls";

        BUTTONS.forEach(([label, action, value, secondLabel]) => {
            grid.appendChild(makeBtn(label, action, value, secondLabel));
        });

        calcArea.appendChild(grid);

        // History
        const historySection = document.createElement("div");
        historySection.innerHTML = `
            <div class="scicalc-history-header">
                <span>${str("history_title")}</span>
                <button id="data-action-clear-history" class="scicalc-clear-history" type="button">
                    ${str("clear_history")}
                </button>
            </div>
            <div class="list-group list-group-flush" id="scicalc-history"
                 aria-live="polite"></div>`;

        calcArea.appendChild(historySection);
        body.appendChild(calcArea);
        popup.appendChild(body);
        document.body.appendChild(popup);

        return {toggleBtn, popup, closeBtn, handle};
    };

    // ── Main init ────────────────────────────────────────────────────────

    const init = (instanceId) => {
        if (document.getElementById("scicalc-toggle-btn")) {
            return; // Already initialised.
        }

        const {toggleBtn, popup, closeBtn, handle} = buildUI();

        // calculator.js can now safely find #calculator-area in the DOM.
        calculator.init(instanceId);

        // Special actions handled here before calculator.js sees the click.
        // Operators — if justEvaluated is set and user presses one of these, keep result.
        const OPERATORS = new Set(["insert_op", "xsq", "nthroot", "^"]);
        const OP_VALUES  = new Set(["+", "-", "*", "/", "^", "−"]);

        let justEvaluated = false;

        const insertAt = (display, text) => {
            const s = display.selectionStart || display.value.length;
            const e = display.selectionEnd   || display.value.length;
            display.value = display.value.slice(0, s) + text + display.value.slice(e);
            display.setSelectionRange(s + text.length, s + text.length);
            display.focus();
        };

        // Returns true if text is a pure operator (should chain onto previous result).
        const isOperator = (text) => OP_VALUES.has(text);

        const ansGrid = popup.querySelector(".calculator-controls");
        const ansDisplay = document.getElementById("scicalc-display");
        ansGrid.addEventListener("click", (ev) => {
            const btn = ev.target.closest("[data-action]");
            if (!btn) { return; }
            const action = btn.getAttribute("data-action");
            const value  = btn.getAttribute("data-value") || "";

            // After = : operators chain, everything else starts fresh.
            if (justEvaluated && action !== "equals" && action !== "clear" && action !== "backspace") {
                if (!isOperator(value) && action !== "negate") {
                    if (ansDisplay) { ansDisplay.value = ""; }
                }
                justEvaluated = false;
            }

            if (action === "autoclosed") {
                if (ansDisplay) {
                    const text  = value;
                    const cursorOffset = text.length - 1;
                    const s = ansDisplay.selectionStart !== undefined ? ansDisplay.selectionStart : ansDisplay.value.length;
                    const e = ansDisplay.selectionEnd   !== undefined ? ansDisplay.selectionEnd   : ansDisplay.value.length;
                    ansDisplay.value = ansDisplay.value.slice(0, s) + text + ansDisplay.value.slice(e);
                    const pos = s + cursorOffset;
                    ansDisplay.setSelectionRange(pos, pos);
                    ansDisplay.focus();
                }
                ev.stopPropagation(); return;
            }
            if (action === "nthroot") {
                if (ansDisplay) {
                    const s = ansDisplay.selectionStart || ansDisplay.value.length;
                    const e = ansDisplay.selectionEnd   || ansDisplay.value.length;
                    ansDisplay.value = ansDisplay.value.slice(0, s) + "^(1/)" + ansDisplay.value.slice(e);
                    const pos = s + 4;
                    ansDisplay.setSelectionRange(pos, pos);
                    ansDisplay.focus();
                }
                ev.stopPropagation(); return;
            }
            if (action === "ans") {
                const ans = calculator.getLastAnswer();
                if (ans !== null && ansDisplay) { insertAt(ansDisplay, ans); }
                ev.stopPropagation(); return;
            }
            if (action === "negate") {
                if (ansDisplay) { insertAt(ansDisplay, "−"); }
                ev.stopPropagation(); return;
            }
            if (action === "xsq") {
                if (ansDisplay) { insertAt(ansDisplay, "^2"); }
                ev.stopPropagation(); return;
            }
            // Let calculator.js handle equals/insert/backspace/clear.
            // After equals fires, mark justEvaluated on the next tick
            // (so calculator.js has time to update the display first).
            if (action === "equals") {
                setTimeout(() => { justEvaluated = true; }, 0);
            }
        }, true);

        let state = loadState();

        // Handle direct keyboard input after = : digit/letter starts fresh, operator chains.
        if (ansDisplay) {
            ansDisplay.addEventListener("keydown", (ev) => {
                if (!justEvaluated) { return; }
                justEvaluated = false;
                const k = ev.key;
                // Operators and Enter keep the result; everything else clears.
                const opKeys = new Set(["+", "-", "*", "/", "^", "Enter"]);
                if (!opKeys.has(k) && k !== "Backspace" && k !== "Delete") {
                    ansDisplay.value = "";
                }
            });
        }

        const showPopup = () => {
            popup.style.display = "block";
            const clamped = clamp(state.x, state.y, popup);
            applyPosition(popup, clamped.x, clamped.y);
            toggleBtn.setAttribute("aria-expanded", "true");
            state.open = true;
            saveState(state);
            const display = document.getElementById("scicalc-display");
            if (display) {
                display.focus();
            }
        };

        const hidePopup = () => {
            popup.style.display = "none";
            toggleBtn.setAttribute("aria-expanded", "false");
            state.open = false;
            saveState(state);
        };

        if (state.open) {
            showPopup();
        }

        toggleBtn.addEventListener("click", () => {
            popup.style.display === "none" || popup.style.display === ""
                ? showPopup() : hidePopup();
        });

        closeBtn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            hidePopup();
        });

        // Drag — mouse
        let dragging = false;
        let dragStartX = 0, dragStartY = 0, popupStartX = 0, popupStartY = 0;

        handle.addEventListener("mousedown", (ev) => {
            if (ev.target === closeBtn) {
                return;
            }
            dragging    = true;
            dragStartX  = ev.clientX;
            dragStartY  = ev.clientY;
            popupStartX = popup.offsetLeft;
            popupStartY = popup.offsetTop;
            handle.style.cursor = "grabbing";
            ev.preventDefault();
        });

        document.addEventListener("mousemove", (ev) => {
            if (!dragging) {
                return;
            }
            const c = clamp(popupStartX + ev.clientX - dragStartX,
                            popupStartY + ev.clientY - dragStartY, popup);
            applyPosition(popup, c.x, c.y);
        });

        document.addEventListener("mouseup", () => {
            if (!dragging) {
                return;
            }
            dragging = false;
            handle.style.cursor = "grab";
            state.x = popup.offsetLeft;
            state.y = popup.offsetTop;
            saveState(state);
        });

        // Drag — touch
        handle.addEventListener("touchstart", (ev) => {
            if (ev.target === closeBtn) {
                return;
            }
            const t     = ev.touches[0];
            dragging    = true;
            dragStartX  = t.clientX;
            dragStartY  = t.clientY;
            popupStartX = popup.offsetLeft;
            popupStartY = popup.offsetTop;
            ev.preventDefault();
        }, {passive: false});

        document.addEventListener("touchmove", (ev) => {
            if (!dragging) {
                return;
            }
            const t = ev.touches[0];
            const c = clamp(popupStartX + t.clientX - dragStartX,
                            popupStartY + t.clientY - dragStartY, popup);
            applyPosition(popup, c.x, c.y);
            ev.preventDefault();
        }, {passive: false});

        document.addEventListener("touchend", () => {
            if (!dragging) {
                return;
            }
            dragging = false;
            state.x  = popup.offsetLeft;
            state.y  = popup.offsetTop;
            saveState(state);
        });

        window.addEventListener("resize", () => {
            if (popup.style.display !== "none") {
                const c = clamp(popup.offsetLeft, popup.offsetTop, popup);
                applyPosition(popup, c.x, c.y);
            }
        });
    };

    return {init: init};
});
