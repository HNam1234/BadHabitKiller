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

  render(runVm) {
    const failed = runVm && runVm.status === "FAILED";
    this.#rootEl.classList.toggle("is-active", failed);
    this.#reasonEl.textContent = failed ? (runVm.failedReason || "Run Failed") : "";
  }
}
