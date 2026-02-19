/**
 * Presentation Layer: RunStatusView
 * Renders run diagnostics in ritual panel.
 */
export class RunStatusView {
  #statusEl;
  #tierEl;
  #phaseEl;
  #rageEl;
  #corruptionEl;
  #resistanceEl;
  #comboEl;
  #failEl;

  constructor({ statusEl, tierEl, phaseEl, rageEl, corruptionEl, resistanceEl, comboEl, failEl }) {
    if (!statusEl || !tierEl || !phaseEl || !rageEl || !corruptionEl || !resistanceEl || !comboEl || !failEl) {
      throw new Error("RunStatusView missing required elements.");
    }
    this.#statusEl = statusEl;
    this.#tierEl = tierEl;
    this.#phaseEl = phaseEl;
    this.#rageEl = rageEl;
    this.#corruptionEl = corruptionEl;
    this.#resistanceEl = resistanceEl;
    this.#comboEl = comboEl;
    this.#failEl = failEl;
  }

  render(state) {
    const run = state.run;
    const boss = state.boss;
    const statusText = state.ui && state.ui.statusPanel ? state.ui.statusPanel : {};
    const bossText = state.ui && state.ui.boss ? state.ui.boss : {};

    this.#statusEl.textContent = run.status === "FAILED"
      ? statusText.failed || "FAILED"
      : statusText.active || "ACTIVE";
    this.#tierEl.textContent = `${run.bossTierLevel}`;
    this.#phaseEl.textContent = `${bossText.phase || "Phase"} ${boss.phase}`;
    this.#rageEl.textContent = `${Math.round(run.ragePercent)}%`;
    this.#corruptionEl.textContent = `${Math.round(run.corruptionPercent)}%`;
    this.#resistanceEl.textContent = `${Math.round((boss.resistanceRate || 0) * 100)}%`;
    this.#comboEl.textContent = `${run.comboCount}`;
    this.#failEl.textContent = run.status === "FAILED"
      ? (run.failedReason || statusText.failed || "Run Failed")
      : statusText.noFailure || "No failure";
  }
}
