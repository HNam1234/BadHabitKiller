/**
 * Core Layer: MetaProgressionService
 * - Handles boss defeat: tier up, new boss spawn, run modifier reset
 *
 * No DOM, no persistence.
 */
import { Boss } from "../domain/Boss.js";
import { BossTier } from "../domain/BossTier.js";

export class MetaProgressionService {
  #bossName;
  #tiers;
  #fallbackScalingFactor;

  constructor({ bossName, tiers, fallbackScalingFactor }) {
    if (typeof bossName !== "string" || bossName.trim().length === 0) throw new Error("MetaProgressionService requires bossName.");
    if (!Array.isArray(tiers) || tiers.length === 0) throw new Error("MetaProgressionService requires non-empty tiers.");
    if (!Number.isFinite(fallbackScalingFactor) || fallbackScalingFactor <= 1) {
      throw new Error("MetaProgressionService requires fallbackScalingFactor > 1.");
    }

    this.#bossName = bossName;
    this.#tiers = tiers.slice().sort((a, b) => a.tierLevel - b.tierLevel);
    this.#fallbackScalingFactor = fallbackScalingFactor;
  }

  /**
   * @param {{ bossTier: BossTier, player: any }} context
   */
  handleBossDefeat({ bossTier, player }) {
    if (!(bossTier instanceof BossTier)) throw new Error("MetaProgressionService.handleBossDefeat requires a BossTier.");
    if (!player) throw new Error("MetaProgressionService.handleBossDefeat requires a player.");

    const nextTierLevel = bossTier.tierLevel + 1;

    const explicit = this.#tiers.find((t) => t.tierLevel === nextTierLevel);
    const nextBaseHp = explicit ? explicit.totalHp : Math.floor(bossTier.totalHp * this.#fallbackScalingFactor);
    const scaling = nextBaseHp / bossTier.totalHp;

    const nextTier = new BossTier(nextTierLevel, nextBaseHp, scaling);

    // Reset temporary run modifiers on boss defeat.
    if (typeof player.resetRunModifiers === "function") player.resetRunModifiers();

    const effectiveHp = MetaProgressionService.#applyPermanentHpReduction(nextTier.totalHp, player.permanentHpReductionBonus);
    const nextBoss = new Boss(this.#bossName, effectiveHp, effectiveHp);

    return {
      newBoss: nextBoss,
      newTier: nextTier,
      events: [
        { type: "BOSS_DEFEATED", tierLevel: bossTier.tierLevel },
        { type: "TIER_UP", newTierLevel: nextTier.tierLevel },
      ],
    };
  }

  static #applyPermanentHpReduction(baseHp, reductionBonus) {
    const bonus = Number.isFinite(reductionBonus) ? reductionBonus : 0;
    const clamped = Math.max(0, Math.min(0.999, bonus));
    return Math.max(1, Math.floor(baseHp * (1 - clamped)));
  }
}

