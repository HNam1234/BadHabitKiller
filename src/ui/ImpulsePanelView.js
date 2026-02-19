/**
 * Presentation Layer: ImpulsePanelView
 * Collects financial intent inputs and renders impulse history.
 */
export class ImpulsePanelView {
  #debtValueEl;
  #paidValueEl;
  #integrityValueEl;
  #integrityTierEl;
  #redemptionValueEl;
  #paymentInputEl;
  #paymentButtonEl;
  #impulseInputEl;
  #impulseNoteEl;
  #impulseButtonEl;
  #historyEl;
  #isBusy = false;
  #handlers = null;

  constructor({
    debtValueEl = null,
    paidValueEl = null,
    integrityValueEl = null,
    integrityTierEl = null,
    redemptionValueEl = null,
    paymentInputEl,
    paymentButtonEl,
    impulseInputEl,
    impulseNoteEl,
    impulseButtonEl,
    historyEl,
  }) {
    if (!paymentInputEl || !paymentButtonEl || !impulseInputEl || !impulseButtonEl || !historyEl) {
      throw new Error("ImpulsePanelView missing required elements.");
    }
    this.#debtValueEl = debtValueEl;
    this.#paidValueEl = paidValueEl;
    this.#integrityValueEl = integrityValueEl;
    this.#integrityTierEl = integrityTierEl;
    this.#redemptionValueEl = redemptionValueEl;
    this.#paymentInputEl = paymentInputEl;
    this.#paymentButtonEl = paymentButtonEl;
    this.#impulseInputEl = impulseInputEl;
    this.#impulseNoteEl = impulseNoteEl || null;
    this.#impulseButtonEl = impulseButtonEl;
    this.#historyEl = historyEl;
  }

  render(stateVm, textVm = {}, handlers) {
    this.#handlers = handlers || {};

    if (this.#debtValueEl) {
      const debt = stateVm?.campaign?.debt || {};
      const current = Number.isFinite(debt.current) ? debt.current : 0;
      const total = Number.isFinite(debt.total) ? debt.total : 0;
      this.#debtValueEl.textContent = `${Math.round(current)} / ${Math.round(total)}`;
    }
    if (this.#paidValueEl) {
      const debt = stateVm?.campaign?.debt || {};
      const paid = Number.isFinite(debt.paid) ? debt.paid : 0;
      this.#paidValueEl.textContent = `${Math.round(paid)}`;
    }
    if (this.#integrityValueEl) {
      const integrity = stateVm?.integrity || {};
      this.#integrityValueEl.textContent = `${Math.round(Number.isFinite(integrity.value) ? integrity.value : 0)}%`;
    }
    if (this.#integrityTierEl) {
      const integrity = stateVm?.integrity || {};
      this.#integrityTierEl.textContent = integrity.tier || "-";
    }
    if (this.#redemptionValueEl) {
      const redemption = stateVm?.redemption || {};
      const cur = Number.isFinite(redemption.consistencyDays) ? redemption.consistencyDays : 0;
      const req = Number.isFinite(redemption.requiredDays) ? redemption.requiredDays : 7;
      this.#redemptionValueEl.textContent = `${cur}/${req}`;
    }

    this.#paymentButtonEl.textContent = textVm.logPayment || "Log Payment";
    this.#impulseButtonEl.textContent = textVm.logImpulse || "Log Impulse";
    this.#paymentButtonEl.disabled = this.#isBusy;
    this.#impulseButtonEl.disabled = this.#isBusy;

    if (!this.#paymentButtonEl.dataset.wired) {
      this.#paymentButtonEl.dataset.wired = "1";
      this.#paymentButtonEl.addEventListener("click", async () => {
        if (this.#isBusy || !this.#handlers.onLogPayment) return;
        const amount = Number(this.#paymentInputEl.value);
        if (!Number.isFinite(amount) || amount <= 0) return;
        this.#isBusy = true;
        this.#refreshBusy();
        try {
          await this.#handlers.onLogPayment(amount);
          this.#paymentInputEl.value = "";
        } finally {
          this.#isBusy = false;
          this.#refreshBusy();
        }
      });
    }

    if (!this.#impulseButtonEl.dataset.wired) {
      this.#impulseButtonEl.dataset.wired = "1";
      this.#impulseButtonEl.addEventListener("click", async () => {
        if (this.#isBusy || !this.#handlers.onLogImpulse) return;
        const amount = Number(this.#impulseInputEl.value);
        if (!Number.isFinite(amount) || amount <= 0) return;
        const note = this.#impulseNoteEl ? this.#impulseNoteEl.value : "";
        this.#isBusy = true;
        this.#refreshBusy();
        try {
          await this.#handlers.onLogImpulse(amount, note);
          this.#impulseInputEl.value = "";
          if (this.#impulseNoteEl) this.#impulseNoteEl.value = "";
        } finally {
          this.#isBusy = false;
          this.#refreshBusy();
        }
      });
    }

    this.#historyEl.innerHTML = "";
    const history = Array.isArray(stateVm?.impulseHistory) ? stateVm.impulseHistory : [];
    if (history.length === 0) {
      const empty = document.createElement("div");
      empty.className = "impulse-history__empty";
      empty.textContent = textVm.empty || "No impulse logs.";
      this.#historyEl.appendChild(empty);
      return;
    }

    for (const row of history) {
      const item = document.createElement("div");
      item.className = "impulse-history__item";

      const top = document.createElement("div");
      top.className = "impulse-history__top";
      top.textContent = `${Math.round(row.amount)} (${Math.round(row.remainingAmount)} left)`;
      item.appendChild(top);

      if (row.note) {
        const note = document.createElement("div");
        note.className = "impulse-history__note";
        note.textContent = row.note;
        item.appendChild(note);
      }

      const actions = document.createElement("div");
      actions.className = "impulse-history__actions";
      const redeemInput = document.createElement("input");
      redeemInput.type = "number";
      redeemInput.min = "1";
      redeemInput.step = "1";
      redeemInput.placeholder = textVm.redeemAmount || "Redeem";

      const redeemBtn = document.createElement("button");
      redeemBtn.type = "button";
      redeemBtn.textContent = textVm.redeem || "Redeem";
      redeemBtn.disabled = this.#isBusy || row.remainingAmount <= 0;
      redeemBtn.addEventListener("click", async () => {
        if (!this.#handlers.onRedeemImpulse || this.#isBusy) return;
        const value = Number(redeemInput.value);
        if (!Number.isFinite(value) || value <= 0) return;
        this.#isBusy = true;
        this.#refreshBusy();
        try {
          await this.#handlers.onRedeemImpulse(row.id, value);
        } finally {
          this.#isBusy = false;
          this.#refreshBusy();
        }
      });

      actions.appendChild(redeemInput);
      actions.appendChild(redeemBtn);
      item.appendChild(actions);
      this.#historyEl.appendChild(item);
    }
  }

  #refreshBusy() {
    this.#paymentButtonEl.disabled = this.#isBusy;
    this.#impulseButtonEl.disabled = this.#isBusy;
  }
}
