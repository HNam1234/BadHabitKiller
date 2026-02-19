/**
 * Core Layer: RedemptionService
 * Tracks consistency windows and emits redemption rewards.
 */
export class RedemptionService {
  #config;

  constructor(config) {
    if (!config || typeof config !== "object") {
      throw new Error("RedemptionService requires config.");
    }
    this.#config = { ...config };
  }

  createTracker(stored) {
    const safe = stored && typeof stored === "object" ? stored : {};
    return {
      consistencyDays: Number.isFinite(safe.consistencyDays) ? Math.max(0, Math.floor(safe.consistencyDays)) : 0,
      totalRedemptions: Number.isFinite(safe.totalRedemptions) ? Math.max(0, Math.floor(safe.totalRedemptions)) : 0,
      lastProcessedDate: typeof safe.lastProcessedDate === "string" ? safe.lastProcessedDate : "",
      noActionDays: Number.isFinite(safe.noActionDays) ? Math.max(0, Math.floor(safe.noActionDays)) : 0,
    };
  }

  progressForDay(tracker, { dateStamp, hadAction }) {
    if (!tracker || typeof tracker !== "object") throw new Error("Redemption tracker is required.");
    if (typeof dateStamp !== "string" || dateStamp.length === 0) {
      return { triggered: false, tracker };
    }

    if (tracker.lastProcessedDate === dateStamp) {
      return { triggered: false, tracker };
    }

    tracker.lastProcessedDate = dateStamp;
    if (hadAction) {
      tracker.consistencyDays += 1;
      tracker.noActionDays = 0;
    } else {
      tracker.consistencyDays = 0;
      tracker.noActionDays += 1;
    }

    const required = this.requiredDays();
    if (tracker.consistencyDays < required) {
      return { triggered: false, tracker };
    }

    tracker.consistencyDays = 0;
    tracker.totalRedemptions += 1;

    return {
      triggered: true,
      tracker,
      effects: {
        corruptionReduction: this.corruptionReduction(),
        impulseHpRecoveryRate: this.impulseHpRecoveryRate(),
        integrityGain: this.integrityGain(),
      },
    };
  }

  toViewModel(tracker) {
    const required = this.requiredDays();
    const current = Number.isFinite(tracker?.consistencyDays) ? tracker.consistencyDays : 0;
    return {
      consistencyDays: current,
      requiredDays: required,
      progressPercent: Math.max(0, Math.min(100, (current / required) * 100)),
      totalRedemptions: Number.isFinite(tracker?.totalRedemptions) ? tracker.totalRedemptions : 0,
      noActionDays: Number.isFinite(tracker?.noActionDays) ? tracker.noActionDays : 0,
    };
  }

  requiredDays() {
    return Number.isFinite(this.#config.requiredConsistencyDays)
      ? Math.max(1, Math.floor(this.#config.requiredConsistencyDays))
      : 7;
  }

  corruptionReduction() {
    return Number.isFinite(this.#config.corruptionReduction) ? this.#config.corruptionReduction : 15;
  }

  impulseHpRecoveryRate() {
    const rate = Number.isFinite(this.#config.impulseHpRecoveryRate) ? this.#config.impulseHpRecoveryRate : 0.5;
    return Math.max(0, Math.min(1, rate));
  }

  integrityGain() {
    return Number.isFinite(this.#config.integrityGain) ? this.#config.integrityGain : 8;
  }
}
