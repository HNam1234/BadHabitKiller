/**
 * Core Layer: ImpulseManager
 * Explicit impulse spending logs create burden that can be partially redeemed.
 */
export class ImpulseManager {
  #config;

  constructor(config) {
    if (!config || typeof config !== "object") {
      throw new Error("ImpulseManager requires config.");
    }
    this.#config = { ...config };
  }

  createHistory(storedHistory) {
    const history = [];
    for (const entry of Array.isArray(storedHistory) ? storedHistory : []) {
      if (!entry || typeof entry !== "object") continue;
      if (!Number.isFinite(entry.amount) || entry.amount <= 0) continue;
      history.push({
        id: typeof entry.id === "string" ? entry.id : `impulse-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        amount: Math.max(0, Number(entry.amount)),
        redeemedAmount: Number.isFinite(entry.redeemedAmount) ? Math.max(0, Number(entry.redeemedAmount)) : 0,
        createdAt: typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString(),
        note: typeof entry.note === "string" ? entry.note : "",
      });
    }
    return history;
  }

  logImpulse(history, { amount, nowIso, note = "" }) {
    const value = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    if (value <= 0) throw new Error("Impulse amount must be > 0.");

    const record = {
      id: `impulse-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      amount: value,
      redeemedAmount: 0,
      createdAt: typeof nowIso === "string" ? nowIso : new Date().toISOString(),
      note: typeof note === "string" ? note : "",
    };
    history.push(record);

    const hpIncrease = Math.floor(value * this.#hpMultiplier());
    const corruptionIncrease = (value / 100) * this.#corruptionGainPer100();
    const resistanceAdd = Math.min(this.#maxResistanceAdd(), (value / 100) * this.#resistanceAddPer100());

    return {
      record,
      hpIncrease,
      corruptionIncrease,
      resistanceAdd,
    };
  }

  redeemImpulse(history, impulseId, amount) {
    if (typeof impulseId !== "string" || impulseId.length === 0) {
      throw new Error("impulseId is required.");
    }
    const value = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    if (value <= 0) throw new Error("Redeem amount must be > 0.");

    const record = history.find((entry) => entry.id === impulseId);
    if (!record) throw new Error("Impulse record not found.");

    const remaining = Math.max(0, record.amount - record.redeemedAmount);
    const redeemed = Math.min(remaining, value);
    record.redeemedAmount += redeemed;

    return {
      record,
      redeemedAmount: redeemed,
      hpBurdenReduction: Math.floor(redeemed * this.#hpMultiplier()),
    };
  }

  getOutstandingHpBurden(history) {
    const burden = (Array.isArray(history) ? history : []).reduce((sum, entry) => {
      const amount = Number.isFinite(entry?.amount) ? entry.amount : 0;
      const redeemed = Number.isFinite(entry?.redeemedAmount) ? entry.redeemedAmount : 0;
      return sum + Math.max(0, amount - redeemed);
    }, 0);
    return Math.floor(burden * this.#hpMultiplier());
  }

  getNoImpulseDays(history, todayDateStamp) {
    if (!Array.isArray(history) || history.length === 0) return 999;
    let latestDateStamp = "";
    for (const entry of history) {
      if (!entry || typeof entry.createdAt !== "string") continue;
      const stamp = ImpulseManager.toDateStamp(entry.createdAt);
      if (stamp > latestDateStamp) latestDateStamp = stamp;
    }
    if (!latestDateStamp) return 999;
    return ImpulseManager.diffDays(latestDateStamp, todayDateStamp);
  }

  static toDateStamp(isoLike) {
    const d = new Date(isoLike);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  }

  static diffDays(fromStamp, toStamp) {
    const from = new Date(`${fromStamp}T00:00:00.000Z`);
    const to = new Date(`${toStamp}T00:00:00.000Z`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
    return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000));
  }

  #hpMultiplier() {
    return Number.isFinite(this.#config.hpMultiplier) ? this.#config.hpMultiplier : 1.5;
  }

  #corruptionGainPer100() {
    return Number.isFinite(this.#config.corruptionGainPer100) ? this.#config.corruptionGainPer100 : 1;
  }

  #resistanceAddPer100() {
    return Number.isFinite(this.#config.resistanceAddPer100) ? this.#config.resistanceAddPer100 : 0.004;
  }

  #maxResistanceAdd() {
    return Number.isFinite(this.#config.maxResistanceAdd) ? this.#config.maxResistanceAdd : 0.25;
  }
}

