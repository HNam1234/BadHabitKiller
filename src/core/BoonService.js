/**
 * Core Layer: BoonService
 * - Creates boon offers with blessing + curse trade-offs
 * - Applies boon effects to combat profile and permanent state
 */
import { Boon } from "../domain/Boon.js";

export class BoonService {
  #offerMin;
  #offerMax;
  #templates;

  constructor({ offerMin, offerMax, templates }) {
    if (!Number.isFinite(offerMin) || offerMin <= 0) throw new Error("BoonService requires offerMin > 0.");
    if (!Number.isFinite(offerMax) || offerMax < offerMin) throw new Error("BoonService requires offerMax >= offerMin.");
    if (!Array.isArray(templates) || templates.length < offerMin) {
      throw new Error("BoonService requires templates length >= offerMin.");
    }

    this.#offerMin = Math.floor(offerMin);
    this.#offerMax = Math.floor(offerMax);
    this.#templates = templates.map((template) => ({
      ...template,
      benefits: Array.isArray(template.benefits) ? template.benefits.map((effect) => ({ ...effect })) : [],
      drawbacks: Array.isArray(template.drawbacks) ? template.drawbacks.map((effect) => ({ ...effect })) : [],
    }));
  }

  hydrateBoons(rawBoons) {
    const out = [];
    for (const raw of Array.isArray(rawBoons) ? rawBoons : []) {
      try {
        out.push(Boon.fromJSON(raw));
      } catch {
        // Ignore corrupted entries.
      }
    }
    return out;
  }

  createOffer() {
    const templates = this.#templates.slice();
    const offerSize = Math.min(
      templates.length,
      Math.floor(Math.random() * (this.#offerMax - this.#offerMin + 1)) + this.#offerMin,
    );

    const offer = [];
    while (templates.length > 0 && offer.length < offerSize) {
      const index = Math.floor(Math.random() * templates.length);
      const template = templates.splice(index, 1)[0];
      const uniqueId = `${template.templateId}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

      offer.push(
        new Boon({
          id: uniqueId,
          templateId: template.templateId,
          name: template.name,
          epithet: template.epithet,
          corruptionDelta: template.corruptionDelta,
          benefits: template.benefits,
          drawbacks: template.drawbacks,
        }),
      );
    }

    return offer;
  }

  chooseBoon(activeBoons, offerBoons, boonId) {
    const active = Array.isArray(activeBoons) ? activeBoons : [];
    const offer = Array.isArray(offerBoons) ? offerBoons : [];

    const selected = offer.find((boon) => boon.id === boonId);
    if (!selected) throw new Error("Selected boon is not in the current offer.");

    const chosen = selected.clone();
    active.push(chosen);

    return {
      activeBoons: active,
      chosenBoon: chosen,
    };
  }

  applyOnChoose(player, boon) {
    if (!player) throw new Error("BoonService.applyOnChoose requires player.");
    if (!(boon instanceof Boon)) throw new Error("BoonService.applyOnChoose requires Boon.");

    const events = [];
    for (const effect of boon.benefits) {
      if (!effect || typeof effect.type !== "string") continue;
      if (effect.type === "PERMANENT_BOSS_HP_REDUCTION_ADD") {
        const value = Number.isFinite(effect.value) ? effect.value : 0;
        if (value > 0) {
          player.addPermanentBossHpReduction(value);
          events.push({
            type: "PERMANENT_WEAKNESS_GAINED",
            value,
            total: player.permanentBossHpReduction,
          });
        }
      }
    }
    return { events };
  }

  getCombatProfile(activeBoons, actionType) {
    const profile = {
      damageRawAdd: 0,
      actionTypeDamageRawAdd: 0,
      rageGainMultiplierAdd: 0,
      critChanceAdd: 0,
      critMultiplierAdd: 0,
      comboBreakHoursCap: null,
      loseBoonsOnFail: false,
      xpRawAdd: 0,
    };

    const safeActionType = typeof actionType === "string" ? actionType : "";

    for (const boon of Array.isArray(activeBoons) ? activeBoons : []) {
      if (!(boon instanceof Boon)) continue;

      const allEffects = [...boon.benefits, ...boon.drawbacks];
      for (const effect of allEffects) {
        if (!effect || typeof effect.type !== "string") continue;
        const value = Number.isFinite(effect.value) ? effect.value : 0;

        switch (effect.type) {
          case "DAMAGE_RAW_ADD":
            profile.damageRawAdd += value;
            break;
          case "ACTION_TYPE_DAMAGE_RAW_ADD":
            if (safeActionType === effect.actionType) profile.actionTypeDamageRawAdd += value;
            break;
          case "RAGE_GAIN_MULTIPLIER_ADD":
            profile.rageGainMultiplierAdd += value;
            break;
          case "CRIT_CHANCE_ADD":
            profile.critChanceAdd += value;
            break;
          case "CRIT_MULTIPLIER_ADD":
            profile.critMultiplierAdd += value;
            break;
          case "COMBO_BREAK_HOURS_CAP":
            if (value > 0) {
              if (!Number.isFinite(profile.comboBreakHoursCap) || value < profile.comboBreakHoursCap) {
                profile.comboBreakHoursCap = value;
              }
            }
            break;
          case "LOSE_BOONS_ON_FAIL":
            profile.loseBoonsOnFail = value > 0;
            break;
          case "XP_RAW_ADD":
            profile.xpRawAdd += value;
            break;
          default:
            break;
        }
      }
    }

    return profile;
  }
}
