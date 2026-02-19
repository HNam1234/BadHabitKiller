/**
 * Domain Layer: Boon
 * Represents one run boon card with blessing and curse effects.
 */
export class Boon {
  constructor({
    id,
    templateId,
    name,
    epithet,
    corruptionDelta = 0,
    benefits = [],
    drawbacks = [],
  }) {
    if (typeof id !== "string" || id.trim().length === 0) {
      throw new Error("Boon.id must be a non-empty string.");
    }
    if (typeof templateId !== "string" || templateId.trim().length === 0) {
      throw new Error("Boon.templateId must be a non-empty string.");
    }
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new Error("Boon.name must be a non-empty string.");
    }
    if (typeof epithet !== "string" || epithet.trim().length === 0) {
      throw new Error("Boon.epithet must be a non-empty string.");
    }
    if (!Number.isFinite(corruptionDelta) || corruptionDelta < 0) {
      throw new Error("Boon.corruptionDelta must be a non-negative number.");
    }
    if (!Array.isArray(benefits)) {
      throw new Error("Boon.benefits must be an array.");
    }
    if (!Array.isArray(drawbacks)) {
      throw new Error("Boon.drawbacks must be an array.");
    }

    this.id = id;
    this.templateId = templateId;
    this.name = name;
    this.epithet = epithet;
    this.corruptionDelta = corruptionDelta;
    this.benefits = benefits.map((effect) => ({ ...effect }));
    this.drawbacks = drawbacks.map((effect) => ({ ...effect }));
  }

  clone() {
    return Boon.fromJSON(this.toJSON());
  }

  toJSON() {
    return {
      id: this.id,
      templateId: this.templateId,
      name: this.name,
      epithet: this.epithet,
      corruptionDelta: this.corruptionDelta,
      benefits: this.benefits.map((effect) => ({ ...effect })),
      drawbacks: this.drawbacks.map((effect) => ({ ...effect })),
    };
  }

  static fromJSON(json) {
    if (!json || typeof json !== "object") throw new Error("Boon JSON must be an object.");
    return new Boon({
      id: json.id,
      templateId: json.templateId,
      name: json.name,
      epithet: json.epithet,
      corruptionDelta: json.corruptionDelta,
      benefits: json.benefits,
      drawbacks: json.drawbacks,
    });
  }
}
