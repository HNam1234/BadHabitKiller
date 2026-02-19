/**
 * Composition Root
 * Wires Infra + Core + UI. UI reacts only to state from GameService.
 */
import { ActionConfigService } from "./core/ActionConfigService.js";
import { BoonService } from "./core/BoonService.js";
import { DailyRunService } from "./core/DailyRunService.js";
import { GameService } from "./core/GameService.js";
import { HardcoreCombatService } from "./core/HardcoreCombatService.js";
import { LocalizationService } from "./core/LocalizationService.js";
import { ProgressionService } from "./core/ProgressionService.js";
import { StreakService } from "./core/StreakService.js";
import { UpgradeService } from "./core/UpgradeService.js";
import { LocalStorageRepository } from "./infra/LocalStorageRepository.js";
import { ActionButtonsView } from "./ui/ActionButtonsView.js";
import { BossView } from "./ui/BossView.js";
import { BuffOfferView } from "./ui/BuffOfferView.js";
import { BuffsView } from "./ui/BuffsView.js";
import { CinematicTextView } from "./ui/CinematicTextView.js";
import { CombatArenaView } from "./ui/CombatArenaView.js";
import { DamageAnimator } from "./ui/DamageAnimator.js";
import { FailView } from "./ui/FailView.js";
import { LevelUpAnimator } from "./ui/LevelUpAnimator.js";
import { PlayerView } from "./ui/PlayerView.js";
import { RunInfoView } from "./ui/RunInfoView.js";
import { RunStatusView } from "./ui/RunStatusView.js";
import { ToastView } from "./ui/ToastView.js";
import { TutorialOverlay } from "./ui/TutorialOverlay.js";
import { UpgradeTreeView } from "./ui/UpgradeTreeView.js";

class DebtBossApp {
  #repository;
  #actionConfigService;
  #localizationService;
  #gameService;
  #bossView;
  #combatArenaView;
  #actionsView;
  #playerView;
  #boonsView;
  #boonOfferView;
  #runInfoView;
  #runStatusView;
  #upgradeTreeView;
  #toastView;
  #levelUpAnimator;
  #cinematicView;
  #failView;
  #tutorialOverlay;
  #statusTextEl;
  #errorTextEl;
  #languageToggleButton;
  #tutorialReplayButton;
  #localizedEls;
  #actionHandler = null;
  #currentState = null;
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

    this.#statusTextEl = document.getElementById("statusText");
    this.#errorTextEl = document.getElementById("errorText");
    this.#languageToggleButton = document.getElementById("languageToggleButton");
    this.#tutorialReplayButton = document.getElementById("tutorialReplayButton");

    this.#actionsView = new ActionButtonsView(document.getElementById("actions"), this.#errorTextEl);
    this.#playerView = new PlayerView({
      levelEl: document.getElementById("levelText"),
      xpTextEl: document.getElementById("xpText"),
      metaTextEl: document.getElementById("playerMetaText"),
      xpFillEl: document.getElementById("xpFill"),
    });
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
    this.#upgradeTreeView = new UpgradeTreeView(document.getElementById("upgradeTree"));
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

    this.#localizedEls = {
      appTitle: document.getElementById("appTitle"),
      appSubtitle: document.getElementById("appSubtitle"),
      runLabel: document.getElementById("runLabel"),
      shardsLabel: document.getElementById("shardsLabel"),
      levelLabel: document.getElementById("levelLabel"),
      streakLabel: document.getElementById("streakLabel"),
      statusLabel: document.getElementById("statusLabel"),
      upgradeTreeTitle: document.getElementById("upgradeTreeTitle"),
      runStatusTitle: document.getElementById("runStatusTitle"),
      ascensionTitle: document.getElementById("ascensionTitle"),
      activeBoonsTitle: document.getElementById("activeBoonsTitle"),
      boonBlockNote: document.getElementById("boonBlockNote"),
      actionsTitle: document.getElementById("actionsTitle"),
      essenceLabel: document.getElementById("essenceLabel"),
      rageLabel: document.getElementById("rageLabel"),
      corruptionLabel: document.getElementById("corruptionLabel"),
      runStatusLabel: document.getElementById("runStatusLabel"),
      runTierLabel: document.getElementById("runTierLabel"),
      runPhaseLabel: document.getElementById("runPhaseLabel"),
      runRageLabel: document.getElementById("runRageLabel"),
      runCorruptionLabel: document.getElementById("runCorruptionLabel"),
      runResistanceLabel: document.getElementById("runResistanceLabel"),
      runComboLabel: document.getElementById("runComboLabel"),
      runFailLabel: document.getElementById("runFailLabel"),
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

        const dailyRunService = new DailyRunService();
        const upgradeService = new UpgradeService(upgradePaths);
        const boonService = new BoonService(boonConfig);
        const progressionService = new ProgressionService({
          diminishingFactor: damageRules.diminishingFactor,
          xpPerDamageDivisor: progressionConfig.xpPerDamageDivisor,
          leveling: progressionConfig.leveling,
          bossDefeatXp: progressionConfig.bossDefeatXp,
          shardRewards: progressionConfig.shardRewards,
        });
        const hardcoreCombatService = new HardcoreCombatService(hardcoreConfig);
        const streakService = new StreakService();

        this.#gameService = new GameService({
          repository: this.#repository,
          actionConfigService: this.#actionConfigService,
          dailyRunService,
          upgradeService,
          boonService,
          progressionService,
          hardcoreCombatService,
          localizationService: this.#localizationService,
          streakService,
        });
      }

      this.#actionHandler = async (actionType) => {
        const result = await this.#gameService.applyAction(actionType);
        this.#playEvents(result.events);
        this.#renderAll(result.state);
      };

      const state = await this.#gameService.initialize();
      this.#renderAll(state);
      this.#wireTopControls();
    } catch (err) {
      this.#setStatus("Error");
      this.#setError(this.#toUserFriendlyStartupError(err));
      console.error(err);
      this.#actionsView.setDisabled(true);
    }
  }

  #wireTopControls() {
    if (this.#languageToggleButton && !this.#languageToggleButton.dataset.wired) {
      this.#languageToggleButton.dataset.wired = "1";
      this.#languageToggleButton.addEventListener("click", async () => {
        if (!this.#currentState) return;
        const currentLocale = this.#currentState.settings.locale;
        const nextLocale = currentLocale === "vi" ? "en" : "vi";
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
      });
    }
  }

  #renderAll(state) {
    this.#currentState = state;

    this.#renderLocalizedStaticTexts(state);

    this.#bossView.render(state);
    this.#combatArenaView.render(state);
    this.#playerView.render(state.player, state.ui.misc);
    this.#boonsView.render(state.run.activeBoons, state.ui.boons, state.settings.locale);
    this.#runInfoView.render(state);
    this.#runStatusView.render(state);
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
    const header = state.ui.header || {};
    const layout = state.ui.layout || {};
    const bossText = state.ui.boss || {};
    const statusPanel = state.ui.statusPanel || {};
    const boons = state.ui.boons || {};
    const fail = state.ui.fail || {};
    const misc = state.ui.misc || {};

    this.#setText(this.#localizedEls.appTitle, meta.title || "Debt Boss");
    this.#setText(this.#localizedEls.appSubtitle, meta.subtitle || "One ritual each day.");

    this.#setText(this.#localizedEls.runLabel, header.run || "Run");
    this.#setText(this.#localizedEls.shardsLabel, header.shards || "Shards");
    this.#setText(this.#localizedEls.levelLabel, header.level || "Level");
    this.#setText(this.#localizedEls.streakLabel, header.streak || "Streak");
    this.#setText(this.#localizedEls.statusLabel, header.status || "Status");

    this.#setText(this.#localizedEls.upgradeTreeTitle, layout.upgradeTree || "Upgrade Tree");
    this.#setText(this.#localizedEls.runStatusTitle, layout.runStatus || "Run Status");
    this.#setText(this.#localizedEls.ascensionTitle, layout.ascension || "Ascension");
    this.#setText(this.#localizedEls.activeBoonsTitle, layout.activeBoons || "Active Boons");
    this.#setText(this.#localizedEls.boonBlockNote, layout.boonNote || "Boon chamber appears after each tier defeat.");
    this.#setText(this.#localizedEls.actionsTitle, layout.actions || "Action Rituals");

    this.#setText(this.#localizedEls.essenceLabel, bossText.essence || "Essence");
    this.#setText(this.#localizedEls.rageLabel, bossText.rage || "Rage");
    this.#setText(this.#localizedEls.corruptionLabel, bossText.corruption || "Corruption");

    this.#setText(this.#localizedEls.runStatusLabel, statusPanel.status || "Status");
    this.#setText(this.#localizedEls.runTierLabel, statusPanel.tier || "Tier");
    this.#setText(this.#localizedEls.runPhaseLabel, statusPanel.phase || "Phase");
    this.#setText(this.#localizedEls.runRageLabel, statusPanel.rage || "Rage");
    this.#setText(this.#localizedEls.runCorruptionLabel, statusPanel.corruption || "Corruption");
    this.#setText(this.#localizedEls.runResistanceLabel, statusPanel.resistance || "Resistance");
    this.#setText(this.#localizedEls.runComboLabel, statusPanel.combo || "Combo");
    this.#setText(this.#localizedEls.runFailLabel, statusPanel.failCause || "Fail");

    this.#setText(this.#localizedEls.boonOverlayTitle, boons.offerTitle || "Choose Your Pact");

    this.#setText(this.#localizedEls.failTitle, fail.title || "THE ENTITY ENDURES");
    this.#setText(this.#localizedEls.failSub, fail.subtitle || "Run Failed.");

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

    const ui = this.#currentState && this.#currentState.ui ? this.#currentState.ui : {};
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
          this.#toastView.show({
            title: toasts.levelUp || "Level Up",
            body: `Lv ${event.newLevel}`,
          });
          break;
        case "BOSS_DEFEATED":
          this.#bossView.playBossDefeatCinematic();
          this.#toastView.show({
            title: toasts.tierBroken || "Tier Broken",
            body: `Tier ${event.tierLevel}`,
          });
          break;
        case "PHASE_CHANGED":
          this.#cinematicView.play(cinematic.phaseChange || "THE ENTITY AWAKENS", `${event.newPhase}`);
          break;
        case "RUN_FAILED":
          this.#cinematicView.play(cinematic.runFail || "THE ENTITY ENDURES", ui.fail && ui.fail.subtitle ? ui.fail.subtitle : "Run Failed.");
          this.#toastView.show({
            title: toasts.runFailed || "Run Failed",
            body: toasts.noRetry || "No retries today.",
          });
          break;
        case "BOON_CHOSEN":
          this.#cinematicView.play(cinematic.boonChosen || "PACT SEALED", event.boon && event.boon.name ? event.boon.name : "");
          this.#toastView.show({
            title: toasts.boonInvoked || "Boon Invoked",
            body: event.boon && event.boon.name ? event.boon.name : "",
          });
          break;
        case "UPGRADE_PURCHASED":
          this.#cinematicView.play(cinematic.upgrade || "NEW POWER AWAKENED", event.nodeName || "");
          this.#toastView.show({
            title: toasts.nodeAwakened || "Node Awakened",
            body: `${event.nodeName} ${event.newRank}`,
          });
          break;
        case "SIGIL_REVEALED":
          this.#toastView.show({
            title: toasts.sigilRevealed || "Sigil Revealed",
            body: `Tier ${event.maxTierCleared}`,
          });
          break;
        case "PERMANENT_WEAKNESS_GAINED":
          this.#toastView.show({
            title: toasts.structuralWeakness || "Structural Weakness",
            body: toasts.permBossHpReduced || "Permanent boss HP reduced.",
          });
          this.#bossView.playSigilGoldPulse();
          break;
        case "SIGIL_GOLD_GLOW":
          this.#bossView.playSigilGoldPulse();
          break;
        case "RAGE_GAINED":
          if (event.ragePercent >= 70) {
            this.#toastView.show({
              title: toasts.rageSurges || "Rage Surges",
              body: `${Math.round(event.ragePercent)}%`,
            });
          }
          break;
        case "BOON_OFFERED":
          this.#toastView.show({
            title: toasts.boonChamber || "Boon Chamber",
            body: toasts.choosePact || "Choose your pact.",
          });
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
