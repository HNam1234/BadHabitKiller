/**
 * Presentation Layer: CosmeticInventoryView
 * Renders cosmetic inventory, daily summon, and equip actions.
 */
export class CosmeticInventoryView {
  #summonButtonEl;
  #recentEl;
  #listEl;
  #isBusy = false;
  #handlers = null;

  constructor({ summonButtonEl, recentEl, listEl }) {
    if (!summonButtonEl || !recentEl || !listEl) {
      throw new Error("CosmeticInventoryView missing required elements.");
    }
    this.#summonButtonEl = summonButtonEl;
    this.#recentEl = recentEl;
    this.#listEl = listEl;
  }

  render(vm, textVm = {}, handlers) {
    this.#handlers = handlers || {};
    const canSummon = Boolean(vm?.canSummon);
    const recentPull = vm?.recentPull || null;
    const items = Array.isArray(vm?.items) ? vm.items.slice() : [];
    items.sort((a, b) => {
      if (a.equipped && !b.equipped) return -1;
      if (!a.equipped && b.equipped) return 1;
      if (a.owned && !b.owned) return -1;
      if (!a.owned && b.owned) return 1;
      return String(a.name).localeCompare(String(b.name));
    });

    this.#summonButtonEl.textContent = textVm.summon || "Free Summon";
    this.#summonButtonEl.disabled = this.#isBusy || !canSummon;
    if (!this.#summonButtonEl.dataset.wired) {
      this.#summonButtonEl.dataset.wired = "1";
      this.#summonButtonEl.addEventListener("click", async () => {
        if (this.#isBusy || !this.#handlers.onSummon) return;
        this.#isBusy = true;
        this.#summonButtonEl.disabled = true;
        try {
          await this.#handlers.onSummon();
        } finally {
          this.#isBusy = false;
          this.#summonButtonEl.disabled = false;
        }
      });
    }

    this.#recentEl.textContent = recentPull
      ? `${textVm.recent || "Recent"}: ${recentPull.name} (${recentPull.rarity})`
      : (textVm.noRecent || "No summon yet.");

    this.#listEl.innerHTML = "";
    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "cosmetic-empty";
      empty.textContent = textVm.empty || "No cosmetics available.";
      this.#listEl.appendChild(empty);
      return;
    }

    for (const item of items) {
      const row = document.createElement("div");
      row.className = `cosmetic-item cosmetic-item--${item.rarity.toLowerCase()}`;

      const title = document.createElement("div");
      title.className = "cosmetic-item__title";
      title.textContent = `${item.name} (${item.rarity})`;
      row.appendChild(title);

      const meta = document.createElement("div");
      meta.className = "cosmetic-item__meta";
      meta.textContent = `${item.slot}${item.owned ? "" : ` | ${textVm.locked || "Locked"}`}`;
      row.appendChild(meta);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "cosmetic-item__btn";
      button.textContent = item.equipped
        ? (textVm.equipped || "Equipped")
        : (textVm.equip || "Equip");
      button.disabled = this.#isBusy || !item.owned || item.equipped;
      button.addEventListener("click", async () => {
        if (this.#isBusy || !this.#handlers.onEquip) return;
        this.#isBusy = true;
        try {
          await this.#handlers.onEquip(item.id);
        } finally {
          this.#isBusy = false;
        }
      });

      row.appendChild(button);
      this.#listEl.appendChild(row);
    }
  }
}
