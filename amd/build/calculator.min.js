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
 * calculator.js
 *
 * @package   block_scicalc
 * @copyright 2026 Eduardo Kraus {@link https://eduardokraus.com}
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define([], function () {
    "use strict";

    const MAX_HISTORY_ITEMS = 50;

    let angleMode = "DEG";

    /**
     * Tokenizes an expression into numbers, identifiers, operators, parentheses and commas.
     *
     * @param {string} input
     * @returns {Array}
     */
    const tokenize = (input) => {
        const s = input.trim();
        const tokens = [];
        let i = 0;

        const isDigit = (c) => c >= "0" && c <= "9";
        const isAlpha = (c) => (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";

        while (i < s.length) {
            const c = s[i];

            if (c === " " || c === "\t" || c === "\n") {
                i++;
                continue;
            }

            // Number (supports decimals).
            if (isDigit(c) || (c === "." && isDigit(s[i + 1]))) {
                let start = i;
                i++;
                while (i < s.length && (isDigit(s[i]) || s[i] === ".")) {
                    i++;
                }
                // Support scientific notation: 1.5E10, 6.02E-23, 1e3
                if (i < s.length && (s[i] === "E" || s[i] === "e")) {
                    const eSave = i;
                    i++;
                    if (i < s.length && (s[i] === "+" || s[i] === "-")) {
                        i++;
                    }
                    if (i < s.length && isDigit(s[i])) {
                        while (i < s.length && isDigit(s[i])) {
                            i++;
                        }
                    } else {
                        i = eSave; // Not valid E notation — backtrack.
                    }
                }
                tokens.push({type: "number", value: s.slice(start, i)});
                continue;
            }

            // Identifier (functions/constants).
            if (isAlpha(c)) {
                let start = i;
                i++;
                while (i < s.length && (isAlpha(s[i]) || isDigit(s[i]))) {
                    i++;
                }
                tokens.push({type: "ident", value: s.slice(start, i)});
                continue;
            }

            // Operators / punctuation.
            if ("+-*/^(),!%".includes(c)) {
                tokens.push({type: "op", value: c});
                i++;
                continue;
            }

            // Unknown.
            tokens.push({type: "unknown", value: c});
            i++;
        }

        return tokens;
    };

    /**
     * Operator precedence map.
     */
    const precedence = {
        "!": 5,
        "^": 4,
        "*": 3,
        "/": 3,
        "%": 3,
        "+": 2,
        "-": 2,
        "u-": 4.5,
    };

    /**
     * Associativity map.
     */
    const rightAssociative = {
        "^": true,
    };

    /**
     * Converts tokens to Reverse Polish Notation using Shunting-yard algorithm.
     * Supports functions like sin(x), pow(a,b), min(a,b,c) with argument counting.
     *
     * @param {Array} tokens
     * @returns {Array}
     */
    const toRpn = (tokens) => {
        const output = [];
        const stack = [];
        const argcStack = []; // Parallel stack for function argument counts.

        const isOp = (t) => t && t.type === "op";

        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];

            if (t.type === "unknown") {
                throw new Error("error_unknown_token");
            }

            if (t.type === "number") {
                output.push(t);
                continue;
            }

            if (t.type === "ident") {
                // Function if next token is '('.
                const next = tokens[i + 1];
                if (isOp(next) && next.value === "(") {
                    stack.push({type: "func", value: t.value});
                    argcStack.push(0); // Will become 1 when first arg starts.
                } else {
                    // Constant/identifier (pi/e etc.).
                    output.push(t);
                }
                continue;
            }

            if (t.type === "op" && t.value === ",") {
                // Argument separator: pop operators until '('.
                while (stack.length && stack[stack.length - 1].value !== "(") {
                    output.push(stack.pop());
                }
                if (!stack.length) {
                    throw new Error("error_misplaced_comma");
                }
                // Increase arg count for the current function (if any).
                if (argcStack.length) {
                    argcStack[argcStack.length - 1] += 1;
                }
                continue;
            }

            if (t.type === "op" && t.value === "(") {
                stack.push(t);
                // If this '(' opens a function call, the function is below it.
                // We mark that the first argument is starting (unless next is ')').
                const next = tokens[i + 1];
                if (argcStack.length) {
                    // If next is ')', it's a zero-arg call (we will error later).
                    if (!(isOp(next) && next.value === ")")) {
                        // First argument exists.
                        if (argcStack[argcStack.length - 1] === 0) {
                            argcStack[argcStack.length - 1] = 1;
                        }
                    }
                }
                continue;
            }

            if (t.type === "op" && t.value === ")") {
                while (stack.length && stack[stack.length - 1].value !== "(") {
                    output.push(stack.pop());
                }
                if (!stack.length) {
                    throw new Error("error_mismatched_parentheses");
                }
                stack.pop(); // pop '('

                // If top is a function, pop it into output with argc.
                if (stack.length && stack[stack.length - 1].type === "func") {
                    const fn = stack.pop();
                    const argc = argcStack.pop() ?? 0;
                    if (argc < 1) {
                        throw new Error("error_zero_argument_function_call");
                    }
                    output.push({type: "func", value: fn.value, argc: argc});
                }
                continue;
            }

            // Handle unary minus: if '-' at beginning or after operator/left paren/comma.
            if (t.type === "op" && t.value === "-") {
                const prev = tokens[i - 1];
                const unary = (!prev) || (prev.type === "op" && ["+", "-", "*", "/", "^", "(", ",", "%"].includes(prev.value));
                if (unary) {
                    // Convert unary '-' into 'u-' operator.
                    const u = {type: "op", value: "u-"};
                    while (stack.length) {
                        const top = stack[stack.length - 1];
                        if (top.value === "(" || top.type === "func") {
                            break;
                        }
                        const topPrec = precedence[top.value] ?? 0;
                        const curPrec = precedence[u.value] ?? 0;
                        if (curPrec <= topPrec) {
                            output.push(stack.pop());
                        } else {
                            break;
                        }
                    }
                    stack.push(u);
                    continue;
                }
            }

            if (t.type === "op") {
                // Postfix factorial goes directly to output (RPN).
                if (t.value === "!") {
                    output.push(t);
                    continue;
                }

                while (stack.length) {
                    const top = stack[stack.length - 1];

                    if (top.value === "(" || top.type === "func") {
                        break;
                    }

                    const topPrec = precedence[top.value] ?? 0;
                    const curPrec = precedence[t.value] ?? 0;

                    const shouldPop = rightAssociative[t.value]
                        ? (curPrec < topPrec)
                        : (curPrec <= topPrec);

                    if (!shouldPop) {
                        break;
                    }

                    output.push(stack.pop());
                }

                stack.push(t);
                continue;
            }

            throw new Error("error_invalid_token_flow");
        }

        while (stack.length) {
            const t = stack.pop();
            if (t.value === "(" || t.value === ")") {
                throw new Error("error_mismatched_parentheses");
            }
            if (t.type === "func") {
                throw new Error("error_unclosed_function_call");
            }
            output.push(t);
        }

        return output;
    };

    /**
     * Safe factorial for non-negative integers.
     *
     * @param {number} n
     * @returns {number}
     */
    const factorial = (n) => {
        if (!Number.isFinite(n)) {
            throw new Error("error_invalid_factorial");
        }
        if (n < 0) {
            throw new Error("error_negative_factorial");
        }
        if (!Number.isInteger(n)) {
            throw new Error("error_non_integer_factorial");
        }
        let r = 1;
        for (let i = 2; i <= n; i++) {
            r *= i;
            if (!Number.isFinite(r)) {
                throw new Error("error_factorial_overflow");
            }
        }
        return r;
    };

    /**
     * Evaluates an expression (tokens -> rpn -> eval).
     *
     * Supported constants: pi, e
     * Supported functions: sin, cos, tan, asin, acos, atan, sqrt, abs, ln, log, exp, pow, min, max, floor, ceil, round
     *
     * @param {string} expr
     * @returns {number}
     */
    const evaluate = (expr) => {
        const tokens = tokenize(expr);
        const rpn = toRpn(tokens);
        const stack = [];

        const getConst = (name) => {
            const n = name.toLowerCase();
            if (n === "pi") {
                return Math.PI;
            }
            if (n === "e") {
                return Math.E;
            }
            return null;
        };

        const callFunc = (name, args) => {
            const n = name.toLowerCase();

            const f1 = (fn) => {
                if (args.length !== 1) {
                    throw new Error("error_arity_mismatch");
                }
                return fn(args[0]);
            };

            const DEG2RAD = Math.PI / 180;
            const toRad = function (x) {
                return x * DEG2RAD;
            }
            const fromRad = function (x) {
                return x / DEG2RAD;
            }

            if (n === "sin") return f1((x) => Math.sin(angleMode === "DEG" ? toRad(x) : x));
            if (n === "cos") return f1((x) => Math.cos(angleMode === "DEG" ? toRad(x) : x));
            if (n === "tan") return f1((x) => Math.tan(angleMode === "DEG" ? toRad(x) : x));

            if (n === "asin") return f1((x) => angleMode === "DEG" ? fromRad(Math.asin(x)) : Math.asin(x));
            if (n === "acos") return f1((x) => angleMode === "DEG" ? fromRad(Math.acos(x)) : Math.acos(x));
            if (n === "atan") return f1((x) => angleMode === "DEG" ? fromRad(Math.atan(x)) : Math.atan(x));

            if (n === "sqrt") return f1(Math.sqrt);
            if (n === "abs") return f1(Math.abs);
            if (n === "exp") return f1(Math.exp);
            if (n === "ln") return f1(Math.log);

            if (n === "log") {
                if (args.length !== 1) {
                    throw new Error("error_arity_mismatch");
                }
                return Math.log10 ? Math.log10(args[0]) : (Math.log(args[0]) / Math.log(10));
            }

            if (n === "floor") return f1(Math.floor);
            if (n === "ceil") return f1(Math.ceil);
            if (n === "round") return f1(Math.round);

            if (n === "pow") {
                if (args.length !== 2) {
                    throw new Error("error_arity_mismatch");
                }
                return Math.pow(args[0], args[1]);
            }

            if (n === "min") {
                if (args.length < 1) {
                    throw new Error("error_arity_mismatch");
                }
                return Math.min(...args);
            }

            if (n === "max") {
                if (args.length < 1) {
                    throw new Error("error_arity_mismatch");
                }
                return Math.max(...args);
            }

            throw new Error("error_unsupported_function");
        };

        const popNum = () => {
            if (!stack.length) {
                throw new Error("error_stack_underflow");
            }
            const v = stack.pop();
            if (!Number.isFinite(v)) {
                throw new Error("error_invalid_number");
            }
            return v;
        };

        for (let i = 0; i < rpn.length; i++) {
            const t = rpn[i];

            if (t.type === "number") {
                stack.push(parseFloat(t.value));
                continue;
            }

            if (t.type === "ident") {
                // Only constants are allowed as plain identifiers.
                const c = getConst(t.value);
                if (c === null) {
                    throw new Error("error_unknown_identifier");
                }
                stack.push(c);
                continue;
            }

            if (t.type === "func") {
                const argc = t.argc ?? 1;
                if (stack.length < argc) {
                    throw new Error("error_stack_underflow");
                }
                const args = [];
                for (let k = 0; k < argc; k++) {
                    args.unshift(popNum());
                }
                const r = callFunc(t.value, args);
                stack.push(r);
                continue;
            }

            if (t.type === "op") {
                if (t.value === "u-") {
                    const a = popNum();
                    stack.push(-a);
                    continue;
                }

                if (t.value === "!") {
                    const a = popNum();
                    stack.push(factorial(a));
                    continue;
                }

                const b = popNum();
                const a = popNum();

                if (t.value === "+") stack.push(a + b);
                else if (t.value === "-") stack.push(a - b);
                else if (t.value === "*") stack.push(a * b);
                else if (t.value === "/") stack.push(a / b);
                else if (t.value === "%") stack.push(a % b);
                else if (t.value === "^") stack.push(Math.pow(a, b));
                else throw new Error("error_unsupported_operator");

                continue;
            }

            throw new Error("error_unexpected_token");
        }

        if (stack.length !== 1) {
            throw new Error("error_invalid_expression");
        }

        const result = stack[0];
        if (!Number.isFinite(result)) {
            throw new Error("error_non_finite_result");
        }

        return result;
    };

    const insertAtCursor = (input, value) => {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const before = input.value.slice(0, start);
        const after = input.value.slice(end);
        input.value = before + value + after;
        const pos = start + value.length;
        input.setSelectionRange(pos, pos);
        input.focus();
    };

    /**
     * Adds a history item (click restores the expression, not the result),
     * and persists in localStorage.
     *
     * @param {HTMLElement} list
     * @param {string} expr
     * @param {string} result
     */
    const addHistory = (expr, result) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "list-group-item list-group-item-action";
        item.innerHTML = `<div class="small text-muted text-truncate">${escapeHtml(expr)}</div>` +
            `<div class="fw-semibold">${escapeHtml(result)}</div>`;

        item.addEventListener("click", () => {
            const input = document.getElementById("scicalc-display");
            input.value = expr;
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        });

        let history = document.getElementById("scicalc-history");
        history.prepend(item);

        // Persist.
        historyItems.unshift({expr: expr, result: result, ts: Date.now()});
        if (historyItems.length > MAX_HISTORY_ITEMS) {
            historyItems.length = MAX_HISTORY_ITEMS;
        }
        saveHistory();
    };

    /**
     * Renders full history list.
     */
    const renderHistory = () => {
        let history = document.getElementById("scicalc-history");

        history.innerHTML = "";
        const frag = document.createDocumentFragment();

        // historyItems are stored newest-first.
        historyItems.forEach((h) => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "list-group-item list-group-item-action";
            item.innerHTML = `<div class="small text-muted text-truncate">${escapeHtml(h.expr)}</div>` +
                `<div class="fw-semibold">${escapeHtml(h.result)}</div>`;
            item.addEventListener("click", () => {
                const input = document.getElementById("scicalc-display");
                input.value = h.expr;
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            });
            frag.appendChild(item);
        });

        history.appendChild(frag);
    };

    /**
     * Checks if localStorage is available.
     *
     * @returns {boolean}
     */
    const hasLocalStorage = () => {
        try {
            const k = "__scicalc_test__";
            window.localStorage.setItem(k, "1");
            window.localStorage.removeItem(k);
            return true;
        } catch (e) {
            return false;
        }
    };

    /**
     * Loads history from localStorage.
     *
     * @returns {Array<{expr: string, result: string, ts: number}>}
     */
    const loadHistory = () => {
        if (!hasLocalStorage()) {
            return [];
        }
        try {
            const raw = window.localStorage.getItem(historyKey);
            if (!raw) {
                return [];
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return [];
            }
            return parsed
                .filter(i => i && typeof i.expr === "string" && typeof i.result === "string")
                .map(i => ({expr: i.expr, result: i.result, ts: Number(i.ts) || 0}))
                .slice(0, MAX_HISTORY_ITEMS);
        } catch (e) {
            return [];
        }
    };

    /**
     * Saves history to localStorage.
     */
    const saveHistory = () => {
        if (!hasLocalStorage()) {
            return;
        }
        try {
            window.localStorage.setItem(historyKey, JSON.stringify(historyItems.slice(0, MAX_HISTORY_ITEMS)));
        } catch (e) {
            // Ignore quota/security errors.
        }
    };

    /**
     * Removes history from localStorage.
     */
    const clearHistoryStorage = () => {
        if (!hasLocalStorage()) {
            return;
        }
        try {
            window.localStorage.removeItem(historyKey);
        } catch (e) {
            // Ignore.
        }
    };

    const escapeHtml = (s) => {
        return String(s)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll("\"", "&quot;")
            .replaceAll("'", "&#039;");
    };

    const setErrorVisible = (show, message = false) => {
        const elspan = document.querySelector("#scicalc-error span");
        if (message) {
            elspan.innerHTML = `: ${message}`;
        } else {
            elspan.innerHTML = "";
        }

        const elerror = document.getElementById("scicalc-error");
        elerror.classList.toggle("d-none", !show);
    };

    const toggleSign = (input) => {
        const v = input.value.trim();
        if (!v) {
            input.value = "-";
            input.focus();
            return;
        }
        if (v.startsWith("-")) {
            input.value = v.slice(1);
        } else {
            input.value = "-" + v;
        }
        input.focus();
    };

    /**
     * Executes calculation and updates UI.
     *
     * @param {HTMLInputElement} input
     * @param {HTMLElement} history
     */
    const doEquals = (input, history) => {
        setErrorVisible(false);
        // Convert |expr| → abs(expr) iteratively to handle simple cases like |15-17|.
        // Replaces inner-most pairs first so nested ||x|| also resolves correctly.
        const pipeToAbs = (s) => {
            let prev;
            do {
                prev = s;
                s = s.replace(/\|([^|]*)\|/g, "abs($1)");
            } while (s !== prev);
            return s;
        };
        const expr = pipeToAbs(input.value
            .replace(/×/g, "*")           // Unicode × → *
            .replace(/÷/g, "/")           // Unicode ÷ → /
            .replace(/−/g, "-")           // Unicode minus → -
            .replace(/√\(/g, "sqrt(")     // √( → sqrt(
            .replace(/π/g, "pi"));        // π → pi

        try {
            const result = evaluate(expr);
            // Format output: convert JS scientific notation e+23 / e-23 → E23 / E-23
            const formatted = String(result).replace(/e\+?(-?)(\d+)$/, "E$1$2");
            addHistory(expr, formatted);
            lastAnswer = formatted;
            input.value = formatted;
            input.focus();
        } catch (e) {
            let message = M.util.get_string(e.message, "block_scicalc")
            setErrorVisible(true, message);
        }
    };

    let historyKey = null;
    let historyItems = null;
    let lastAnswer = null;

    const init = (cmid) => {
        // Visibility is managed by popup.js — no display toggle needed here.
        const input = document.getElementById("scicalc-display");
        historyKey = `block_scicalc_history_v1_${cmid}`;
        historyItems = loadHistory();
        renderHistory();

        let equalsLocked = false;
        let calculatorcontrols = document.querySelector("#calculator-area .calculator-controls")
        calculatorcontrols.addEventListener("click", (event) => {
            const btn = event.target.closest("[data-action]");
            if (!btn) {
                return;
            }
            if (btn.getAttribute("data-action") === "equals") {
                if (equalsLocked) { return; }
                equalsLocked = true;
                window.setTimeout(() => { equalsLocked = false; }, 250);
            }

            const action = btn.getAttribute("data-action");

            if (action === "insert") {
                insertAtCursor(input, btn.getAttribute("data-value") || "");
                return;
            }

            if (action === "func") {
                const fn = btn.getAttribute("data-func") || "";
                if (fn) {
                    insertAtCursor(input, fn + "(");
                }
                return;
            }

            if (action === "equals") {
                doEquals(input, history);
                return;
            }

            if (action === "clear") {
                setErrorVisible(false);
                input.value = "";
                input.focus();
                return;
            }

            if (action === "backspace") {
                setErrorVisible(false);
                const start = input.selectionStart || 0;
                const end = input.selectionEnd || 0;
                if (start !== end) {
                    const before = input.value.slice(0, start);
                    const after = input.value.slice(end);
                    input.value = before + after;
                    input.setSelectionRange(start, start);
                } else if (start > 0) {
                    input.value = input.value.slice(0, start - 1) + input.value.slice(start);
                    input.setSelectionRange(start - 1, start - 1);
                }
                input.focus();
                return;
            }

            if (action === "toggle-sign") {
                toggleSign(input);
            }
        });

        let clearhistory = document.getElementById("data-action-clear-history");
        clearhistory.addEventListener("click", (ev) => {
            document.getElementById("scicalc-history").innerHTML = "";
            historyItems.length = 0;
            renderHistory();
            clearHistoryStorage();
        });

        input.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter") {
                ev.preventDefault();
                doEquals(input, history);
            }
        });

        const rad = document.getElementById("anglemode-rad");
        const deg = document.getElementById("anglemode-deg");
        if (rad) { rad.addEventListener("change", () => (angleMode = "RAD")); }
        if (deg) { deg.addEventListener("change", () => (angleMode = "DEG")); }
    };

    return {init: init, getLastAnswer: () => lastAnswer};
});
