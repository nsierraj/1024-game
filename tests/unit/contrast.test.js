import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The contrast ratios of the shipped themes (FR-045, FR-049, SC-016), computed from the colour
 * tokens in the stylesheets with the WCAG 2.x formula, so a palette edit that breaks a ratio fails
 * the build rather than the release gate.
 */

const TEXT_MIN = 4.5;
const NON_TEXT_MIN = 3;
const HIGH_CONTRAST_TEXT_MIN = 7;
const HIGH_CONTRAST_NON_TEXT_MIN = 4.5;

const TILE_VALUES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, "high"];

/**
 * @param {string} relativePath
 * @returns {string}
 */
function read(relativePath) {
  return readFileSync(join(process.cwd(), relativePath), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * The colour tokens declared in the first rule that matches the selector.
 * @param {string} css
 * @param {string} selector
 * @returns {Record<string, string>}
 */
function tokens(css, selector) {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start >= 0, `no rule for ${selector}`);
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(([, name, value]) => [name, value]));
}

/**
 * @param {string} hex
 * @returns {number} the relative luminance
 */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number} the contrast ratio, from 1 to 21
 */
function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const base = tokens(read("src/styles/base.css"), ":root");
const themesCss = read("src/styles/themes.css");

/** Each shipped theme: the base palette with the theme's own tokens on top. */
const THEMES = {
  light: { ...base, ...tokens(themesCss, ':root[data-theme="light"]') },
  dark: { ...base, ...tokens(themesCss, ':root[data-theme="dark"]') },
  contrast: { ...base, ...tokens(themesCss, ':root[data-theme="contrast"]') },
  colorblind: { ...base, ...tokens(themesCss, ':root[data-theme="colorblind"]') },
  "system (dark)": { ...base, ...tokens(themesCss, ":root:not([data-theme])") },
};

/**
 * The pairs of text colours that must reach the text minimum.
 * @param {Record<string, string>} theme
 * @returns {Array<[string, string, string]>} label, foreground, background
 */
function textPairs(theme) {
  return [
    ["text on page", theme["--text"], theme["--bg"]],
    ["strong text on page", theme["--text-strong"], theme["--bg"]],
    ["text on surface", theme["--text"], theme["--surface"]],
    ["accent on page", theme["--accent"], theme["--bg"]],
    ...TILE_VALUES.map((value) => [`tile ${value}`, theme[`--tile-${value}-fg`], theme[`--tile-${value}-bg`]]),
  ];
}

/**
 * The pairs of interface colours that must reach the non-text minimum.
 * @param {Record<string, string>} theme
 * @returns {Array<[string, string, string]>}
 */
function nonTextPairs(theme) {
  return [
    ["border on page", theme["--border"], theme["--bg"]],
    ["focus ring on page", theme["--focus-ring"], theme["--bg"]],
    ["focus ring on surface", theme["--focus-ring"], theme["--surface"]],
  ];
}

/**
 * The pairs that fall short of the minimum, so a failure lists every one rather than the first.
 * @param {Array<[string, string, string]>} pairs
 * @param {number} minimum
 * @returns {string[]}
 */
function shortfalls(pairs, minimum) {
  return pairs
    .map(([label, foreground, background]) => [label, foreground && background ? contrast(foreground, background) : 0])
    .filter(([, ratio]) => ratio < minimum)
    .map(([label, ratio]) => `${label} is ${ratio.toFixed(2)}:1`);
}

describe("theme contrast (FR-049)", () => {
  for (const [name, theme] of Object.entries(THEMES)) {
    it(`${name}: text and tile values reach ${TEXT_MIN}:1`, () => {
      assert.deepEqual(shortfalls(textPairs(theme), TEXT_MIN), []);
    });

    it(`${name}: interface colours reach ${NON_TEXT_MIN}:1`, () => {
      assert.deepEqual(shortfalls(nonTextPairs(theme), NON_TEXT_MIN), []);
    });
  }
});

describe("high-contrast theme (FR-045)", () => {
  it(`reaches ${HIGH_CONTRAST_TEXT_MIN}:1 for text and tile values`, () => {
    assert.deepEqual(shortfalls(textPairs(THEMES.contrast), HIGH_CONTRAST_TEXT_MIN), []);
  });

  it(`reaches ${HIGH_CONTRAST_NON_TEXT_MIN}:1 for interface colours`, () => {
    assert.deepEqual(shortfalls(nonTextPairs(THEMES.contrast), HIGH_CONTRAST_NON_TEXT_MIN), []);
  });
});
