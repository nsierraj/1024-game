/**
 * Theme management.
 */

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "system" || !theme) {
    root.removeAttribute("data-theme");
    return;
  }
  root.setAttribute("data-theme", theme);
}

export function initTheme(theme, onChange) {
  applyTheme(theme);
  if (typeof window !== "undefined" && window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (!document.documentElement.hasAttribute("data-theme")) {
        if (typeof onChange === "function") onChange("system");
      }
    };
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", handler);
    } else if (typeof mq.addListener === "function") {
      mq.addListener(handler);
    }
  }
}
