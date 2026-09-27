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

namespace block_scicalc\local;

use context;
use moodle_page;

/**
 * Puts the floating calculator on a page, from the block or from a quiz attempt.
 *
 * @package   block_scicalc
 * @copyright 2026 Eduardo Kraus {@link https://eduardokraus.com}
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class loader {
    /** @var bool Whether the calculator has already been requested for this page. */
    private static bool $loaded = false;

    /**
     * Load the calculator JS and strings onto the page (once per request).
     *
     * @param moodle_page $page
     */
    public static function require_calculator(moodle_page $page): void {
        global $USER;

        if (self::$loaded || ($page->cm && $page->cm->modname === 'quiz' && self::is_turned_off((int) $page->cm->id))) {
            return;
        }
        self::$loaded = true;

        $page->requires->strings_for_js([
            'invalid_expression',
            'error_generic',
            'error_unknown_token',
            'error_misplaced_comma',
            'error_mismatched_parentheses',
            'error_zero_argument_function_call',
            'error_unclosed_function_call',
            'error_negative_factorial',
            'error_non_integer_factorial',
            'error_factorial_overflow',
            'error_arity_mismatch',
            'error_unsupported_function',
            'error_stack_underflow',
            'error_unknown_identifier',
            'error_invalid_expression',
            'error_non_finite_result',
        ], 'block_scicalc');
        // History lasts for one login session: the login time identifies the session.
        $page->requires->js_call_amd('block_scicalc/popup', 'init', [(int) $USER->id, (int) ($USER->currentlogin ?? 0)]);
    }

    /**
     * Find a calculator block that covers the given context.
     *
     * That is a block added directly to the course (or activity) page, or one added
     * higher up (category, front page) and set to show in sub-contexts.
     *
     * @param context $context Usually the quiz's module context.
     * @return int|null Block instance id, or null if there is none.
     */
    public static function find_block(context $context): ?int {
        global $DB;

        $coursecontext = $context->get_course_context(false);
        $direct = array_filter([$context->id, $coursecontext ? $coursecontext->id : null]);
        $ancestors = $context->get_parent_context_ids();

        [$directsql, $directparams] = $DB->get_in_or_equal($direct, SQL_PARAMS_NAMED, 'direct');
        [$ancestorsql, $ancestorparams] = $DB->get_in_or_equal($ancestors ?: [0], SQL_PARAMS_NAMED, 'anc');
        $sql = "SELECT id
                  FROM {block_instances}
                 WHERE blockname = :blockname
                   AND (parentcontextid $directsql OR (parentcontextid $ancestorsql AND showinsubcontexts = 1))
              ORDER BY id";
        $id = $DB->get_field_sql($sql, ['blockname' => 'scicalc'] + $directparams + $ancestorparams, IGNORE_MULTIPLE);

        return $id ? (int) $id : null;
    }

    /**
     * Whether a quiz has "Show calculator during attempts" unticked.
     *
     * @param int $cmid Quiz course module id.
     * @return bool
     */
    public static function is_turned_off(int $cmid): bool {
        global $DB;
        return $DB->record_exists('block_scicalc_quizoff', ['cmid' => $cmid]);
    }

    /**
     * Turn the calculator off or back on for a quiz.
     *
     * @param int $cmid Quiz course module id.
     * @param bool $off
     */
    public static function set_turned_off(int $cmid, bool $off): void {
        global $DB;
        if (!$off) {
            $DB->delete_records('block_scicalc_quizoff', ['cmid' => $cmid]);
        } else if (!self::is_turned_off($cmid)) {
            $DB->insert_record('block_scicalc_quizoff', (object) ['cmid' => $cmid]);
        }
    }

    /**
     * Reset the once-per-request flag (for unit tests).
     */
    public static function reset(): void {
        self::$loaded = false;
    }
}
