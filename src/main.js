/**
 * Composition Root
 * Wires Infra + Core + UI. UI reacts only to state from GameService.
 */
import { ActionConfigService } from "./core/ActionConfigService.js";
import { BoonService } from "./core/BoonService.js";
import { CampaignManager } from "./core/CampaignManager.js";
import { CardService } from "./core/CardService.js";
import { CosmeticService } from "./core/CosmeticService.js";
import { DailyRunService } from "./core/DailyRunService.js";
import { GameService } from "./core/GameService.js";
import { HardcoreCombatService } from "./core/HardcoreCombatService.js";
import { ImpulseManager } from "./core/ImpulseManager.js";
import { IntegrityService } from "./core/IntegrityService.js";
import { LocalizationService } from "./core/LocalizationService.js";
import { ProgressionService } from "./core/ProgressionService.js";
import { RedemptionService } from "./core/RedemptionService.js";
import { StreakService } from "./core/StreakService.js";
import { UpgradeService } from "./core/UpgradeService.js";
import { LocalStorageRepository } from "./infra/LocalStorageRepository.js";
import { ActionButtonsView } from "./ui/ActionButtonsView.js";
import { BossView } from "./ui/BossView.js";
import { BuffOfferView } from "./ui/BuffOfferView.js";
import { BuffsView } from "./ui/BuffsView.js";
import { CampaignView } from "./ui/CampaignView.js";
import { CinematicTextView } from "./ui/CinematicTextView.js";
import { CombatArenaView } from "./ui/CombatArenaView.js";
import { CombatView } from "./ui/CombatView.js";
import { CosmeticInventoryView } from "./ui/CosmeticInventoryView.js";
import { DamageAnimator } from "./ui/DamageAnimator.js";
import { DeckPanelView } from "./ui/DeckPanelView.js";
import { FailView } from "./ui/FailView.js";
import { ImpulsePanelView } from "./ui/ImpulsePanelView.js";
import { LevelUpAnimator } from "./ui/LevelUpAnimator.js";
import { OverlayManager } from "./ui/OverlayManager.js";
import { PlayerView } from "./ui/PlayerView.js";
import { RunInfoView } from "./ui/RunInfoView.js";
import { RunStatusView } from "./ui/RunStatusView.js";
import { ToastView } from "./ui/ToastView.js";
import { TutorialOverlay } from "./ui/TutorialOverlay.js";
import { UIModeManager } from "./ui/UIModeManager.js";
import { UpgradeTreeView } from "./ui/UpgradeTreeView.js";

class DebtBossApp {
  #repository;
  #actionConfigService;
  #localizationService;
  #gameService;

  #bossView;
  #combatArenaView;
  #combatView;
  #actionsView;
  #boonsView;
  #boonOfferView;
  #runInfoView;
  #runStatusView;
  #playerView;
  #upgradeTreeView;
  #campaignView;
  #deckPanelView;
  #impulsePanelView;
  #cosmeticView;

  #toastView;
  #levelUpAnimator;
  #cinematicView;
  #failView;
  #tutorialOverlay;

  #modeManager;
  #overlayManager;
  #ritualTabsController;

  #statusTextEl;
  #errorTextEl;
  #languageToggleButton;
  #tutorialReplayButton;
  #settingsButton;
  #ritualButton;
  #ledgerButton;

  #localizedEls;
  #currentState = null;
  #actionHandler = null;
  #initializePromise = null;

  constructor() {
    const configUrl = new URL("../config.json", import.meta.url).toString();

    this.#repository = new LocalStorageRepository("debtBoss.gameState.v4");
    this.#actionConfigService = new ActionConfigService(configUrl);
    this.#localizationService = new LocalizationService({
      defaultLocale: "en",
      localeSources: {
        en: new URL("./locales/en.json", import.meta.url).toString(),
        vi: new URL("./locales/vi.json", import.meta.url).toString(),
      },
    });
    this.#gameService = null;

    const entityStageEl = document.getElementById("entityStage");
    const damageAnimator = new DamageAnimator(entityStageEl);

    this.#bossView = new BossView({
      nameEl: document.getElementById("bossName"),
      stageEl: entityStageEl,
      coreEl: document.getElementById("entityCore"),
      auraEl: document.getElementById("entityAura"),
      sigilLayerEl: document.getElementById("entitySigilLayer"),
      fractureEl: document.getElementById("entityFractureLayer"),
      hpTextEl: document.getElementById("hpText"),
      hpFillEl: document.getElementById("hpFill"),
      rageTextEl: document.getElementById("rageText"),
      rageFillEl: document.getElementById("rageFill"),
      corruptionTextEl: document.getElementById("corruptionText"),
      corruptionFillEl: document.getElementById("corruptionFill"),
      phaseTextEl: document.getElementById("phaseText"),
      statusTextEl: document.getElementById("statusText"),
      tipTextEl: document.getElementById("tipText"),
      damageAnimator,
    });

    this.#combatArenaView = new CombatArenaView({
      stageEl: entityStageEl,
      playerEl: document.getElementById("arenaPlayer"),
      bossEl: document.getElementById("arenaBoss"),
      slashLayerEl: document.getElementById("slashLayer"),
    });
    this.#combatView = new CombatView({
      boonSummaryEl: document.getElementById("boonsSummaryText"),
      actionHintEl: document.getElementById("actionHintText"),
    });

    this.#statusTextEl = document.getElementById("statusText");
    this.#errorTextEl = document.getElementById("errorText");
    this.#languageToggleButton = document.getElementById("languageToggleButton");
    this.#tutorialReplayButton = document.getElementById("tutorialReplayButton");
    this.#settingsButton = document.getElementById("settingsButton");
    this.#ritualButton = document.getElementById("ritualButton");
    this.#ledgerButton = document.getElementById("ledgerButton");

    this.#actionsView = new ActionButtonsView(document.getElementById("actions"), this.#errorTextEl);
    this.#boonsView = new BuffsView(document.getElementById("boonList"));
    this.#boonOfferView = new BuffOfferView({
      rootEl: document.getElementById("boonOverlay"),
      containerEl: document.getElementById("boonOfferList"),
      hintEl: document.getElementById("boonOfferHint"),
    });

    this.#runInfoView = new RunInfoView({
      runEl: document.getElementById("runText"),
      shardsEl: document.getElementById("shardsText"),
      streakEl: document.getElementById("streakText"),
    });
    this.#runStatusView = new RunStatusView({
      statusEl: document.getElementById("runStatusValue"),
      tierEl: document.getElementById("runTierValue"),
      phaseEl: document.getElementById("runPhaseValue"),
      rageEl: document.getElementById("runRageValue"),
      corruptionEl: document.getElementById("runCorruptionValue"),
      resistanceEl: document.getElementById("runResistanceValue"),
      comboEl: document.getElementById("runComboValue"),
      failEl: document.getElementById("runFailValue"),
    });
    this.#playerView = new PlayerView({
      levelEl: document.getElementById("levelText"),
      xpTextEl: document.getElementById("xpText"),
      metaTextEl: document.getElementById("playerMetaText"),
      xpFillEl: document.getElementById("xpFill"),
    });

    this.#upgradeTreeView = new UpgradeTreeView(document.getElementById("upgradeTree"));
    this.#campaignView = new CampaignView({
      titleEl: document.getElementById("campaignPanelName"),
      subtitleEl: document.getElementById("campaignPanelSub"),
      debtTextEl: document.getElementById("campaignDebtText"),
      debtFillEl: document.getElementById("campaignDebtFill"),
      bossTypeEl: document.getElementById("campaignBossTypeValue"),
      themeEl: document.getElementById("campaignThemeValue"),
    });
    this.#deckPanelView = new DeckPanelView({
      listEl: document.getElementById("deckList"),
      applyBtn: document.getElementById("deckApplyButton"),
      slotsEl: document.getElementById("deckSlotsValue"),
    });
    this.#impulsePanelView = new ImpulsePanelView({
      debtValueEl: document.getElementById("ledgerDebtValue"),
      paidValueEl: document.getElementById("ledgerPaidValue"),
      integrityValueEl: document.getElementById("ledgerIntegrityValue"),
      integrityTierEl: document.getElementById("ledgerIntegrityTier"),
      redemptionValueEl: document.getElementById("ledgerRedemptionValue"),
      paymentInputEl: document.getElementById("paymentAmountInput"),
      paymentButtonEl: document.getElementById("logPaymentButton"),
      impulseInputEl: document.getElementById("impulseAmountInput"),
      impulseNoteEl: document.getElementById("impulseNoteInput"),
      impulseButtonEl: document.getElementById("logImpulseButton"),
      historyEl: document.getElementById("impulseHistoryList"),
    });
    this.#cosmeticView = new CosmeticInventoryView({
      summonButtonEl: document.getElementById("summonButton"),
      recentEl: document.getElementById("recentSummonText"),
      listEl: document.getElementById("cosmeticList"),
    });

    this.#toastView = new ToastView(document.getElementById("toastContainer"));
    this.#levelUpAnimator = new LevelUpAnimator(
      document.getElementById("levelUpOverlay"),
      document.getElementById("levelUpSub"),
    );
    this.#cinematicView = new CinematicTextView({
      rootEl: document.getElementById("cinematicOverlay"),
      titleEl: document.getElementById("cinematicTitle"),
      subEl: document.getElementById("cinematicSub"),
    });
    this.#failView = new FailView({
      rootEl: document.getElementById("failOverlay"),
      reasonEl: document.getElementById("failReason"),
    });
    this.#tutorialOverlay = new TutorialOverlay({
      rootEl: document.getElementById("tutorialOverlay"),
      titleEl: document.getElementById("tutorialTitle"),
      counterEl: document.getElementById("tutorialStepCounter"),
      bodyEl: document.getElementById("tutorialStepBody"),
      skipBtn: document.getElementById("tutorialSkipButton"),
      prevBtn: document.getElementById("tutorialPrevButton"),
      nextBtn: document.getElementById("tutorialNextButton"),
      doneBtn: document.getElementById("tutorialDoneButton"),
    });

    this.#modeManager = new UIModeManager();
    this.#overlayManager = new OverlayManager();
    this.#registerOverlays();

    this.#localizedEls = {
      appTitle: document.getElementById("appTitle"),
      appSubtitle: document.getElementById("appSubtitle"),
      activeBoonsTitle: document.getElementById("activeBoonsTitle"),
      actionsTitle: document.getElementById("actionsTitle"),
      essenceLabel: document.getElementById("essenceLabel"),
      rageLabel: document.getElementById("rageLabel"),
      corruptionLabel: document.getElementById("corruptionLabel"),
      advancedStatsSummary: document.getElementById("advancedStatsSummary"),
      runLabel: document.getElementById("runLabel"),
      shardsLabel: document.getElementById("shardsLabel"),
      streakLabel: document.getElementById("streakLabel"),
      levelLabel: document.getElementById("levelLabel"),
      xpLabel: document.getElementById("xpLabel"),
      runStatusLabel: document.getElementById("runStatusLabel"),
      runTierLabel: document.getElementById("runTierLabel"),
      runPhaseLabel: document.getElementById("runPhaseLabel"),
      runRageLabel: document.getElementById("runRageLabel"),
      runCorruptionLabel: document.getElementById("runCorruptionLabel"),
      runResistanceLabel: document.getElementById("runResistanceLabel"),
      runComboLabel: document.getElementById("runComboLabel"),
      runFailLabel: document.getElementById("runFailLabel"),
      ritualTitle: document.getElementById("ritualTitle"),
      deckTitle: document.getElementById("deckTitle"),
      deckSlotsLabel: document.getElementById("deckSlotsLabel"),
      campaignPanelTitle: document.getElementById("campaignPanelTitle"),
      campaignBossTypeLabel: document.getElementById("campaignBossTypeLabel"),
      campaignThemeLabel: document.getElementById("campaignThemeLabel"),
      upgradeTreeTitle: document.getElementById("upgradeTreeTitle"),
      cosmeticTitle: document.getElementById("cosmeticTitle"),
      ledgerTitle: document.getElementById("ledgerTitle"),
      ledgerDebtLabel: document.getElementById("ledgerDebtLabel"),
      ledgerPaidLabel: document.getElementById("ledgerPaidLabel"),
      ledgerIntegrityLabel: document.getElementById("ledgerIntegrityLabel"),
      ledgerRedemptionLabel: document.getElementById("ledgerRedemptionLabel"),
      debtPaymentLabel: document.getElementById("debtPaymentLabel"),
      impulseAmountLabel: document.getElementById("impulseAmountLabel"),
      impulseHistoryTitle: document.getElementById("impulseHistoryTitle"),
      settingsTitle: document.getElementById("settingsTitle"),
      boonOverlayTitle: document.getElementById("boonOverlayTitle"),
      failTitle: document.getElementById("failTitle"),
      failSub: document.getElementById("failSub"),
    };
  }

  async initialize() {
    if (this.#initializePromise) return this.#initializePromise;

    this.#initializePromise = this.#initializeInternal().catch((err) => {
      this.#initializePromise = null;
      throw err;
    });
    return this.#initializePromise;
  }

  async #initializeInternal() {
    this.#setStatus("Loading...");
    this.#setError("");

    try {
      await this.#actionConfigService.load();
      await this.#localizationService.loadAll();

      if (!this.#gameService) {
        const progressionConfig = this.#actionConfigService.getProgressionConfig();
        const damageRules = this.#actionConfigService.getDamageRules();
        const upgradePaths = this.#actionConfigService.getUpgradePaths();
        const boonConfig = this.#actionConfigService.getBoonConfig();
        const hardcoreConfig = this.#actionConfigService.getHardcoreConfig();
        const campaignConfig = this.#actionConfigService.getCampaignConfig();
        const debtConfig = this.#actionConfigService.getDebtConfig();
        const deckConfig = this.#actionConfigService.getDeckConfig();
        const integrityConfig = this.#actionConfigService.getIntegrityConfig();
        const impulseConfig = this.#actionConfigService.getImpulseConfig();
        const redemptionConfig = this.#actionConfigService.getRedemptionConfig();
        const cosmeticConfig = this.#actionConfigService.getCosmeticConfig();

        this.#gameService = new GameService({
          repository: this.#repository,
          actionConfigService: this.#actionConfigService,
          dailyRunService: new DailyRunService(),
          upgradeService: new UpgradeService(upgradePaths),
          boonService: new BoonService(boonConfig),
          progressionService: new ProgressionService({
            diminishingFactor: damageRules.diminishingFactor,
            xpPerDamageDivisor: progressionConfig.xpPerDamageDivisor,
            leveling: progressionConfig.leveling,
            bossDefeatXp: progressionConfig.bossDefeatXp,
            shardRewards: progressionConfig.shardRewards,
          }),
          hardcoreCombatService: new HardcoreCombatService(hardcoreConfig),
          localizationService: this.#localizationService,
          campaignManager: new CampaignManager({ campaigns: campaignConfig, debt: debtConfig }),
          cardService: new CardService(deckConfig),
          impulseManager: new ImpulseManager(impulseConfig),
          integrityService: new IntegrityService(integrityConfig),
          redemptionService: new RedemptionService(redemptionConfig),
          cosmeticService: new CosmeticService(cosmeticConfig),
          streakService: new StreakService(),
        });
      }

      this.#wireControls();

      this.#actionHandler = async (actionType) => {
        const result = await this.#gameService.applyAction(actionType);
        this.#playEvents(result.events);
        this.#renderAll(result.state);
      };

      const state = await this.#gameService.initialize();
      this.#renderAll(state);
      this.#modeManager.setMode(UIModeManager.MODES.COMBAT);
    } catch (err) {
      this.#setStatus("Error");
      this.#setError(this.#toUserFriendlyStartupError(err));
      console.error(err);
      this.#actionsView.setDisabled(true);
    }
  }

  #registerOverlays() {
    this.#overlayManager.register("ritual", { rootEl: document.getElementById("ritualOverlay") });
    this.#overlayManager.register("ledger", { rootEl: document.getElementById("ledgerOverlay") });
    this.#overlayManager.register("settings", { rootEl: document.getElementById("settingsOverlay") });

    this.#ritualTabsController = this.#overlayManager.setupTabs({
      rootEl: document.getElementById("ritualTabPanels")?.parentElement,
      buttonSelector: ".ritual-tab-btn",
      panelSelector: ".ritual-tab-panel",
      initialTabId: "deck",
    });
  }

  #wireControls() {
    this.#settingsButton?.addEventListener("click", () => this.#modeManager.setMode(UIModeManager.MODES.SETTINGS));
    this.#ritualButton?.addEventListener("click", () => this.#modeManager.setMode(UIModeManager.MODES.RITUAL));
    this.#ledgerButton?.addEventListener("click", () => this.#modeManager.setMode(UIModeManager.MODES.LEDGER));

    const closeToCombatIds = [
      "settingsCloseButton",
      "ritualCloseButton",
      "ledgerCloseButton",
    ];
    for (const id of closeToCombatIds) {
      const el = document.getElementById(id);
      el?.addEventListener("click", () => this.#modeManager.setMode(UIModeManager.MODES.COMBAT));
    }

    document.querySelectorAll("[data-overlay-close]").forEach((el) => {
      el.addEventListener("click", () => this.#modeManager.setMode(UIModeManager.MODES.COMBAT));
    });

    if (this.#languageToggleButton && !this.#languageToggleButton.dataset.wired) {
      this.#languageToggleButton.dataset.wired = "1";
      this.#languageToggleButton.addEventListener("click", async () => {
        if (!this.#currentState) return;
        const nextLocale = this.#currentState.settings.locale === "vi" ? "en" : "vi";
        const result = await this.#gameService.setLocale(nextLocale);
        this.#playEvents(result.events);
        this.#renderAll(result.state);
      });
    }

    if (this.#tutorialReplayButton && !this.#tutorialReplayButton.dataset.wired) {
      this.#tutorialReplayButton.dataset.wired = "1";
      this.#tutorialReplayButton.addEventListener("click", async () => {
        const result = await this.#gameService.resetTutorial();
        this.#playEvents(result.events);
        this.#renderAll(result.state);
        this.#modeManager.setMode(UIModeManager.MODES.COMBAT);
      });
    }

    this.#modeManager.subscribe((mode) => {
      this.#overlayManager.closeAll();
      document.body.classList.toggle("is-overlay-open", mode !== UIModeManager.MODES.COMBAT);
      if (mode === UIModeManager.MODES.RITUAL) this.#overlayManager.open("ritual");
      if (mode === UIModeManager.MODES.LEDGER) this.#overlayManager.open("ledger");
      if (mode === UIModeManager.MODES.SETTINGS) this.#overlayManager.open("settings");
    });
  }

  #renderAll(state) {
    this.#currentState = state;
    this.#renderLocalizedStaticTexts(state);

    this.#bossView.render(state);
    this.#combatArenaView.render(state);
    this.#combatView.render(state, state.ui.boons, state.ui.misc);
    this.#boonsView.render(state.run.activeBoons, state.ui.boons, state.settings.locale);

    this.#runInfoView.render(state);
    this.#runStatusView.render(state);
    this.#playerView.render(state.player, state.ui.misc);
    this.#failView.render(state.run, state.ui.statusPanel);

    this.#actionsView.render(state.availableActions, this.#actionHandler, state.ui.actions);
    const locked = Boolean(state.run.awaitingBoonChoice) || state.run.status === "FAILED";
    this.#actionsView.setDisabled(locked);

    this.#boonOfferView.render(
      state.run.boonOffer,
      async (boonId) => {
        try {
          this.#setError("");
          const result = await this.#gameService.chooseBoon(boonId);
          this.#playEvents(result.events);
          this.#renderAll(result.state);
        } catch (err) {
          this.#setError(err instanceof Error ? err.message : "Failed to choose boon.");
        }
      },
      state.ui.boons,
      state.settings.locale,
    );

    this.#deckPanelView.render(state.deck, state.ui.deckPanel, async (cardIds) => {
      try {
        this.#setError("");
        const result = await this.#gameService.setActiveDeckCards(cardIds);
        this.#playEvents(result.events);
        this.#renderAll(result.state);
      } catch (err) {
        this.#setError(err instanceof Error ? err.message : "Failed to update deck.");
      }
    });

    this.#campaignView.render(state.campaign);

    this.#upgradeTreeView.render(state.upgrades.paths, async (nodeId) => {
      try {
        this.#setError("");
        const result = await this.#gameService.purchaseUpgrade(nodeId);
        this.#playEvents(result.events);
        this.#renderAll(result.state);
      } catch (err) {
        this.#setError(err instanceof Error ? err.message : "Failed to unlock node.");
      }
    });

    this.#cosmeticView.render(
      state.cosmetics,
      state.ui.cosmeticPanel,
      {
        onSummon: async () => {
          try {
            this.#setError("");
            const result = await this.#gameService.claimDailySummon();
            this.#playEvents(result.events);
            this.#renderAll(result.state);
          } catch (err) {
            this.#setError(err instanceof Error ? err.message : "Failed to summon.");
          }
        },
        onEquip: async (itemId) => {
          try {
            this.#setError("");
            const result = await this.#gameService.equipCosmetic(itemId);
            this.#playEvents(result.events);
            this.#renderAll(result.state);
          } catch (err) {
            this.#setError(err instanceof Error ? err.message : "Failed to equip cosmetic.");
          }
        },
      },
    );

    this.#impulsePanelView.render(
      {
        campaign: state.campaign,
        integrity: state.integrity,
        redemption: state.redemption,
        impulseHistory: state.impulseHistory,
      },
      state.ui.impulsePanel,
      {
        onLogPayment: async (amount) => {
          try {
            this.#setError("");
            const result = await this.#gameService.logDebtPayment(amount);
            this.#playEvents(result.events);
            this.#renderAll(result.state);
          } catch (err) {
            this.#setError(err instanceof Error ? err.message : "Failed to log payment.");
          }
        },
        onLogImpulse: async (amount, note) => {
          try {
            this.#setError("");
            const result = await this.#gameService.logImpulse(amount, note);
            this.#playEvents(result.events);
            this.#renderAll(result.state);
          } catch (err) {
            this.#setError(err instanceof Error ? err.message : "Failed to log impulse.");
          }
        },
        onRedeemImpulse: async (id, amount) => {
          try {
            this.#setError("");
            const result = await this.#gameService.redeemImpulse(id, amount);
            this.#playEvents(result.events);
            this.#renderAll(result.state);
          } catch (err) {
            this.#setError(err instanceof Error ? err.message : "Failed to redeem impulse.");
          }
        },
      },
    );

    this.#tutorialOverlay.render(
      {
        shouldShow: !state.settings.tutorialCompleted,
        title: state.ui.tutorial.title,
        stepFormat: state.ui.tutorial.stepFormat,
        steps: state.ui.tutorial.steps,
        skipLabel: state.ui.tutorial.skip,
        prevLabel: state.ui.tutorial.prev,
        nextLabel: state.ui.tutorial.next,
        doneLabel: state.ui.tutorial.done,
      },
      {
        onComplete: async () => {
          const result = await this.#gameService.markTutorialCompleted();
          this.#renderAll(result.state);
        },
      },
    );

    this.#setStatus(state.ui.statusText || state.ui.misc.ready || "Ready");
  }

  #renderLocalizedStaticTexts(state) {
    const meta = state.ui.meta || {};
    const layout = state.ui.layout || {};
    const bossText = state.ui.boss || {};
    const statusPanel = state.ui.statusPanel || {};
    const boons = state.ui.boons || {};
    const fail = state.ui.fail || {};
    const misc = state.ui.misc || {};
    const deck = state.ui.deckPanel || {};
    const campaignPanel = state.ui.campaignPanel || {};
    const impulse = state.ui.impulsePanel || {};
    const cosmetic = state.ui.cosmeticPanel || {};

    this.#setText(this.#localizedEls.appTitle, meta.title || "Debt Boss");
    this.#setText(this.#localizedEls.appSubtitle, meta.subtitle || "One ritual each day.");
    this.#setText(this.#localizedEls.activeBoonsTitle, layout.activeBoons || "Active Boons");
    this.#setText(this.#localizedEls.actionsTitle, layout.actions || "Action Rituals");
    this.#setText(this.#localizedEls.essenceLabel, bossText.essence || "Essence");
    this.#setText(this.#localizedEls.rageLabel, bossText.rage || "Rage");
    this.#setText(this.#localizedEls.corruptionLabel, bossText.corruption || "Corruption");

    this.#setText(this.#localizedEls.advancedStatsSummary, misc.advancedStats || "Advanced Stats");
    this.#setText(this.#localizedEls.runLabel, misc.runIndicatorPrefix || "Run");
    this.#setText(this.#localizedEls.shardsLabel, (state.ui.header && state.ui.header.shards) || "Shards");
    this.#setText(this.#localizedEls.streakLabel, (state.ui.header && state.ui.header.streak) || "Streak");
    this.#setText(this.#localizedEls.levelLabel, (state.ui.header && state.ui.header.level) || "Level");
    this.#setText(this.#localizedEls.xpLabel, misc.xpLabel || "XP");
    this.#setText(this.#localizedEls.runStatusLabel, statusPanel.status || "Status");
    this.#setText(this.#localizedEls.runTierLabel, statusPanel.tier || "Tier");
    this.#setText(this.#localizedEls.runPhaseLabel, statusPanel.phase || "Phase");
    this.#setText(this.#localizedEls.runRageLabel, statusPanel.rage || "Rage");
    this.#setText(this.#localizedEls.runCorruptionLabel, statusPanel.corruption || "Corruption");
    this.#setText(this.#localizedEls.runResistanceLabel, statusPanel.resistance || "Resistance");
    this.#setText(this.#localizedEls.runComboLabel, statusPanel.combo || "Combo");
    this.#setText(this.#localizedEls.runFailLabel, statusPanel.failCause || "Fail");

    this.#setText(this.#localizedEls.ritualTitle, misc.ritualChamber || "Ritual Chamber");
    this.#setText(this.#localizedEls.deckTitle, deck.title || "Deck");
    this.#setText(this.#localizedEls.deckSlotsLabel, deck.slots || "Slots");
    this.#setText(this.#localizedEls.campaignPanelTitle, campaignPanel.title || "Campaign");
    this.#setText(this.#localizedEls.campaignBossTypeLabel, campaignPanel.bossType || "Boss Type");
    this.#setText(this.#localizedEls.campaignThemeLabel, campaignPanel.theme || "Theme");
    this.#setText(this.#localizedEls.upgradeTreeTitle, layout.upgradeTree || "Upgrade Tree");
    this.#setText(this.#localizedEls.cosmeticTitle, cosmetic.title || "Cosmetics");

    this.#setText(this.#localizedEls.ledgerTitle, misc.ledgerMode || "Ledger");
    this.#setText(this.#localizedEls.ledgerDebtLabel, impulse.currentDebt || "Current Debt");
    this.#setText(this.#localizedEls.ledgerPaidLabel, impulse.totalPaid || "Total Paid");
    this.#setText(this.#localizedEls.ledgerIntegrityLabel, impulse.integrity || "Integrity");
    this.#setText(this.#localizedEls.ledgerRedemptionLabel, impulse.redemption || "Redemption");
    this.#setText(this.#localizedEls.debtPaymentLabel, impulse.debtPayment || "Debt Payment");
    this.#setText(this.#localizedEls.impulseAmountLabel, impulse.impulseSpending || "Impulse Spending");
    this.#setText(this.#localizedEls.impulseHistoryTitle, impulse.history || "Impulse Log");

    this.#setText(this.#localizedEls.settingsTitle, misc.settings || "Settings");
    this.#setText(this.#localizedEls.boonOverlayTitle, boons.offerTitle || "Choose Your Pact");
    this.#setText(this.#localizedEls.failTitle, fail.title || "THE ENTITY ENDURES");
    this.#setText(this.#localizedEls.failSub, fail.subtitle || "Run Failed.");

    const ritualTabButtons = document.querySelectorAll(".ritual-tab-btn");
    if (ritualTabButtons.length >= 4) {
      ritualTabButtons[0].textContent = deck.title || "Deck";
      ritualTabButtons[1].textContent = campaignPanel.title || "Campaign";
      ritualTabButtons[2].textContent = layout.upgradeTree || "Upgrades";
      ritualTabButtons[3].textContent = cosmetic.title || "Cosmetics";
    }

    const noteInput = document.getElementById("impulseNoteInput");
    if (noteInput) noteInput.placeholder = impulse.notePlaceholder || "Note";

    if (this.#languageToggleButton) {
      this.#languageToggleButton.textContent = misc.langToggle || "VI";
      this.#languageToggleButton.setAttribute("aria-label", misc.langToggleAria || "Switch language");
    }
    if (this.#tutorialReplayButton) {
      this.#tutorialReplayButton.textContent = state.ui.tutorial.replay || "Replay Tutorial";
    }
  }

  #setText(el, value) {
    if (!el) return;
    el.textContent = value;
  }

  #playEvents(events) {
    if (!Array.isArray(events)) return;

    const ui = this.#currentState?.ui || {};
    const toasts = ui.toasts || {};
    const cinematic = ui.cinematic || {};

    for (const event of events) {
      if (!event || typeof event.type !== "string") continue;
      switch (event.type) {
        case "DAMAGE":
          this.#combatArenaView.playAttack({
            actionType: event.actionType,
            isCrit: Boolean(event.isCrit),
            isHeavy: Boolean(event.isHeavy),
          });
          this.#bossView.playHit({
            amount: event.amount,
            isCrit: Boolean(event.isCrit),
            isHeavy: Boolean(event.isHeavy),
          });
          break;
        case "LEVEL_UP":
          this.#levelUpAnimator.play({ newLevel: event.newLevel, levelsGained: event.levelsGained });
          this.#toastView.show({ title: toasts.levelUp || "Level Up", body: `Lv ${event.newLevel}` });
          break;
        case "BOSS_DEFEATED":
          this.#bossView.playBossDefeatCinematic();
          this.#toastView.show({ title: toasts.tierBroken || "Tier Broken", body: `Tier ${event.tierLevel}` });
          break;
        case "PHASE_CHANGED":
          this.#cinematicView.play(cinematic.phaseChange || "THE ENTITY AWAKENS", `${event.newPhase}`);
          break;
        case "RUN_FAILED":
          this.#cinematicView.play(cinematic.runFail || "THE ENTITY ENDURES", ui.fail?.subtitle || "Run Failed.");
          this.#toastView.show({ title: toasts.runFailed || "Run Failed", body: toasts.noRetry || "No retries today." });
          break;
        case "BOON_CHOSEN":
          this.#cinematicView.play(cinematic.boonChosen || "PACT SEALED", event.boon?.name || "");
          break;
        case "UPGRADE_PURCHASED":
          this.#cinematicView.play(cinematic.upgrade || "NEW POWER AWAKENED", event.nodeName || "");
          break;
        case "RUN_RESET":
          this.#cinematicView.play(cinematic.runReset || "A NEW RITUAL BEGINS", event.dateStamp || "");
          break;
        default:
          break;
      }
    }
  }

  #toUserFriendlyStartupError(err) {
    const raw = err instanceof Error ? err.message : "Unknown error.";
    const isFileProtocol = window.location && window.location.protocol === "file:";

    if (isFileProtocol) {
      return "Cannot load config/locales from file://. Run a local server and open via localhost.";
    }
    if (raw.includes("Failed to load config.json") || raw.startsWith("Config")) {
      return "Configuration failed to load. Verify config.json at app root.";
    }
    return "App failed to start. Check console for details.";
  }

  #setStatus(text) {
    if (this.#statusTextEl) this.#statusTextEl.textContent = text;
  }

  #setError(message) {
    if (this.#errorTextEl) this.#errorTextEl.textContent = message;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new DebtBossApp();
  app.initialize();
});
