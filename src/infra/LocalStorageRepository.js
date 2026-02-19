/**
 * Infrastructure Layer: LocalStorageRepository
 * Persists the game state in browser localStorage.
 */
import { GameRepository } from "./GameRepository.js";

export class LocalStorageRepository extends GameRepository {
  #storageKey;
  #memoryRaw = null;

  constructor(storageKey = "debtBoss.gameState.v1") {
    super();
    this.#storageKey = storageKey;
  }

  async load() {
    const storage = LocalStorageRepository.#tryGetLocalStorage();
    let raw = null;

    if (storage) {
      try {
        raw = storage.getItem(this.#storageKey);
      } catch (err) {
        // localStorage can throw (e.g., blocked/disabled). Fall back to in-memory.
        console.warn("Debt Boss: localStorage read failed; using in-memory state only.", err);
      }
    }

    if (!raw) raw = this.#memoryRaw;
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (err) {
      // Corrupt storage should not brick the app.
      console.warn("Debt Boss: stored game state was invalid JSON; ignoring.", err);
      return null;
    }
  }

  async save(state) {
    const raw = JSON.stringify(state);
    this.#memoryRaw = raw;

    const storage = LocalStorageRepository.#tryGetLocalStorage();
    if (!storage) return;

    try {
      storage.setItem(this.#storageKey, raw);
    } catch (err) {
      // localStorage can throw (quota / blocked). Keep in-memory so the session still works.
      console.warn("Debt Boss: localStorage write failed; progress won't persist after reload.", err);
    }
  }

  static #tryGetLocalStorage() {
    try {
      return globalThis.localStorage || null;
    } catch {
      return null;
    }
  }
}
