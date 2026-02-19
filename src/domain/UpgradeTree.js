/**
 * Domain Layer: UpgradeTree
 * Owns upgrade node collection and owned ranks.
 */
import { UpgradeNode } from "./UpgradeNode.js";

export class UpgradeTree {
  constructor(nodes) {
    if (!Array.isArray(nodes) || nodes.length === 0) {
      throw new Error("UpgradeTree requires a non-empty node array.");
    }
    this.nodes = nodes;
  }

  getNode(nodeId) {
    return this.nodes.find((node) => node.id === nodeId) || null;
  }

  getRank(nodeId) {
    const node = this.getNode(nodeId);
    return node ? node.rank : 0;
  }

  toRankState() {
    const ranks = {};
    for (const node of this.nodes) {
      ranks[node.id] = node.rank;
    }
    return ranks;
  }

  static fromDefinitions(pathDefinitions, rankState = {}) {
    if (!Array.isArray(pathDefinitions) || pathDefinitions.length === 0) {
      throw new Error("UpgradeTree.fromDefinitions requires path definitions.");
    }

    const nodes = [];

    for (const path of pathDefinitions) {
      if (!path || typeof path !== "object" || !Array.isArray(path.nodes)) continue;

      for (const nodeDef of path.nodes) {
        if (!nodeDef || typeof nodeDef !== "object") continue;

        const rank =
          rankState && Number.isFinite(rankState[nodeDef.id]) && rankState[nodeDef.id] >= 0
            ? rankState[nodeDef.id]
            : 0;

        nodes.push(
          new UpgradeNode({
            id: nodeDef.id,
            pathId: path.pathId,
            name: nodeDef.name,
            description: nodeDef.description,
            cost: nodeDef.cost,
            maxRank: nodeDef.maxRank,
            rank,
            prerequisiteIds: nodeDef.prerequisiteIds,
            effects: nodeDef.effects,
          }),
        );
      }
    }

    if (nodes.length === 0) throw new Error("UpgradeTree.fromDefinitions produced no nodes.");
    return new UpgradeTree(nodes);
  }
}
