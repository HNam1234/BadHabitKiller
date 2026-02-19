/**
 * Presentation Layer: QuestView
 * Renders daily quest info + progress.
 */
export class QuestView {
  #descriptionEl;
  #progressTextEl;
  #fillEl;
  #rewardEl;
  #formatter;

  constructor({
    descriptionEl,
    progressTextEl,
    fillEl,
    rewardEl,
    formatter = new Intl.NumberFormat("en-US"),
  }) {
    if (!descriptionEl || !progressTextEl || !fillEl || !rewardEl) {
      throw new Error("QuestView missing required elements.");
    }
    this.#descriptionEl = descriptionEl;
    this.#progressTextEl = progressTextEl;
    this.#fillEl = fillEl;
    this.#rewardEl = rewardEl;
    this.#formatter = formatter;
  }

  render(questVm) {
    this.#descriptionEl.textContent = questVm.description;

    const current = Number.isFinite(questVm.currentValue) ? questVm.currentValue : 0;
    const target = Number.isFinite(questVm.targetValue) ? questVm.targetValue : 0;
    this.#progressTextEl.textContent = `${this.#formatter.format(current)} / ${this.#formatter.format(target)}`;

    const percent = Number.isFinite(questVm.progressPercent) ? questVm.progressPercent : 0;
    const clamped = Math.max(0, Math.min(100, percent));
    this.#fillEl.style.width = `${clamped}%`;

    const rewardText = QuestView.#rewardToText(questVm.reward);
    this.#rewardEl.textContent = questVm.isCompleted ? `Completed. ${rewardText}` : `Reward: ${rewardText}`;
  }

  static #rewardToText(rewardJson) {
    if (!rewardJson || typeof rewardJson !== "object") return "Unknown";

    const value = rewardJson.value;
    const percent = Number.isFinite(value) ? Math.round(value * 100) : null;

    switch (rewardJson.type) {
      case "XP_GRANT":
        return `${Number.isFinite(value) ? value : 0} XP`;
      case "RUN_DAMAGE_MULTIPLIER_ADD":
        return `+${percent}% damage (run)`;
      case "PERM_DAMAGE_MULTIPLIER_ADD":
        return `+${percent}% damage (permanent)`;
      case "NEXT_HITS_DAMAGE_MULTIPLIER":
        return `+${percent}% next hits (${rewardJson.charges || 0})`;
      default:
        return rewardJson.type;
    }
  }
}

