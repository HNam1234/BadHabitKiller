/**
 * Core Layer: HardcoreCombatService
 * Encapsulates rage/corruption/phase/fail rules.
 */
export class HardcoreCombatService {
  #config;

  constructor(config) {
    if (!config || typeof config !== "object") throw new Error("HardcoreCombatService requires config.");
    this.#config = JSON.parse(JSON.stringify(config));
  }

  getBaseCrit() {
    return {
      chance: this.#config.crit.baseChance,
      multiplier: this.#config.crit.baseMultiplier,
    };
  }

  getDefaultComboBreakHours() {
    return this.#config.combo.breakGapHours;
  }

  getEffectiveComboBreakHours(profile) {
    const cap = profile && Number.isFinite(profile.comboBreakHoursCap) ? profile.comboBreakHoursCap : null;
    if (!Number.isFinite(cap) || cap <= 0) return this.getDefaultComboBreakHours();
    return Math.min(this.getDefaultComboBreakHours(), cap);
  }

  hasRepeatedActionPenalty(repeatedCount) {
    const count = Number.isFinite(repeatedCount) ? repeatedCount : 0;
    return count > this.#config.rage.repeatThreshold;
  }

  calculateRageGain({ phase, comboBroken, repeatedPenalty, rageGainMultiplierAdd }) {
    let base = 0;
    if (comboBroken) base += this.#config.rage.comboBreakBaseGain;
    if (repeatedPenalty) base += this.#config.rage.repeatBaseGain;
    if (base <= 0) return 0;

    const phaseMultiplier =
      phase >= 3
        ? this.#config.rage.phase3GainMultiplier
        : phase === 2
          ? this.#config.rage.phase2GainMultiplier
          : 1;
    const boonMultiplier = 1 + (Number.isFinite(rageGainMultiplierAdd) ? rageGainMultiplierAdd : 0);

    return Math.max(0, Math.floor(base * phaseMultiplier * boonMultiplier));
  }

  getPhaseByHpPercent(hpPercent) {
    const hp = Number.isFinite(hpPercent) ? hpPercent : 100;
    if (hp <= this.#config.phase.phase3HpThresholdPercent) return 3;
    if (hp <= this.#config.phase.phase2HpThresholdPercent) return 2;
    return 1;
  }

  getPhase3NoCritDamagePenalty() {
    return this.#config.phase.phase3NoCritDamagePenalty;
  }

  getCorruptionResistance(corruptionPercent) {
    const corruption = Number.isFinite(corruptionPercent) ? Math.max(0, corruptionPercent) : 0;
    return Math.min(this.#config.corruption.maxResistance, corruption * this.#config.corruption.resistancePerPoint);
  }

  clampRage(ragePercent) {
    const rage = Number.isFinite(ragePercent) ? ragePercent : 0;
    return Math.max(0, Math.min(999, rage));
  }

  clampCorruption(corruptionPercent) {
    const corruption = Number.isFinite(corruptionPercent) ? corruptionPercent : 0;
    return Math.max(0, Math.min(100, corruption));
  }

  isRunFailedByRage(ragePercent) {
    const rage = Number.isFinite(ragePercent) ? ragePercent : 0;
    return rage >= this.#config.rage.failThreshold;
  }
}
