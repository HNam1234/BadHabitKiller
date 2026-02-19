/**
 * Core Layer: RewardService
 * - Applies rewards to player (temporary run vs permanent meta)
 * - Calculates effective damage using player modifiers
 *
 * No DOM, no persistence.
 */
import { Reward } from "../domain/Reward.js";

export class RewardService {
  #playerService;
  #levelingRules;

  constructor(playerService, levelingRules) {
    if (!playerService) throw new Error("RewardService requires a PlayerService.");
    if (!levelingRules || typeof levelingRules !== "object") throw new Error("RewardService requires levelingRules.");
    this.#playerService = playerService;
    this.#levelingRules = levelingRules;
  }

  computeAndConsumeDamage(player, baseDamage) {
    if (!player) throw new Error("RewardService.computeAndConsumeDamage requires a player.");
    if (!Number.isFinite(baseDamage) || baseDamage <= 0) return { damage: 0, consumedModifiers: [], events: [] };

    const permanentMultiplier = 1 + (Number.isFinite(player.permanentDamageMultiplier) ? player.permanentDamageMultiplier : 0);
    const runAdditiveSum = RewardService.#sumRunAdditiveDamage(player.activeRunModifiers);

    let damage = baseDamage * permanentMultiplier * (1 + runAdditiveSum);

    const consumed = [];
    const remaining = [];

    for (const mod of Array.isArray(player.activeRunModifiers) ? player.activeRunModifiers : []) {
      if (!mod || typeof mod !== "object" || typeof mod.type !== "string") continue;

      if (mod.type === "NEXT_HITS_DAMAGE_MULTIPLIER") {
        const remainingCharges = Number.isFinite(mod.remainingCharges) ? mod.remainingCharges : 0;
        if (remainingCharges > 0) {
          const value = Number.isFinite(mod.value) ? mod.value : 0;
          damage *= 1 + value;

          const nextCharges = remainingCharges - 1;
          consumed.push({ type: mod.type, value, remainingCharges: nextCharges });

          if (nextCharges > 0) {
            remaining.push({ ...mod, remainingCharges: nextCharges });
          }
        }
        continue;
      }

      remaining.push(mod);
    }

    player.activeRunModifiers = remaining;

    const finalDamage = Math.max(0, Math.floor(damage));
    return { damage: finalDamage, consumedModifiers: consumed, events: [] };
  }

  applyRewardToPlayer(player, reward) {
    if (!player) throw new Error("RewardService.applyRewardToPlayer requires a player.");
    if (!(reward instanceof Reward)) throw new Error("RewardService.applyRewardToPlayer requires a Reward.");

    const events = [{ type: "REWARD_GRANTED", reward: reward.toJSON() }];

    switch (reward.type) {
      case "XP_GRANT": {
        const result = this.#playerService.grantXp(player, reward.value);
        events.push(...result.events);
        break;
      }
      case "PERM_DAMAGE_MULTIPLIER_ADD": {
        player.permanentDamageMultiplier += reward.value;
        player.permanentDamageMultiplier = Math.min(
          this.#levelingRules.caps.permanentDamageMultiplierMax,
          Math.max(0, player.permanentDamageMultiplier),
        );
        break;
      }
      case "RUN_DAMAGE_MULTIPLIER_ADD": {
        const value = Number.isFinite(reward.value) ? reward.value : 0;
        player.activeRunModifiers = Array.isArray(player.activeRunModifiers) ? player.activeRunModifiers : [];
        player.activeRunModifiers.push({ type: "RUN_DAMAGE_MULTIPLIER_ADD", value });
        break;
      }
      case "NEXT_HITS_DAMAGE_MULTIPLIER": {
        const value = Number.isFinite(reward.value) ? reward.value : 0;
        const charges = Number.isFinite(reward.charges) ? reward.charges : 0;
        player.activeRunModifiers = Array.isArray(player.activeRunModifiers) ? player.activeRunModifiers : [];
        player.activeRunModifiers.push({ type: "NEXT_HITS_DAMAGE_MULTIPLIER", value, remainingCharges: charges });
        break;
      }
      default:
        throw new Error(`Unknown reward type: ${reward.type}`);
    }

    return { events };
  }

  static #sumRunAdditiveDamage(modifiers) {
    if (!Array.isArray(modifiers)) return 0;
    let sum = 0;
    for (const mod of modifiers) {
      if (!mod || typeof mod !== "object") continue;
      if (mod.type !== "RUN_DAMAGE_MULTIPLIER_ADD") continue;
      if (!Number.isFinite(mod.value)) continue;
      sum += mod.value;
    }
    return sum;
  }
}

