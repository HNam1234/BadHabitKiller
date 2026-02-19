/**
 * Presentation Layer: RedemptionView
 * Renders redemption consistency progress.
 */
export class RedemptionView {
  #textEl;
  #fillEl;
  #totalEl;

  constructor({ textEl, fillEl, totalEl }) {
    if (!textEl || !fillEl || !totalEl) {
      throw new Error("RedemptionView missing required elements.");
    }
    this.#textEl = textEl;
    this.#fillEl = fillEl;
    this.#totalEl = totalEl;
  }

  render(vm) {
    const current = Number.isFinite(vm?.consistencyDays) ? vm.consistencyDays : 0;
    const required = Number.isFinite(vm?.requiredDays) ? vm.requiredDays : 7;
    const progress = Number.isFinite(vm?.progressPercent) ? vm.progressPercent : 0;
    const total = Number.isFinite(vm?.totalRedemptions) ? vm.totalRedemptions : 0;

    this.#textEl.textContent = `${current}/${required}`;
    this.#fillEl.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    this.#totalEl.textContent = String(total);
  }
}

