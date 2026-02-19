/**
 * Core Layer: UpgradeService
 * - Builds upgrade tree from config + persisted ranks
 * - Handles purchases and computes upgrade-driven bonuses
 */
import { UpgradeTree } from "../domain/UpgradeTree.js";

export class UpgradeService {
  #pathDefinitions;

  constructor(pathDefinitions) {
    if (!Array.isArray(pathDefinitions) || pathDefinitions.length === 0) {
      throw new Error("UpgradeService requires non-empty upgrade path definitions.");
    }
    this.#pathDefinitions = pathDefinitions.map((path) => ({
      ...path,
      nodes: Array.isArray(path.nodes)
        ? path.nodes.map((node) => ({
            ...node,
            display: node.display ? { ...node.display } : null,
            effects: Array.isArray(node.effects) ? node.effects.map((effect) => ({ ...effect })) : [],
          }))
        : [],
    }));
  }

  createTree(rankState = {}) {
    return UpgradeTree.fromDefinitions(this.#pathDefinitions, rankState);
  }

  canPurchase(tree, currency, nodeId) {
    const node = tree.getNode(nodeId);
    if (!node) return { canPurchase: false, reason: "Unknown upgrade." };
    if (node.isMaxed()) return { canPurchase: false, reason: "Upgrade is already maxed." };

    for (const prerequisiteId of node.prerequisiteIds) {
      if (tree.getRank(prerequisiteId) <= 0) {
        return { canPurchase: false, reason: "Prerequisite not unlocked." };
      }
    }

    if (!currency || !Number.isFinite(currency.shards) || currency.shards < node.cost) {
      return { canPurchase: false, reason: "Not enough shards." };
    }

    return { canPurchase: true, reason: "" };
  }

  purchase(tree, currency, nodeId) {
    const guard = this.canPurchase(tree, currency, nodeId);
    if (!guard.canPurchase) {
      return { purchased: false, reason: guard.reason, events: [] };
    }

    const node = tree.getNode(nodeId);
    const oldRank = node.rank;
    const spent = currency.spendShards(node.cost);
    if (!spent) return { purchased: false, reason: "Not enough shards.", events: [] };

    node.increaseRank();
    const newRank = node.rank;

    let streakGraceGranted = 0;
    for (const effect of node.effects) {
      if (!effect || typeof effect.type !== "string") continue;

      if (effect.type === "STREAK_GRACE_CHARGE_ON_UNLOCK" && oldRank === 0 && newRank > 0) {
        const amount = Number.isFinite(effect.value) && effect.value > 0 ? Math.floor(effect.value) : 0;
        streakGraceGranted += amount;
      }
    }

    return {
      purchased: true,
      reason: "",
      streakGraceGranted,
      node,
      events: [
        {
          type: "UPGRADE_PURCHASED",
          nodeId: node.id,
          nodeName: node.name,
          newRank: node.rank,
          cost: node.cost,
        },
      ],
    };
  }

  getDamageRawBonus(tree, context) {
    const safeContext = context && typeof context === "object" ? context : {};
    const streak = Number.isFinite(safeContext.streak) ? safeContext.streak : 0;
    const isFirstActionOfDay = Boolean(safeContext.isFirstActionOfDay);
    const isComboActive = Boolean(safeContext.isComboActive);
    const isFirstHitOfRun = Boolean(safeContext.isFirstHitOfRun);
    const actionType = typeof safeContext.actionType === "string" ? safeContext.actionType : "";

    let raw = 0;

    for (const node of tree.nodes) {
      if (node.rank <= 0) continue;
      for (const effect of node.effects) {
        if (!effect || typeof effect.type !== "string") continue;
        const value = Number.isFinite(effect.value) ? effect.value : 0;
        const totalValue = UpgradeService.#isPerRank(effect.type) ? value * node.rank : value;

        switch (effect.type) {
          case "DAMAGE_WHEN_STREAK_AT_LEAST":
            if (streak >= (Number.isFinite(effect.streakAtLeast) ? effect.streakAtLeast : 0)) raw += totalValue;
            break;
          case "DAMAGE_WHEN_FIRST_ACTION_OF_DAY":
            if (isFirstActionOfDay) raw += totalValue;
            break;
          case "ACTION_TYPE_DAMAGE_MULTIPLIER":
            if (actionType === effect.actionType) raw += totalValue;
            break;
          case "DAMAGE_WHEN_COMBO_ACTIVE":
            if (isComboActive) raw += totalValue;
            break;
          case "DAMAGE_WHEN_FIRST_HIT_OF_RUN":
            if (isFirstHitOfRun) raw += totalValue;
            break;
          default:
            break;
        }
      }
    }

    return raw;
  }

  getXpRawBonus(tree) {
    let raw = 0;
    for (const node of tree.nodes) {
      if (node.rank <= 0) continue;
      for (const effect of node.effects) {
        if (!effect || effect.type !== "XP_GAIN_RAW") continue;
        const value = Number.isFinite(effect.value) ? effect.value : 0;
        raw += UpgradeService.#isPerRank(effect.type) ? value * node.rank : value;
      }
    }
    return raw;
  }

  getBossHpReductionRate(tree) {
    let rate = 0;
    for (const node of tree.nodes) {
      if (node.rank <= 0) continue;
      for (const effect of node.effects) {
        if (!effect || effect.type !== "BOSS_HP_REDUCTION_PER_RANK") continue;
        const value = Number.isFinite(effect.value) ? effect.value : 0;
        rate += value * node.rank;
      }
    }
    return Math.max(0, Math.min(0.9, rate));
  }

  getOverflowRetentionRate(tree) {
    let rate = 0;
    for (const node of tree.nodes) {
      if (node.rank <= 0) continue;
      for (const effect of node.effects) {
        if (!effect || effect.type !== "OVERFLOW_RETENTION_RATE") continue;
        const value = Number.isFinite(effect.value) ? effect.value : 0;
        rate += UpgradeService.#isPerRank(effect.type) ? value * node.rank : value;
      }
    }
    return Math.max(0, Math.min(1, rate));
  }

  toViewModel(tree, currency) {
    const shards = currency && Number.isFinite(currency.shards) ? currency.shards : 0;
    const nodeById = new Map(tree.nodes.map((node) => [node.id, node]));

    const paths = [];

    for (const pathDef of this.#pathDefinitions) {
      const nodesVm = [];
      for (const nodeDef of pathDef.nodes) {
        const node = nodeById.get(nodeDef.id);
        if (!node) continue;

        const prerequisiteMissing = node.prerequisiteIds.some((id) => (nodeById.get(id)?.rank || 0) <= 0);
        const canAfford = shards >= node.cost;
        const isMaxed = node.isMaxed();
        const canPurchase = !prerequisiteMissing && canAfford && !isMaxed;

        nodesVm.push({
          id: node.id,
          name: node.name,
          description: node.description,
          cost: node.cost,
          rank: node.rank,
          maxRank: node.maxRank,
          isMaxed,
          isLocked: prerequisiteMissing,
          canAfford,
          canPurchase,
          prerequisiteIds: node.prerequisiteIds.slice(),
          display: nodeDef.display ? { ...nodeDef.display } : null,
        });
      }

      paths.push({
        pathId: pathDef.pathId,
        label: pathDef.label,
        nodes: nodesVm,
        links: nodesVm.flatMap((nodeVm) =>
          nodeVm.prerequisiteIds.map((fromId) => ({
            fromId,
            toId: nodeVm.id,
          })),
        ),
      });
    }

    return paths;
  }

  static #isPerRank(effectType) {
    return effectType === "BOSS_HP_REDUCTION_PER_RANK";
  }
}
