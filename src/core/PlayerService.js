/**
 * Core Layer: PlayerService
 * - XP gain and level-up thresholds
 * - Applies level-up bonuses (config-driven)
 *
 * No DOM, no persistence.
 */
export class PlayerService {
  #xpRules;
  #levelingRules;

  constructor(xpRules, levelingRules) {
    if (!xpRules || typeof xpRules !== "object") throw new Error("PlayerService requires xpRules.");
    if (!levelingRules || typeof levelingRules !== "object") throw new Error("PlayerService requires levelingRules.");

    this.#xpRules = xpRules;
    this.#levelingRules = levelingRules;
  }

  calculateXpFromDamage(damage) {
    if (!Number.isFinite(damage) || damage <= 0) return 0;
    return Math.floor(damage / this.#xpRules.damageDivisor);
  }

  getXpToNextLevel(level) {
    const lvl = Number.isFinite(level) && level > 0 ? level : 1;
    const base = this.#levelingRules.baseXpToLevelUp;
    const growth = this.#levelingRules.growthFactor;
    return Math.floor(base * growth ** (lvl - 1));
  }

  grantXp(player, xpAmount) {
    if (!player) throw new Error("PlayerService.grantXp requires a player.");

    const events = [];
    const xpToGrant = Number.isFinite(xpAmount) && xpAmount > 0 ? Math.floor(xpAmount) : 0;
    if (xpToGrant <= 0) return { levelsGained: 0, events };

    player.gainXp(xpToGrant);
    events.push({ type: "XP_GAINED", amount: xpToGrant });

    let levelsGained = 0;
    // Support multiple level-ups from one XP grant.
    while (player.xp >= this.getXpToNextLevel(player.level)) {
      const threshold = this.getXpToNextLevel(player.level);
      player.xp -= threshold;
      player.levelUp();
      levelsGained += 1;

      const dmgAdd = this.#levelingRules.levelUpBonuses.permanentDamageMultiplierAdd;
      const hpRedAdd = this.#levelingRules.levelUpBonuses.permanentHpReductionBonusAdd;

      player.permanentDamageMultiplier += dmgAdd;
      player.permanentHpReductionBonus += hpRedAdd;

      player.permanentDamageMultiplier = Math.min(
        this.#levelingRules.caps.permanentDamageMultiplierMax,
        Math.max(0, player.permanentDamageMultiplier),
      );
      player.permanentHpReductionBonus = Math.min(
        this.#levelingRules.caps.permanentHpReductionBonusMax,
        Math.max(0, player.permanentHpReductionBonus),
      );
    }

    if (levelsGained > 0) {
      events.push({ type: "LEVEL_UP", newLevel: player.level, levelsGained });
    }

    return { levelsGained, events };
  }
}

