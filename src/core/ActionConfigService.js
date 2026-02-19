/**
 * Core Layer: ActionConfigService
 * Owns config loading and validation so core services never read raw JSON directly.
 */
export class ActionConfigService {
  #configUrl;
  #fetchFn;
  #loadPromise = null;
  #config = null;

  constructor(configUrl, fetchFn = fetch) {
    if (typeof configUrl !== "string" || configUrl.trim().length === 0) {
      throw new Error("ActionConfigService requires a config URL.");
    }
    if (typeof fetchFn !== "function") {
      throw new Error("ActionConfigService requires a fetch function.");
    }

    this.#configUrl = configUrl;
    this.#fetchFn = fetchFn.bind(globalThis);
  }

  async load() {
    if (this.#config) return;
    if (this.#loadPromise) return this.#loadPromise;

    this.#loadPromise = this.#loadInternal().catch((err) => {
      this.#loadPromise = null;
      throw err;
    });

    return this.#loadPromise;
  }

  getBossConfig() {
    this.#ensureLoaded();
    return Object.freeze({ name: this.#config.boss.name });
  }

  getBossTiers() {
    this.#ensureLoaded();
    return this.#config.boss.tiers.map((tier) => ({ ...tier }));
  }

  getBossFallbackScalingFactor() {
    this.#ensureLoaded();
    return this.#config.boss.fallbackScalingFactor;
  }

  getActionTypes() {
    this.#ensureLoaded();
    return Object.keys(this.#config.actions);
  }

  getDamageForAction(actionType) {
    this.#ensureLoaded();
    if (!(actionType in this.#config.actions)) throw new Error(`Unknown action type: ${actionType}`);
    return this.#config.actions[actionType];
  }

  getDamageRules() {
    this.#ensureLoaded();
    return { ...this.#config.damage };
  }

  getProgressionConfig() {
    this.#ensureLoaded();
    return {
      xpPerDamageDivisor: this.#config.progression.xpPerDamageDivisor,
      leveling: { ...this.#config.progression.leveling },
      bossDefeatXp: { ...this.#config.progression.bossDefeatXp },
      shardRewards: { ...this.#config.progression.shardRewards },
    };
  }

  getHardcoreConfig() {
    this.#ensureLoaded();
    return JSON.parse(JSON.stringify(this.#config.hardcore));
  }

  getSigilConfig() {
    this.#ensureLoaded();
    return {
      milestones: this.#config.sigil.milestones.slice(),
      fullRevealAtTier: this.#config.sigil.fullRevealAtTier,
    };
  }

  getUpgradePaths() {
    this.#ensureLoaded();
    return this.#config.upgrades.paths.map((path) => ({
      ...path,
      nodes: path.nodes.map((node) => ({
        ...node,
        display: node.display ? { ...node.display } : null,
        effects: node.effects.map((effect) => ({ ...effect })),
      })),
    }));
  }

  getBoonConfig() {
    this.#ensureLoaded();
    return {
      offerMin: this.#config.boons.offerMin,
      offerMax: this.#config.boons.offerMax,
      templates: this.#config.boons.templates.map((template) => ({
        ...template,
        benefits: template.benefits.map((effect) => ({ ...effect })),
        drawbacks: template.drawbacks.map((effect) => ({ ...effect })),
      })),
    };
  }

  getDebtConfig() {
    this.#ensureLoaded();
    return { ...this.#config.debt };
  }

  getCampaignConfig() {
    this.#ensureLoaded();
    return this.#config.campaigns.map((campaign) => ({
      ...campaign,
      combatModifier: campaign.combatModifier && typeof campaign.combatModifier === "object"
        ? { ...campaign.combatModifier }
        : {},
    }));
  }

  getDeckConfig() {
    this.#ensureLoaded();
    return {
      maxPoolSize: this.#config.deck.maxPoolSize,
      activeSlots: this.#config.deck.activeSlots,
      synergy: { ...this.#config.deck.synergy },
      cards: this.#config.deck.cards.map((card) => ({
        ...card,
        tags: Array.isArray(card.tags) ? card.tags.slice() : [],
        effect: card.effect && typeof card.effect === "object" ? { ...card.effect } : {},
        tradeoff: card.tradeoff && typeof card.tradeoff === "object" ? { ...card.tradeoff } : null,
      })),
    };
  }

  getIntegrityConfig() {
    this.#ensureLoaded();
    return { ...this.#config.integrity };
  }

  getImpulseConfig() {
    this.#ensureLoaded();
    return { ...this.#config.impulse };
  }

  getRedemptionConfig() {
    this.#ensureLoaded();
    return { ...this.#config.redemption };
  }

  getCosmeticConfig() {
    this.#ensureLoaded();
    return {
      rarityWeights: { ...this.#config.cosmetics.rarityWeights },
      pool: this.#config.cosmetics.pool.map((item) => ({ ...item })),
    };
  }

  // Backward-compatible alias to avoid breaking old composition roots.
  getBuffConfig() {
    return this.getBoonConfig();
  }

  #ensureLoaded() {
    if (!this.#config) throw new Error("Config not loaded. Call ActionConfigService.load() first.");
  }

  async #loadInternal() {
    const response = await this.#fetchFn(this.#configUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load config.json (HTTP ${response.status}).`);

    const json = await response.json();
    this.#validate(json);
    this.#config = json;
  }

  #validate(json) {
    if (!json || typeof json !== "object") throw new Error("Config must be a JSON object.");

    this.#validateBoss(json);
    this.#validateActions(json);
    this.#validateDamage(json);
    this.#validateProgression(json);
    this.#validateHardcore(json);
    this.#validateSigil(json);
    this.#validateUpgrades(json);
    this.#validateBoons(json);
    this.#validateDebt(json);
    this.#validateCampaigns(json);
    this.#validateDeck(json);
    this.#validateIntegrity(json);
    this.#validateImpulse(json);
    this.#validateRedemption(json);
    this.#validateCosmetics(json);
  }

  #validateBoss(json) {
    if (!json.boss || typeof json.boss !== "object") throw new Error("Config.boss is required.");
    if (typeof json.boss.name !== "string" || json.boss.name.trim().length === 0) {
      throw new Error("Config.boss.name must be a non-empty string.");
    }
    if (!Array.isArray(json.boss.tiers) || json.boss.tiers.length === 0) {
      throw new Error("Config.boss.tiers must be a non-empty array.");
    }
    for (const tier of json.boss.tiers) {
      if (!Number.isFinite(tier.tierLevel) || tier.tierLevel <= 0) throw new Error("Boss tierLevel must be > 0.");
      if (!Number.isFinite(tier.totalHp) || tier.totalHp <= 0) throw new Error("Boss totalHp must be > 0.");
    }
    if (!Number.isFinite(json.boss.fallbackScalingFactor) || json.boss.fallbackScalingFactor <= 1) {
      throw new Error("Config.boss.fallbackScalingFactor must be > 1.");
    }
  }

  #validateActions(json) {
    if (!json.actions || typeof json.actions !== "object") throw new Error("Config.actions is required.");
    const entries = Object.entries(json.actions);
    if (entries.length === 0) throw new Error("Config.actions must not be empty.");
    for (const [actionType, value] of entries) {
      if (typeof actionType !== "string" || actionType.trim().length === 0) {
        throw new Error("Action type must be non-empty.");
      }
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`Config.actions.${actionType} must be > 0.`);
      }
    }
  }

  #validateDamage(json) {
    if (!json.damage || typeof json.damage !== "object") throw new Error("Config.damage is required.");
    if (!Number.isFinite(json.damage.diminishingFactor) || json.damage.diminishingFactor <= 0 || json.damage.diminishingFactor > 1) {
      throw new Error("Config.damage.diminishingFactor must be in (0, 1].");
    }
  }

  #validateProgression(json) {
    if (!json.progression || typeof json.progression !== "object") throw new Error("Config.progression is required.");
    if (!Number.isFinite(json.progression.xpPerDamageDivisor) || json.progression.xpPerDamageDivisor <= 0) {
      throw new Error("Config.progression.xpPerDamageDivisor must be > 0.");
    }

    const leveling = json.progression.leveling;
    if (!leveling || typeof leveling !== "object") throw new Error("Config.progression.leveling is required.");
    if (!Number.isFinite(leveling.startingLevel) || leveling.startingLevel <= 0) {
      throw new Error("Config.progression.leveling.startingLevel must be > 0.");
    }
    if (!Number.isFinite(leveling.startingXp) || leveling.startingXp < 0) {
      throw new Error("Config.progression.leveling.startingXp must be >= 0.");
    }
    if (!Number.isFinite(leveling.baseXpToLevelUp) || leveling.baseXpToLevelUp <= 0) {
      throw new Error("Config.progression.leveling.baseXpToLevelUp must be > 0.");
    }
    if (!Number.isFinite(leveling.growthFactor) || leveling.growthFactor <= 1) {
      throw new Error("Config.progression.leveling.growthFactor must be > 1.");
    }
    if (!Number.isFinite(leveling.permanentDamageAddPerLevel) || leveling.permanentDamageAddPerLevel < 0) {
      throw new Error("Config.progression.leveling.permanentDamageAddPerLevel must be >= 0.");
    }

    const bossDefeatXp = json.progression.bossDefeatXp;
    if (!bossDefeatXp || typeof bossDefeatXp !== "object") throw new Error("Config.progression.bossDefeatXp is required.");
    if (!Number.isFinite(bossDefeatXp.base) || bossDefeatXp.base < 0) {
      throw new Error("Config.progression.bossDefeatXp.base must be >= 0.");
    }
    if (!Number.isFinite(bossDefeatXp.tierBonus) || bossDefeatXp.tierBonus < 0) {
      throw new Error("Config.progression.bossDefeatXp.tierBonus must be >= 0.");
    }

    const shardRewards = json.progression.shardRewards;
    if (!shardRewards || typeof shardRewards !== "object") throw new Error("Config.progression.shardRewards is required.");
    if (!Number.isFinite(shardRewards.base) || shardRewards.base <= 0) {
      throw new Error("Config.progression.shardRewards.base must be > 0.");
    }
    if (!Number.isFinite(shardRewards.stepEveryTier) || shardRewards.stepEveryTier <= 0) {
      throw new Error("Config.progression.shardRewards.stepEveryTier must be > 0.");
    }
    if (!Number.isFinite(shardRewards.stepReward) || shardRewards.stepReward < 0) {
      throw new Error("Config.progression.shardRewards.stepReward must be >= 0.");
    }
  }

  #validateHardcore(json) {
    if (!json.hardcore || typeof json.hardcore !== "object") throw new Error("Config.hardcore is required.");

    const crit = json.hardcore.crit;
    const combo = json.hardcore.combo;
    const rage = json.hardcore.rage;
    const corruption = json.hardcore.corruption;
    const phase = json.hardcore.phase;

    if (!crit || typeof crit !== "object") throw new Error("Config.hardcore.crit is required.");
    if (!Number.isFinite(crit.baseChance) || crit.baseChance < 0 || crit.baseChance > 1) {
      throw new Error("Config.hardcore.crit.baseChance must be in [0,1].");
    }
    if (!Number.isFinite(crit.baseMultiplier) || crit.baseMultiplier < 1) {
      throw new Error("Config.hardcore.crit.baseMultiplier must be >= 1.");
    }

    if (!combo || typeof combo !== "object") throw new Error("Config.hardcore.combo is required.");
    if (!Number.isFinite(combo.breakGapHours) || combo.breakGapHours <= 0) {
      throw new Error("Config.hardcore.combo.breakGapHours must be > 0.");
    }

    if (!rage || typeof rage !== "object") throw new Error("Config.hardcore.rage is required.");
    if (!Number.isFinite(rage.comboBreakBaseGain) || rage.comboBreakBaseGain < 0) throw new Error("Invalid rage.comboBreakBaseGain.");
    if (!Number.isFinite(rage.repeatBaseGain) || rage.repeatBaseGain < 0) throw new Error("Invalid rage.repeatBaseGain.");
    if (!Number.isFinite(rage.repeatThreshold) || rage.repeatThreshold < 0) throw new Error("Invalid rage.repeatThreshold.");
    if (!Number.isFinite(rage.phase2GainMultiplier) || rage.phase2GainMultiplier < 1) throw new Error("Invalid rage.phase2GainMultiplier.");
    if (!Number.isFinite(rage.phase3GainMultiplier) || rage.phase3GainMultiplier < 1) throw new Error("Invalid rage.phase3GainMultiplier.");
    if (!Number.isFinite(rage.failThreshold) || rage.failThreshold <= 0) throw new Error("Invalid rage.failThreshold.");

    if (!corruption || typeof corruption !== "object") throw new Error("Config.hardcore.corruption is required.");
    if (!Number.isFinite(corruption.resistancePerPoint) || corruption.resistancePerPoint < 0) {
      throw new Error("Invalid corruption.resistancePerPoint.");
    }
    if (!Number.isFinite(corruption.maxResistance) || corruption.maxResistance < 0 || corruption.maxResistance >= 1) {
      throw new Error("Invalid corruption.maxResistance.");
    }

    if (!phase || typeof phase !== "object") throw new Error("Config.hardcore.phase is required.");
    if (!Number.isFinite(phase.phase2HpThresholdPercent) || phase.phase2HpThresholdPercent <= 0 || phase.phase2HpThresholdPercent >= 100) {
      throw new Error("Invalid phase2HpThresholdPercent.");
    }
    if (!Number.isFinite(phase.phase3HpThresholdPercent) || phase.phase3HpThresholdPercent <= 0 || phase.phase3HpThresholdPercent >= 100) {
      throw new Error("Invalid phase3HpThresholdPercent.");
    }
    if (!Number.isFinite(phase.phase3NoCritDamagePenalty) || phase.phase3NoCritDamagePenalty < 0 || phase.phase3NoCritDamagePenalty >= 1) {
      throw new Error("Invalid phase3NoCritDamagePenalty.");
    }
  }

  #validateSigil(json) {
    if (!json.sigil || typeof json.sigil !== "object") throw new Error("Config.sigil is required.");
    if (!Array.isArray(json.sigil.milestones) || json.sigil.milestones.length < 3) {
      throw new Error("Config.sigil.milestones must include at least 3 entries.");
    }
    for (const milestone of json.sigil.milestones) {
      if (!Number.isFinite(milestone) || milestone <= 0) throw new Error("Invalid sigil milestone.");
    }
    if (!Number.isFinite(json.sigil.fullRevealAtTier) || json.sigil.fullRevealAtTier <= 0) {
      throw new Error("Config.sigil.fullRevealAtTier must be > 0.");
    }
  }

  #validateUpgrades(json) {
    if (!json.upgrades || typeof json.upgrades !== "object") throw new Error("Config.upgrades is required.");
    if (!Array.isArray(json.upgrades.paths) || json.upgrades.paths.length === 0) {
      throw new Error("Config.upgrades.paths must be non-empty.");
    }

    for (const path of json.upgrades.paths) {
      if (!path || typeof path !== "object") throw new Error("Upgrade path must be object.");
      if (typeof path.pathId !== "string" || path.pathId.trim().length === 0) throw new Error("Upgrade pathId must be non-empty.");
      if (typeof path.label !== "string" || path.label.trim().length === 0) throw new Error("Upgrade label must be non-empty.");
      if (!Array.isArray(path.nodes) || path.nodes.length === 0) throw new Error("Upgrade path must include nodes.");

      for (const node of path.nodes) {
        if (typeof node.id !== "string" || node.id.trim().length === 0) throw new Error("Upgrade node id must be non-empty.");
        if (typeof node.name !== "string" || node.name.trim().length === 0) throw new Error("Upgrade node name must be non-empty.");
        if (typeof node.description !== "string" || node.description.trim().length === 0) throw new Error("Upgrade node description must be non-empty.");
        if (!Number.isFinite(node.cost) || node.cost <= 0) throw new Error(`Invalid cost for ${node.id}.`);
        if (!Number.isFinite(node.maxRank) || node.maxRank <= 0) throw new Error(`Invalid maxRank for ${node.id}.`);
        if (!Array.isArray(node.prerequisiteIds)) throw new Error(`prerequisiteIds must be array for ${node.id}.`);
        if (!Array.isArray(node.effects) || node.effects.length === 0) throw new Error(`effects must be non-empty for ${node.id}.`);
        if (node.display) {
          if (!Number.isFinite(node.display.x) || !Number.isFinite(node.display.y)) {
            throw new Error(`display coordinates must be numeric for ${node.id}.`);
          }
        }
      }
    }
  }

  #validateBoons(json) {
    if (!json.boons || typeof json.boons !== "object") throw new Error("Config.boons is required.");
    if (!Number.isFinite(json.boons.offerMin) || json.boons.offerMin <= 0) throw new Error("Config.boons.offerMin must be > 0.");
    if (!Number.isFinite(json.boons.offerMax) || json.boons.offerMax < json.boons.offerMin) {
      throw new Error("Config.boons.offerMax must be >= offerMin.");
    }
    if (!Array.isArray(json.boons.templates) || json.boons.templates.length < json.boons.offerMin) {
      throw new Error("Config.boons.templates must contain at least offerMin entries.");
    }

    for (const template of json.boons.templates) {
      if (!template || typeof template !== "object") throw new Error("Boon template must be an object.");
      if (typeof template.templateId !== "string" || template.templateId.trim().length === 0) {
        throw new Error("Boon templateId must be non-empty.");
      }
      if (typeof template.name !== "string" || template.name.trim().length === 0) {
        throw new Error("Boon name must be non-empty.");
      }
      if (typeof template.epithet !== "string" || template.epithet.trim().length === 0) {
        throw new Error("Boon epithet must be non-empty.");
      }
      if (!Number.isFinite(template.corruptionDelta) || template.corruptionDelta < 0) {
        throw new Error("Boon corruptionDelta must be >= 0.");
      }
      if (!Array.isArray(template.benefits) || template.benefits.length === 0) {
        throw new Error("Boon benefits must be non-empty.");
      }
      if (!Array.isArray(template.drawbacks) || template.drawbacks.length === 0) {
        throw new Error("Boon drawbacks must be non-empty.");
      }
    }
  }

  #validateDebt(json) {
    if (!json.debt || typeof json.debt !== "object") throw new Error("Config.debt is required.");
    if (!Number.isFinite(json.debt.totalDebt) || json.debt.totalDebt <= 0) {
      throw new Error("Config.debt.totalDebt must be > 0.");
    }
    if (json.debt.startingDebt !== undefined && (!Number.isFinite(json.debt.startingDebt) || json.debt.startingDebt < 0)) {
      throw new Error("Config.debt.startingDebt must be >= 0.");
    }
  }

  #validateCampaigns(json) {
    if (!Array.isArray(json.campaigns) || json.campaigns.length < 4) {
      throw new Error("Config.campaigns must include standard campaigns and final campaign.");
    }

    for (const campaign of json.campaigns) {
      if (!campaign || typeof campaign !== "object") throw new Error("Campaign entry must be object.");
      if (typeof campaign.id !== "string" || campaign.id.trim().length === 0) throw new Error("Campaign id required.");
      if (typeof campaign.label !== "string" || campaign.label.trim().length === 0) throw new Error("Campaign label required.");
      if (typeof campaign.bossType !== "string" || campaign.bossType.trim().length === 0) throw new Error("Campaign bossType required.");
      if (typeof campaign.bossName !== "string" || campaign.bossName.trim().length === 0) throw new Error("Campaign bossName required.");

      if (!Boolean(campaign.isFinal)) {
        if (!Number.isFinite(campaign.minDebtRatio) || campaign.minDebtRatio < 0 || campaign.minDebtRatio > 1) {
          throw new Error(`Invalid minDebtRatio for ${campaign.id}.`);
        }
        if (!Number.isFinite(campaign.maxDebtRatio) || campaign.maxDebtRatio < 0 || campaign.maxDebtRatio > 1) {
          throw new Error(`Invalid maxDebtRatio for ${campaign.id}.`);
        }
      }
    }
  }

  #validateDeck(json) {
    if (!json.deck || typeof json.deck !== "object") throw new Error("Config.deck is required.");
    if (!Number.isFinite(json.deck.maxPoolSize) || json.deck.maxPoolSize <= 0) {
      throw new Error("Config.deck.maxPoolSize must be > 0.");
    }
    if (!Number.isFinite(json.deck.activeSlots) || json.deck.activeSlots <= 0) {
      throw new Error("Config.deck.activeSlots must be > 0.");
    }
    if (!json.deck.synergy || typeof json.deck.synergy !== "object") throw new Error("Config.deck.synergy is required.");
    if (!Array.isArray(json.deck.cards) || json.deck.cards.length === 0) throw new Error("Config.deck.cards must be non-empty.");

    for (const card of json.deck.cards) {
      if (!card || typeof card !== "object") throw new Error("Deck card must be object.");
      if (typeof card.id !== "string" || card.id.trim().length === 0) throw new Error("Deck card id required.");
      if (typeof card.name !== "string" || card.name.trim().length === 0) throw new Error("Deck card name required.");
      if (card.type !== "Permanent" && card.type !== "Run") throw new Error(`Deck card type invalid for ${card.id}.`);
      if (!Array.isArray(card.tags)) throw new Error(`Deck card tags must be array for ${card.id}.`);
      if (!card.effect || typeof card.effect !== "object") throw new Error(`Deck card effect must be object for ${card.id}.`);
    }
  }

  #validateIntegrity(json) {
    if (!json.integrity || typeof json.integrity !== "object") throw new Error("Config.integrity is required.");
    if (!Number.isFinite(json.integrity.base)) throw new Error("Config.integrity.base is required.");
    if (!Number.isFinite(json.integrity.min)) throw new Error("Config.integrity.min is required.");
    if (!Number.isFinite(json.integrity.max)) throw new Error("Config.integrity.max is required.");
  }

  #validateImpulse(json) {
    if (!json.impulse || typeof json.impulse !== "object") throw new Error("Config.impulse is required.");
    if (!Number.isFinite(json.impulse.hpMultiplier) || json.impulse.hpMultiplier <= 0) {
      throw new Error("Config.impulse.hpMultiplier must be > 0.");
    }
  }

  #validateRedemption(json) {
    if (!json.redemption || typeof json.redemption !== "object") throw new Error("Config.redemption is required.");
    if (!Number.isFinite(json.redemption.requiredConsistencyDays) || json.redemption.requiredConsistencyDays <= 0) {
      throw new Error("Config.redemption.requiredConsistencyDays must be > 0.");
    }
  }

  #validateCosmetics(json) {
    if (!json.cosmetics || typeof json.cosmetics !== "object") throw new Error("Config.cosmetics is required.");
    if (!json.cosmetics.rarityWeights || typeof json.cosmetics.rarityWeights !== "object") {
      throw new Error("Config.cosmetics.rarityWeights is required.");
    }
    if (!Array.isArray(json.cosmetics.pool) || json.cosmetics.pool.length === 0) {
      throw new Error("Config.cosmetics.pool must be non-empty.");
    }
  }
}
