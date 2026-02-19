/**
 * Presentation Layer: XpBarView
 * - Renders XP bar fill from a player view-model
 */
export class XpBarView {
  #fillEl;

  constructor(fillEl) {
    if (!fillEl) throw new Error("XpBarView requires a fill element.");
    this.#fillEl = fillEl;
  }

  render(playerVm) {
    const percent = Number.isFinite(playerVm.xpPercent) ? playerVm.xpPercent : 0;
    const clamped = Math.max(0, Math.min(100, percent));
    this.#fillEl.style.width = `${clamped}%`;
  }

  playGainGlow() {
    this.#fillEl.classList.remove("is-xp-glow");
    void this.#fillEl.offsetWidth;
    this.#fillEl.classList.add("is-xp-glow");

    const remove = () => this.#fillEl.classList.remove("is-xp-glow");
    this.#fillEl.addEventListener("animationend", remove, { once: true });
    window.setTimeout(remove, 500);
  }
}

