<?php
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
 * block_scicalc.php — Scientific Calculator block
 *
 * @package   block_scicalc
 * @copyright 2026 Eduardo Kraus {@link https://eduardokraus.com}
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Scientific Calculator block class.
 */
class block_scicalc extends block_base {

    /**
     * Initialise the block.
     */
    public function init(): void {
        $this->title = get_string('pluginname', 'block_scicalc');
    }

    /**
     * This block can appear on any page, including quiz attempt pages.
     *
     * @return array
     */
    public function applicable_formats(): array {
        return ['all' => true];
    }

    /**
     * Only one calculator block per page is needed.
     *
     * @return bool
     */
    public function instance_allow_multiple(): bool {
        return false;
    }

    /**
     * No per-instance configuration form.
     *
     * @return bool
     */
    public function has_config(): bool {
        return false;
    }

    /**
     * Build and return the block content.
     *
     * @return stdClass|null
     */
    public function get_content(): ?stdClass {
        if ($this->content !== null) {
            return $this->content;
        }

        // Load all error/UI strings into JS so the calculator can use them.
        $this->page->requires->strings_for_js([
            'error_generic',
            'error_unknown_token',
            'error_misplaced_comma',
            'error_mismatched_parentheses',
            'error_zero_argument_function_call',
            'error_invalid_token_flow',
            'error_unclosed_function_call',
            'error_invalid_factorial',
            'error_negative_factorial',
            'error_non_integer_factorial',
            'error_factorial_overflow',
            'error_arity_mismatch',
            'error_unsupported_function',
            'error_stack_underflow',
            'error_invalid_number',
            'error_unknown_identifier',
            'error_unsupported_operator',
            'error_unexpected_token',
            'error_invalid_expression',
            'error_non_finite_result',
            'history_title',
            'clear_history',
            'invalid_expression',
        ], 'block_scicalc');

        // popup.js requires calculator.js as an AMD dependency and calls
        // calculator.init() itself after injecting the UI into the DOM.
        // This guarantees correct load order — calculator.js always finds
        // #calculator-area already present when it runs.
        $this->page->requires->js_call_amd(
            'block_scicalc/popup',
            'init',
            [$this->instance->id]
        );

        $this->content = new stdClass();
        $this->content->text = $this->page->get_renderer('core')
            ->render_from_template('block_scicalc/content', []);
        $this->content->footer = '';

        return $this->content;
    }
}
