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
  const { merging = [], absorbed = [], spawned = [] } = groups;

  for (const element of merging) element.classList.add("tile--merged");
  for (const element of absorbed) element.classList.add("tile--absorbed");
  for (const element of spawned) element.classList.add("tile--spawned");

  return new Promise((resolve) => {
    setTimeout(() => {
      for (const element of merging) element.classList.remove("tile--merged");
      for (const element of absorbed) {
        element.classList.remove("tile--absorbed");
        element.remove();
      }
      for (const element of spawned) element.classList.remove("tile--spawned");
      resolve();
    }, MOVE_DURATION);
  });
}
