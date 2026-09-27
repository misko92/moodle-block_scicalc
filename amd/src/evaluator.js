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
 * Pure expression evaluator for block_scicalc (no DOM access).
 *
 * Pipeline: normalise → tokenize → shunting-yard to RPN → evaluate.
 *
 * Errors are thrown as Error objects whose message is a block_scicalc
 * language string key, so the UI can translate them.
 *
 * Constants: pi (also π), e (lower-case only — "E" is the exponent marker).
 * Functions: sin, cos, tan, asin, acos, atan (degrees), sqrt (also √), abs (also |x|),
 * ln, log, exp, pow, min, max, floor, ceil, round.
 *
 * @module     block_scicalc/evaluator
 * @copyright  2026 Eduardo Kraus {@link https://eduardokraus.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** Binary operator precedence. Unary minus/plus sit between * and ^, so -2^2 = -(2^2). */
const PRECEDENCE = {
    '^': 4,
    'u-': 3.5,
    'u+': 3.5,
    '*': 3,
    '/': 3,
    '%': 3,
    '+': 2,
    '-': 2,
};

const RIGHT_ASSOCIATIVE = new Set(['^', 'u-', 'u+']);

/** Tokens after which a +/- or | starts a new operand rather than continuing one. */
const OPERAND_EXPECTED_AFTER = new Set(['+', '-', '*', '/', '%', '^', '(', ',', 'u-', 'u+']);

const DEG2RAD = Math.PI / 180;

const FUNCTIONS = {
    sin: [1, (x) => Math.sin(x * DEG2RAD)],
    cos: [1, (x) => Math.cos(x * DEG2RAD)],
    tan: [1, (x) => Math.tan(x * DEG2RAD)],
    asin: [1, (x) => Math.asin(x) / DEG2RAD],
    acos: [1, (x) => Math.acos(x) / DEG2RAD],
    atan: [1, (x) => Math.atan(x) / DEG2RAD],
    sqrt: [1, Math.sqrt],
    abs: [1, Math.abs],
    exp: [1, Math.exp],
    ln: [1, Math.log],
    log: [1, Math.log10],
    floor: [1, Math.floor],
    ceil: [1, Math.ceil],
    round: [1, Math.round],
    pow: [2, Math.pow],
    min: [-1, Math.min],
    max: [-1, Math.max],
};

/**
 * Map the calculator's display glyphs onto plain ASCII operators and names.
 *
 * @param {string} input
 * @returns {string}
 */
export const normalise = (input) => input
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–]/g, '-')
    .replace(/√/g, 'sqrt')
    .replace(/π/g, 'pi');

/**
 * Split an expression into number, identifier and operator tokens.
 *
 * A "|" becomes abs( when an operand is expected at that point and ) otherwise,
 * which lets |x| nest, e.g. |2-|3-5||.
 *
 * @param {string} input
 * @returns {Array<{type: string, value: string}>}
 */
export const tokenize = (input) => {
    const s = normalise(input);
    const tokens = [];
    const isDigit = (c) => c >= '0' && c <= '9';
    const isAlpha = (c) => /[A-Za-z_]/.test(c);
    const expectingOperand = () => {
        const prev = tokens[tokens.length - 1];
        return !prev || (prev.type === 'op' && OPERAND_EXPECTED_AFTER.has(prev.value));
    };

    let i = 0;
    while (i < s.length) {
        const c = s[i];

        if (/\s/.test(c)) {
            i++;
        } else if (isDigit(c) || (c === '.' && isDigit(s[i + 1]))) {
            const start = i;
            while (i < s.length && (isDigit(s[i]) || s[i] === '.')) {
                i++;
            }
            // Scientific notation: 6.02E23, 1e-3. Backtrack if no exponent digits follow.
            const exponent = /^[eE][+-]?\d+/.exec(s.slice(i));
            if (exponent) {
                i += exponent[0].length;
            }
            tokens.push({type: 'number', value: s.slice(start, i)});
        } else if (isAlpha(c)) {
            const start = i;
            while (i < s.length && (isAlpha(s[i]) || isDigit(s[i]))) {
                i++;
            }
            tokens.push({type: 'ident', value: s.slice(start, i)});
        } else if (c === '|') {
            if (expectingOperand()) {
                tokens.push({type: 'ident', value: 'abs'}, {type: 'op', value: '('});
            } else {
                tokens.push({type: 'op', value: ')'});
            }
            i++;
        } else if ('+-*/%^(),!'.includes(c)) {
            const unary = (c === '-' || c === '+') && expectingOperand();
            tokens.push({type: 'op', value: unary ? 'u' + c : c});
            i++;
        } else {
            throw new Error('error_unknown_token');
        }
    }
    return tokens;
};

/**
 * Convert tokens to Reverse Polish Notation (shunting-yard), counting function arguments.
 *
 * @param {Array<{type: string, value: string}>} tokens
 * @returns {Array<{type: string, value: string, argc?: number}>}
 */
export const toRpn = (tokens) => {
    const output = [];
    // Operators and open parens; a paren opened by a function call carries {func, argc}.
    const stack = [];
    const top = () => stack[stack.length - 1];
    const isParen = (t) => t && t.value === '(';

    tokens.forEach((t, i) => {
        const next = tokens[i + 1];

        if (t.type === 'number') {
            output.push(t);
        } else if (t.type === 'ident') {
            if (next && next.value === '(') {
                // Function name: recorded on its opening paren (the next token).
                return;
            }
            output.push(t);
        } else if (t.value === '(') {
            const prev = tokens[i - 1];
            const paren = {type: 'op', value: '('};
            if (prev && prev.type === 'ident') {
                paren.func = prev.value;
                paren.argc = (next && next.value === ')') ? 0 : 1;
            }
            stack.push(paren);
        } else if (t.value === ',') {
            while (stack.length && !isParen(top())) {
                output.push(stack.pop());
            }
            if (!stack.length || !top().func) {
                throw new Error('error_misplaced_comma');
            }
            top().argc++;
        } else if (t.value === ')') {
            while (stack.length && !isParen(top())) {
                output.push(stack.pop());
            }
            if (!stack.length) {
                throw new Error('error_mismatched_parentheses');
            }
            const paren = stack.pop();
            if (paren.func) {
                if (paren.argc < 1) {
                    throw new Error('error_zero_argument_function_call');
                }
                output.push({type: 'func', value: paren.func, argc: paren.argc});
            }
        } else if (t.value === '!') {
            // Postfix: its operand is already on the output.
            output.push(t);
        } else if (t.value === 'u-' || t.value === 'u+') {
            // Prefix: there is no left operand, so nothing on the stack can be popped yet.
            stack.push(t);
        } else {
            const prec = PRECEDENCE[t.value];
            while (stack.length && !isParen(top())) {
                const topprec = PRECEDENCE[top().value];
                if (topprec > prec || (topprec === prec && !RIGHT_ASSOCIATIVE.has(t.value))) {
                    output.push(stack.pop());
                } else {
                    break;
                }
            }
            stack.push(t);
        }
    });

    while (stack.length) {
        const t = stack.pop();
        if (isParen(t)) {
            throw new Error(t.func ? 'error_unclosed_function_call' : 'error_mismatched_parentheses');
        }
        output.push(t);
    }
    return output;
};

/**
 * Factorial of a non-negative integer.
 *
 * @param {number} n
 * @returns {number}
 */
const factorial = (n) => {
    if (n < 0) {
        throw new Error('error_negative_factorial');
    }
    if (!Number.isInteger(n)) {
        throw new Error('error_non_integer_factorial');
    }
    let r = 1;
    for (let i = 2; i <= n; i++) {
        r *= i;
        if (!Number.isFinite(r)) {
            throw new Error('error_factorial_overflow');
        }
    }
    return r;
};

/**
 * Evaluate an expression.
 *
 * @param {string} expr
 * @returns {number}
 */
export const evaluate = (expr) => {
    const stack = [];
    const pop = () => {
        if (!stack.length) {
            throw new Error('error_stack_underflow');
        }
        const v = stack.pop();
        if (!Number.isFinite(v)) {
            throw new Error('error_non_finite_result');
        }
        return v;
    };

    toRpn(tokenize(expr)).forEach((t) => {
        if (t.type === 'number') {
            stack.push(parseFloat(t.value));
        } else if (t.type === 'ident') {
            if (t.value.toLowerCase() === 'pi') {
                stack.push(Math.PI);
            } else if (t.value === 'e') {
                stack.push(Math.E);
            } else {
                throw new Error('error_unknown_identifier');
            }
        } else if (t.type === 'func') {
            const def = FUNCTIONS[t.value.toLowerCase()];
            if (!def) {
                throw new Error('error_unsupported_function');
            }
            const [arity, fn] = def;
            if (arity !== -1 && arity !== t.argc) {
                throw new Error('error_arity_mismatch');
            }
            const args = [];
            for (let k = 0; k < t.argc; k++) {
                args.unshift(pop());
            }
            stack.push(fn(...args));
        } else if (t.value === 'u-') {
            stack.push(-pop());
        } else if (t.value === 'u+') {
            stack.push(pop());
        } else if (t.value === '!') {
            stack.push(factorial(pop()));
        } else {
            const b = pop();
            const a = pop();
            switch (t.value) {
                case '+': stack.push(a + b); break;
                case '-': stack.push(a - b); break;
                case '*': stack.push(a * b); break;
                case '/': stack.push(a / b); break;
                case '%': stack.push(a % b); break;
                case '^': stack.push(Math.pow(a, b)); break;
            }
        }
    });

    if (stack.length !== 1) {
        throw new Error('error_invalid_expression');
    }
    if (!Number.isFinite(stack[0])) {
        throw new Error('error_non_finite_result');
    }
    return stack[0];
};

/**
 * Format a result for display: 15 significant digits (hides binary float noise such as
 * 0.1 + 0.2 = 0.30000000000000004) and calculator-style exponents (6.02E23, 1E-7).
 *
 * @param {number} value
 * @returns {string}
 */
export const formatResult = (value) => String(Number(value.toPrecision(15)))
    .replace(/e\+?(-?)(\d+)$/, 'E$1$2');
