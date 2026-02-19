/**
 * Presentation Layer: HpBarView
 * - Renders HP bar fill from a boss view-model
 * - Does not calculate damage or modify domain entities
 */
export class HpBarView {
  #fillEl;

  constructor(fillEl) {
    if (!fillEl) throw new Error("HpBarView requires a fill element.");
    this.#fillEl = fillEl;
  }

  render(bossVm) {
    const percent = Number.isFinite(bossVm.hpRemainingPercent) ? bossVm.hpRemainingPercent : 0;
    const clamped = Math.max(0, Math.min(100, percent));
    this.#fillEl.style.width = `${clamped}%`;
  }

  playDamageGlow() {
    this.#fillEl.classList.remove("is-damage-glow");
    // Force reflow so the animation reliably retriggers.
    void this.#fillEl.offsetWidth;
    this.#fillEl.classList.add("is-damage-glow");

    const remove = () => this.#fillEl.classList.remove("is-damage-glow");
    this.#fillEl.addEventListener("animationend", remove, { once: true });
    // Fallback for reduced-motion or interrupted animations.
    window.setTimeout(remove, 500);
  }
}
