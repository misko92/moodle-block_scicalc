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
 * Scientific Calculator block.
 *
 * @package   block_scicalc
 * @copyright 2026 Eduardo Kraus {@link https://eduardokraus.com}
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Scientific Calculator block.
 *
 * The block itself shows nothing to students: it marks the course (or activity)
 * whose quiz attempts get the floating calculator (see \block_scicalc\hook_callbacks).
 * While editing, it shows a short note so teachers can still find, move and delete it.
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
     * Return the (normally empty) block content.
     *
     * Empty content keeps the block out of the page for everyone who isn't editing.
     * The calculator itself is only loaded on quiz attempt pages, by the hook callback.
     *
     * @return stdClass|null
     */
    public function get_content(): ?stdClass {
        if ($this->content !== null) {
            return $this->content;
        }

        $this->content = new stdClass();
        $this->content->text = $this->page->user_is_editing() ? get_string('editinghint', 'block_scicalc') : '';
        $this->content->footer = '';

        return $this->content;
    }
}
