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
 * Callbacks for block_scicalc: the "Show calculator" quiz setting.
 *
 * @package   block_scicalc
 * @copyright 2026 Eduardo Kraus {@link https://eduardokraus.com}
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

use block_scicalc\local\loader;

/**
 * Add the "Show calculator during attempts" checkbox to quiz settings.
 *
 * @param moodleform_mod $formwrapper
 * @param MoodleQuickForm $mform
 */
function block_scicalc_coursemodule_standard_elements($formwrapper, $mform): void {
    if (!$formwrapper instanceof mod_quiz_mod_form) {
        return;
    }
    $cm = $formwrapper->get_coursemodule();

    $mform->addElement('header', 'scicalcheader', get_string('pluginname', 'block_scicalc'));
    $mform->addElement('advcheckbox', 'scicalc_enabled', get_string('quizsetting', 'block_scicalc'));
    $mform->addHelpButton('scicalc_enabled', 'quizsetting', 'block_scicalc');
    $mform->setDefault('scicalc_enabled', ($cm && loader::is_turned_off((int) $cm->id)) ? 0 : 1);
}

/**
 * Save the "Show calculator during attempts" checkbox.
 *
 * @param stdClass $data Submitted module form data.
 * @param stdClass $course
 * @return stdClass
 */
function block_scicalc_coursemodule_edit_post_actions($data, $course): stdClass {
    if ($data->modulename === 'quiz' && isset($data->scicalc_enabled)) {
        loader::set_turned_off((int) $data->coursemodule, empty($data->scicalc_enabled));
    }
    return $data;
}
