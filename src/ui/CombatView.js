/**
 * Presentation Layer: CombatView
 * Renders combat-screen-only helper UI.
 */
export class CombatView {
  #boonSummaryEl;
  #actionHintEl;

  constructor({ boonSummaryEl, actionHintEl }) {
    if (!boonSummaryEl || !actionHintEl) {
      throw new Error("CombatView missing required elements.");
    }
    this.#boonSummaryEl = boonSummaryEl;
    this.#actionHintEl = actionHintEl;
  }

  render(state, boonsText = {}, miscText = {}) {
    const boons = Array.isArray(state?.run?.activeBoons) ? state.run.activeBoons : [];
    const first = boons[0];

    if (boons.length === 0) {
      this.#boonSummaryEl.textContent = boonsText.emptyHint || "No active boons.";
    } else if (boons.length === 1) {
      this.#boonSummaryEl.textContent = first && first.name ? first.name : "1 active boon";
    } else {
      const firstName = first && first.name ? first.name : "Boon";
      this.#boonSummaryEl.textContent = `${firstName} +${boons.length - 1}`;
    }

    const lockedReason = typeof state?.ui?.actionLockedReason === "string" ? state.ui.actionLockedReason : "";
    this.#actionHintEl.textContent = lockedReason || miscText.ready || "Ready";
  }
}

