/**
 * The announcements made to the live region. (FR-051)
 *
 * The module takes the region as an argument, so it can be driven from Node without a browser. All
 * wording lives in `strings.js`.
 */

import { STRINGS } from "./strings.js";

/** The shortest gap between two merge announcements, so a fast run of merges does not flood. */
const MERGE_THROTTLE_MS = 500;

/** A no-break space, appended to make a repeated message differ from the one before it. */
const REPEAT_MARK = " ";

/**
 * Creates the announcer.
 *
 * @param {{textContent: string} | null} region The `role="status"` element, or null when the page
 *   has none.
 * @param {object} [options]
 * @param {() => number} [options.now] The clock, replaceable so the throttle can be tested.
 * @param {number} [options.throttleMs] The shortest gap between two merge announcements.
 * @returns {{
 *   announceMove: (gained: number, score: number) => void,
 *   announceUndo: (score: number) => void,
 *   announceWin: () => void,
 *   announceGameOver: (score: number) => void
 * }}
 */
export function createAnnouncer(region, { now = Date.now, throttleMs = MERGE_THROTTLE_MS } = {}) {
  let lastMergeAt = -Infinity;

  /**
   * Writes a message. A screen reader reads a live region only when its text changes, so a
   * message identical to the current one is marked to make it a change.
   * @param {string} message
   */
  function say(message) {
    if (!region) return;
    region.textContent = region.textContent === message ? `${message}${REPEAT_MARK}` : message;
  }

  return {
    /**
     * Announces a merge. A move that merged nothing is silent, and merges closer together than the
     * throttle are skipped.
     * @param {number} gained The points the move awarded.
     * @param {number} score The score after the move.
     */
    announceMove(gained, score) {
      if (gained <= 0) return;
      const time = now();
      if (time - lastMergeAt < throttleMs) return;
      lastMergeAt = time;
      say(STRINGS.mergedAnnouncement(gained, score));
    },

    /**
     * Announces an undo and the score it restored.
     * @param {number} score
     */
    announceUndo(score) {
      say(STRINGS.undoAnnouncement(score));
    },

    announceWin() {
      say(STRINGS.winAnnouncement);
    },

    /**
     * @param {number} score The final score.
     */
    announceGameOver(score) {
      say(STRINGS.gameOverAnnouncement(score));
    },
  };
}
