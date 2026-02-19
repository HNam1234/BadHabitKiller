/**
 * Domain Layer: UpgradeNode
 * Definition + owned rank for one upgrade.
 */
export class UpgradeNode {
  constructor({
    id,
    pathId,
    name,
    description,
    cost,
    maxRank = 1,
    rank = 0,
    prerequisiteIds = [],
    effects = [],
  }) {
    if (typeof id !== "string" || id.trim().length === 0) {
      throw new Error("UpgradeNode.id must be a non-empty string.");
    }
    if (typeof pathId !== "string" || pathId.trim().length === 0) {
      throw new Error("UpgradeNode.pathId must be a non-empty string.");
    }
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new Error("UpgradeNode.name must be a non-empty string.");
    }
    if (typeof description !== "string" || description.trim().length === 0) {
      throw new Error("UpgradeNode.description must be a non-empty string.");
    }
    if (!Number.isFinite(cost) || cost <= 0) {
      throw new Error("UpgradeNode.cost must be a positive number.");
    }
    if (!Number.isFinite(maxRank) || maxRank <= 0) {
      throw new Error("UpgradeNode.maxRank must be a positive number.");
    }
    if (!Number.isFinite(rank) || rank < 0) {
      throw new Error("UpgradeNode.rank must be a non-negative number.");
    }
    if (!Array.isArray(prerequisiteIds)) {
      throw new Error("UpgradeNode.prerequisiteIds must be an array.");
    }
    if (!Array.isArray(effects)) {
      throw new Error("UpgradeNode.effects must be an array.");
    }

    this.id = id;
    this.pathId = pathId;
    this.name = name;
    this.description = description;
    this.cost = Math.floor(cost);
    this.maxRank = Math.floor(maxRank);
    this.rank = Math.min(Math.floor(rank), this.maxRank);
    this.prerequisiteIds = prerequisiteIds.slice();
    this.effects = effects.map((effect) => ({ ...effect }));
  }

  isMaxed() {
    return this.rank >= this.maxRank;
  }

  increaseRank() {
    if (this.isMaxed()) return false;
    this.rank += 1;
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      pathId: this.pathId,
      name: this.name,
      description: this.description,
      cost: this.cost,
      maxRank: this.maxRank,
      rank: this.rank,
      prerequisiteIds: this.prerequisiteIds.slice(),
      effects: this.effects.map((effect) => ({ ...effect })),
    };
  }
}
