/**
 * The animation of a move.
 *
 * The renderer decides what happened to each tile; this module decides how long to wait for it.
 * The stylesheet owns the movement itself, so honouring the reduced-motion preference is a matter
 * of one block in the stylesheet rather than a branch here. (FR-007)
 *
 * The move ends when the browser says its animations have finished, not after a fixed timer, so a
 * change to the timeline in the stylesheet needs no change here. A cap stops a stuck animation
 * from holding up the next queued move. (FR-005, FR-006)
 */

/**
 * The longest a move may take to settle, in milliseconds: the 150 ms limit plus a frame.
 * (FR-005)
 */
export const MOVE_CAP = 160;

export function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The animations and transitions a set of elements is running.
 * @param {object[]} elements
 * @returns {Animation[]}
 */
function runningAnimations(elements) {
  const found = [];
  for (const element of elements) {
    if (element && typeof element.getAnimations === "function") found.push(...element.getAnimations());
  }
  return found;
}

/**
 * Resolves when every animation has finished, or at the cap.
 * @param {Animation[]} animations
 * @returns {Promise<void>}
 */
function whenSettled(animations) {
  if (animations.length === 0) return Promise.resolve();

  const finished = Promise.all(animations.map((animation) => Promise.resolve(animation.finished).catch(() => {})));
  const cap = new Promise((resolve) => {
    setTimeout(resolve, MOVE_CAP);
  });
  return Promise.race([finished, cap]).then(() => {});
}

/**
 * Plays the animation of a move and resolves when it is over.
 *
 * @param {object} groups The tiles the move touched.
 * @param {HTMLElement[]} [groups.moving] The tiles that slid.
 * @param {HTMLElement[]} [groups.merging] The tiles that merged and survived.
 * @param {HTMLElement[]} [groups.absorbed] The tiles a merge absorbed.
 * @param {HTMLElement[]} [groups.spawned] The tiles that appeared.
 * @returns {Promise<void>} Resolves when the animation is over.
 */
export function playMove(groups = {}) {
  const { moving = [], merging = [], absorbed = [], spawned = [] } = groups || {};

  const removeAbsorbed = () => {
    for (const element of absorbed) {
      if (element && element.classList) element.classList.remove("tile--absorbed");
      if (element && typeof element.remove === "function") element.remove();
    }
  };

  if (prefersReducedMotion()) {
    removeAbsorbed();
    return Promise.resolve();
  }

  for (const element of merging) {
    if (element && element.classList) element.classList.add("tile--merged");
  }
  for (const element of absorbed) {
    if (element && element.classList) element.classList.add("tile--absorbed");
  }
  for (const element of spawned) {
    if (element && element.classList) element.classList.add("tile--spawned");
  }

  // Reading the animations makes the browser start the transitions the renderer has just set up.
  const animations = runningAnimations([...moving, ...merging, ...absorbed, ...spawned]);

  return whenSettled(animations).then(() => {
    for (const element of merging) {
      if (element && element.classList) element.classList.remove("tile--merged");
    }
    for (const element of spawned) {
      if (element && element.classList) element.classList.remove("tile--spawned");
    }
    removeAbsorbed();
  });
}
