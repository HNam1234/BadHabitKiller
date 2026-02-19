/**
 * Presentation Layer: IntegrityView
 * Renders integrity meter and current integrity tier.
 */
export class IntegrityView {
  #valueEl;
  #tierEl;
  #fillEl;

  constructor({ valueEl, tierEl, fillEl }) {
    if (!valueEl || !tierEl || !fillEl) {
      throw new Error("IntegrityView missing required elements.");
    }
    this.#valueEl = valueEl;
    this.#tierEl = tierEl;
    this.#fillEl = fillEl;
  }

  render(integrityVm) {
    const value = Number.isFinite(integrityVm?.value) ? integrityVm.value : 0;
    const percent = Number.isFinite(integrityVm?.percent) ? integrityVm.percent : value;
    const tier = typeof integrityVm?.tier === "string" ? integrityVm.tier : "Stable";

    this.#valueEl.textContent = `${Math.round(value)}%`;
    this.#tierEl.textContent = tier;
    this.#fillEl.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  }
}

