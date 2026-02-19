/**
 * Domain Layer: Player
 * Holds persistent progression state only.
 */
export class Player {
  constructor({
    level = 1,
    xp = 0,
    permanentDamageMultiplier = 0,
    permanentBossHpReduction = 0,
    streakGraceCharges = 0,
  } = {}) {
    this.level = Number.isFinite(level) && level > 0 ? Math.floor(level) : 1;
    this.xp = Number.isFinite(xp) && xp >= 0 ? Math.floor(xp) : 0;
    this.permanentDamageMultiplier =
      Number.isFinite(permanentDamageMultiplier) && permanentDamageMultiplier >= 0
        ? permanentDamageMultiplier
        : 0;
    this.permanentBossHpReduction =
      Number.isFinite(permanentBossHpReduction) && permanentBossHpReduction >= 0
        ? permanentBossHpReduction
        : 0;
    this.streakGraceCharges =
      Number.isFinite(streakGraceCharges) && streakGraceCharges >= 0 ? Math.floor(streakGraceCharges) : 0;
  }

  gainXp(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.xp += Math.floor(amount);
  }

  levelUp() {
    this.level += 1;
  }

  addPermanentDamageMultiplier(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.permanentDamageMultiplier += amount;
  }

  addPermanentBossHpReduction(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.permanentBossHpReduction = Math.max(0, Math.min(0.9, this.permanentBossHpReduction + amount));
  }

  addStreakGraceCharges(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.streakGraceCharges += Math.floor(amount);
  }

  consumeStreakGraceCharge() {
    if (this.streakGraceCharges <= 0) return false;
    this.streakGraceCharges -= 1;
    return true;
  }

  toJSON() {
    return {
      level: this.level,
      xp: this.xp,
      permanentDamageMultiplier: this.permanentDamageMultiplier,
      permanentBossHpReduction: this.permanentBossHpReduction,
      streakGraceCharges: this.streakGraceCharges,
    };
  }

  static fromJSON(json, fallback = {}) {
    if (!json || typeof json !== "object") {
      return new Player(fallback);
    }

    return new Player({
      level: json.level,
      xp: json.xp,
      permanentDamageMultiplier: json.permanentDamageMultiplier,
      permanentBossHpReduction: json.permanentBossHpReduction,
      streakGraceCharges: json.streakGraceCharges,
    });
  }
}
