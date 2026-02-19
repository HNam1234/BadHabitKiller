/**
 * Core Layer: IntegrityService
 * Softly maps discipline behavior into combat-facing modifiers.
 */
export class IntegrityService {
  #config;

  constructor(config) {
    if (!config || typeof config !== "object") {
      throw new Error("IntegrityService requires config.");
    }
    this.#config = { ...config };
  }

  createValue(storedValue) {
    const fallback = Number.isFinite(this.#config.base) ? this.#config.base : 70;
    const value = Number.isFinite(storedValue) ? storedValue : fallback;
    return this.#clamp(value);
  }

  applyImpulsePenalty(currentValue, impulseAmount) {
    const per100 = Number.isFinite(this.#config.impulsePenaltyPer100) ? this.#config.impulsePenaltyPer100 : 1;
    const amount = Number.isFinite(impulseAmount) ? Math.max(0, impulseAmount) : 0;
    const delta = (amount / 100) * per100;
    return this.#clamp(currentValue - delta);
  }

  applyDebtPaymentReward(currentValue, paymentAmount) {
    const per100 = Number.isFinite(this.#config.debtPaymentRewardPer100) ? this.#config.debtPaymentRewardPer100 : 1;
    const amount = Number.isFinite(paymentAmount) ? Math.max(0, paymentAmount) : 0;
    const delta = (amount / 100) * per100;
    return this.#clamp(currentValue + delta);
  }

  applyComboBreakPenalty(currentValue, count = 1) {
    const penalty = Number.isFinite(this.#config.comboBreakPenalty) ? this.#config.comboBreakPenalty : 2;
    const safeCount = Number.isFinite(count) ? Math.max(0, count) : 0;
    return this.#clamp(currentValue - penalty * safeCount);
  }

  applyDeepWorkReward(currentValue) {
    const reward = Number.isFinite(this.#config.deepWorkReward) ? this.#config.deepWorkReward : 1;
    return this.#clamp(currentValue + reward);
  }

  applyNoActionPenalty(currentValue, consecutiveNoActionDays) {
    const threshold = Number.isFinite(this.#config.idleDaysThreshold) ? this.#config.idleDaysThreshold : 3;
    const penalty = Number.isFinite(this.#config.idleDaysPenalty) ? this.#config.idleDaysPenalty : 6;
    const days = Number.isFinite(consecutiveNoActionDays) ? Math.max(0, Math.floor(consecutiveNoActionDays)) : 0;
    if (days < threshold) return this.#clamp(currentValue);
    return this.#clamp(currentValue - penalty);
  }

  applyNoImpulseReward(currentValue, noImpulseDays) {
    const threshold = Number.isFinite(this.#config.noImpulseRewardDays) ? this.#config.noImpulseRewardDays : 3;
    const reward = Number.isFinite(this.#config.noImpulseDaysReward) ? this.#config.noImpulseDaysReward : 3;
    const days = Number.isFinite(noImpulseDays) ? Math.max(0, Math.floor(noImpulseDays)) : 0;
    if (days < threshold) return this.#clamp(currentValue);
    return this.#clamp(currentValue + reward);
  }

  applyRedemptionReward(currentValue, integrityGain) {
    const gain = Number.isFinite(integrityGain) ? integrityGain : 0;
    return this.#clamp(currentValue + gain);
  }

  getCombatProfile(integrityValue) {
    const value = this.#clamp(integrityValue);
    const min = this.#min();
    const max = this.#max();
    const t = max > min ? (value - min) / (max - min) : 0.5;

    const damageAtZero = Number.isFinite(this.#config.damageMultiplierAtZero)
      ? this.#config.damageMultiplierAtZero
      : 0.85;
    const damageAtFull = Number.isFinite(this.#config.damageMultiplierAtFull)
      ? this.#config.damageMultiplierAtFull
      : 1.15;
    const damageMultiplier = damageAtZero + (damageAtFull - damageAtZero) * t;

    const critBonusAtFull = Number.isFinite(this.#config.critBonusAtFull) ? this.#config.critBonusAtFull : 0.1;
    const resistanceReductionAtFull = Number.isFinite(this.#config.resistanceReductionAtFull)
      ? this.#config.resistanceReductionAtFull
      : 0.08;

    return {
      value,
      damageRawAdd: damageMultiplier - 1,
      critChanceAdd: Math.max(0, t * critBonusAtFull),
      resistanceReduction: Math.max(0, t * resistanceReductionAtFull),
    };
  }

  toViewModel(integrityValue) {
    const value = Math.round(this.#clamp(integrityValue));
    let tier = "Stable";
    if (value >= 85) tier = "Ascendant";
    else if (value >= 65) tier = "Steady";
    else if (value >= 40) tier = "Shaken";
    else tier = "Fractured";
    return {
      value,
      percent: value,
      tier,
    };
  }

  #clamp(value) {
    const min = this.#min();
    const max = this.#max();
    const numeric = Number.isFinite(value) ? value : min;
    return Math.max(min, Math.min(max, numeric));
  }

  #min() {
    return Number.isFinite(this.#config.min) ? this.#config.min : 0;
  }

  #max() {
    return Number.isFinite(this.#config.max) ? this.#config.max : 100;
  }
}

