# Scientific Calculator block (block_scicalc)

A Moodle block that adds a floating, draggable scientific calculator to any page,
including quiz attempts. The layout is aimed at chemistry: LOG, LN, 10ˣ, eˣ,
EE (scientific notation), √, ⁿ√, x², 1/x, |x| and ANS.

- The block itself is invisible to students; it adds a **Calculator** button below
  the navbar. Teachers see a short note in the block while editing.
- Expressions follow normal maths precedence (`-2^2 = -4`, `2^-3 = 0.125`).
  Trig functions use degrees. Use `*` for multiplication; `E` is only the
  exponent marker (`6.02E23`), lower-case `e` is Euler's number.
- Calculation history is stored per user in the browser's localStorage; nothing
  is stored on the server.

Requires Moodle 5.2.

## Development

- AMD modules: edit `amd/src/`, then build from the Moodle root with
  `npx grunt amd --root=public/blocks/scicalc`.
- Evaluator unit tests (jest): `npm install && npm test`.
- Acceptance tests: `--tags @block_scicalc`.

## License

GNU GPL v3 or later.
