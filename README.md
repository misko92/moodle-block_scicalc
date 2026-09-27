# Scientific Calculator block (block_scicalc)

A Moodle block that adds a floating, draggable scientific calculator to any page,
including quiz attempts. The layout is aimed at chemistry: LOG, LN, 10ˣ, eˣ,
EE (scientific notation), √, ⁿ√, x², 1/x, |x| and ANS.

- The block itself is invisible to students; it adds a **Calculator** button below
  the navbar. Teachers see a short note in the block while editing.
- **Quizzes:** add the block to a course once and every quiz attempt in that course
  gets the calculator — even with "Show blocks during quiz attempts" off. Each quiz
  has a **Show calculator during attempts** checkbox (under *Scientific Calculator*
  in its settings) to turn it off for no-calculator tests. That setting isn't
  included in course backups, so it resets to "on" after a restore or duplicate.
- Exponents are typed as superscripts: press **^** (it lights up), then the digits,
  e.g. `2³` or `10⁻⁴`; **10ˣ** and **eˣ** start an exponent straight away. Decimal
  or fraction exponents fall back to caret form: a `.` turns `10⁻⁴` into `10^(-4.)`,
  and ⁿ√ gives `^(1/ )`. Typed `^` on a keyboard works the same way.
- Function keys continue from an answer: after a result, **LOG**, **LN**, **√x**,
  **1/x**, **|x|**, **10ˣ** and **eˣ** fill it in (`log(12.5)`, `10^(4.2)`) and wait
  for **=**. Typing a number straight away replaces it (**LOG** then `0.002` gives
  `log(0.002)`); an operator builds on it; after **10ˣ**/**eˣ**, **+/−** flips its sign
  and **−** starts a new negative exponent.
- A negative number raised to a power is bracketed as it's typed: −3 then x² shows
  `(−3)²` = 9, which is what students almost always mean. A minus that subtracts is
  left alone (`5−3²` = −4). Otherwise expressions follow normal maths precedence.
  Trig functions use degrees. Use `*` for multiplication; `E` is only the
  exponent marker (`6.02E23`), lower-case `e` is Euler's number.
- Calculation history lasts for the current login session only (kept in the
  browser's localStorage across pages and tabs). Logging in again — or another
  student logging in on the same computer — clears it. Nothing is stored on the server.

Requires Moodle 5.2.

## Development

- AMD modules: edit `amd/src/`, then build from the Moodle root with
  `npx grunt amd --root=public/blocks/scicalc`.
- Evaluator unit tests (jest): `npm install && npm test`.
- Acceptance tests: `--tags @block_scicalc`.

## License

GNU GPL v3 or later.
