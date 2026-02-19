/**
 * Presentation Layer: PlayerView
 * Renders player level, XP, and permanent progression details.
 */
import { XpBarView } from "./XpBarView.js";

export class PlayerView {
  #levelEl;
  #xpTextEl;
  #metaTextEl;
  #xpBarView;
  #formatter;

  constructor({ levelEl, xpTextEl, metaTextEl, xpFillEl, formatter = new Intl.NumberFormat("en-US") }) {
    if (!levelEl || !xpTextEl || !xpFillEl) throw new Error("PlayerView missing required elements.");
    this.#levelEl = levelEl;
    this.#xpTextEl = xpTextEl;
    this.#metaTextEl = metaTextEl || null;
    this.#xpBarView = new XpBarView(xpFillEl);
    this.#formatter = formatter;
  }

  render(playerVm, miscVm = {}) {
    this.#levelEl.textContent = String(playerVm.level || 1);

    const xp = Number.isFinite(playerVm.xp) ? playerVm.xp : 0;
    const toNext = Number.isFinite(playerVm.xpToNextLevel) ? playerVm.xpToNextLevel : 0;
    this.#xpTextEl.textContent = `${this.#formatter.format(xp)} / ${this.#formatter.format(toNext)} XP`;
    this.#xpBarView.render(playerVm);

    if (this.#metaTextEl) {
      const permanentDamageMultiplier = Number.isFinite(playerVm.permanentDamageMultiplier)
        ? playerVm.permanentDamageMultiplier
        : 0;
      const permanentBossHpReduction = Number.isFinite(playerVm.permanentBossHpReduction)
        ? playerVm.permanentBossHpReduction
        : 0;
      const streakGraceCharges = Number.isFinite(playerVm.streakGraceCharges) ? playerVm.streakGraceCharges : 0;
      const damagePercent = Math.round(permanentDamageMultiplier * 100);
      const bossReductionPercent = Math.round(permanentBossHpReduction * 100);
      const dmgLabel = typeof miscVm.permDamageShort === "string" ? miscVm.permDamageShort : "DMG";
      const bossLabel = typeof miscVm.bossHpShort === "string" ? miscVm.bossHpShort : "BossHP";
      const graceLabel = typeof miscVm.graceShort === "string" ? miscVm.graceShort : "Grace";
      this.#metaTextEl.textContent = `${dmgLabel} +${damagePercent}% | ${bossLabel} -${bossReductionPercent}% | ${graceLabel} ${streakGraceCharges}`;
    }
  }

  playXpGain() {
    this.#xpBarView.playGainGlow();
  }
}
