/**
 * Core Layer: StreakService
 * - Increments streak once per day when at least one action is logged
 * - Resets streak on missed days unless a grace charge is consumed
 */
export class StreakService {
  #dailyStreak = 0;
  #lastActionDate = null;

  constructor(initialState = null) {
    if (initialState) this.setState(initialState);
  }

  /**
   * @param {Date} date
   * @param {{ graceCharges?: number }} options
   */
  recordAction(date = new Date(), options = {}) {
    const today = StreakService.#toDateStamp(date);
    const graceCharges =
      options && Number.isFinite(options.graceCharges) && options.graceCharges > 0
        ? Math.floor(options.graceCharges)
        : 0;

    if (!this.#lastActionDate) {
      this.#dailyStreak = 1;
      this.#lastActionDate = today;
      return { state: this.getState(), usedGrace: false, streakReset: false, incremented: true };
    }

    const daysDiff = StreakService.#daysBetween(this.#lastActionDate, today);
    if (daysDiff <= 0) {
      // Same day action should not increment again.
      return { state: this.getState(), usedGrace: false, streakReset: false, incremented: false };
    }

    let usedGrace = false;
    let streakReset = false;

    if (daysDiff === 1) {
      this.#dailyStreak += 1;
    } else {
      const missedDays = daysDiff - 1;
      const canUseGrace = missedDays === 1 && graceCharges > 0;

      if (canUseGrace) {
        usedGrace = true;
        this.#dailyStreak += 1;
      } else {
        this.#dailyStreak = 1;
        streakReset = true;
      }
    }

    this.#lastActionDate = today;
    return { state: this.getState(), usedGrace, streakReset, incremented: true };
  }

  getState() {
    return {
      dailyStreak: this.#dailyStreak,
      lastActionDate: this.#lastActionDate,
    };
  }

  setState(state) {
    const streak = state && Number.isFinite(state.dailyStreak) && state.dailyStreak >= 0 ? state.dailyStreak : 0;
    const lastActionDate =
      state && typeof state.lastActionDate === "string" && state.lastActionDate.length > 0
        ? state.lastActionDate
        : null;

    this.#dailyStreak = Math.floor(streak);
    this.#lastActionDate = lastActionDate;
  }

  static toDateStamp(date = new Date()) {
    return StreakService.#toDateStamp(date);
  }

  static #toDateStamp(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  static #daysBetween(fromDateStamp, toDateStamp) {
    const from = StreakService.#parseDateStamp(fromDateStamp);
    const to = StreakService.#parseDateStamp(toDateStamp);
    const diffMs = to.getTime() - from.getTime();
    return Math.floor(diffMs / 86400000);
  }

  static #parseDateStamp(dateStamp) {
    const [year, month, day] = dateStamp.split("-").map((v) => Number(v));
    return new Date(year, month - 1, day);
  }
}
