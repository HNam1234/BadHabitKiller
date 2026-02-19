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

      const blessing = BuffsView.#effectsToText(Array.isArray(boon.benefits) ? boon.benefits : [], locale);
      const curse = BuffsView.#effectsToText(Array.isArray(boon.drawbacks) ? boon.drawbacks : [], locale);

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

  static #effectsToText(effects, locale) {
    if (!Array.isArray(effects) || effects.length === 0) return "None";
    return effects
      .map((effect) => BuffsView.#effectToText(effect, locale))
      .filter((text) => text.length > 0)
      .join(" | ");
  }

  static #effectToText(effect, locale) {
    if (!effect || typeof effect !== "object") return "";
    const value = Number.isFinite(effect.value) ? effect.value : 0;
    const pct = Math.round(value * 100);
    const vi = locale === "vi";

    switch (effect.type) {
      case "DAMAGE_RAW_ADD":
        return vi ? `+${pct}% sat thuong tong` : `+${pct}% all damage`;
      case "ACTION_TYPE_DAMAGE_RAW_ADD":
        return vi
          ? `+${pct}% sat thuong ${effect.actionType || "theo hanh dong"}`
          : `+${pct}% ${effect.actionType || "specific"} damage`;
      case "RAGE_GAIN_MULTIPLIER_ADD":
        return vi ? `Cuong no +${pct}%` : `Rage gain +${pct}%`;
      case "COMBO_BREAK_HOURS_CAP":
        return vi ? `Combo dut sau ${effect.value}h` : `Combo breaks after ${effect.value}h`;
      case "PERMANENT_BOSS_HP_REDUCTION_ADD":
        return vi ? `HP boss -${pct}% vinh vien` : `Permanent boss HP -${pct}%`;
      case "LOSE_BOONS_ON_FAIL":
        return vi ? "That bai se mat toan bo phuc an" : "Failing purges all boons";
      case "CRIT_CHANCE_ADD":
        return vi ? `+${pct}% ti le crit` : `+${pct}% crit chance`;
      case "CRIT_MULTIPLIER_ADD":
        return vi ? `+${pct}% sat thuong crit` : `+${pct}% crit multiplier`;
      case "XP_RAW_ADD":
        return vi ? `+${pct}% XP` : `+${pct}% XP`;
      default:
        return effect.type;
    }
  }
}
