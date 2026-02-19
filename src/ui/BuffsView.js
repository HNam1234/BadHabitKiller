/**
 * Presentation Layer: BuffsView
 * Renders active boons in the right ritual panel.
 */
export class BuffsView {
  #containerEl;
  #maxVisible;

  constructor(containerEl, maxVisible = 4) {
    if (!containerEl) throw new Error("BuffsView requires a container element.");
    this.#containerEl = containerEl;
    this.#maxVisible = Number.isFinite(maxVisible) && maxVisible > 0 ? Math.floor(maxVisible) : 4;
  }

  render(boonsVm, textVm = {}, locale = "en") {
    this.#containerEl.innerHTML = "";
    const boons = Array.isArray(boonsVm) ? boonsVm : [];

    if (boons.length === 0) {
      const empty = document.createElement("article");
      empty.className = "boon-item";
      empty.innerHTML = `<div class="boon-item__name">${textVm.emptyTitle || "No active boons"}</div><div class="boon-item__curse">${textVm.emptyHint || "Defeat a tier to invoke one."}</div>`;
      this.#containerEl.appendChild(empty);
      return;
    }

    const visibleBoons = boons.slice(-this.#maxVisible);

    for (const boon of visibleBoons) {
      const card = document.createElement("article");
      card.className = "boon-item";

      const blessing = BuffsView.#effectsToText(Array.isArray(boon.benefits) ? boon.benefits : [], locale, textVm);
      const curse = BuffsView.#effectsToText(Array.isArray(boon.drawbacks) ? boon.drawbacks : [], locale, textVm);

      const blessingLabel = textVm.blessing || "Blessing";
      const curseLabel = textVm.curse || "Curse";

      card.innerHTML = `
        <div class="boon-item__name">${boon.name}</div>
        <div class="boon-item__epithet">${boon.epithet || ""}</div>
        <div class="boon-item__blessing">${blessingLabel}: ${blessing}</div>
        <div class="boon-item__curse">${curseLabel}: ${curse}</div>
      `;
      this.#containerEl.appendChild(card);
    }

    if (boons.length > visibleBoons.length) {
      const hiddenCount = boons.length - visibleBoons.length;
      const overflow = document.createElement("article");
      overflow.className = "boon-item";
      const overflowHintTemplate = textVm.additionalHint || "+{count} more boons are active this run.";
      overflow.innerHTML = `
        <div class="boon-item__name">${textVm.additionalTitle || "Additional Pacts"}</div>
        <div class="boon-item__curse">${overflowHintTemplate.replace("{count}", String(hiddenCount))}</div>
      `;
      this.#containerEl.appendChild(overflow);
    }
  }

  static #effectsToText(effects, locale, textVm) {
    if (!Array.isArray(effects) || effects.length === 0) return textVm.none || "None";
    return effects
      .map((effect) => BuffsView.#effectToText(effect, locale, textVm))
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
        return BuffsView.#tpl(fx.damageRawAdd, { pct }, vi ? `+${pct}% sat thuong tong` : `+${pct}% all damage`);
      case "ACTION_TYPE_DAMAGE_RAW_ADD":
        return BuffsView.#tpl(
          fx.actionTypeDamageRawAdd,
          { pct, action },
          vi ? `+${pct}% sat thuong ${action}` : `+${pct}% ${action} damage`,
        );
      case "RAGE_GAIN_MULTIPLIER_ADD":
        return BuffsView.#tpl(fx.rageGainMultiplierAdd, { pct }, vi ? `Cuong no +${pct}%` : `Rage gain +${pct}%`);
      case "COMBO_BREAK_HOURS_CAP":
        return BuffsView.#tpl(
          fx.comboBreakHoursCap,
          { hours: effect.value },
          vi ? `Combo dut sau ${effect.value}h` : `Combo breaks after ${effect.value}h`,
        );
      case "PERMANENT_BOSS_HP_REDUCTION_ADD":
        return BuffsView.#tpl(
          fx.permanentBossHpReductionAdd,
          { pct },
          vi ? `HP boss -${pct}% vinh vien` : `Permanent boss HP -${pct}%`,
        );
      case "LOSE_BOONS_ON_FAIL":
        return BuffsView.#tpl(
          fx.loseBoonsOnFail,
          {},
          vi ? "That bai se mat toan bo phuc an" : "Failing purges all boons",
        );
      case "CRIT_CHANCE_ADD":
        return BuffsView.#tpl(fx.critChanceAdd, { pct }, vi ? `+${pct}% ti le crit` : `+${pct}% crit chance`);
      case "CRIT_MULTIPLIER_ADD":
        return BuffsView.#tpl(
          fx.critMultiplierAdd,
          { pct },
          vi ? `+${pct}% sat thuong crit` : `+${pct}% crit multiplier`,
        );
      case "XP_RAW_ADD":
        return BuffsView.#tpl(fx.xpRawAdd, { pct }, `+${pct}% XP`);
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
