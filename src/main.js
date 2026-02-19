/**
 * Composition Root
 * Wires Infra + Core + UI. UI reacts only to state from GameService.
 */
import { ActionConfigService } from "./core/ActionConfigService.js";
import { BoonService } from "./core/BoonService.js";
import { DailyRunService } from "./core/DailyRunService.js";
import { GameService } from "./core/GameService.js";
import { HardcoreCombatService } from "./core/HardcoreCombatService.js";
import { ProgressionService } from "./core/ProgressionService.js";
import { StreakService } from "./core/StreakService.js";
import { UpgradeService } from "./core/UpgradeService.js";
import { LocalStorageRepository } from "./infra/LocalStorageRepository.js";
import { ActionButtonsView } from "./ui/ActionButtonsView.js";
import { BossView } from "./ui/BossView.js";
import { BuffOfferView } from "./ui/BuffOfferView.js";
import { BuffsView } from "./ui/BuffsView.js";
import { CinematicTextView } from "./ui/CinematicTextView.js";
import { DamageAnimator } from "./ui/DamageAnimator.js";
import { FailView } from "./ui/FailView.js";
import { LevelUpAnimator } from "./ui/LevelUpAnimator.js";
import { PlayerView } from "./ui/PlayerView.js";
import { RunInfoView } from "./ui/RunInfoView.js";
import { RunStatusView } from "./ui/RunStatusView.js";
import { ToastView } from "./ui/ToastView.js";
import { UpgradeTreeView } from "./ui/UpgradeTreeView.js";

class DebtBossApp {
  #repository;
  #actionConfigService;
  #gameService;
  #bossView;
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
  #statusTextEl;
  #errorTextEl;
  #initializePromise = null;

  constructor() {
    const configUrl = new URL("../config.json", import.meta.url).toString();

    this.#repository = new LocalStorageRepository("debtBoss.gameState.v4");
    this.#actionConfigService = new ActionConfigService(configUrl);
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

    this.#statusTextEl = document.getElementById("statusText");
    this.#errorTextEl = document.getElementById("errorText");
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
          streakService,
        });
      }

      const state = await this.#gameService.initialize();
      this.#renderAll(state);

      this.#actionsView.render(state.availableActions, async (actionType) => {
        const result = await this.#gameService.applyAction(actionType);
        this.#playEvents(result.events);
        this.#renderAll(result.state);
      });

      this.#actionsView.setDisabled(Boolean(state.run.awaitingBoonChoice) || state.run.status === "FAILED");
      this.#setStatus(state.ui.statusText || "Ready");
    } catch (err) {
      this.#setStatus("Error");
      this.#setError(this.#toUserFriendlyStartupError(err));
      console.error(err);
      this.#actionsView.setDisabled(true);
    }
  }

  #renderAll(state) {
    this.#bossView.render(state);
    this.#playerView.render(state.player);
    this.#boonsView.render(state.run.activeBoons);
    this.#runInfoView.render(state);
    this.#runStatusView.render(state);
    this.#failView.render(state.run);

    const locked = Boolean(state.run.awaitingBoonChoice) || state.run.status === "FAILED";
    this.#actionsView.setDisabled(locked);

    this.#boonOfferView.render(state.run.boonOffer, async (boonId) => {
      try {
        this.#setError("");
        const result = await this.#gameService.chooseBoon(boonId);
        this.#playEvents(result.events);
        this.#renderAll(result.state);
      } catch (err) {
        this.#setError(err instanceof Error ? err.message : "Failed to choose boon.");
      }
    });

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
  }

  #playEvents(events) {
    if (!Array.isArray(events)) return;

    for (const event of events) {
      if (!event || typeof event.type !== "string") continue;

      switch (event.type) {
        case "DAMAGE":
          this.#bossView.playHit({
            amount: event.amount,
            isCrit: Boolean(event.isCrit),
            isHeavy: Boolean(event.isHeavy),
          });
          break;
        case "LEVEL_UP":
          this.#levelUpAnimator.play({ newLevel: event.newLevel, levelsGained: event.levelsGained });
          this.#toastView.show({ title: "Level Up", body: `You reached level ${event.newLevel}.` });
          break;
        case "BOSS_DEFEATED":
          this.#bossView.playBossDefeatCinematic();
          this.#toastView.show({ title: "Tier Broken", body: `Tier ${event.tierLevel} has fallen.` });
          break;
        case "PHASE_CHANGED":
          this.#cinematicView.play("THE ENTITY AWAKENS", `Phase ${event.newPhase}`);
          break;
        case "RUN_FAILED":
          this.#cinematicView.play("THE ENTITY ENDURES", "Run Failed.");
          this.#toastView.show({ title: "Run Failed", body: "No retries today." });
          break;
        case "BOON_CHOSEN":
          this.#cinematicView.play("PACT SEALED", event.boon && event.boon.name ? event.boon.name : "Boon chosen");
          this.#toastView.show({ title: "Boon Invoked", body: event.boon && event.boon.name ? event.boon.name : "" });
          break;
        case "UPGRADE_PURCHASED":
          this.#cinematicView.play("NEW POWER AWAKENED", event.nodeName || "");
          this.#toastView.show({ title: "Node Awakened", body: `${event.nodeName} Rank ${event.newRank}` });
          break;
        case "SIGIL_REVEALED":
          this.#toastView.show({ title: "Sigil Revealed", body: `Tier memory ${event.maxTierCleared}` });
          break;
        case "PERMANENT_WEAKNESS_GAINED":
          this.#toastView.show({ title: "Structural Weakness", body: `Permanent boss HP reduced.` });
          this.#bossView.playSigilGoldPulse();
          break;
        case "SIGIL_GOLD_GLOW":
          this.#bossView.playSigilGoldPulse();
          break;
        case "RAGE_GAINED":
          if (event.ragePercent >= 70) {
            this.#toastView.show({ title: "Rage Surges", body: `${Math.round(event.ragePercent)}%` });
          }
          break;
        case "BOON_OFFERED":
          this.#toastView.show({ title: "Boon Chamber", body: "Choose your pact." });
          break;
        case "RUN_RESET":
          this.#cinematicView.play("A NEW RITUAL BEGINS", event.dateStamp || "");
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
      return "Cannot load config.json from file://. Run a local server and open via localhost.";
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
