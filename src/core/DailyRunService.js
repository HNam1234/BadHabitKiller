/**
 * Core Layer: DailyRunService
 * Enforces one run per local real-world day.
 */
export class DailyRunService {
  createOrResumeRun(storedRun, todayDateStamp, tierOneHp) {
    const safeTierOneHp = Number.isFinite(tierOneHp) && tierOneHp > 0 ? Math.floor(tierOneHp) : 1;
    const sanitized = DailyRunService.#sanitizeRun(storedRun, safeTierOneHp);

    if (!sanitized || sanitized.dateStamp !== todayDateStamp) {
      const previousRunNumber = sanitized && Number.isFinite(sanitized.runNumber) ? sanitized.runNumber : 0;
      return {
        run: DailyRunService.#newRun(todayDateStamp, previousRunNumber + 1, safeTierOneHp),
        didReset: true,
      };
    }

    return {
      run: sanitized,
      didReset: false,
    };
  }

  resetForNewDay(previousRun, todayDateStamp, tierOneHp) {
    const previousRunNumber =
      previousRun && Number.isFinite(previousRun.runNumber) && previousRun.runNumber > 0
        ? Math.floor(previousRun.runNumber)
        : 0;
    const safeTierOneHp = Number.isFinite(tierOneHp) && tierOneHp > 0 ? Math.floor(tierOneHp) : 1;
    return DailyRunService.#newRun(todayDateStamp, previousRunNumber + 1, safeTierOneHp);
  }

  static #newRun(dateStamp, runNumber, tierOneHp) {
    return {
      dateStamp,
      runNumber,
      status: "ACTIVE",
      failedReason: "",
      bossTierLevel: 1,
      bossCurrentHp: tierOneHp,
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
    };
  }

  static #sanitizeRun(run, tierOneHp) {
    if (!run || typeof run !== "object") return null;

    const dateStamp = typeof run.dateStamp === "string" && run.dateStamp.length > 0 ? run.dateStamp : null;
    if (!dateStamp) return null;

    const runNumber = Number.isFinite(run.runNumber) && run.runNumber > 0 ? Math.floor(run.runNumber) : 1;
    const status = run.status === "FAILED" ? "FAILED" : "ACTIVE";
    const failedReason = typeof run.failedReason === "string" ? run.failedReason : "";
    const bossTierLevel = Number.isFinite(run.bossTierLevel) && run.bossTierLevel > 0 ? Math.floor(run.bossTierLevel) : 1;
    const bossCurrentHp = Number.isFinite(run.bossCurrentHp) && run.bossCurrentHp > 0 ? Math.floor(run.bossCurrentHp) : tierOneHp;
    const actionsCount = Number.isFinite(run.actionsCount) && run.actionsCount >= 0 ? Math.floor(run.actionsCount) : 0;
    const comboCount = Number.isFinite(run.comboCount) && run.comboCount >= 0 ? Math.floor(run.comboCount) : 0;
    const firstHitConsumed = Boolean(run.firstHitConsumed);
    const ragePercent = Number.isFinite(run.ragePercent) ? run.ragePercent : 0;
    const corruptionPercent = Number.isFinite(run.corruptionPercent) ? run.corruptionPercent : 0;
    const phase = Number.isFinite(run.phase) && run.phase > 0 ? Math.floor(run.phase) : 1;
    const lastActionAt = typeof run.lastActionAt === "string" && run.lastActionAt.length > 0 ? run.lastActionAt : null;
    const lastActionType = typeof run.lastActionType === "string" ? run.lastActionType : "";
    const repeatedActionCount =
      Number.isFinite(run.repeatedActionCount) && run.repeatedActionCount >= 0 ? Math.floor(run.repeatedActionCount) : 0;
    const comboBreaksCount =
      Number.isFinite(run.comboBreaksCount) && run.comboBreaksCount >= 0 ? Math.floor(run.comboBreaksCount) : 0;
    const impulseResistanceAdd = Number.isFinite(run.impulseResistanceAdd) ? run.impulseResistanceAdd : 0;
    const campaignId = typeof run.campaignId === "string" ? run.campaignId : "";
    const deepWorkActions = Number.isFinite(run.deepWorkActions) && run.deepWorkActions >= 0 ? Math.floor(run.deepWorkActions) : 0;
    const hadImpulseToday = Boolean(run.hadImpulseToday);
    const activeBoons = Array.isArray(run.activeBoons) ? run.activeBoons : [];
    const boonOffer = Array.isArray(run.boonOffer) ? run.boonOffer : [];

    return {
      dateStamp,
      runNumber,
      status,
      failedReason,
      bossTierLevel,
      bossCurrentHp,
      actionsCount,
      comboCount,
      firstHitConsumed,
      ragePercent,
      corruptionPercent,
      phase,
      lastActionAt,
      lastActionType,
      repeatedActionCount,
      comboBreaksCount,
      impulseResistanceAdd,
      campaignId,
      deepWorkActions,
      hadImpulseToday,
      activeBoons,
      boonOffer,
    };
  }
}
