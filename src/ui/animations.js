/**
 * Animation orchestration for moves.
 *
 * The slide and the merge must finish together within 150 ms (FR-036). The CSS transitions own the
 * geometry; the animation controller marks the layer and waits for the transition end so that
 * tiles can be repossessed after a move.
 */

const SLIDE_DURATION_MS = 150;

export function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Plays the move animation for the affected tiles.
 * @param {Array<Array<HTMLElement>>} groups
 * @returns {Promise<void>}
 */
export function playMove(groups) {
  if (!Array.isArray(groups) || groups.length === 0) return Promise.resolve();

  if (prefersReducedMotion()) {
    return Promise.resolve();
  }

  const layer = groups[0] && groups[0][0] && groups[0][0].parentElement;
  if (!layer) return Promise.resolve();

  layer.classList.remove("tile-layer--instant");
  layer.classList.add("tile-layer--moving");

  const tiles = [];
  for (const group of groups) {
    for (const tile of group) {
      if (tile) tiles.push(tile);
    }
  }

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      layer.classList.remove("tile-layer--moving");
      resolve();
    };

    const timeout = setTimeout(finish, SLIDE_DURATION_MS + 50);

    const onEnd = (event) => {
      if (event.propertyName !== "transform") return;
      if (tiles.length === 0) {
        clearTimeout(timeout);
        layer.removeEventListener("transitionend", onEnd);
        finish();
        return;
      }
      const remaining = tiles.filter((tile) => !tile.dataset.animDone);
      if (remaining.length === 0) {
        clearTimeout(timeout);
        layer.removeEventListener("transitionend", onEnd);
        finish();
      }
    };

    layer.addEventListener("transitionend", onEnd);
  });
}
