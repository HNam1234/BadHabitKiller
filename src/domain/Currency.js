/**
 * Domain Layer: Currency
 * Keeps permanent economy state.
 */
export class Currency {
  constructor({ shards = 0 } = {}) {
    this.shards = Number.isFinite(shards) && shards >= 0 ? Math.floor(shards) : 0;
  }

  addShards(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.shards += Math.floor(amount);
  }

  spendShards(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const cost = Math.floor(amount);
    if (this.shards < cost) return false;
    this.shards -= cost;
    return true;
  }

  toJSON() {
    return { shards: this.shards };
  }

  static fromJSON(json) {
    if (!json || typeof json !== "object") return new Currency();
    return new Currency({ shards: json.shards });
  }
}
