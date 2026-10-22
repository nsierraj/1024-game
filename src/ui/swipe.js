/**
 * Pure gesture resolution for swipe input.
 */

export const SWIPE_FRACTION = 0.25;

/**
 * Resolves a swipe gesture to a direction or null.
 * @param {number} dx
 * @param {number} dy
 * @param {number} width
 * @param {number} height
 * @returns {"left"|"right"|"up"|"down"|null}
 */
export function resolveSwipe(dx, dy, width, height) {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (absX >= absY) {
    if (absX < width * SWIPE_FRACTION) return null;
    return dx > 0 ? "right" : "left";
  }

  if (absY < height * SWIPE_FRACTION) return null;
  return dy > 0 ? "down" : "up";
}
