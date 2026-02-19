/**
 * Domain Layer: BossTier
 * Represents tier identity and base HP before permanent reductions.
 */
export class BossTier {
  constructor({ tierLevel, baseHp }) {
    if (!Number.isFinite(tierLevel) || tierLevel <= 0) {
      throw new Error("BossTier.tierLevel must be a positive number.");
    }
    if (!Number.isFinite(baseHp) || baseHp <= 0) {
      throw new Error("BossTier.baseHp must be a positive number.");
    }

    this.tierLevel = Math.floor(tierLevel);
    this.baseHp = Math.floor(baseHp);
  }

  getEffectiveHp(permanentReductionRate = 0) {
    const reduction = Number.isFinite(permanentReductionRate) ? permanentReductionRate : 0;
    const clamped = Math.max(0, Math.min(0.95, reduction));
    return Math.max(1, Math.floor(this.baseHp * (1 - clamped)));
  }

  toJSON() {
    return {
      tierLevel: this.tierLevel,
      baseHp: this.baseHp,
    };
  }

  static fromJSON(json, fallback = null) {
    if (!json || typeof json !== "object") {
      if (!fallback) throw new Error("BossTier JSON missing and no fallback provided.");
      return new BossTier(fallback);
    }

    try {
      return new BossTier({
        tierLevel: json.tierLevel,
        baseHp: json.baseHp,
      });
    } catch {
      if (!fallback) throw new Error("BossTier JSON invalid and no fallback provided.");
      return new BossTier(fallback);
    }
  }
}
