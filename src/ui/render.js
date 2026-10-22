/**
 * The renderer: it draws the board, the tiles, and the scores from the game's state.
 *
 * The board in the page is a native grid of sixteen cells, and it carries the meaning: the rows
 * and the cells are what a screen reader reads, and each cell's text is the value it holds. The
 * tiles are drawn in a second layer on top of the grid, because a tile that slides has to travel
 * smoothly from one cell to the next, and a grid cell cannot do that on its own. The layer is
 * hidden from assistive technology, so nothing is read twice.
 *
 * The renderer reuses the tile elements between draws, so that a tile which stays on the board
 * keeps its identity while the board around it changes.
 */

import { BOARD_SIZE } from "../core/constants.js";
import { STRINGS } from "./strings.js";

/**
 * The word a cell reads.
 *
 * An occupied cell reads its value and an empty one reads "empty", so that the shape of the
 * board is perceivable rather than a hole in the grid. (FR-052)
 *
 * @param {number} value The value of the cell, or 0 for an empty one.
 * @returns {string}
 */
export function cellText(value) {
  return value === 0 ? STRINGS.emptyCell : String(value);
}

/**
 * The row of a board index.
 * @param {number} index
 * @returns {number}
 */
function rowOf(index) {
  return Math.floor(index / BOARD_SIZE);
}

/**
 * The column of a board index.
 * @param {number} index
 * @returns {number}
 */
function columnOf(index) {
  return index % BOARD_SIZE;
}

/**
 * The index of the cell that follows the given one in the direction the tiles travel, or -1 when
 * the line has run out.
 *
 * A leftward slide travels from the left edge of a row to its right, a rightward slide the other
 * way, an upward slide from the top of a column to its bottom, and a downward slide the other
 * way. (FR-011)
 *
 * @param {number} from The index to start from.
 * @param {import("../core/types.js").Direction} direction
 * @returns {number}
 */
function nextInLine(from, direction) {
  const row = rowOf(from);
  const column = columnOf(from);

  if (direction === "left") return column + 1 < BOARD_SIZE ? from + 1 : -1;
  if (direction === "right") return column > 0 ? from - 1 : -1;
  if (direction === "up") return row + 1 < BOARD_SIZE ? from + BOARD_SIZE : -1;
  return row > 0 ? from - BOARD_SIZE : -1;
}

/**
 * The index of the first cell after the given one that holds a tile, in the direction the tiles
 * travel.
 *
 * This is how the renderer finds the tile that a merge absorbed: the core reports the tile that
 * survived the merge, and the absorbed one is the next tile in the line.
 *
 * @param {number[]} board The board as it was before the move.
 * @param {number} from The index to start from.
 * @param {import("../core/types.js").Direction} direction
 * @returns {number} The index, or -1 when there is no tile after the given one.
 */
function nextOccupied(board, from, direction) {
  let index = from;
  for (;;) {
    index = nextInLine(index, direction);
    if (index < 0) return -1;
    if (board[index] !== 0) return index;
  }
}

/**
 * Creates the renderer.
 *
 * @param {object} elements The elements of the page shell.
 * @param {HTMLElement} elements.board The grid the board is drawn in.
 * @param {HTMLElement} elements.score The element that shows the current score.
 * @param {HTMLElement} elements.bestScore The element that shows the best score.
 * @param {HTMLElement} [elements.scoreGain] The element that shows the points just awarded.
 * @returns {{
 *   render: (game: import("../core/types.js").Game) => void,
 *   applyMove: (
 *     result: import("../core/types.js").MoveResult,
 *     direction: import("../core/types.js").Direction
 *   ) => { moving: HTMLElement[], merging: HTMLElement[], absorbed: HTMLElement[], spawned: HTMLElement[] },
 *   showScoreGain: (points: number) => void
 * }}
 */
export function createRenderer({ board, score, bestScore, scoreGain }) {
  const doc = board.ownerDocument;

  // The layer the tiles are drawn in. It sits over the board, so a tile can move between cells
  // without the grid having to move it.
  const layer = doc.createElement("div");
  layer.className = "tile-layer";
  layer.setAttribute("aria-hidden", "true");

  // The grid: four rows of four cells, always, whether the cells hold a tile or not. (FR-052)
  board.replaceChildren();
  const cellTexts = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    const rowElement = doc.createElement("div");
    rowElement.className = "board-row";
    rowElement.setAttribute("role", "row");

    for (let column = 0; column < BOARD_SIZE; column += 1) {
      const cell = doc.createElement("div");
      cell.className = "board-cell";
      cell.setAttribute("role", "gridcell");

      const text = doc.createElement("span");
      text.className = "cell-value visually-hidden";
      text.textContent = STRINGS.emptyCell;
      cell.append(text);
      rowElement.append(cell);
      cellTexts.push(text);
    }
    board.append(rowElement);
  }
  board.after(layer);

  /** The tile element at each board index. */
  let tiles = new Map();
  /** The board as it was last drawn, so that a move can be compared with it. */
  let drawn = new Array(BOARD_SIZE * BOARD_SIZE).fill(0);

  /**
   * Creates a tile.
   * @param {number} value
   * @returns {HTMLElement}
   */
  function createTile(value) {
    const element = doc.createElement("div");
    element.className = "tile";
    element.dataset.value = String(value);
    element.classList.add(`tile--${value}`);
    element.textContent = String(value);
    return element;
  }

  /**
   * Sets the value a tile shows.
   * @param {HTMLElement} element
   * @param {number} value
   */
  function setTileValue(element, value) {
    if (element.textContent === String(value)) return;
    element.textContent = String(value);
    element.dataset.value = String(value);
    for (const cls of Array.from(element.classList)) {
      if (cls.startsWith("tile--")) element.classList.remove(cls);
    }
    element.classList.add(`tile--${value}`);
  }

  /**
   * Puts a tile in the cell it belongs to.
   *
   * The position is a pair of custom properties rather than a computed offset, so that the
   * stylesheet owns the geometry and the transition follows it.
   *
   * @param {HTMLElement} element
   * @param {number} index
   */
  function placeTile(element, index) {
    element.style.setProperty("--col", String(columnOf(index)));
    element.style.setProperty("--row", String(rowOf(index)));
  }

  /**
   * Sets the text of a cell.
   * @param {number} index
   * @param {number} value
   */
  function setCellText(index, value) {
    cellTexts[index].textContent = cellText(value);
  }

  /**
   * Draws the game from scratch, without animating anything.
   *
   * @param {import("../core/types.js").Game} game
   */
  function render(game) {
    // The tiles move without a transition while the board is redrawn: a new game or an undo is
    // a change of state, not a slide.
    layer.classList.add("tile-layer--instant");

    score.textContent = String(game.score);
    bestScore.textContent = String(game.bestScore);

    for (const [index, element] of tiles) {
      if (game.board[index] !== 0) continue;
      element.remove();
      tiles.delete(index);
    }

    game.board.forEach((value, index) => {
      setCellText(index, value);
      if (value === 0) return;

      const element = tiles.get(index);
      if (element) {
        setTileValue(element, value);
        placeTile(element, index);
        return;
      }

      const fresh = createTile(value);
      placeTile(fresh, index);
      layer.append(fresh);
      tiles.set(index, fresh);
    });

    drawn = game.board.slice();

    // The browser has to see the class before it is taken off again, or the tiles would slide
    // from where they were rather than appear where they are.
    void layer.offsetHeight;
    layer.classList.remove("tile-layer--instant");
  }

  /**
   * Draws a move, animating the tiles that slid, merged, and appeared.
   *
   * The core reports the tile that survived each merge, but not the one that was absorbed by it,
   * so the absorbed tile is found here: it is the next tile in the line the merge happened in.
   *
   * @param {import("../core/types.js").MoveResult} result
   * @param {import("../core/types.js").Direction} direction
   * @returns {{
   *   moving: HTMLElement[],
   *   merging: HTMLElement[],
   *   absorbed: HTMLElement[],
   *   spawned: HTMLElement[]
   * }}
   */
  function applyMove(result, direction) {
    const previous = drawn;

    // The tiles a merge absorbed, and the cell each of them slides into.
    const absorbedSources = new Map();
    for (const transition of result.transitions) {
      if (transition.value <= previous[transition.from]) continue;
      const partner = nextOccupied(previous, transition.from, direction);
      if (partner >= 0) absorbedSources.set(partner, transition.to);
    }

    // The absorbed tiles are taken off the map first, because the cell a merge lands in may
    // also be the cell a tile started from.
    const absorbedTiles = [];
    for (const [source, destination] of absorbedSources) {
      const element = tiles.get(source);
      if (!element) continue;
      tiles.delete(source);
      absorbedTiles.push({ element, destination });
    }

    const moving = [];
    const merging = [];

    // The tiles that ended up on the board are read from the board as it was and written to a
    // new one. Moving them in the map as they go would lose a tile whose cell is filled by
    // another tile before its own move has been read: a slide to the right can put a tile in a
    // cell that another tile is about to leave.
    const nextTiles = new Map();

    for (const transition of result.transitions) {
      let element = tiles.get(transition.from);
      if (!element) {
        element = createTile(transition.value);
        placeTile(element, transition.to);
        layer.append(element);
      }

      nextTiles.set(transition.to, element);

      const merged = transition.value > previous[transition.from];
      setTileValue(element, transition.value);
      placeTile(element, transition.to);
      moving.push(element);
      if (merged) merging.push(element);
    }

    // The absorbed tiles slide into the tile that absorbed them and fade out.
    const absorbed = [];
    for (const { element, destination } of absorbedTiles) {
      placeTile(element, destination);
      absorbed.push(element);
    }

    // The tile that appeared after the move.
    const spawned = [];
    if (result.spawned) {
      const element = createTile(result.spawned.value);
      placeTile(element, result.spawned.index);
      layer.append(element);
      nextTiles.set(result.spawned.index, element);
      spawned.push(element);
    }

    for (let index = 0; index < cellTexts.length; index += 1) {
      setCellText(index, result.board[index]);
    }

    score.textContent = String(result.score);
    bestScore.textContent = String(result.bestScore);

    drawn = result.board.slice();
    tiles = nextTiles;

    return { moving, merging, absorbed, spawned };
  }

  /**
   * Shows the points a move awarded.
   *
   * The indicator is hidden from assistive technology, because the live region already
   * announces the change. (FR-018)
   *
   * @param {number} points
   */
  function showScoreGain(points) {
    if (!scoreGain || points <= 0) return;
    scoreGain.textContent = `+${points}`;
    scoreGain.classList.remove("score-gain--visible");
    void scoreGain.offsetWidth;
    scoreGain.classList.add("score-gain--visible");
  }

  return { render, applyMove, showScoreGain };
}
