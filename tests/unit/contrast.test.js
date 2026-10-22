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
    ["button text on accent", theme["--accent-fg"], theme["--accent"]],
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

describe("the token sources (FR-020, FR-023)", () => {
  const COLOUR_TOKEN = /^--(?:bg|surface|board-bg|text|text-strong|accent|accent-fg|border|focus-ring|tile-[\w-]+-(?:bg|fg))$/;

  /** Every custom property a rule block declares, with its raw value. */
  function declarations(css) {
    return [...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]);
  }

  it("declares every colour token as a six-digit hex value, so this test can check it", () => {
    for (const path of ["src/styles/base.css", "src/styles/themes.css"]) {
      for (const [name, value] of declarations(read(path))) {
        if (COLOUR_TOKEN.test(name)) assert.match(value, /^#[0-9a-fA-F]{6}$/, `${path}: ${name} is ${value}`);
      }
    }
  });

  it("declares no colour token in board.css, where it would override the palette without being checked", () => {
    const declared = declarations(read("src/styles/board.css")).filter(([name]) => COLOUR_TOKEN.test(name));
    assert.deepEqual(declared.map(([name]) => name), []);
  });

  it("gives the dark theme and the system dark default the same tokens", () => {
    assert.deepEqual(tokens(themesCss, ':root[data-theme="dark"]'), tokens(themesCss, ":root:not([data-theme])"));
  });

  it("keeps the light theme's own block in step with the default palette in base.css", () => {
    const light = tokens(themesCss, ':root[data-theme="light"]');
    for (const [name, value] of Object.entries(light)) assert.equal(value, base[name], `${name} differs from base.css`);
  });

  it("defines a token block for every theme name a player can have saved (FR-023)", () => {
    for (const theme of ["light", "dark", "contrast", "colorblind"]) {
      assert.ok(themesCss.includes(`:root[data-theme="${theme}"] {`), `no block for ${theme}`);
    }
    // "system" has no attribute: it is the default, which follows the device.
    assert.ok(themesCss.includes(":root:not([data-theme]) {"), "no block for the system default");
  });

  it("gives each theme a complete set of tile tokens", () => {
    for (const [name, theme] of Object.entries(THEMES)) {
      for (const value of TILE_VALUES) {
        assert.ok(theme[`--tile-${value}-bg`] && theme[`--tile-${value}-fg`], `${name}: tile ${value} is missing a colour`);
      }
    }
  });
});

describe("the tile ladder moves from cool to warm (FR-020)", () => {
  const LADDER = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

  /** The hue of a hex colour, in degrees from 0 to 360. */
  function hue(hex) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === min) return 0;
    const d = max - min;
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  }

  /** The distance between two colours in CIELAB (CIE76). */
  function distance(a, b) {
    const lab = (hex) => {
      const [r, g, bl] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * bl;
      const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * bl;
      const z = 0.0193339 * r + 0.119192 * g + 0.9503041 * bl;
      const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
      return [116 * f(y) - 16, 500 * (f(x / 0.95047) - f(y)), 200 * (f(y) - f(z / 1.08883))];
    };
    const [p, q] = [lab(a), lab(b)];
    return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  }

  for (const name of ["light", "dark"]) {
    it(`${name}: starts cool, ends warm, and never turns back`, () => {
      const hues = LADDER.map((value) => hue(THEMES[name][`--tile-${value}-bg`]));
      // Cool blue to teal at the low values, warm orange to rose at the high ones.
      assert.ok(hues[0] >= 180 && hues[0] <= 250, `tile 2 hue ${hues[0].toFixed(0)}`);
      assert.ok(hues[1] >= 180 && hues[1] <= 250, `tile 4 hue ${hues[1].toFixed(0)}`);
      assert.ok(hues[LADDER.length - 1] >= 330 || hues[LADDER.length - 1] <= 30, `tile 1024 hue ${hues[LADDER.length - 1].toFixed(0)}`);
      // Walking up the ladder the hue only falls: blue, teal, green, yellow, orange, red, rose.
      const unwrapped = hues.map((h) => (h > 300 ? h - 360 : h));
      for (let i = 1; i < unwrapped.length; i += 1) {
        assert.ok(unwrapped[i] <= unwrapped[i - 1] + 1, `hue rises from tile ${LADDER[i - 1]} to ${LADDER[i]}`);
      }
    });

    it(`${name}: no neighbouring step jumps more than 60 degrees of hue`, () => {
      const hues = LADDER.map((value) => hue(THEMES[name][`--tile-${value}-bg`]));
      for (let i = 1; i < hues.length; i += 1) {
        const step = Math.min(Math.abs(hues[i] - hues[i - 1]), 360 - Math.abs(hues[i] - hues[i - 1]));
        assert.ok(step <= 60, `${LADDER[i - 1]} to ${LADDER[i]} jumps ${step.toFixed(0)} degrees`);
      }
    });

    it(`${name}: the tile above 1024 is clearly different from the 1024 tile`, () => {
      const d = distance(THEMES[name]["--tile-1024-bg"], THEMES[name]["--tile-high-bg"]);
      assert.ok(d >= 15, `only ${d.toFixed(1)} apart`);
    });
  }
});

