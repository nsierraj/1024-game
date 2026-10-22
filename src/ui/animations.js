/**
 * The animation of a move.
 *
 * The renderer decides what happened to each tile; this module decides how it looks while it
 * happens, and how long the move takes. The stylesheet owns the movement itself, so honouring
 * the reduced-motion preference is a matter of one rule in the stylesheet rather than a branch
 * here. (FR-037)
 */

/**
 * How long a move takes, in milliseconds.
 *
 * The contract allows 150 milliseconds for the slide and the merge together, and the two overlap:
 * the tile grows as it travels rather than after it arrives. (FR-036)
 */
export const MOVE_DURATION = 130;

export function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Plays the animation of a move and resolves when it is over.
 *
 * @param {object} groups The tiles the move touched.
 * @param {HTMLElement[]} [groups.merging] The tiles that merged and survived.
 * @param {HTMLElement[]} [groups.absorbed] The tiles a merge absorbed.
 * @param {HTMLElement[]} [groups.spawned] The tiles that appeared.
 * @returns {Promise<void>} Resolves when the animation is over.
 */
export function playMove(groups = {}) {
  if (!groups || typeof groups !== "object") {
    return new Promise((resolve) => {
      setTimeout(() => resolve(), MOVE_DURATION);
    });
  }

  const { merging = [], absorbed = [], spawned = [] } = groups;

  if (prefersReducedMotion()) {
    for (const element of absorbed) {
      if (element && typeof element.remove === "function") {
        element.remove();
      }
    }
    return Promise.resolve();
  }

  for (const element of merging || []) {
    if (element && element.classList) element.classList.add("tile--merged");
  }
  for (const element of absorbed || []) {
    if (element && element.classList) element.classList.add("tile--absorbed");
  }
  for (const element of spawned || []) {
    if (element && element.classList) element.classList.add("tile--spawned");
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      for (const element of merging || []) {
        if (element && element.classList) element.classList.remove("tile--merged");
      }
      for (const element of absorbed || []) {
        if (element && element.classList) {
          element.classList.remove("tile--absorbed");
        }
        if (element && typeof element.remove === "function") {
          element.remove();
        }
      }
      for (const element of spawned || []) {
        if (element && element.classList) element.classList.remove("tile--spawned");
      }
      resolve();
    }, MOVE_DURATION);
  });
}
