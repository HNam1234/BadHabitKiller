/**
 * Domain Layer: Buff
 * Run-scoped buff instance.
 */
export class Buff {
  constructor({
    id,
    type,
    name,
    description,
    value = 0,
    stacks = 0,
    maxStacks = 0,
    remainingHits = 0,
  }) {
    if (typeof id !== "string" || id.trim().length === 0) {
      throw new Error("Buff.id must be a non-empty string.");
    }
    if (typeof type !== "string" || type.trim().length === 0) {
      throw new Error("Buff.type must be a non-empty string.");
    }
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new Error("Buff.name must be a non-empty string.");
    }
    if (typeof description !== "string" || description.trim().length === 0) {
      throw new Error("Buff.description must be a non-empty string.");
    }
    if (!Number.isFinite(value)) {
      throw new Error("Buff.value must be a number.");
    }

    this.id = id;
    this.type = type;
    this.name = name;
    this.description = description;
    this.value = value;
    this.stacks = Number.isFinite(stacks) && stacks >= 0 ? Math.floor(stacks) : 0;
    this.maxStacks = Number.isFinite(maxStacks) && maxStacks >= 0 ? Math.floor(maxStacks) : 0;
    this.remainingHits =
      Number.isFinite(remainingHits) && remainingHits >= 0 ? Math.floor(remainingHits) : 0;
  }

  clone() {
    return Buff.fromJSON(this.toJSON());
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      description: this.description,
      value: this.value,
      stacks: this.stacks,
      maxStacks: this.maxStacks,
      remainingHits: this.remainingHits,
    };
  }

  static fromJSON(json) {
    if (!json || typeof json !== "object") throw new Error("Buff JSON must be an object.");
    return new Buff({
      id: json.id,
      type: json.type,
      name: json.name,
      description: json.description,
      value: json.value,
      stacks: json.stacks,
      maxStacks: json.maxStacks,
      remainingHits: json.remainingHits,
    });
  }
}
