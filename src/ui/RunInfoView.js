/**
 * Presentation Layer: RunInfoView
 * Renders run indicator and shard currency in header.
 */
export class RunInfoView {
  #runEl;
  #shardsEl;
  #streakEl;

  constructor({ runEl, shardsEl, streakEl }) {
    if (!runEl || !shardsEl) throw new Error("RunInfoView requires run and shard elements.");
    this.#runEl = runEl;
    this.#shardsEl = shardsEl;
    this.#streakEl = streakEl || null;
  }

  render(state) {
    const runIndicator = state && state.ui && typeof state.ui.runIndicator === "string" ? state.ui.runIndicator : "Run";
    const shards = state && state.currency && Number.isFinite(state.currency.shards) ? state.currency.shards : 0;
    const streak = state && state.streak && Number.isFinite(state.streak.dailyStreak) ? state.streak.dailyStreak : 0;

    this.#runEl.textContent = runIndicator;
    this.#shardsEl.textContent = String(shards);
    if (this.#streakEl) this.#streakEl.textContent = String(streak);
  }
}
