/**
 * Domain Layer: Card
 * Lightweight deck/relic entry used by CardService.
 */
export class Card {
  constructor({
    id,
    name,
    type,
    tags = [],
    effect = {},
    tradeoff = null,
  }) {
    if (typeof id !== "string" || id.trim().length === 0) {
      throw new Error("Card.id must be a non-empty string.");
    }
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new Error("Card.name must be a non-empty string.");
    }
    if (type !== "Permanent" && type !== "Run") {
      throw new Error("Card.type must be Permanent or Run.");
    }
    if (!Array.isArray(tags)) {
      throw new Error("Card.tags must be an array.");
    }
    if (!effect || typeof effect !== "object") {
      throw new Error("Card.effect must be an object.");
    }
    if (tradeoff !== null && typeof tradeoff !== "object") {
      throw new Error("Card.tradeoff must be null or an object.");
    }

    this.id = id;
    this.name = name;
    this.type = type;
    this.tags = tags.filter((tag) => typeof tag === "string" && tag.length > 0);
    this.effect = { ...effect };
    this.tradeoff = tradeoff ? { ...tradeoff } : null;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      tags: this.tags.slice(),
      effect: { ...this.effect },
      tradeoff: this.tradeoff ? { ...this.tradeoff } : null,
    };
  }

  static fromJSON(json) {
    if (!json || typeof json !== "object") throw new Error("Card JSON must be an object.");
    return new Card({
      id: json.id,
      name: json.name,
      type: json.type,
      tags: json.tags,
      effect: json.effect,
      tradeoff: json.tradeoff,
    });
  }
}

