/**
 * Constants shared by the logic core. Every value is a rule from the specification, and the
 * requirement it comes from is named beside it.
 */

/** The board is 4x4, so the board holds 16 cells. (FR-001) */
export const BOARD_SIZE = 4;

/** Number of cells on the board. (FR-001) */
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;

/** The tile value that wins the game. (FR-019) */
export const TARGET_VALUE = 1024;

/** A new game begins with two tiles. (FR-002) */
export const INITIAL_TILE_COUNT = 2;

/** A spawned tile is 2 or 4. (FR-003) */
export const SPAWN_VALUES = [2, 4];

/** A spawned tile is 2 with probability 0.9 and 4 with probability 0.1. (FR-003) */
export const SPAWN_WEIGHTS = [0.9, 0.1];
