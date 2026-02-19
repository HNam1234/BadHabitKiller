/**
 * Core Layer: BuffService
 * - Generates random buff offers
 * - Applies chosen buffs
 * - Computes run buff damage/xp effects
 */
import { Buff } from "../domain/Buff.js";

export class BuffService {
  #offerCount;
  #templates;

  constructor({ offerCount, templates }) {
    if (!Number.isFinite(offerCount) || offerCount <= 0) {
      throw new Error("BuffService requires offerCount > 0.");
    }
    if (!Array.isArray(templates) || templates.length === 0) {
      throw new Error("BuffService requires non-empty templates.");
    }

    this.#offerCount = Math.floor(offerCount);
    this.#templates = templates.map((template) => ({ ...template }));
  }

  hydrateBuffs(rawBuffs) {
    const out = [];
    for (const raw of Array.isArray(rawBuffs) ? rawBuffs : []) {
      try {
        out.push(Buff.fromJSON(raw));
      } catch {
        // Ignore corrupted buff entries.
      }
    }
    return out;
  }

  createOffer() {
    const templates = this.#templates.slice();
    const offer = [];

    while (templates.length > 0 && offer.length < this.#offerCount) {
      const index = Math.floor(Math.random() * templates.length);
      const template = templates.splice(index, 1)[0];
      const uniqueId = `${template.templateId}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

      offer.push(
        new Buff({
          id: uniqueId,
          type: template.type,
          name: template.name,
          description: template.description,
          value: template.value,
          maxStacks: template.maxStacks,
          remainingHits: template.remainingHits,
          stacks: 0,
        }),
      );
    }

    return offer;
  }

  chooseBuff(activeBuffs, offerBuffs, buffId) {
    const active = Array.isArray(activeBuffs) ? activeBuffs : [];
    const offer = Array.isArray(offerBuffs) ? offerBuffs : [];

    const selected = offer.find((buff) => buff.id === buffId);
    if (!selected) {
      throw new Error("Selected buff is not in the current offer.");
    }

    const cloned = selected.clone();
    active.push(cloned);
    return {
      activeBuffs: active,
      chosenBuff: cloned,
    };
  }

  consumeDamageRawBonusForAction(activeBuffs) {
    let rawBonus = 0;
    const events = [];

    for (const buff of Array.isArray(activeBuffs) ? activeBuffs : []) {
      if (!(buff instanceof Buff)) continue;

      switch (buff.type) {
        case "RUN_DAMAGE_RAW":
          rawBonus += buff.value;
          break;
        case "ACTION_STACK_DAMAGE_RAW":
          rawBonus += buff.value * buff.stacks;
          break;
        case "NEXT_HIT_DAMAGE_RAW":
          if (buff.remainingHits > 0) {
            rawBonus += buff.value;
            buff.remainingHits -= 1;
            events.push({
              type: "BUFF_CONSUMED",
              buffId: buff.id,
              buffName: buff.name,
            });
          }
          break;
        default:
          break;
      }
    }

    return { rawBonus, events };
  }

  getXpRawBonus(activeBuffs) {
    let rawBonus = 0;
    for (const buff of Array.isArray(activeBuffs) ? activeBuffs : []) {
      if (!(buff instanceof Buff)) continue;
      if (buff.type === "RUN_XP_RAW") {
        rawBonus += buff.value;
      }
    }
    return rawBonus;
  }

  onActionCommitted(activeBuffs) {
    for (const buff of Array.isArray(activeBuffs) ? activeBuffs : []) {
      if (!(buff instanceof Buff)) continue;
      if (buff.type !== "ACTION_STACK_DAMAGE_RAW") continue;
      const maxStacks = Number.isFinite(buff.maxStacks) ? buff.maxStacks : 0;
      buff.stacks = Math.min(maxStacks, buff.stacks + 1);
    }
  }

  cleanupExpiredBuffs(activeBuffs) {
    return (Array.isArray(activeBuffs) ? activeBuffs : []).filter((buff) => {
      if (!(buff instanceof Buff)) return false;
      if (buff.type !== "NEXT_HIT_DAMAGE_RAW") return true;
      return buff.remainingHits > 0;
    });
  }
}
