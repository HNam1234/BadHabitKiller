/**
 * Domain Layer: SigilProgress
 * Tracks permanent reveal state for the entity sigil.
 */
export class SigilProgress {
  #milestones;
  #fullRevealAtTier;

  constructor({ maxTierCleared = 0, milestones = [], fullRevealAtTier = 12 } = {}) {
    if (!Array.isArray(milestones) || milestones.length < 3) {
      throw new Error("SigilProgress.milestones must contain at least 3 entries.");
    }
    if (!Number.isFinite(fullRevealAtTier) || fullRevealAtTier <= 0) {
      throw new Error("SigilProgress.fullRevealAtTier must be > 0.");
    }

    this.maxTierCleared = Number.isFinite(maxTierCleared) && maxTierCleared >= 0 ? Math.floor(maxTierCleared) : 0;
    this.#milestones = milestones
      .filter((value) => Number.isFinite(value) && value > 0)
      .map((value) => Math.floor(value))
      .sort((a, b) => a - b);
    this.#fullRevealAtTier = Math.floor(fullRevealAtTier);
  }

  recordTierClear(tierLevel) {
    const tier = Number.isFinite(tierLevel) && tierLevel > 0 ? Math.floor(tierLevel) : 0;
    if (tier > this.maxTierCleared) {
      this.maxTierCleared = tier;
    }
  }

  toViewModel(currentHpPercent, ragePercent) {
    const revealPercent = Math.max(0, Math.min(100, (this.maxTierCleared / this.#fullRevealAtTier) * 100));
    return {
      maxTierCleared: this.maxTierCleared,
      revealPercent,
      layers: {
        tier3: this.maxTierCleared >= this.#milestones[0],
        tier5: this.maxTierCleared >= this.#milestones[1],
        tier8: this.maxTierCleared >= this.#milestones[2],
      },
      fractureActive: Number.isFinite(currentHpPercent) ? currentHpPercent <= 30 : false,
      ragePulse: Number.isFinite(ragePercent) ? ragePercent >= 70 : false,
    };
  }

  toJSON() {
    return {
      maxTierCleared: this.maxTierCleared,
    };
  }

  static fromJSON(json, defaults) {
    const fallback = defaults && typeof defaults === "object" ? defaults : {};

    const maxTierCleared =
      json && Number.isFinite(json.maxTierCleared) && json.maxTierCleared >= 0
        ? json.maxTierCleared
        : fallback.maxTierCleared;

    return new SigilProgress({
      maxTierCleared,
      milestones: fallback.milestones,
      fullRevealAtTier: fallback.fullRevealAtTier,
    });
  }
}
