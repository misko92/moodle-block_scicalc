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

namespace block_scicalc;

use block_scicalc\local\loader;
use core\hook\output\before_footer_html_generation;

/**
 * Hook callbacks for block_scicalc.
 *
 * @package   block_scicalc
 * @copyright 2026 Eduardo Kraus {@link https://eduardokraus.com}
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class hook_callbacks {
    /**
     * Show the calculator during quiz attempts in courses that have the block.
     *
     * This is the only place the calculator is loaded: the block doesn't load it on the
     * pages it sits on, and this works whether or not the quiz shows blocks during attempts.
     *
     * @param before_footer_html_generation $hook
     */
    public static function before_footer_html_generation(before_footer_html_generation $hook): void {
        global $PAGE;

        if ($PAGE->pagetype !== 'mod-quiz-attempt' || !$PAGE->cm || during_initial_install()) {
            return;
        }
        if (loader::find_block($PAGE->context) !== null) {
            loader::require_calculator($PAGE);
        }
    }
}
