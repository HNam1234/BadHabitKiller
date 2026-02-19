/**
 * Presentation Layer: BuffOfferView
 * Renders boon choice overlay cards.
 */
export class BuffOfferView {
  #rootEl;
  #listEl;
  #hintEl;
  #isBusy = false;

  constructor({ rootEl, containerEl, hintEl }) {
    if (!rootEl || !containerEl || !hintEl) {
      throw new Error("BuffOfferView requires root, container and hint elements.");
    }
    this.#rootEl = rootEl;
    this.#listEl = containerEl;
    this.#hintEl = hintEl;
  }

  render(offerVm, onChoose, textVm = {}, locale = "en") {
    this.#listEl.innerHTML = "";
    const offer = Array.isArray(offerVm) ? offerVm : [];

    if (offer.length === 0) {
      this.#rootEl.classList.remove("is-active");
      this.#hintEl.textContent = textVm.offerIdleHint || "Defeat the entity tier to invoke a boon.";
      return;
    }

    this.#rootEl.classList.add("is-active");
    this.#hintEl.textContent = textVm.offerChooseHint || "Choose one pact. The curse is mandatory.";

    for (const boon of offer) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "boon-card";
      card.disabled = this.#isBusy;

      const blessing = textVm.blessing || "Blessing";
      const curse = textVm.curse || "Curse";
      const corruption = textVm.corruption || "Corruption";

      card.innerHTML = `
        <div class="boon-card__name">${boon.name}</div>
        <div class="boon-card__epithet">${boon.epithet || ""}</div>
        <div class="boon-card__blessing">${blessing}: ${BuffOfferView.#effectsToText(boon.benefits, locale, textVm)}</div>
        <div class="boon-card__curse">${curse}: ${BuffOfferView.#effectsToText(boon.drawbacks, locale, textVm)}</div>
        <div class="boon-card__corruption">${corruption} +${Math.round(boon.corruptionDelta || 0)}%</div>
      `;

      card.addEventListener("click", async () => {
        if (this.#isBusy) return;
        this.#isBusy = true;
        card.classList.add("is-picked");
        this.#setDisabled(true);
        try {
          await onChoose(boon.id);
        } finally {
          this.#isBusy = false;
          this.#setDisabled(false);
        }
      });

      this.#listEl.appendChild(card);
    }
  }

  #setDisabled(disabled) {
    const cards = this.#listEl.querySelectorAll("button");
    for (const card of cards) card.disabled = disabled;
  }

  static #effectsToText(effects, locale, textVm) {
    if (!Array.isArray(effects) || effects.length === 0) return textVm.none || "None";
    return effects
      .map((effect) => BuffOfferView.#effectToText(effect, locale, textVm))
      .filter((text) => text.length > 0)
      .join(" | ");
  }

  static #effectToText(effect, locale, textVm) {
    if (!effect || typeof effect !== "object") return "";
    const value = Number.isFinite(effect.value) ? effect.value : 0;
    const pct = Math.round(value * 100);
    const vi = locale === "vi";
    const fx = textVm && textVm.effects && typeof textVm.effects === "object" ? textVm.effects : {};
    const action = effect.actionType || (vi ? "hanh dong" : "specific");

    switch (effect.type) {
      case "DAMAGE_RAW_ADD":
        return BuffOfferView.#tpl(fx.damageRawAdd, { pct }, vi ? `+${pct}% sat thuong tong` : `+${pct}% all damage`);
      case "ACTION_TYPE_DAMAGE_RAW_ADD":
        return BuffOfferView.#tpl(
          fx.actionTypeDamageRawAdd,
          { pct, action },
          vi ? `+${pct}% sat thuong ${action}` : `+${pct}% ${action} damage`,
        );
      case "RAGE_GAIN_MULTIPLIER_ADD":
        return BuffOfferView.#tpl(
          fx.rageGainMultiplierAdd,
          { pct },
          vi ? `cuong no tang nhanh hon ${pct}%` : `rage grows ${pct}% faster`,
        );
      case "COMBO_BREAK_HOURS_CAP":
        return BuffOfferView.#tpl(
          fx.comboBreakHoursCap,
          { hours: effect.value },
          vi ? `combo dut sau ${effect.value}h` : `combo breaks after ${effect.value}h`,
        );
      case "PERMANENT_BOSS_HP_REDUCTION_ADD":
        return BuffOfferView.#tpl(
          fx.permanentBossHpReductionAdd,
          { pct },
          vi ? `HP boss -${pct}% vinh vien` : `boss HP -${pct}% permanently`,
        );
      case "LOSE_BOONS_ON_FAIL":
        return BuffOfferView.#tpl(
          fx.loseBoonsOnFail,
          {},
          vi ? "that bai se mat toan bo phuc an" : "run fail purges all boons",
        );
      case "CRIT_CHANCE_ADD":
        return BuffOfferView.#tpl(fx.critChanceAdd, { pct }, vi ? `+${pct}% ti le crit` : `+${pct}% crit chance`);
      case "CRIT_MULTIPLIER_ADD":
        return BuffOfferView.#tpl(
          fx.critMultiplierAdd,
          { pct },
          vi ? `+${pct}% sat thuong crit` : `+${pct}% crit multiplier`,
        );
      case "XP_RAW_ADD":
        return BuffOfferView.#tpl(fx.xpRawAdd, { pct }, `+${pct}% XP`);
      default:
        return effect.type;
    }
  }

  static #tpl(template, values, fallback) {
    if (typeof template !== "string" || template.length === 0) return fallback;
    let out = template;
    for (const [key, raw] of Object.entries(values || {})) {
      out = out.replace(`{${key}}`, String(raw));
    }
    return out;
  }
}
