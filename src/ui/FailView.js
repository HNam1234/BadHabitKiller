/**
 * Presentation Layer: FailView
 * Displays hardcore fail state overlay.
 */
export class FailView {
  #rootEl;
  #reasonEl;

  constructor({ rootEl, reasonEl }) {
    if (!rootEl || !reasonEl) throw new Error("FailView missing required elements.");
    this.#rootEl = rootEl;
    this.#reasonEl = reasonEl;
  }

  render(runVm, statusText = {}) {
    const failed = runVm && runVm.status === "FAILED";
    this.#rootEl.classList.toggle("is-active", failed);
    this.#reasonEl.textContent = failed ? FailView.#resolveReason(runVm.failedReason, statusText) : "";
  }

  static #resolveReason(reasonCode, statusText) {
    if (reasonCode === "RAGE_OVERFLOW") {
      return statusText.rageOverflow || "Rage reached 100%";
    }
    if (typeof reasonCode === "string" && reasonCode.length > 0) return reasonCode;
    return statusText.failed || "Run Failed";
  }
}
