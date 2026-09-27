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

/**
 * Tests for the calculator loader.
 *
 * @package   block_scicalc
 * @copyright 2026 Eduardo Kraus {@link https://eduardokraus.com}
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversClass(loader::class)]
final class loader_test extends \advanced_testcase {
    /**
     * Add a calculator block to a context.
     *
     * @param \context $context
     * @param bool $showinsubcontexts
     * @return int Block instance id.
     */
    private function add_block(\context $context, bool $showinsubcontexts = false): int {
        $block = $this->getDataGenerator()->create_block('scicalc', [
            'parentcontextid' => $context->id,
            'showinsubcontexts' => (int) $showinsubcontexts,
            'pagetypepattern' => '*',
        ]);
        return (int) $block->id;
    }

    public function test_find_block(): void {
        $this->resetAfterTest();
        $generator = $this->getDataGenerator();
        $category = $generator->create_category();
        $course = $generator->create_course(['category' => $category->id]);
        $quiz = $generator->create_module('quiz', ['course' => $course->id]);
        $quizcontext = \context_module::instance($quiz->cmid);

        // No block anywhere.
        $this->assertNull(loader::find_block($quizcontext));

        // A block in another course doesn't count.
        $this->add_block(\context_course::instance($generator->create_course()->id));
        $this->assertNull(loader::find_block($quizcontext));

        // A category block only counts if it's shown in sub-contexts.
        $categorycontext = \context_coursecat::instance($category->id);
        $this->add_block($categorycontext);
        $this->assertNull(loader::find_block($quizcontext));
        $categoryblock = $this->add_block($categorycontext, true);
        $this->assertSame($categoryblock, loader::find_block($quizcontext));
    }

    public function test_find_block_in_course_or_activity(): void {
        $this->resetAfterTest();
        $generator = $this->getDataGenerator();
        $course = $generator->create_course();
        $quiz1 = $generator->create_module('quiz', ['course' => $course->id]);
        $quiz2 = $generator->create_module('quiz', ['course' => $course->id]);
        $quiz1context = \context_module::instance($quiz1->cmid);
        $quiz2context = \context_module::instance($quiz2->cmid);

        // A block on one quiz's own page covers that quiz only.
        $quizblock = $this->add_block($quiz1context);
        $this->assertSame($quizblock, loader::find_block($quiz1context));
        $this->assertNull(loader::find_block($quiz2context));

        // A block on the course page covers every quiz in the course.
        $courseblock = $this->add_block(\context_course::instance($course->id));
        $this->assertSame($courseblock, loader::find_block($quiz2context));
    }

    /**
     * Count calls to block_scicalc/popup queued on a page.
     *
     * @param \moodle_page $page
     * @return int
     */
    private function count_calculator_calls(\moodle_page $page): int {
        $code = implode("\n", (new \ReflectionProperty($page->requires, 'amdjscode'))->getValue($page->requires));
        return substr_count($code, "require(['block_scicalc/popup']");
    }

    public function test_require_calculator_only_once(): void {
        $this->resetAfterTest();
        loader::reset();
        $page = new \moodle_page();
        $page->set_context(\context_system::instance());

        loader::require_calculator($page, 1);
        loader::require_calculator($page, 2);

        $this->assertSame(1, $this->count_calculator_calls($page));
        loader::reset();
    }

    public function test_turned_off_quiz(): void {
        $this->resetAfterTest();
        loader::reset();
        $generator = $this->getDataGenerator();
        $course = $generator->create_course();
        $quiz = $generator->create_module('quiz', ['course' => $course->id]);

        $this->assertFalse(loader::is_turned_off($quiz->cmid));
        loader::set_turned_off($quiz->cmid, true);
        loader::set_turned_off($quiz->cmid, true);
        $this->assertTrue(loader::is_turned_off($quiz->cmid));

        // The calculator isn't loaded on that quiz's pages.
        $page = new \moodle_page();
        [$course, $cm] = get_course_and_cm_from_cmid($quiz->cmid);
        $page->set_cm($cm, $course);
        loader::require_calculator($page, 1);
        $this->assertSame(0, $this->count_calculator_calls($page));

        // Turning it back on loads it again.
        loader::set_turned_off($quiz->cmid, false);
        $this->assertFalse(loader::is_turned_off($quiz->cmid));
        loader::require_calculator($page, 1);
        $this->assertSame(1, $this->count_calculator_calls($page));

        // Deleting the quiz removes its setting.
        loader::set_turned_off($quiz->cmid, true);
        (new \core_courseformat\local\cmactions($course))->delete($quiz->cmid);
        $this->assertFalse(loader::is_turned_off($quiz->cmid));
        loader::reset();
    }
}
