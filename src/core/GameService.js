/**
 * Core Layer: GameService
 * Central application orchestrator:
 * - daily run lifecycle
 * - hardcore combat loop
 * - campaign/debt progression
 * - integrity/impulse/redemption systems
 * - deck + cosmetics
 */
import { Boss } from "../domain/Boss.js";
import { BossTier } from "../domain/BossTier.js";
import { Currency } from "../domain/Currency.js";
import { Player } from "../domain/Player.js";
import { SigilProgress } from "../domain/SigilProgress.js";
import { StreakService } from "./StreakService.js";

export class GameService {
  #repository;
  #actionConfigService;
  #dailyRunService;
  #upgradeService;
  #boonService;
  #progressionService;
  #hardcoreCombatService;
  #localizationService;
  #streakService;
  #campaignManager;
  #cardService;
  #impulseManager;
  #integrityService;
  #redemptionService;
  #cosmeticService;

  #bossName = "";
  #bossTiers = [];
  #fallbackScalingFactor = 1.5;
  #sigilConfig = { milestones: [3, 5, 8], fullRevealAtTier: 12 };

  #player = null;
  #currency = null;
  #upgradeTree = null;
  #runState = null;
  #sigilProgress = null;
  #bossTier = null;
  #boss = null;

  #campaignState = null;
  #deckState = null;
  #integrityValue = 70;
  #impulseHistory = [];
  #redemptionTracker = null;
  #cosmeticState = null;
  #currentCampaign = null;
  #campaignBossProfile = null;

  #locale = "en";
  #tutorialCompleted = false;
  #supportedLocales = [];

  #isInitialized = false;

  constructor({
    repository,
    actionConfigService,
    dailyRunService,
    upgradeService,
    boonService,
    progressionService,
    hardcoreCombatService,
    localizationService,
    campaignManager,
    cardService,
    impulseManager,
    integrityService,
    redemptionService,
    cosmeticService,
    streakService = new StreakService(),
  }) {
    if (!repository) throw new Error("GameService requires repository.");
    if (!actionConfigService) throw new Error("GameService requires actionConfigService.");
    if (!dailyRunService) throw new Error("GameService requires dailyRunService.");
    if (!upgradeService) throw new Error("GameService requires upgradeService.");
    if (!boonService) throw new Error("GameService requires boonService.");
    if (!progressionService) throw new Error("GameService requires progressionService.");
    if (!hardcoreCombatService) throw new Error("GameService requires hardcoreCombatService.");
    if (!localizationService) throw new Error("GameService requires localizationService.");
    if (!campaignManager) throw new Error("GameService requires campaignManager.");
    if (!cardService) throw new Error("GameService requires cardService.");
    if (!impulseManager) throw new Error("GameService requires impulseManager.");
    if (!integrityService) throw new Error("GameService requires integrityService.");
    if (!redemptionService) throw new Error("GameService requires redemptionService.");
    if (!cosmeticService) throw new Error("GameService requires cosmeticService.");
    if (!streakService) throw new Error("GameService requires streakService.");

    this.#repository = repository;
    this.#actionConfigService = actionConfigService;
    this.#dailyRunService = dailyRunService;
    this.#upgradeService = upgradeService;
    this.#boonService = boonService;
    this.#progressionService = progressionService;
    this.#hardcoreCombatService = hardcoreCombatService;
    this.#localizationService = localizationService;
    this.#campaignManager = campaignManager;
    this.#cardService = cardService;
    this.#impulseManager = impulseManager;
    this.#integrityService = integrityService;
    this.#redemptionService = redemptionService;
    this.#cosmeticService = cosmeticService;
    this.#streakService = streakService;
  }

  async initialize() {
    await this.#actionConfigService.load();
    await this.#localizationService.loadAll();

    const bossConfig = this.#actionConfigService.getBossConfig();
    this.#bossName = bossConfig.name;
    this.#bossTiers = this.#actionConfigService.getBossTiers().sort((a, b) => a.tierLevel - b.tierLevel);
    this.#fallbackScalingFactor = this.#actionConfigService.getBossFallbackScalingFactor();
    this.#sigilConfig = this.#actionConfigService.getSigilConfig();
    this.#supportedLocales = this.#localizationService.getSupportedLocales();

    const stored = await this.#repository.load();
    const migrated = this.#migrateStoredState(stored);
    const todayDateStamp = StreakService.toDateStamp(new Date());

    this.#locale = this.#localizationService.resolveLocale(migrated.settings.locale);
    this.#tutorialCompleted = Boolean(migrated.settings.tutorialCompleted);

    this.#player = Player.fromJSON(migrated.player, {
      level: this.#progressionService.getStartingLevel(),
      xp: this.#progressionService.getStartingXp(),
      permanentDamageMultiplier: 0,
      permanentBossHpReduction: 0,
      streakGraceCharges: 0,
    });
    this.#currency = Currency.fromJSON(migrated.currency);
    this.#upgradeTree = this.#upgradeService.createTree(migrated.upgradeRanks);
    this.#streakService.setState(migrated.streak);
    this.#sigilProgress = SigilProgress.fromJSON(migrated.sigilProgress, {
      maxTierCleared: 0,
      milestones: this.#sigilConfig.milestones,
      fullRevealAtTier: this.#sigilConfig.fullRevealAtTier,
    });

    this.#campaignState = this.#campaignManager.createState(migrated.campaignState);
    this.#deckState = this.#cardService.createState(migrated.deckState);
    this.#integrityValue = this.#integrityService.createValue(migrated.integrity);
    this.#impulseHistory = this.#impulseManager.createHistory(migrated.impulseHistory);
    this.#redemptionTracker = this.#redemptionService.createTracker(migrated.redemptionTracker);
    this.#cosmeticState = this.#cosmeticService.createState(migrated.cosmeticInventory);

    this.#campaignState.impulseHpBurden = Math.max(
      this.#campaignState.impulseHpBurden,
      this.#impulseManager.getOutstandingHpBurden(this.#impulseHistory),
    );

    this.#syncCampaignContext();

    const storedRun = migrated.run;
    if (storedRun && typeof storedRun === "object" && storedRun.dateStamp && storedRun.dateStamp !== todayDateStamp) {
      this.#processClosedDay(storedRun, todayDateStamp);
    }

    const tierOneHp = this.#effectiveHpForTierLevel(1);
    const runInit = this.#dailyRunService.createOrResumeRun(storedRun, todayDateStamp, tierOneHp);
    this.#runState = runInit.run;
    this.#runState.activeBoons = this.#boonService.hydrateBoons(this.#runState.activeBoons);
    this.#runState.boonOffer = this.#boonService.hydrateBoons(this.#runState.boonOffer);

    if (runInit.didReset) {
      this.#cardService.resetForNewDay(this.#deckState);
      this.#runState.activeBoons = [];
      this.#runState.boonOffer = [];
      this.#runState.phase = 1;
      this.#runState.ragePercent = 0;
      this.#runState.corruptionPercent = this.#hardcoreCombatService.clampCorruption(this.#campaignState.corruptionBurden);
      this.#runState.impulseResistanceAdd = 0;
      this.#runState.campaignId = this.#currentCampaign.id;
      this.#runState.hadImpulseToday = false;
      this.#runState.deepWorkActions = 0;
    }

    this.#syncBossFromRun();
    this.#isInitialized = true;

    await this.#persist();
    return this.getCurrentState();
  }

  async setLocale(locale) {
    this.#ensureInitialized();
    const nextLocale = this.#localizationService.resolveLocale(locale);
    if (nextLocale === this.#locale) {
      return { events: [], state: this.getCurrentState() };
    }

    this.#locale = nextLocale;
    await this.#persist();
    return {
      events: [{ type: "LOCALE_CHANGED", locale: this.#locale }],
      state: this.getCurrentState(),
    };
  }

  async markTutorialCompleted() {
    this.#ensureInitialized();
    if (this.#tutorialCompleted) {
      return { events: [], state: this.getCurrentState() };
    }

    this.#tutorialCompleted = true;
    await this.#persist();
    return {
      events: [{ type: "TUTORIAL_COMPLETED" }],
      state: this.getCurrentState(),
    };
  }

  async resetTutorial() {
    this.#ensureInitialized();
    this.#tutorialCompleted = false;
    await this.#persist();
    return {
      events: [{ type: "TUTORIAL_RESET" }],
      state: this.getCurrentState(),
    };
  }

  async applyAction(actionType) {
    this.#ensureInitialized();

    const events = this.#rolloverIfNeeded();
    this.#ensureRunActive();
    this.#ensureNoPendingBoonChoice();

    const now = new Date();
    const nowIso = now.toISOString();
    const baseDamage = this.#actionConfigService.getDamageForAction(actionType);

    const streakUpdate = this.#streakService.recordAction(now, { graceCharges: this.#player.streakGraceCharges });
    if (streakUpdate.usedGrace) {
      this.#player.consumeStreakGraceCharge();
      events.push({ type: "STREAK_GRACE_USED", remainingCharges: this.#player.streakGraceCharges });
    }
    if (streakUpdate.streakReset) {
      events.push({ type: "STREAK_RESET", newStreak: streakUpdate.state.dailyStreak });
    }
    const streakState = streakUpdate.state;

    const boonProfile = this.#boonService.getCombatProfile(this.#runState.activeBoons, actionType);
    const cardProfile = this.#cardService.getCombatProfile(this.#deckState, actionType);
    const integrityProfile = this.#integrityService.getCombatProfile(this.#integrityValue);
    const campaignCombat = this.#campaignBossProfile.combatModifier || {};

    const comboBreakHours = this.#hardcoreCombatService.getEffectiveComboBreakHours(boonProfile);
    const comboBroken = this.#isComboBroken(now, comboBreakHours);
    if (comboBroken) {
      this.#runState.comboCount = 0;
      this.#runState.comboBreaksCount += 1;
      const previousIntegrity = this.#integrityValue;
      this.#integrityValue = this.#integrityService.applyComboBreakPenalty(this.#integrityValue, 1);
      if (this.#integrityValue !== previousIntegrity) {
        events.push({ type: "INTEGRITY_CHANGED", value: this.#integrityValue });
      }
      events.push({ type: "COMBO_BROKEN", breakGapHours: comboBreakHours });
    }

    if (this.#runState.lastActionType === actionType) {
      this.#runState.repeatedActionCount += 1;
    } else {
      this.#runState.repeatedActionCount = 1;
    }

    const repeatedPenalty = this.#hardcoreCombatService.hasRepeatedActionPenalty(this.#runState.repeatedActionCount);
    if (repeatedPenalty) {
      events.push({
        type: "ACTION_REPETITION_PENALTY",
        actionType,
        repeatedCount: this.#runState.repeatedActionCount,
      });
    }

    const campaignRageMultiplier = Number.isFinite(campaignCombat.rageGainMultiplier) ? campaignCombat.rageGainMultiplier : 1;
    const rageGain = this.#hardcoreCombatService.calculateRageGain({
      phase: this.#runState.phase,
      comboBroken,
      repeatedPenalty,
      rageGainMultiplierAdd:
        boonProfile.rageGainMultiplierAdd +
        cardProfile.rageGainMultiplierAdd +
        Math.max(0, campaignRageMultiplier - 1),
    });
    if (rageGain > 0) {
      this.#runState.ragePercent = this.#hardcoreCombatService.clampRage(this.#runState.ragePercent + rageGain);
      events.push({
        type: "RAGE_GAINED",
        amount: rageGain,
        ragePercent: this.#runState.ragePercent,
      });
    }

    if (this.#hardcoreCombatService.isRunFailedByRage(this.#runState.ragePercent)) {
      events.push(...this.#failRun("RAGE_OVERFLOW", boonProfile));
      await this.#persist();
      return {
        actionType,
        damage: 0,
        events,
        state: this.getCurrentState(),
      };
    }

    const isFirstActionOfDay = this.#runState.actionsCount === 0;
    const isComboActive = this.#runState.comboCount >= 1;
    const isFirstHitOfRun = !this.#runState.firstHitConsumed;

    const permanentRaw = this.#player.permanentDamageMultiplier;
    const streakRaw = Math.max(0, streakState.dailyStreak * 0.02);
    const upgradeRaw = this.#upgradeService.getDamageRawBonus(this.#upgradeTree, {
      streak: streakState.dailyStreak,
      isFirstActionOfDay,
      isComboActive,
      isFirstHitOfRun,
      actionType,
    });
    const runBuffRaw =
      boonProfile.damageRawAdd +
      boonProfile.actionTypeDamageRawAdd +
      cardProfile.damageRawAdd +
      cardProfile.actionTypeDamageRawAdd +
      integrityProfile.damageRawAdd +
      (Number.isFinite(campaignCombat.damageRawAdd) ? campaignCombat.damageRawAdd : 0);

    let finalDamage = this.#progressionService.calculateFinalDamage({
      baseDamage,
      permanentRaw,
      streakRaw,
      upgradeRaw,
      runBuffRaw,
    });

    const critConfig = this.#hardcoreCombatService.getBaseCrit();
    const critChance = Math.max(
      0,
      Math.min(
        0.95,
        critConfig.chance + boonProfile.critChanceAdd + cardProfile.critChanceAdd + integrityProfile.critChanceAdd,
      ),
    );
    const critMultiplier = Math.max(1, critConfig.multiplier + boonProfile.critMultiplierAdd);
    const isCrit = Math.random() < critChance;
    if (isCrit) {
      finalDamage = Math.floor(finalDamage * critMultiplier);
    }

    if (this.#runState.phase === 3 && !isCrit) {
      const penalty = this.#hardcoreCombatService.getPhase3NoCritDamagePenalty();
      finalDamage = Math.floor(finalDamage * (1 - penalty));
    }

    if (cardProfile.corruptionAdd > 0) {
      this.#runState.corruptionPercent = this.#hardcoreCombatService.clampCorruption(
        this.#runState.corruptionPercent + cardProfile.corruptionAdd,
      );
      this.#campaignState.corruptionBurden = this.#hardcoreCombatService.clampCorruption(
        this.#campaignState.corruptionBurden + cardProfile.corruptionAdd * 0.15,
      );
    }

    const baseResistance = this.#hardcoreCombatService.getCorruptionResistance(this.#runState.corruptionPercent);
    const impulseResistance = Number.isFinite(this.#runState.impulseResistanceAdd) ? this.#runState.impulseResistanceAdd : 0;
    const campaignResistance = Number.isFinite(campaignCombat.resistanceAdd) ? campaignCombat.resistanceAdd : 0;
    const resistanceRate = Math.max(
      0,
      Math.min(
        0.95,
        baseResistance +
          Math.max(0, impulseResistance) +
          Math.max(0, cardProfile.resistanceAdd) +
          Math.max(0, campaignResistance) -
          integrityProfile.resistanceReduction,
      ),
    );

    finalDamage = Math.max(0, Math.floor(finalDamage * (1 - resistanceRate)));
    const hitResult = this.#boss.takeDamage(finalDamage);

    this.#runState.actionsCount += 1;
    this.#runState.comboCount += 1;
    this.#runState.firstHitConsumed = true;
    this.#runState.bossCurrentHp = this.#boss.currentHp;
    this.#runState.lastActionAt = nowIso;
    this.#runState.lastActionType = actionType;
    if (actionType === "DEEP_WORK") {
      this.#runState.deepWorkActions += 1;
      const previousIntegrity = this.#integrityValue;
      this.#integrityValue = this.#integrityService.applyDeepWorkReward(this.#integrityValue);
      if (this.#integrityValue !== previousIntegrity) {
        events.push({ type: "INTEGRITY_CHANGED", value: this.#integrityValue });
      }
    }

    const xpRawBonus = this.#upgradeService.getXpRawBonus(this.#upgradeTree) + boonProfile.xpRawAdd + cardProfile.xpRawAdd;
    const xpFromDamage = this.#progressionService.calculateXpFromDamage(hitResult.appliedDamage, xpRawBonus);
    const xpGrant = this.#progressionService.grantXp(this.#player, xpFromDamage);

    const heavyThreshold = baseDamage * 1.5;
    events.push({
      type: "DAMAGE",
      actionType,
      amount: hitResult.appliedDamage,
      isCrit,
      isHeavy: hitResult.appliedDamage >= heavyThreshold,
      resistanceRate,
    });
    events.push(...xpGrant.events);

    const hpPercent = this.#boss.getHpPercentage();
    const newPhase = this.#hardcoreCombatService.getPhaseByHpPercent(hpPercent);
    if (newPhase !== this.#runState.phase) {
      this.#runState.phase = newPhase;
      events.push({ type: "PHASE_CHANGED", newPhase });
    }

    if (this.#boss.getRemainingHp() <= 0) {
      events.push(
        ...this.#handleBossDefeat({
          clearedTierLevel: this.#bossTier.tierLevel,
          overflowDamage: hitResult.overflowDamage,
          xpRawBonus,
        }),
      );
    }

    await this.#persist();

    return {
      actionType,
      damage: hitResult.appliedDamage,
      events,
      state: this.getCurrentState(),
    };
  }

  async chooseBoon(boonId) {
    this.#ensureInitialized();
    const events = this.#rolloverIfNeeded();
    this.#ensureRunActive();

    if (!Array.isArray(this.#runState.boonOffer) || this.#runState.boonOffer.length === 0) {
      throw new Error("No boon choice is currently available.");
    }

    const result = this.#boonService.chooseBoon(this.#runState.activeBoons, this.#runState.boonOffer, boonId);
    this.#runState.activeBoons = result.activeBoons;
    this.#runState.boonOffer = [];

    const onChoose = this.#boonService.applyOnChoose(this.#player, result.chosenBoon);
    events.push(...onChoose.events);

    const corruptionDelta = Number.isFinite(result.chosenBoon.corruptionDelta) ? result.chosenBoon.corruptionDelta : 0;
    this.#runState.corruptionPercent = this.#hardcoreCombatService.clampCorruption(this.#runState.corruptionPercent + corruptionDelta);
    this.#campaignState.corruptionBurden = this.#hardcoreCombatService.clampCorruption(
      this.#campaignState.corruptionBurden + corruptionDelta * 0.4,
    );

    const drawnRunCard = this.#cardService.drawRandomRunCard(this.#deckState);
    if (drawnRunCard) {
      events.push({ type: "RUN_CARD_DRAWN", card: drawnRunCard });
    }

    this.#recalibrateBossKeepingRatio(events);

    events.push({
      type: "BOON_CHOSEN",
      boon: result.chosenBoon.toJSON(),
      corruptionPercent: this.#runState.corruptionPercent,
    });

    await this.#persist();
    return {
      events,
      state: this.getCurrentState(),
    };
  }

  async purchaseUpgrade(nodeId) {
    this.#ensureInitialized();
    const events = this.#rolloverIfNeeded();

    const purchase = this.#upgradeService.purchase(this.#upgradeTree, this.#currency, nodeId);
    if (!purchase.purchased) throw new Error(purchase.reason || "Upgrade purchase failed.");

    if (purchase.streakGraceGranted > 0) {
      this.#player.addStreakGraceCharges(purchase.streakGraceGranted);
      events.push({
        type: "STREAK_GRACE_GRANTED",
        amount: purchase.streakGraceGranted,
        totalCharges: this.#player.streakGraceCharges,
      });
    }

    this.#recalibrateBossKeepingRatio(events);

    events.push(...purchase.events);
    events.push({ type: "SIGIL_GOLD_GLOW" });

    await this.#persist();
    return {
      events,
      state: this.getCurrentState(),
    };
  }

  async logDebtPayment(amount) {
    this.#ensureInitialized();
    const events = this.#rolloverIfNeeded();

    const value = Number.isFinite(amount) ? Math.floor(amount) : 0;
    if (value <= 0) throw new Error("Debt payment amount must be > 0.");

    const previousIntegrity = this.#integrityValue;
    const result = this.#campaignManager.applyDebtPayment(this.#campaignState, value);
    this.#integrityValue = this.#integrityService.applyDebtPaymentReward(this.#integrityValue, result.appliedAmount);

    this.#syncCampaignContext();
    this.#runState.campaignId = this.#currentCampaign.id;
    if (result.campaignChanged) {
      events.push({
        type: "CAMPAIGN_ADVANCED",
        campaignId: this.#currentCampaign.id,
      });
    }
    if (this.#campaignState.currentDebt <= 0) {
      events.push({ type: "FINAL_CAMPAIGN_UNLOCKED" });
    }

    if (this.#integrityValue !== previousIntegrity) {
      events.push({ type: "INTEGRITY_CHANGED", value: this.#integrityValue });
    }

    events.push({
      type: "DEBT_PAYMENT_LOGGED",
      amount: result.appliedAmount,
      currentDebt: this.#campaignState.currentDebt,
    });

    this.#recalibrateBossKeepingRatio(events);
    await this.#persist();
    return {
      events,
      state: this.getCurrentState(),
    };
  }

  async logImpulse(amount, note = "") {
    this.#ensureInitialized();
    const events = this.#rolloverIfNeeded();

    const value = Number.isFinite(amount) ? amount : 0;
    if (value <= 0) throw new Error("Impulse amount must be > 0.");

    const previousIntegrity = this.#integrityValue;
    const nowIso = new Date().toISOString();
    const impact = this.#impulseManager.logImpulse(this.#impulseHistory, {
      amount: value,
      nowIso,
      note,
    });

    this.#campaignState.impulseHpBurden += impact.hpIncrease;
    this.#campaignState.corruptionBurden = this.#hardcoreCombatService.clampCorruption(
      this.#campaignState.corruptionBurden + impact.corruptionIncrease * 0.6,
    );
    this.#runState.corruptionPercent = this.#hardcoreCombatService.clampCorruption(
      this.#runState.corruptionPercent + impact.corruptionIncrease,
    );
    this.#runState.impulseResistanceAdd = Math.max(0, this.#runState.impulseResistanceAdd + impact.resistanceAdd);
    this.#runState.hadImpulseToday = true;

    this.#integrityValue = this.#integrityService.applyImpulsePenalty(this.#integrityValue, value);
    if (this.#integrityValue !== previousIntegrity) {
      events.push({ type: "INTEGRITY_CHANGED", value: this.#integrityValue });
    }

    const newTotalHp = this.#boss.totalHp + impact.hpIncrease;
    const newCurrentHp = this.#boss.currentHp + impact.hpIncrease;
    this.#boss = new Boss(this.#bossName, newTotalHp, newCurrentHp);
    this.#runState.bossCurrentHp = this.#boss.currentHp;

    events.push({
      type: "IMPULSE_LOGGED",
      amount: value,
      hpIncrease: impact.hpIncrease,
      corruptionIncrease: impact.corruptionIncrease,
      integrity: this.#integrityValue,
    });

    await this.#persist();
    return {
      events,
      state: this.getCurrentState(),
    };
  }

  async redeemImpulse(impulseId, amount) {
    this.#ensureInitialized();
    const events = this.#rolloverIfNeeded();

    const redeemed = this.#impulseManager.redeemImpulse(this.#impulseHistory, impulseId, amount);
    this.#campaignState.impulseHpBurden = Math.max(0, this.#campaignState.impulseHpBurden - redeemed.hpBurdenReduction);
    this.#recalibrateBossKeepingRatio(events);

    events.push({
      type: "IMPULSE_REDEEMED",
      impulseId,
      amount: redeemed.redeemedAmount,
      hpBurdenReduction: redeemed.hpBurdenReduction,
    });

    await this.#persist();
    return {
      events,
      state: this.getCurrentState(),
    };
  }

  async setActiveDeckCards(cardIds) {
    this.#ensureInitialized();
    const events = this.#rolloverIfNeeded();

    const active = this.#cardService.setActiveCards(this.#deckState, cardIds);
    events.push({ type: "DECK_UPDATED", activeCardIds: active });

    await this.#persist();
    return {
      events,
      state: this.getCurrentState(),
    };
  }

  async claimDailySummon() {
    this.#ensureInitialized();
    const events = this.#rolloverIfNeeded();
    const todayDateStamp = StreakService.toDateStamp(new Date());

    const item = this.#cosmeticService.summonFree(this.#cosmeticState, todayDateStamp);
    events.push({ type: "COSMETIC_SUMMONED", item });

    await this.#persist();
    return {
      events,
      state: this.getCurrentState(),
    };
  }

  async equipCosmetic(itemId) {
    this.#ensureInitialized();
    const item = this.#cosmeticService.equip(this.#cosmeticState, itemId);
    await this.#persist();
    return {
      events: [{ type: "COSMETIC_EQUIPPED", item }],
      state: this.getCurrentState(),
    };
  }

  getCurrentState() {
    this.#ensureInitialized();

    const bundle = this.#localizationService.getBundle(this.#locale);
    const headerText = bundle.header || {};
    const layoutText = bundle.layout || {};
    const bossText = bundle.boss || {};
    const statusPanelText = bundle.statusPanel || {};
    const boonText = bundle.boons || {};
    const tutorialText = bundle.tutorial || {};
    const failText = bundle.fail || {};
    const cinematicText = bundle.cinematic || {};
    const toastText = bundle.toasts || {};
    const miscText = bundle.misc || {};
    const actionText = bundle.actions || {};
    const upgradePathLabels = bundle.upgradePaths || {};

    const campaignText = bundle.campaignPanel || {};
    const integrityText = bundle.integrityPanel || {};
    const impulseText = bundle.impulsePanel || {};
    const redemptionText = bundle.redemptionPanel || {};
    const cosmeticText = bundle.cosmeticPanel || {};
    const deckText = bundle.deckPanel || {};
    const financeText = bundle.finance || {};

    const bossRemaining = this.#boss.getRemainingHp();
    const hpPercent = this.#boss.getHpPercentage();
    const xpToNext = this.#progressionService.getXpToNextLevel(this.#player.level);
    const xpPercent = xpToNext > 0 ? Math.max(0, Math.min(100, (this.#player.xp / xpToNext) * 100)) : 0;
    const streak = this.#streakService.getState();
    const todayDateStamp = StreakService.toDateStamp(new Date());

    const awaitingBoonChoice = this.#isAwaitingBoonChoice();
    const isFailed = this.#runState.status === "FAILED";
    const campaignModifier = this.#campaignBossProfile.combatModifier || {};
    const baseResistance = this.#hardcoreCombatService.getCorruptionResistance(this.#runState.corruptionPercent);
    const integrityProfile = this.#integrityService.getCombatProfile(this.#integrityValue);
    const resistanceRate = Math.max(
      0,
      Math.min(
        0.95,
        baseResistance +
          (Number.isFinite(this.#runState.impulseResistanceAdd) ? this.#runState.impulseResistanceAdd : 0) +
          (Number.isFinite(campaignModifier.resistanceAdd) ? campaignModifier.resistanceAdd : 0) -
          integrityProfile.resistanceReduction,
      ),
    );
    const sigilVm = this.#sigilProgress.toViewModel(hpPercent, this.#runState.ragePercent);

    const statusText = isFailed
      ? statusPanelText.failed || "FAILED"
      : awaitingBoonChoice
        ? boonText.offerTitle || "Choose Boon"
        : statusPanelText.active || "ACTIVE";
    const tipText = isFailed
      ? bossText.tipFailed || "The Entity Endures. Return tomorrow."
      : awaitingBoonChoice
        ? bossText.tipChooseBoon || "Choose one boon to continue."
        : bossText.tipActive || "Strike with discipline.";

    const localizedPaths = this.#upgradeService.toViewModel(this.#upgradeTree, this.#currency).map((pathVm) => ({
      ...pathVm,
      label: upgradePathLabels[pathVm.pathId] || pathVm.label,
    }));

    const campaignVm = this.#campaignManager.toViewModel(this.#campaignState);
    const integrityVm = this.#integrityService.toViewModel(this.#integrityValue);
    const redemptionVm = this.#redemptionService.toViewModel(this.#redemptionTracker);
    const cosmeticVm = this.#cosmeticService.toViewModel(this.#cosmeticState, todayDateStamp);
    const deckCardsVm = this.#cardService.getCardsViewModel(this.#deckState);

    const impulseHistoryVm = this.#impulseHistory
      .slice(-8)
      .map((entry) => ({
        id: entry.id,
        amount: Math.round(entry.amount),
        redeemedAmount: Math.round(entry.redeemedAmount || 0),
        remainingAmount: Math.max(0, Math.round(entry.amount - (entry.redeemedAmount || 0))),
        createdAt: entry.createdAt,
        note: entry.note || "",
      }))
      .reverse();

    return {
      schemaVersion: 6,
      updatedAt: new Date().toISOString(),
      settings: {
        locale: this.#locale,
        tutorialCompleted: this.#tutorialCompleted,
        supportedLocales: this.#supportedLocales.slice(),
      },
      boss: {
        ...this.#boss.toJSON(),
        name: this.#bossName,
        hpRemaining: bossRemaining,
        hpRemainingPercent: hpPercent,
        hpClearedPercent: Math.max(0, 100 - hpPercent),
        tierLevel: this.#bossTier.tierLevel,
        phase: this.#runState.phase,
        ragePercent: this.#runState.ragePercent,
        corruptionPercent: this.#runState.corruptionPercent,
        resistanceRate,
        resistancePercent: Math.round(resistanceRate * 100),
        sigil: sigilVm,
        bossType: this.#campaignBossProfile.bossType,
      },
      currentCampaignBoss: {
        type: this.#campaignBossProfile.bossType,
        name: this.#campaignBossProfile.bossName,
        visualTheme: this.#campaignBossProfile.visualTheme,
      },
      player: {
        ...this.#player.toJSON(),
        xpToNextLevel: xpToNext,
        xpPercent,
      },
      currency: this.#currency.toJSON(),
      streak,
      run: {
        dateStamp: this.#runState.dateStamp,
        runNumber: this.#runState.runNumber,
        status: this.#runState.status,
        failedReason: this.#runState.failedReason,
        actionsCount: this.#runState.actionsCount,
        comboCount: this.#runState.comboCount,
        bossTierLevel: this.#runState.bossTierLevel,
        phase: this.#runState.phase,
        ragePercent: this.#runState.ragePercent,
        corruptionPercent: this.#runState.corruptionPercent,
        lastActionType: this.#runState.lastActionType,
        awaitingBoonChoice,
        activeBoons: this.#runState.activeBoons.map((boon) => boon.toJSON()),
        boonOffer: this.#runState.boonOffer.map((boon) => boon.toJSON()),
        impulseResistanceAdd: this.#runState.impulseResistanceAdd,
        campaignId: this.#runState.campaignId,
      },
      campaignState: {
        ...this.#campaignState,
        currentCampaignId: campaignVm.id,
      },
      deckState: {
        ...this.#deckState,
      },
      integrity: integrityVm,
      impulseHistory: impulseHistoryVm,
      cosmeticInventory: {
        ...this.#cosmeticState,
      },
      redemptionTracker: {
        ...this.#redemptionTracker,
      },
      campaign: campaignVm,
      deck: {
        activeSlots: this.#deckState.activeSlots,
        maxPoolSize: this.#deckState.maxPoolSize,
        cards: deckCardsVm,
      },
      redemption: redemptionVm,
      cosmetics: cosmeticVm,
      sigilProgress: this.#sigilProgress.toJSON(),
      upgrades: {
        paths: localizedPaths,
      },
      availableActions: this.#actionConfigService.getActionTypes(),
      ui: {
        runIndicator: `${miscText.runIndicatorPrefix || "Run"} #${this.#runState.runNumber} (${this.#runState.dateStamp})`,
        statusText,
        tipText,
        actionLockedReason: isFailed
          ? miscText.lockedFailed || "Run already failed for today. No retries."
          : awaitingBoonChoice
            ? miscText.lockedBoon || "Choose one boon before acting."
            : "",
        meta: bundle.meta || {},
        header: headerText,
        layout: layoutText,
        boss: bossText,
        statusPanel: statusPanelText,
        boons: boonText,
        actions: actionText,
        campaignPanel: campaignText,
        integrityPanel: integrityText,
        impulsePanel: impulseText,
        redemptionPanel: redemptionText,
        cosmeticPanel: cosmeticText,
        deckPanel: deckText,
        finance: financeText,
        tutorial: {
          title: tutorialText.title || "Tutorial",
          replay: tutorialText.replay || "Replay Tutorial",
          skip: tutorialText.skip || "Skip",
          prev: tutorialText.prev || "Back",
          next: tutorialText.next || "Next",
          done: tutorialText.done || "Done",
          stepFormat: tutorialText.stepFormat || "Step {current}/{total}",
          steps: Array.isArray(tutorialText.steps) ? tutorialText.steps : [],
        },
        fail: failText,
        cinematic: cinematicText,
        toasts: toastText,
        misc: miscText,
      },
    };
  }

  #handleBossDefeat({ clearedTierLevel, overflowDamage, xpRawBonus }) {
    const events = [];
    const tier = Number.isFinite(clearedTierLevel) && clearedTierLevel > 0 ? Math.floor(clearedTierLevel) : 1;

    const previousMaxTier = this.#sigilProgress.maxTierCleared;
    this.#sigilProgress.recordTierClear(tier);
    events.push({ type: "BOSS_DEFEATED", tierLevel: tier });

    const defeatXp = this.#progressionService.calculateBossDefeatXp(tier, xpRawBonus);
    const defeatXpGrant = this.#progressionService.grantXp(this.#player, defeatXp);
    events.push(...defeatXpGrant.events);

    const shards = this.#progressionService.calculateShardReward(tier);
    this.#currency.addShards(shards);
    events.push({
      type: "SHARDS_GAINED",
      amount: shards,
      totalShards: this.#currency.shards,
    });

    const runCard = this.#cardService.drawRandomRunCard(this.#deckState);
    if (runCard) {
      events.push({ type: "RUN_CARD_DRAWN", card: runCard });
    }

    if (this.#currentCampaign.isFinal && !this.#campaignState.trueEndingCompleted) {
      this.#campaignState.trueEndingCompleted = true;
      this.#campaignState.prestigeUnlocked = true;
      events.push({
        type: "TRUE_ENDING_COMPLETED",
        message: "DEBT ERASED - THE RITUAL IS COMPLETE",
      });
    }

    const nextTierLevel = tier + 1;
    this.#bossTier = this.#createBossTier(nextTierLevel);
    const nextTotalHp = this.#effectiveHpForTierLevel(nextTierLevel);

    const overflowRetentionRate = this.#upgradeService.getOverflowRetentionRate(this.#upgradeTree);
    const retainedOverflow = Math.floor(Math.max(0, overflowDamage) * overflowRetentionRate);
    const nextCurrentHp = Math.max(1, nextTotalHp - retainedOverflow);

    this.#boss = new Boss(this.#bossName, nextTotalHp, nextCurrentHp);
    this.#runState.bossTierLevel = nextTierLevel;
    this.#runState.bossCurrentHp = nextCurrentHp;
    this.#runState.phase = 1;
    this.#runState.comboCount = 0;
    this.#runState.repeatedActionCount = 0;
    this.#runState.lastActionType = "";
    this.#runState.boonOffer = this.#boonService.createOffer();

    events.push({ type: "BOSS_TIER_UP", newTierLevel: nextTierLevel });
    if (retainedOverflow > 0) events.push({ type: "OVERFLOW_CARRIED", amount: retainedOverflow });
    events.push({ type: "BOON_OFFERED", count: this.#runState.boonOffer.length });

    if (this.#sigilProgress.maxTierCleared > previousMaxTier) {
      events.push({
        type: "SIGIL_REVEALED",
        maxTierCleared: this.#sigilProgress.maxTierCleared,
      });
    }

    return events;
  }

  #failRun(reason, boonProfile) {
    this.#runState.status = "FAILED";
    this.#runState.failedReason = reason;

    const events = [{ type: "RUN_FAILED", reason }];

    if (boonProfile && boonProfile.loseBoonsOnFail && this.#runState.activeBoons.length > 0) {
      const purged = this.#runState.activeBoons.length;
      this.#runState.activeBoons = [];
      events.push({ type: "BOONS_PURGED_ON_FAIL", count: purged });
    }

    this.#runState.boonOffer = [];
    return events;
  }

  #isComboBroken(now, breakGapHours) {
    if (!this.#runState.lastActionAt) return false;
    const last = new Date(this.#runState.lastActionAt);
    if (Number.isNaN(last.getTime())) return false;
    const diffHours = (now.getTime() - last.getTime()) / 3600000;
    return diffHours > breakGapHours;
  }

  #rolloverIfNeeded() {
    const todayDateStamp = StreakService.toDateStamp(new Date());
    if (this.#runState.dateStamp === todayDateStamp) return [];

    const events = this.#processClosedDay(this.#runState, todayDateStamp);

    const tierOneHp = this.#effectiveHpForTierLevel(1);
    this.#runState = this.#dailyRunService.resetForNewDay(this.#runState, todayDateStamp, tierOneHp);
    this.#cardService.resetForNewDay(this.#deckState);

    this.#runState.activeBoons = [];
    this.#runState.boonOffer = [];
    this.#runState.phase = 1;
    this.#runState.ragePercent = 0;
    this.#runState.corruptionPercent = this.#hardcoreCombatService.clampCorruption(this.#campaignState.corruptionBurden);
    this.#runState.impulseResistanceAdd = 0;
    this.#runState.campaignId = this.#currentCampaign.id;
    this.#runState.hadImpulseToday = false;
    this.#runState.deepWorkActions = 0;

    this.#bossTier = this.#createBossTier(1);
    this.#boss = new Boss(this.#bossName, tierOneHp, tierOneHp);

    events.push({ type: "RUN_RESET", dateStamp: todayDateStamp, runNumber: this.#runState.runNumber });
    return events;
  }

  #processClosedDay(previousRun, todayDateStamp) {
    const events = [];
    if (!previousRun || typeof previousRun !== "object" || typeof previousRun.dateStamp !== "string") {
      return events;
    }

    const hadAction = Number.isFinite(previousRun.actionsCount) && previousRun.actionsCount > 0;
    const redemption = this.#redemptionService.progressForDay(this.#redemptionTracker, {
      dateStamp: previousRun.dateStamp,
      hadAction,
    });

    const previousIntegrity = this.#integrityValue;
    this.#integrityValue = this.#integrityService.applyNoActionPenalty(this.#integrityValue, this.#redemptionTracker.noActionDays);
    const noImpulseDays = this.#impulseManager.getNoImpulseDays(this.#impulseHistory, todayDateStamp);
    this.#integrityValue = this.#integrityService.applyNoImpulseReward(this.#integrityValue, noImpulseDays);

    if (Number.isFinite(previousRun.deepWorkActions) && previousRun.deepWorkActions > 0) {
      this.#integrityValue = this.#integrityService.applyDeepWorkReward(this.#integrityValue);
    }

    if (this.#integrityValue !== previousIntegrity) {
      events.push({ type: "INTEGRITY_CHANGED", value: this.#integrityValue });
    }

    if (redemption.triggered) {
      const effects = redemption.effects;
      const hpRecovery = Math.floor(this.#campaignState.impulseHpBurden * effects.impulseHpRecoveryRate);
      this.#campaignState.impulseHpBurden = Math.max(0, this.#campaignState.impulseHpBurden - hpRecovery);
      this.#campaignState.corruptionBurden = this.#hardcoreCombatService.clampCorruption(
        this.#campaignState.corruptionBurden - effects.corruptionReduction,
      );
      this.#integrityValue = this.#integrityService.applyRedemptionReward(this.#integrityValue, effects.integrityGain);

      events.push({
        type: "REDEMPTION_TRIGGERED",
        hpRecovery,
        corruptionReduction: effects.corruptionReduction,
        integrityGain: effects.integrityGain,
      });
    }

    return events;
  }

  #syncBossFromRun() {
    this.#syncCampaignContext();
    this.#runState.campaignId = this.#currentCampaign.id;

    this.#bossTier = this.#createBossTier(this.#runState.bossTierLevel);
    const effectiveHp = this.#effectiveHpForTierLevel(this.#bossTier.tierLevel);
    const currentHp = Math.max(1, Math.min(effectiveHp, this.#runState.bossCurrentHp));

    this.#boss = new Boss(this.#bossName, effectiveHp, currentHp);
    this.#runState.bossCurrentHp = currentHp;

    this.#runState.ragePercent = this.#hardcoreCombatService.clampRage(this.#runState.ragePercent);
    this.#runState.corruptionPercent = this.#hardcoreCombatService.clampCorruption(this.#runState.corruptionPercent);
    this.#runState.phase = this.#hardcoreCombatService.getPhaseByHpPercent(this.#boss.getHpPercentage());
  }

  #syncCampaignContext() {
    const transition = this.#campaignManager.syncActiveCampaign(this.#campaignState);
    this.#currentCampaign = transition.campaign;
    this.#campaignBossProfile = this.#campaignManager.getBossProfile(this.#currentCampaign);
    this.#bossName = this.#campaignBossProfile.bossName;
  }

  #recalibrateBossKeepingRatio(events) {
    const previousTotalHp = this.#boss.totalHp;
    const previousCurrentHp = this.#boss.currentHp;
    const recalculatedTotalHp = this.#effectiveHpForTierLevel(this.#bossTier.tierLevel);
    if (recalculatedTotalHp !== previousTotalHp) {
      const remainingRatio = previousTotalHp > 0 ? previousCurrentHp / previousTotalHp : 1;
      const recalculatedCurrentHp = Math.max(1, Math.floor(recalculatedTotalHp * remainingRatio));
      this.#boss = new Boss(this.#bossName, recalculatedTotalHp, recalculatedCurrentHp);
      this.#runState.bossCurrentHp = recalculatedCurrentHp;
      if (Array.isArray(events)) {
        events.push({ type: "BOSS_RECALIBRATED", newTotalHp: recalculatedTotalHp });
      }
    }
  }

  #createBossTier(tierLevel) {
    const safeTier = Number.isFinite(tierLevel) && tierLevel > 0 ? Math.floor(tierLevel) : 1;
    const explicit = this.#bossTiers.find((tier) => tier.tierLevel === safeTier);

    let baseHp;
    if (explicit) baseHp = explicit.totalHp;
    else baseHp = Math.floor(this.#bossTiers[0].totalHp * this.#fallbackScalingFactor ** (safeTier - 1));

    return new BossTier({ tierLevel: safeTier, baseHp });
  }

  #effectiveHpForTierLevel(tierLevel) {
    const tier = this.#createBossTier(tierLevel);
    const upgradeReduction = this.#upgradeService.getBossHpReductionRate(this.#upgradeTree);
    const permanentReduction = Number.isFinite(this.#player?.permanentBossHpReduction)
      ? this.#player.permanentBossHpReduction
      : 0;
    const totalReduction = Math.max(0, Math.min(0.95, upgradeReduction + permanentReduction));

    const campaignHpMultiplier = Number.isFinite(this.#campaignBossProfile?.combatModifier?.bossHpMultiplier)
      ? this.#campaignBossProfile.combatModifier.bossHpMultiplier
      : 1;
    const impulseBurden = Number.isFinite(this.#campaignState?.impulseHpBurden) ? this.#campaignState.impulseHpBurden : 0;

    const reduced = tier.getEffectiveHp(totalReduction);
    const campaignScaled = Math.max(1, Math.floor(reduced * campaignHpMultiplier));
    return Math.max(1, campaignScaled + Math.floor(Math.max(0, impulseBurden)));
  }

  async #persist() {
    await this.#repository.save({
      schemaVersion: 6,
      settings: {
        locale: this.#locale,
        tutorialCompleted: this.#tutorialCompleted,
      },
      player: this.#player.toJSON(),
      currency: this.#currency.toJSON(),
      streak: this.#streakService.getState(),
      sigilProgress: this.#sigilProgress.toJSON(),
      upgrades: {
        ranks: this.#upgradeTree.toRankState(),
      },
      campaignState: { ...this.#campaignState },
      deckState: { ...this.#deckState },
      integrity: this.#integrityValue,
      impulseHistory: this.#impulseHistory.map((entry) => ({ ...entry })),
      cosmeticInventory: { ...this.#cosmeticState },
      redemptionTracker: { ...this.#redemptionTracker },
      run: {
        dateStamp: this.#runState.dateStamp,
        runNumber: this.#runState.runNumber,
        status: this.#runState.status,
        failedReason: this.#runState.failedReason,
        bossTierLevel: this.#runState.bossTierLevel,
        bossCurrentHp: this.#runState.bossCurrentHp,
        actionsCount: this.#runState.actionsCount,
        comboCount: this.#runState.comboCount,
        firstHitConsumed: this.#runState.firstHitConsumed,
        ragePercent: this.#runState.ragePercent,
        corruptionPercent: this.#runState.corruptionPercent,
        phase: this.#runState.phase,
        lastActionAt: this.#runState.lastActionAt,
        lastActionType: this.#runState.lastActionType,
        repeatedActionCount: this.#runState.repeatedActionCount,
        comboBreaksCount: this.#runState.comboBreaksCount,
        impulseResistanceAdd: this.#runState.impulseResistanceAdd,
        campaignId: this.#runState.campaignId,
        deepWorkActions: this.#runState.deepWorkActions,
        hadImpulseToday: this.#runState.hadImpulseToday,
        activeBoons: this.#runState.activeBoons.map((boon) => boon.toJSON()),
        boonOffer: this.#runState.boonOffer.map((boon) => boon.toJSON()),
      },
      updatedAt: new Date().toISOString(),
    });
  }

  #ensureNoPendingBoonChoice() {
    if (this.#isAwaitingBoonChoice()) {
      throw new Error("Choose one boon before taking another action.");
    }
  }

  #ensureRunActive() {
    if (this.#runState.status === "FAILED") {
      throw new Error("Run failed for today. Return tomorrow for a new run.");
    }
  }

  #isAwaitingBoonChoice() {
    return Array.isArray(this.#runState.boonOffer) && this.#runState.boonOffer.length > 0;
  }

  #ensureInitialized() {
    if (!this.#isInitialized) throw new Error("GameService not initialized. Call initialize() first.");
  }

  #migrateStoredState(stored) {
    const todayDateStamp = StreakService.toDateStamp(new Date());

    const debtConfig = this.#actionConfigService.getDebtConfig();
    const defaults = {
      settings: {
        locale: "en",
        tutorialCompleted: false,
      },
      player: {
        level: this.#progressionService.getStartingLevel(),
        xp: this.#progressionService.getStartingXp(),
        permanentDamageMultiplier: 0,
        permanentBossHpReduction: 0,
        streakGraceCharges: 0,
      },
      currency: { shards: 0 },
      streak: { dailyStreak: 0, lastActionDate: null },
      sigilProgress: { maxTierCleared: 0 },
      campaignState: {
        totalDebt: debtConfig.totalDebt,
        currentDebt: debtConfig.startingDebt,
        totalPaid: 0,
        impulseHpBurden: 0,
        corruptionBurden: 0,
        activeCampaignId: "",
        trueEndingCompleted: false,
        prestigeUnlocked: false,
      },
      deckState: {
        poolCardIds: [],
        activeCardIds: [],
        runCardIds: [],
      },
      integrity: this.#integrityService.createValue(),
      impulseHistory: [],
      cosmeticInventory: {
        ownedIds: [],
        equipped: { warrior: "", weapon: "", aura: "", damage: "" },
        lastFreeSummonDate: "",
        recentPullId: "",
      },
      redemptionTracker: {
        consistencyDays: 0,
        totalRedemptions: 0,
        lastProcessedDate: "",
        noActionDays: 0,
      },
      upgradeRanks: {},
      run: {
        dateStamp: todayDateStamp,
        runNumber: 1,
        status: "ACTIVE",
        failedReason: "",
        bossTierLevel: 1,
        bossCurrentHp: this.#bossTiers[0].totalHp,
        actionsCount: 0,
        comboCount: 0,
        firstHitConsumed: false,
        ragePercent: 0,
        corruptionPercent: 0,
        phase: 1,
        lastActionAt: null,
        lastActionType: "",
        repeatedActionCount: 0,
        comboBreaksCount: 0,
        impulseResistanceAdd: 0,
        campaignId: "",
        deepWorkActions: 0,
        hadImpulseToday: false,
        activeBoons: [],
        boonOffer: [],
      },
    };

    if (!stored || typeof stored !== "object") return defaults;

    if (stored.schemaVersion === 6) {
      return {
        settings: stored.settings || defaults.settings,
        player: stored.player || defaults.player,
        currency: stored.currency || defaults.currency,
        streak: stored.streak || defaults.streak,
        sigilProgress: stored.sigilProgress || defaults.sigilProgress,
        campaignState: stored.campaignState || defaults.campaignState,
        deckState: stored.deckState || defaults.deckState,
        integrity: Number.isFinite(stored.integrity) ? stored.integrity : defaults.integrity,
        impulseHistory: Array.isArray(stored.impulseHistory) ? stored.impulseHistory : defaults.impulseHistory,
        cosmeticInventory: stored.cosmeticInventory || defaults.cosmeticInventory,
        redemptionTracker: stored.redemptionTracker || defaults.redemptionTracker,
        upgradeRanks: stored.upgrades && typeof stored.upgrades === "object" ? stored.upgrades.ranks || {} : {},
        run: stored.run || defaults.run,
      };
    }

    if (stored.schemaVersion === 5 || stored.schemaVersion === 4 || stored.schemaVersion === 3) {
      const oldPlayer = stored.player && typeof stored.player === "object" ? stored.player : {};
      const oldRun = stored.run && typeof stored.run === "object" ? stored.run : {};
      const legacyRunBuffs = Array.isArray(oldRun.runBuffs) ? oldRun.runBuffs : [];

      const migratedBoons = legacyRunBuffs.map((legacy, index) => ({
        id: `legacy-boon-${index}-${Math.random()}`,
        templateId: "LEGACY_ECHO",
        name: "Legacy Echo",
        epithet: "An old pact still lingers.",
        corruptionDelta: 0,
        benefits: [
          {
            type: "DAMAGE_RAW_ADD",
            value: Number.isFinite(legacy.value) ? legacy.value : 0,
          },
        ],
        drawbacks: [
          {
            type: "RAGE_GAIN_MULTIPLIER_ADD",
            value: 0,
          },
        ],
      }));

      return {
        settings: stored.settings || defaults.settings,
        player: {
          level: oldPlayer.level,
          xp: oldPlayer.xp,
          permanentDamageMultiplier: oldPlayer.permanentDamageMultiplier,
          permanentBossHpReduction: oldPlayer.permanentBossHpReduction || 0,
          streakGraceCharges: oldPlayer.streakGraceCharges || 0,
        },
        currency: stored.currency || defaults.currency,
        streak: stored.streak || defaults.streak,
        sigilProgress: stored.sigilProgress || defaults.sigilProgress,
        campaignState: defaults.campaignState,
        deckState: defaults.deckState,
        integrity: defaults.integrity,
        impulseHistory: defaults.impulseHistory,
        cosmeticInventory: defaults.cosmeticInventory,
        redemptionTracker: defaults.redemptionTracker,
        upgradeRanks: stored.upgrades && typeof stored.upgrades === "object" ? stored.upgrades.ranks || {} : {},
        run: {
          dateStamp: typeof oldRun.dateStamp === "string" ? oldRun.dateStamp : todayDateStamp,
          runNumber: Number.isFinite(oldRun.runNumber) ? oldRun.runNumber : 1,
          status: oldRun.status === "FAILED" ? "FAILED" : "ACTIVE",
          failedReason: typeof oldRun.failedReason === "string" ? oldRun.failedReason : "",
          bossTierLevel: Number.isFinite(oldRun.bossTierLevel) ? oldRun.bossTierLevel : 1,
          bossCurrentHp: Number.isFinite(oldRun.bossCurrentHp) ? oldRun.bossCurrentHp : this.#bossTiers[0].totalHp,
          actionsCount: Number.isFinite(oldRun.actionsCount) ? oldRun.actionsCount : 0,
          comboCount: Number.isFinite(oldRun.comboCount) ? oldRun.comboCount : 0,
          firstHitConsumed: Boolean(oldRun.firstHitConsumed),
          ragePercent: Number.isFinite(oldRun.ragePercent) ? oldRun.ragePercent : 0,
          corruptionPercent: Number.isFinite(oldRun.corruptionPercent) ? oldRun.corruptionPercent : 0,
          phase: Number.isFinite(oldRun.phase) ? oldRun.phase : 1,
          lastActionAt: typeof oldRun.lastActionAt === "string" ? oldRun.lastActionAt : null,
          lastActionType: typeof oldRun.lastActionType === "string" ? oldRun.lastActionType : "",
          repeatedActionCount: Number.isFinite(oldRun.repeatedActionCount) ? oldRun.repeatedActionCount : 0,
          comboBreaksCount: 0,
          impulseResistanceAdd: 0,
          campaignId: "",
          deepWorkActions: 0,
          hadImpulseToday: false,
          activeBoons:
            Array.isArray(oldRun.activeBoons) && oldRun.activeBoons.length > 0
              ? oldRun.activeBoons
              : migratedBoons,
          boonOffer: Array.isArray(oldRun.boonOffer) ? oldRun.boonOffer : [],
        },
      };
    }

    return defaults;
  }
}
