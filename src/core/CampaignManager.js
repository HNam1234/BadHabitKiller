/**
 * Core Layer: CampaignManager
 * Maps real debt progress to campaign stage, boss archetype, and combat modifiers.
 */
import { BossType } from "../domain/BossType.js";

export class CampaignManager {
  #campaigns;
  #finalCampaign;
  #totalDebt;
  #startingDebt;

  constructor({ campaigns, debt }) {
    if (!Array.isArray(campaigns) || campaigns.length === 0) {
      throw new Error("CampaignManager requires campaigns config.");
    }
    if (!debt || typeof debt !== "object") {
      throw new Error("CampaignManager requires debt config.");
    }
    if (!Number.isFinite(debt.totalDebt) || debt.totalDebt <= 0) {
      throw new Error("debt.totalDebt must be > 0.");
    }

    this.#totalDebt = Math.floor(debt.totalDebt);
    this.#startingDebt = Number.isFinite(debt.startingDebt) && debt.startingDebt > 0
      ? Math.floor(debt.startingDebt)
      : this.#totalDebt;

    const prepared = campaigns.map((campaign) => CampaignManager.#normalizeCampaign(campaign));
    this.#finalCampaign = prepared.find((campaign) => campaign.isFinal) || null;
    this.#campaigns = prepared
      .filter((campaign) => !campaign.isFinal)
      .sort((a, b) => b.maxDebtRatio - a.maxDebtRatio);
  }

  createState(stored) {
    const safe = stored && typeof stored === "object" ? stored : {};
    const currentDebt = Number.isFinite(safe.currentDebt) && safe.currentDebt >= 0
      ? Math.floor(safe.currentDebt)
      : this.#startingDebt;
    const totalPaid = Number.isFinite(safe.totalPaid) && safe.totalPaid >= 0
      ? Math.floor(safe.totalPaid)
      : Math.max(0, this.#totalDebt - currentDebt);
    const impulseHpBurden = Number.isFinite(safe.impulseHpBurden) && safe.impulseHpBurden >= 0
      ? Math.floor(safe.impulseHpBurden)
      : 0;
    const corruptionBurden = Number.isFinite(safe.corruptionBurden) && safe.corruptionBurden >= 0
      ? safe.corruptionBurden
      : 0;
    const activeCampaignId = typeof safe.activeCampaignId === "string" ? safe.activeCampaignId : "";
    const trueEndingCompleted = Boolean(safe.trueEndingCompleted);
    const prestigeUnlocked = Boolean(safe.prestigeUnlocked);

    return {
      totalDebt: this.#totalDebt,
      currentDebt: Math.max(0, Math.min(this.#totalDebt, currentDebt)),
      totalPaid: Math.max(0, totalPaid),
      impulseHpBurden,
      corruptionBurden,
      activeCampaignId,
      trueEndingCompleted,
      prestigeUnlocked,
    };
  }

  getDebtRatio(campaignState) {
    if (!campaignState || !Number.isFinite(campaignState.currentDebt)) return 1;
    return Math.max(0, Math.min(1, campaignState.currentDebt / this.#totalDebt));
  }

  resolveCampaign(campaignState) {
    const ratio = this.getDebtRatio(campaignState);

    if (ratio <= 0 && this.#finalCampaign) {
      return this.#finalCampaign;
    }

    for (const campaign of this.#campaigns) {
      if (ratio <= campaign.maxDebtRatio && ratio > campaign.minDebtRatio) {
        return campaign;
      }
    }

    return this.#campaigns[this.#campaigns.length - 1];
  }

  syncActiveCampaign(campaignState) {
    const current = this.resolveCampaign(campaignState);
    const previousId = campaignState.activeCampaignId || "";
    campaignState.activeCampaignId = current.id;
    return {
      campaign: current,
      changed: previousId !== "" && previousId !== current.id,
      previousId,
      currentId: current.id,
    };
  }

  applyDebtPayment(campaignState, amount) {
    const value = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
    if (value <= 0) {
      return {
        appliedAmount: 0,
        previousDebt: campaignState.currentDebt,
        currentDebt: campaignState.currentDebt,
        campaignChanged: false,
      };
    }

    const previousDebt = campaignState.currentDebt;
    campaignState.currentDebt = Math.max(0, campaignState.currentDebt - value);
    campaignState.totalPaid += previousDebt - campaignState.currentDebt;
    const transition = this.syncActiveCampaign(campaignState);

    return {
      appliedAmount: previousDebt - campaignState.currentDebt,
      previousDebt,
      currentDebt: campaignState.currentDebt,
      campaignChanged: transition.changed,
      previousCampaignId: transition.previousId,
      newCampaign: transition.campaign,
    };
  }

  getBossProfile(campaign) {
    const fallback = {
      bossType: BossType.DEFAULT_CRUSHER,
      bossName: "Debt Entity",
      visualTheme: "Obsidian",
      combatModifier: {
        bossHpMultiplier: 1,
        rageGainMultiplier: 1,
        resistanceAdd: 0,
        damageRawAdd: 0,
      },
    };

    if (!campaign || typeof campaign !== "object") return fallback;
    return {
      bossType: campaign.bossType,
      bossName: campaign.bossName,
      visualTheme: campaign.visualTheme,
      combatModifier: { ...fallback.combatModifier, ...(campaign.combatModifier || {}) },
    };
  }

  toViewModel(campaignState) {
    const campaign = this.resolveCampaign(campaignState);
    const ratio = this.getDebtRatio(campaignState);
    const profile = this.getBossProfile(campaign);
    return {
      id: campaign.id,
      title: campaign.label,
      subtitle: campaign.subtitle,
      visualTheme: profile.visualTheme,
      bossType: profile.bossType,
      bossName: profile.bossName,
      debt: {
        current: campaignState.currentDebt,
        total: campaignState.totalDebt,
        ratio,
        paid: campaignState.totalPaid,
      },
      isFinal: Boolean(campaign.isFinal),
      trueEndingCompleted: Boolean(campaignState.trueEndingCompleted),
      prestigeUnlocked: Boolean(campaignState.prestigeUnlocked),
    };
  }

  static #normalizeCampaign(campaign) {
    if (!campaign || typeof campaign !== "object") throw new Error("campaign entry must be object.");
    if (typeof campaign.id !== "string" || campaign.id.trim().length === 0) throw new Error("campaign.id required.");
    if (typeof campaign.label !== "string" || campaign.label.trim().length === 0) throw new Error("campaign.label required.");
    if (typeof campaign.bossName !== "string" || campaign.bossName.trim().length === 0) throw new Error("campaign.bossName required.");

    const minDebtRatio = Number.isFinite(campaign.minDebtRatio) ? campaign.minDebtRatio : 0;
    const maxDebtRatio = Number.isFinite(campaign.maxDebtRatio) ? campaign.maxDebtRatio : 1;
    const isFinal = Boolean(campaign.isFinal);

    return {
      id: campaign.id,
      label: campaign.label,
      subtitle: typeof campaign.subtitle === "string" ? campaign.subtitle : "",
      bossType: typeof campaign.bossType === "string" ? campaign.bossType : BossType.DEFAULT_CRUSHER,
      bossName: campaign.bossName,
      visualTheme: typeof campaign.visualTheme === "string" ? campaign.visualTheme : "Obsidian",
      minDebtRatio: Math.max(0, Math.min(1, minDebtRatio)),
      maxDebtRatio: Math.max(0, Math.min(1, maxDebtRatio)),
      isFinal,
      combatModifier: campaign.combatModifier && typeof campaign.combatModifier === "object"
        ? { ...campaign.combatModifier }
        : {},
    };
  }
}

