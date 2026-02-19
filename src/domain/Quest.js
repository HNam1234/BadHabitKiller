/**
 * Domain Layer: Quest
 * Holds quest definition and completion state.
 */
import { Reward } from "./Reward.js";

export class Quest {
  constructor({ id, description, conditionType, targetValue, conditionMeta, reward, isCompleted }) {
    if (typeof id !== "string" || id.trim().length === 0) throw new Error("Quest.id must be a non-empty string.");
    if (typeof description !== "string" || description.trim().length === 0) {
      throw new Error("Quest.description must be a non-empty string.");
    }
    if (typeof conditionType !== "string" || conditionType.trim().length === 0) {
      throw new Error("Quest.conditionType must be a non-empty string.");
    }
    if (!Number.isFinite(targetValue) || targetValue <= 0) throw new Error("Quest.targetValue must be a positive number.");
    if (!(reward instanceof Reward)) throw new Error("Quest.reward must be a Reward.");

    this.id = id;
    this.description = description;
    this.conditionType = conditionType;
    this.targetValue = targetValue;
    this.conditionMeta = conditionMeta && typeof conditionMeta === "object" ? conditionMeta : null;
    this.reward = reward;
    this.isCompleted = Boolean(isCompleted);
  }

  /**
   * @param {{ dateStamp: string, streak: { dailyStreak: number }, todayStats: { damageDealt: number, actionsCount: number, actionsByType: Record<string, number> }, dailyStats: Array<{ dateStamp: string, actionsByType: Record<string, number> }>}} metrics
   */
  checkCompletion(metrics) {
    const todayStats = metrics && metrics.todayStats ? metrics.todayStats : null;
    const streak = metrics && metrics.streak ? metrics.streak : null;
    const dailyStats = metrics && Array.isArray(metrics.dailyStats) ? metrics.dailyStats : [];
    const dateStamp = metrics && typeof metrics.dateStamp === "string" ? metrics.dateStamp : null;

    let currentValue = 0;

    switch (this.conditionType) {
      case "DAMAGE_TODAY":
        currentValue = todayStats && Number.isFinite(todayStats.damageDealt) ? todayStats.damageDealt : 0;
        break;
      case "ACTIONS_TODAY":
        currentValue = todayStats && Number.isFinite(todayStats.actionsCount) ? todayStats.actionsCount : 0;
        break;
      case "STREAK_AT_LEAST":
        currentValue = streak && Number.isFinite(streak.dailyStreak) ? streak.dailyStreak : 0;
        break;
      case "ACTION_CONSECUTIVE_DAYS": {
        const actionType = this.conditionMeta && typeof this.conditionMeta.actionType === "string" ? this.conditionMeta.actionType : null;
        if (!actionType || !dateStamp) {
          currentValue = 0;
          break;
        }

        const byDate = new Map();
        for (const stat of dailyStats) {
          if (!stat || typeof stat.dateStamp !== "string") continue;
          byDate.set(stat.dateStamp, stat);
        }

        let consecutive = 0;
        for (let i = 0; i < this.targetValue; i++) {
          const ds = Quest.#addDaysToDateStamp(dateStamp, -i);
          const stat = byDate.get(ds);
          const count = stat && stat.actionsByType && Number.isFinite(stat.actionsByType[actionType]) ? stat.actionsByType[actionType] : 0;
          if (count > 0) consecutive += 1;
          else break;
        }
        currentValue = consecutive;
        break;
      }
      default:
        currentValue = 0;
        break;
    }

    return {
      completed: currentValue >= this.targetValue,
      currentValue,
    };
  }

  toJSON() {
    return {
      id: this.id,
      description: this.description,
      conditionType: this.conditionType,
      targetValue: this.targetValue,
      conditionMeta: this.conditionMeta,
      reward: this.reward.toJSON(),
      isCompleted: this.isCompleted,
    };
  }

  static fromJSON(json) {
    if (!json || typeof json !== "object") throw new Error("Quest JSON must be an object.");
    return new Quest({
      id: json.id,
      description: json.description,
      conditionType: json.conditionType,
      targetValue: json.targetValue,
      conditionMeta: json.conditionMeta,
      reward: Reward.fromJSON(json.reward),
      isCompleted: json.isCompleted,
    });
  }

  static #addDaysToDateStamp(dateStamp, daysDelta) {
    const [y, m, d] = dateStamp.split("-").map((v) => Number(v));
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + daysDelta);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

