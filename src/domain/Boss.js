/**
 * Domain Layer: Boss entity
 * - Pure state + invariants + behavior
 * - No UI (DOM) and no persistence concerns
 */
export class Boss {
  constructor(name, totalHp, currentHp) {
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new Error("Boss requires a non-empty name.");
    }
    if (!Number.isFinite(totalHp) || totalHp <= 0) {
      throw new Error("Boss requires a positive totalHp.");
    }

    const resolvedCurrentHp = Number.isFinite(currentHp) ? currentHp : totalHp;

    this.name = name;
    this.totalHp = totalHp;
    this.currentHp = Boss.#clamp(resolvedCurrentHp, 0, totalHp);
  }

  takeDamage(amount) {
    if (!Number.isFinite(amount) || amount <= 0) {
      return { appliedDamage: 0, overflowDamage: 0 };
    }

    const before = this.currentHp;
    this.currentHp = Math.max(0, this.currentHp - amount);

    const appliedDamage = before - this.currentHp;
    const overflowDamage = Math.max(0, amount - appliedDamage);

    return { appliedDamage, overflowDamage };
  }

  getRemainingHp() {
    return this.currentHp;
  }

  getHpPercentage() {
    return (this.currentHp / this.totalHp) * 100;
  }

  toJSON() {
    return {
      name: this.name,
      totalHp: this.totalHp,
      currentHp: this.currentHp,
    };
  }

  static #clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
}
