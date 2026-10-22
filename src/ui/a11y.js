/**
 * Accessibility announcements.
 */

let lastScore = null;

export function createAnnouncer() {
  const el = typeof document !== "undefined" ? document.getElementById("announcer") : null;

  function announce(message) {
    if (!el) return;
    el.textContent = "";
    setTimeout(() => {
      el.textContent = String(message);
    }, 10);
  }

  return {
    announce,
    announceMove(gained, score) {
      if (gained > 0) {
        announce(`Merged. Score ${score}.`);
      } else {
        if (lastScore !== score) {
          announce(`Score ${score}.`);
        }
      }
      lastScore = score;
    },
    announceWin() {
      announce("You reached 1024!");
    },
    announceGameOver(score) {
      announce(`Game over. Score ${score}.`);
    },
    reset() {
      lastScore = null;
    },
  };
}
