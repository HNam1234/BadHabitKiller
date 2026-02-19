/**
 * Presentation Layer: DamageAnimator
 * Creates floating damage numbers near the boss. Pure UI effect.
 */
export class DamageAnimator {
  #stageEl;
  #formatter;

  constructor(stageEl, formatter = new Intl.NumberFormat("en-US")) {
    if (!stageEl) throw new Error("DamageAnimator requires a stage element.");
    this.#stageEl = stageEl;
    this.#formatter = formatter;
  }

  spawn(amount, options = {}) {
    if (!Number.isFinite(amount) || amount <= 0) return;

    const el = document.createElement("div");
    el.className = "damage-float";
    if (options && options.isCrit) el.classList.add("is-crit");
    el.textContent = `-${this.#formatter.format(amount)}`;

    const rect = this.#stageEl.getBoundingClientRect();
    const xJitter = Math.random() * 40 - 20;
    const yJitter = Math.random() * 24 - 12;

    el.style.left = `${rect.width / 2 + xJitter}px`;
    el.style.top = `${rect.height * 0.55 + yJitter}px`;

    this.#stageEl.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }
}
