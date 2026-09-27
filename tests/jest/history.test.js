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
 * Tests for clearing calculator history from earlier login sessions.
 *
 * @copyright  2026 Eduardo Kraus {@link https://eduardokraus.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {pruneHistory, HISTORY_PREFIX} from '../../amd/src/calculator';

/**
 * Minimal Storage stand-in.
 *
 * @param {Object} items
 * @returns {Object}
 */
const fakeStorage = (items) => {
    const data = new Map(Object.entries(items));
    return {
        get length() {
            return data.size;
        },
        key: (i) => [...data.keys()][i] ?? null,
        removeItem: (k) => data.delete(k),
        keys: () => [...data.keys()].sort(),
    };
};

test('only the current session history is kept', () => {
    const current = `${HISTORY_PREFIX}5_1790000000`;
    const storage = fakeStorage({
        [current]: '[]',
        [`${HISTORY_PREFIX}5_1780000000`]: '[]', // Same user, earlier login.
        [`${HISTORY_PREFIX}7_1790000100`]: '[]', // Another student on this computer.
        [`${HISTORY_PREFIX}v1_12`]: '[]', // Plugin v1.3.8.
        [`${HISTORY_PREFIX}v2_5_3`]: '[]', // Plugin 2026092700-02.
        'block_scicalc_popup_v1': '{}',
        'unrelated': 'x',
    });

    pruneHistory(storage, current);

    expect(storage.keys()).toEqual([current, 'block_scicalc_popup_v1', 'unrelated'].sort());
});
