/**
 * Core Layer: ProgressionService
 * Handles damage formula, XP gain, leveling, and shard rewards.
 */
export class ProgressionService {
  #diminishingFactor;
  #xpPerDamageDivisor;
  #leveling;
  #bossDefeatXp;
  #shardRewards;

  constructor({
    diminishingFactor,
    xpPerDamageDivisor,
    leveling,
    bossDefeatXp,
    shardRewards,
  }) {
    if (!Number.isFinite(diminishingFactor) || diminishingFactor <= 0 || diminishingFactor > 1) {
      throw new Error("ProgressionService requires diminishingFactor in (0, 1].");
    }
    if (!Number.isFinite(xpPerDamageDivisor) || xpPerDamageDivisor <= 0) {
      throw new Error("ProgressionService requires xpPerDamageDivisor > 0.");
    }
    if (!leveling || typeof leveling !== "object") {
      throw new Error("ProgressionService requires leveling config.");
    }
    if (!bossDefeatXp || typeof bossDefeatXp !== "object") {
      throw new Error("ProgressionService requires bossDefeatXp config.");
    }
    if (!shardRewards || typeof shardRewards !== "object") {
      throw new Error("ProgressionService requires shardRewards config.");
    }

    this.#diminishingFactor = diminishingFactor;
    this.#xpPerDamageDivisor = xpPerDamageDivisor;
    this.#leveling = { ...leveling };
    this.#bossDefeatXp = { ...bossDefeatXp };
    this.#shardRewards = { ...shardRewards };
  }

  calculateFinalDamage({
    baseDamage,
    permanentRaw,
    streakRaw,
    upgradeRaw,
    runBuffRaw,
  }) {
    if (!Number.isFinite(baseDamage) || baseDamage <= 0) return 0;

    const perm = this.#effectiveMultiplier(permanentRaw);
    const streak = this.#effectiveMultiplier(streakRaw);
    const upgrade = this.#effectiveMultiplier(upgradeRaw);
    const runBuff = this.#effectiveMultiplier(runBuffRaw);

    return Math.max(0, Math.floor(baseDamage * perm * streak * upgrade * runBuff));
  }

  calculateXpFromDamage(damage, xpRawBonus = 0) {
    if (!Number.isFinite(damage) || damage <= 0) return 0;
    const baseXp = Math.floor(damage / this.#xpPerDamageDivisor);
    const multiplier = Math.max(1, 1 + (Number.isFinite(xpRawBonus) ? xpRawBonus : 0));
    return Math.max(0, Math.floor(baseXp * multiplier));
  }

  calculateBossDefeatXp(tierLevel, xpRawBonus = 0) {
    const tier = Number.isFinite(tierLevel) && tierLevel > 0 ? Math.floor(tierLevel) : 1;
    const base = Number.isFinite(this.#bossDefeatXp.base) ? this.#bossDefeatXp.base : 0;
    const tierBonus = Number.isFinite(this.#bossDefeatXp.tierBonus) ? this.#bossDefeatXp.tierBonus : 0;
    const raw = base + tierBonus * (tier - 1);
    const multiplier = Math.max(1, 1 + (Number.isFinite(xpRawBonus) ? xpRawBonus : 0));
    return Math.max(0, Math.floor(raw * multiplier));
  }

  calculateShardReward(tierLevel) {
    const tier = Number.isFinite(tierLevel) && tierLevel > 0 ? Math.floor(tierLevel) : 1;
    const base = Number.isFinite(this.#shardRewards.base) ? this.#shardRewards.base : 1;
    const stepEvery = Number.isFinite(this.#shardRewards.stepEveryTier) && this.#shardRewards.stepEveryTier > 0
      ? Math.floor(this.#shardRewards.stepEveryTier)
      : 1;
    const stepReward = Number.isFinite(this.#shardRewards.stepReward) ? this.#shardRewards.stepReward : 0;

    return Math.max(1, Math.floor(base + Math.floor((tier - 1) / stepEvery) * stepReward));
  }

  getStartingLevel() {
    return this.#leveling.startingLevel;
  }

  getStartingXp() {
    return this.#leveling.startingXp;
  }

  getXpToNextLevel(level) {
    const lvl = Number.isFinite(level) && level > 0 ? Math.floor(level) : 1;
    const base = this.#leveling.baseXpToLevelUp;
    const growthFactor = this.#leveling.growthFactor;
    return Math.max(1, Math.floor(base * growthFactor ** (lvl - 1)));
  }

  grantXp(player, amount) {
    const events = [];
    if (!player) throw new Error("ProgressionService.grantXp requires player.");

    const xp = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
    if (xp <= 0) return { levelsGained: 0, events };

    player.gainXp(xp);
    events.push({ type: "XP_GAINED", amount: xp });

    let levelsGained = 0;
    while (player.xp >= this.getXpToNextLevel(player.level)) {
      const threshold = this.getXpToNextLevel(player.level);
      player.xp -= threshold;
      player.levelUp();
      levelsGained += 1;

      const add = Number.isFinite(this.#leveling.permanentDamageAddPerLevel)
        ? this.#leveling.permanentDamageAddPerLevel
        : 0;
      player.addPermanentDamageMultiplier(add);
    }

    if (levelsGained > 0) {
      events.push({
        type: "LEVEL_UP",
        newLevel: player.level,
        levelsGained,
      });
    }

    return { levelsGained, events };
  }

  #effectiveMultiplier(rawMultiplier) {
    const raw = Number.isFinite(rawMultiplier) ? rawMultiplier : 0;
    return Math.max(0, 1 + raw * this.#diminishingFactor);
  }
}
