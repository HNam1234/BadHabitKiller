/**
 * Core Layer: CosmeticService
 * Daily cosmetic-only summon system. Never affects gameplay stats.
 */
export class CosmeticService {
  #weights;
  #pool;
  #byRarity;
  #byId;

  constructor(config) {
    if (!config || typeof config !== "object") {
      throw new Error("CosmeticService requires config.");
    }
    if (!Array.isArray(config.pool) || config.pool.length === 0) {
      throw new Error("CosmeticService requires non-empty pool.");
    }

    this.#weights = config.rarityWeights && typeof config.rarityWeights === "object"
      ? { ...config.rarityWeights }
      : { Common: 80, Rare: 18, Legendary: 2 };
    this.#pool = config.pool.map((item) => CosmeticService.#normalizeItem(item));
    this.#byRarity = new Map();
    this.#byId = new Map();

    for (const item of this.#pool) {
      this.#byId.set(item.id, item);
      const group = this.#byRarity.get(item.rarity) || [];
      group.push(item);
      this.#byRarity.set(item.rarity, group);
    }
  }

  createState(stored) {
    const safe = stored && typeof stored === "object" ? stored : {};
    const ownedIds = Array.isArray(safe.ownedIds)
      ? safe.ownedIds.filter((id) => typeof id === "string" && this.#byId.has(id))
      : [];
    return {
      ownedIds: Array.from(new Set(ownedIds)),
      equipped: CosmeticService.#sanitizeEquipped(safe.equipped, this.#byId),
      lastFreeSummonDate: typeof safe.lastFreeSummonDate === "string" ? safe.lastFreeSummonDate : "",
      recentPullId: typeof safe.recentPullId === "string" && this.#byId.has(safe.recentPullId) ? safe.recentPullId : "",
    };
  }

  canFreeSummonToday(cosmeticState, todayDateStamp) {
    if (!cosmeticState || typeof cosmeticState !== "object") return false;
    return cosmeticState.lastFreeSummonDate !== todayDateStamp;
  }

  summonFree(cosmeticState, todayDateStamp) {
    if (!this.canFreeSummonToday(cosmeticState, todayDateStamp)) {
      throw new Error("Daily summon already used.");
    }

    const rarity = this.#rollRarity();
    const choices = this.#byRarity.get(rarity) || this.#pool;
    const item = choices[Math.floor(Math.random() * choices.length)];

    if (!cosmeticState.ownedIds.includes(item.id)) {
      cosmeticState.ownedIds.push(item.id);
    }
    cosmeticState.recentPullId = item.id;
    cosmeticState.lastFreeSummonDate = todayDateStamp;

    const equipped = cosmeticState.equipped || {};
    if (!equipped[item.slot]) {
      equipped[item.slot] = item.id;
      cosmeticState.equipped = equipped;
    }

    return item;
  }

  equip(cosmeticState, itemId) {
    if (!this.#byId.has(itemId)) throw new Error("Unknown cosmetic item.");
    if (!cosmeticState.ownedIds.includes(itemId)) throw new Error("Item not owned.");

    const item = this.#byId.get(itemId);
    cosmeticState.equipped = cosmeticState.equipped || {};
    cosmeticState.equipped[item.slot] = item.id;
    return item;
  }

  toViewModel(cosmeticState, todayDateStamp) {
    const owned = new Set(Array.isArray(cosmeticState?.ownedIds) ? cosmeticState.ownedIds : []);
    const equipped = cosmeticState?.equipped || {};

    return {
      canSummon: this.canFreeSummonToday(cosmeticState, todayDateStamp),
      lastFreeSummonDate: cosmeticState?.lastFreeSummonDate || "",
      recentPull: this.#byId.get(cosmeticState?.recentPullId || "") || null,
      equipped,
      items: this.#pool.map((item) => ({
        ...item,
        owned: owned.has(item.id),
        equipped: equipped[item.slot] === item.id,
      })),
    };
  }

  #rollRarity() {
    const entries = Object.entries(this.#weights);
    const total = entries.reduce((sum, [, weight]) => sum + (Number.isFinite(weight) ? Math.max(0, weight) : 0), 0);
    if (total <= 0) return "Common";

    let roll = Math.random() * total;
    for (const [rarity, weightRaw] of entries) {
      const weight = Number.isFinite(weightRaw) ? Math.max(0, weightRaw) : 0;
      roll -= weight;
      if (roll <= 0) return rarity;
    }
    return entries[0][0];
  }

  static #sanitizeEquipped(raw, byId) {
    const fallback = { warrior: "", weapon: "", aura: "", damage: "" };
    if (!raw || typeof raw !== "object") return fallback;
    const out = { ...fallback };
    for (const slot of Object.keys(out)) {
      const id = typeof raw[slot] === "string" ? raw[slot] : "";
      out[slot] = byId.has(id) ? id : "";
    }
    return out;
  }

  static #normalizeItem(item) {
    if (!item || typeof item !== "object") throw new Error("Cosmetic item must be object.");
    if (typeof item.id !== "string" || item.id.trim().length === 0) throw new Error("Cosmetic item id required.");
    if (typeof item.name !== "string" || item.name.trim().length === 0) throw new Error("Cosmetic item name required.");
    if (!["warrior", "weapon", "aura", "damage"].includes(item.slot)) throw new Error("Cosmetic item slot invalid.");
    if (!["Common", "Rare", "Legendary"].includes(item.rarity)) throw new Error("Cosmetic item rarity invalid.");

    return {
      id: item.id,
      name: item.name,
      slot: item.slot,
      rarity: item.rarity,
      className: typeof item.className === "string" ? item.className : "",
    };
  }
}

