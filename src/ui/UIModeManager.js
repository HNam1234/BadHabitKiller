/**
 * Presentation Layer: UIModeManager
 * Keeps UI-only mode state. Never mutates game state.
 */
export class UIModeManager {
  static MODES = Object.freeze({
    COMBAT: "COMBAT",
    RITUAL: "RITUAL",
    LEDGER: "LEDGER",
    SETTINGS: "SETTINGS",
  });

  #mode = UIModeManager.MODES.COMBAT;
  #listeners = new Set();

  getMode() {
    return this.#mode;
  }

  setMode(mode) {
    const next = UIModeManager.#normalize(mode);
    if (next === this.#mode) return;
    this.#mode = next;
    for (const listener of this.#listeners) listener(this.#mode);
  }

  subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  static #normalize(mode) {
    const values = Object.values(UIModeManager.MODES);
    if (values.includes(mode)) return mode;
    return UIModeManager.MODES.COMBAT;
  }
}

