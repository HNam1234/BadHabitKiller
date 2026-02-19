/**
 * Core Layer: QuestService
 * - Deterministic daily quest generation
 * - Quest completion checks (delegates evaluation to Quest.checkCompletion)
 *
 * No DOM, no persistence.
 */
import { Quest } from "../domain/Quest.js";
import { Reward } from "../domain/Reward.js";

export class QuestService {
  getOrCreateDailyQuest(existingQuestState, dateStamp, templates) {
    if (typeof dateStamp !== "string" || dateStamp.trim().length === 0) {
      throw new Error("QuestService requires a dateStamp.");
    }
    if (!Array.isArray(templates) || templates.length === 0) {
      throw new Error("QuestService requires non-empty templates.");
    }

    if (
      existingQuestState &&
      typeof existingQuestState === "object" &&
      existingQuestState.dateStamp === dateStamp &&
      existingQuestState.quest &&
      typeof existingQuestState.quest === "object"
    ) {
      try {
        return Quest.fromJSON(existingQuestState.quest);
      } catch {
        // If stored quest is corrupted, fall back to a regenerated quest for today.
      }
    }

    const index = QuestService.#hashStringToIndex(dateStamp, templates.length);
    const template = templates[index];
    return QuestService.#fromTemplate(template);
  }

  checkQuestCompletion(quest, metrics) {
    if (!(quest instanceof Quest)) throw new Error("QuestService.checkQuestCompletion requires a Quest.");
    return quest.checkCompletion(metrics);
  }

  static #fromTemplate(template) {
    const rewardInit = {
      type: template.reward.type,
      value: template.reward.value,
      duration: template.reward.duration,
    };
    if (template.reward && typeof template.reward === "object" && "charges" in template.reward) {
      rewardInit.charges = template.reward.charges;
    }

    const reward = new Reward(rewardInit);

    return new Quest({
      id: template.id,
      description: template.description,
      conditionType: template.conditionType,
      targetValue: template.targetValue,
      conditionMeta: template.conditionMeta,
      reward,
      isCompleted: false,
    });
  }

  static #hashStringToIndex(input, modulo) {
    // FNV-1a 32-bit
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    const unsigned = hash >>> 0;
    return unsigned % modulo;
  }
}
