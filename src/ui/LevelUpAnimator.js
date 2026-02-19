/**
 * Presentation Layer: LevelUpAnimator
 * Plays a big "LEVEL UP" overlay animation.
 */
export class LevelUpAnimator {
  #overlayEl;
  #subEl;

  constructor(overlayEl, subEl) {
    if (!overlayEl || !subEl) throw new Error("LevelUpAnimator requires overlay and sub elements.");
    this.#overlayEl = overlayEl;
    this.#subEl = subEl;
  }

  play({ newLevel, levelsGained }) {
    const lvl = Number.isFinite(newLevel) ? newLevel : null;
    const gained = Number.isFinite(levelsGained) ? levelsGained : 1;

    this.#subEl.textContent = lvl ? `Level ${lvl} (+${gained})` : `Level Up (+${gained})`;

    this.#overlayEl.classList.remove("is-active");
    void this.#overlayEl.offsetWidth;
    this.#overlayEl.classList.add("is-active");

    const cleanup = () => this.#overlayEl.classList.remove("is-active");
    this.#overlayEl.addEventListener("animationend", cleanup, { once: true });
    window.setTimeout(cleanup, 1000);
  }
}

