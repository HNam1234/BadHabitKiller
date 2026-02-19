/**
 * Domain Layer: Reward
 * Represents a reward definition, typically granted by quests.
 */
export class Reward {
  constructor({ type, value, duration, charges }) {
    if (typeof type !== "string" || type.trim().length === 0) throw new Error("Reward.type must be a non-empty string.");
    if (!Number.isFinite(value)) throw new Error("Reward.value must be a number.");
    if (duration !== "run" && duration !== "permanent") throw new Error("Reward.duration must be 'run' or 'permanent'.");
    if ("charges" in (arguments[0] || {}) && (!Number.isFinite(charges) || charges <= 0)) {
      throw new Error("Reward.charges must be a positive number when present.");
    }

    this.type = type;
    this.value = value;
    this.duration = duration;
    this.charges = charges;
  }

  toJSON() {
    const json = {
      type: this.type,
      value: this.value,
      duration: this.duration,
    };
    if (Number.isFinite(this.charges)) json.charges = this.charges;
    return json;
  }

  static fromJSON(json) {
    if (!json || typeof json !== "object") throw new Error("Reward JSON must be an object.");
    const init = {
      type: json.type,
      value: json.value,
      duration: json.duration,
    };
    if ("charges" in json) init.charges = json.charges;
    return new Reward(init);
  }
}
