/**
 * Core Layer: CardService
 * Manages a lightweight deck pool and exposes combat profile from active cards.
 */
import { Card } from "../domain/Card.js";

export class CardService {
  #maxPoolSize;
  #activeSlots;
  #synergy;
  #catalog;

  constructor({ maxPoolSize, activeSlots, synergy, cards }) {
    if (!Number.isFinite(maxPoolSize) || maxPoolSize <= 0) {
      throw new Error("CardService requires maxPoolSize > 0.");
    }
    if (!Number.isFinite(activeSlots) || activeSlots <= 0) {
      throw new Error("CardService requires activeSlots > 0.");
    }
    if (!Array.isArray(cards) || cards.length === 0) {
      throw new Error("CardService requires non-empty cards list.");
    }

    this.#maxPoolSize = Math.floor(maxPoolSize);
    this.#activeSlots = Math.floor(activeSlots);
    this.#synergy = synergy && typeof synergy === "object" ? { ...synergy } : {};
    this.#catalog = new Map();

    for (const cardRaw of cards) {
      const card = Card.fromJSON(cardRaw);
      this.#catalog.set(card.id, card);
    }
  }

  createState(storedState) {
    const stored = storedState && typeof storedState === "object" ? storedState : {};

    const defaultPool = Array.from(this.#catalog.values())
      .slice(0, this.#maxPoolSize)
      .map((card) => card.id);
    const poolCardIds = CardService.#sanitizeIds(stored.poolCardIds, this.#catalog, this.#maxPoolSize, defaultPool);

    const defaultActive = poolCardIds.slice(0, this.#activeSlots);
    const activeCardIds = CardService.#sanitizeIds(stored.activeCardIds, this.#catalog, this.#activeSlots, defaultActive)
      .filter((id) => poolCardIds.includes(id));

    const runCardIds = CardService.#sanitizeIds(stored.runCardIds, this.#catalog, this.#maxPoolSize, [])
      .filter((id) => poolCardIds.includes(id) && this.#catalog.get(id).type === "Run");

    return {
      maxPoolSize: this.#maxPoolSize,
      activeSlots: this.#activeSlots,
      poolCardIds,
      activeCardIds,
      runCardIds,
    };
  }

  resetForNewDay(deckState) {
    if (!deckState || typeof deckState !== "object") return;
    const runSet = new Set(deckState.runCardIds || []);
    if (runSet.size === 0) return;

    deckState.poolCardIds = (deckState.poolCardIds || []).filter((id) => !runSet.has(id));
    deckState.activeCardIds = (deckState.activeCardIds || []).filter((id) => !runSet.has(id));
    deckState.runCardIds = [];
  }

  setActiveCards(deckState, cardIds) {
    if (!deckState || typeof deckState !== "object") throw new Error("Deck state is required.");
    const requested = Array.isArray(cardIds) ? cardIds : [];
    const valid = [];
    for (const id of requested) {
      if (valid.length >= this.#activeSlots) break;
      if (typeof id !== "string" || !this.#catalog.has(id)) continue;
      if (!(deckState.poolCardIds || []).includes(id)) continue;
      if (!valid.includes(id)) valid.push(id);
    }
    deckState.activeCardIds = valid;
    return valid;
  }

  addRunCard(deckState, cardId) {
    if (!deckState || typeof deckState !== "object") throw new Error("Deck state is required.");
    if (!this.#catalog.has(cardId)) throw new Error("Unknown card.");

    const card = this.#catalog.get(cardId);
    if (card.type !== "Run") throw new Error("addRunCard accepts Run cards only.");

    if (!(deckState.poolCardIds || []).includes(cardId)) {
      deckState.poolCardIds = [...(deckState.poolCardIds || []), cardId].slice(-this.#maxPoolSize);
    }
    if (!(deckState.runCardIds || []).includes(cardId)) {
      deckState.runCardIds = [...(deckState.runCardIds || []), cardId];
    }
    if ((deckState.activeCardIds || []).length < this.#activeSlots) {
      deckState.activeCardIds = [...(deckState.activeCardIds || []), cardId];
    }
  }

  drawRandomRunCard(deckState) {
    const poolSet = new Set(Array.isArray(deckState?.poolCardIds) ? deckState.poolCardIds : []);
    const candidates = Array.from(this.#catalog.values()).filter((card) => card.type === "Run" && !poolSet.has(card.id));
    if (candidates.length === 0) return null;

    const card = candidates[Math.floor(Math.random() * candidates.length)];
    this.addRunCard(deckState, card.id);
    return card.toJSON();
  }

  getCombatProfile(deckState, actionType) {
    const active = (deckState && Array.isArray(deckState.activeCardIds) ? deckState.activeCardIds : [])
      .map((id) => this.#catalog.get(id))
      .filter(Boolean);

    const safeAction = typeof actionType === "string" ? actionType : "";
    const profile = {
      damageRawAdd: 0,
      actionTypeDamageRawAdd: 0,
      xpRawAdd: 0,
      critChanceAdd: 0,
      rageGainMultiplierAdd: 0,
      resistanceAdd: 0,
      corruptionAdd: 0,
      synergyTag: "",
    };

    for (const card of active) {
      const effect = card.effect || {};
      const tradeoff = card.tradeoff || {};

      profile.damageRawAdd += Number.isFinite(effect.damageRawAdd) ? effect.damageRawAdd : 0;
      profile.xpRawAdd += Number.isFinite(effect.xpRawAdd) ? effect.xpRawAdd : 0;
      profile.critChanceAdd += Number.isFinite(effect.critChanceAdd) ? effect.critChanceAdd : 0;

      if (effect.actionType === safeAction && Number.isFinite(effect.actionTypeDamageRawAdd)) {
        profile.actionTypeDamageRawAdd += effect.actionTypeDamageRawAdd;
      }

      profile.rageGainMultiplierAdd += Number.isFinite(tradeoff.rageGainMultiplierAdd) ? tradeoff.rageGainMultiplierAdd : 0;
      profile.resistanceAdd += Number.isFinite(tradeoff.resistanceAdd) ? tradeoff.resistanceAdd : 0;
      profile.corruptionAdd += Number.isFinite(tradeoff.corruptionAdd) ? tradeoff.corruptionAdd : 0;
    }

    const synergyTag = this.#resolveSynergyTag(active);
    if (synergyTag) {
      profile.synergyTag = synergyTag;
      profile.damageRawAdd += Number.isFinite(this.#synergy.damageRawBonus) ? this.#synergy.damageRawBonus : 0;
      profile.critChanceAdd += Number.isFinite(this.#synergy.critChanceAdd) ? this.#synergy.critChanceAdd : 0;
    }

    return profile;
  }

  getCardsViewModel(deckState) {
    const pool = Array.isArray(deckState?.poolCardIds) ? deckState.poolCardIds : [];
    const active = new Set(Array.isArray(deckState?.activeCardIds) ? deckState.activeCardIds : []);
    const runSet = new Set(Array.isArray(deckState?.runCardIds) ? deckState.runCardIds : []);

    return pool
      .map((id) => this.#catalog.get(id))
      .filter(Boolean)
      .map((card) => ({
        ...card.toJSON(),
        isActive: active.has(card.id),
        isRunCard: runSet.has(card.id),
      }));
  }

  #resolveSynergyTag(activeCards) {
    const required = Number.isFinite(this.#synergy.requiredTagCount) ? Math.max(2, Math.floor(this.#synergy.requiredTagCount)) : 2;
    const counts = new Map();

    for (const card of activeCards) {
      const uniqueTags = new Set(card.tags);
      for (const tag of uniqueTags) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }

    for (const [tag, count] of counts.entries()) {
      if (count >= required) return tag;
    }
    return "";
  }

  static #sanitizeIds(input, catalog, maxLength, fallback) {
    const raw = Array.isArray(input) ? input : fallback;
    const out = [];
    for (const value of raw) {
      if (out.length >= maxLength) break;
      if (typeof value !== "string") continue;
      if (!catalog.has(value)) continue;
      if (!out.includes(value)) out.push(value);
    }
    return out;
  }
}
