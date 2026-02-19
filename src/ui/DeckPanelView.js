/**
 * Presentation Layer: DeckPanelView
 * Renders deck pool and active slot selection.
 */
export class DeckPanelView {
  #listEl;
  #applyBtn;
  #slotsEl;
  #selected = new Set();
  #activeSlots = 5;
  #isBusy = false;
  #onApply = null;

  constructor({ listEl, applyBtn, slotsEl }) {
    if (!listEl || !applyBtn || !slotsEl) {
      throw new Error("DeckPanelView missing required elements.");
    }
    this.#listEl = listEl;
    this.#applyBtn = applyBtn;
    this.#slotsEl = slotsEl;
  }

  render(deckVm, textVm = {}, onApply) {
    this.#onApply = onApply;
    this.#activeSlots = Number.isFinite(deckVm?.activeSlots) ? deckVm.activeSlots : 5;

    const cards = Array.isArray(deckVm?.cards) ? deckVm.cards.slice() : [];
    cards.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return String(a.name).localeCompare(String(b.name));
    });
    this.#selected = new Set(cards.filter((card) => card.isActive).map((card) => card.id));

    this.#slotsEl.textContent = `${this.#selected.size}/${this.#activeSlots}`;
    this.#listEl.innerHTML = "";

    if (cards.length === 0) {
      const empty = document.createElement("div");
      empty.className = "deck-empty";
      empty.textContent = textVm.empty || "No cards available.";
      this.#listEl.appendChild(empty);
    }

    for (const card of cards) {
      const row = document.createElement("label");
      row.className = "deck-card";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = this.#selected.has(card.id);
      checkbox.disabled = this.#isBusy;

      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          if (this.#selected.size >= this.#activeSlots) {
            checkbox.checked = false;
            return;
          }
          this.#selected.add(card.id);
        } else {
          this.#selected.delete(card.id);
        }
        this.#slotsEl.textContent = `${this.#selected.size}/${this.#activeSlots}`;
      });

      const body = document.createElement("div");
      body.className = "deck-card__body";
      const type = card.type === "Run"
        ? (textVm.runType || "Run")
        : (textVm.permanentType || "Permanent");
      const tags = Array.isArray(card.tags) && card.tags.length > 0
        ? card.tags.join(" • ")
        : "";
      body.innerHTML = `
        <div class="deck-card__title">${card.name}</div>
        <div class="deck-card__meta">${type}${tags ? ` | ${tags}` : ""}</div>
      `;

      row.appendChild(checkbox);
      row.appendChild(body);
      this.#listEl.appendChild(row);
    }

    if (!this.#applyBtn.dataset.wired) {
      this.#applyBtn.dataset.wired = "1";
      this.#applyBtn.addEventListener("click", async () => {
        if (!this.#onApply || this.#isBusy) return;
        this.#isBusy = true;
        this.#applyBtn.disabled = true;
        try {
          await this.#onApply(Array.from(this.#selected));
        } finally {
          this.#isBusy = false;
          this.#applyBtn.disabled = false;
        }
      });
    }

    this.#applyBtn.textContent = textVm.apply || "Apply Deck";
    this.#applyBtn.disabled = this.#isBusy;
  }
}
