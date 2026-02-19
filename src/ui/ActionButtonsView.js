/**
 * Presentation Layer: ActionButtonsView
 * Renders buttons from action types and wires user intent to a callback.
 */
export class ActionButtonsView {
  #containerEl;
  #buttons = [];
  #onAction = null;
  #errorEl;
  #isExternallyDisabled = false;
  #isBusy = false;

  constructor(containerEl, errorEl) {
    if (!containerEl) throw new Error("ActionButtonsView requires a container element.");
    this.#containerEl = containerEl;
    this.#errorEl = errorEl || null;
  }

  render(actionTypes, onAction, actionTextVm = {}) {
    this.#onAction = onAction;
    this.#containerEl.innerHTML = "";
    this.#buttons = [];

    for (const actionType of actionTypes) {
      const actionVm = actionTextVm && actionTextVm[actionType] ? actionTextVm[actionType] : {};
      const label = typeof actionVm.label === "string" && actionVm.label.length > 0
        ? actionVm.label
        : ActionButtonsView.#fallbackLabel(actionType);
      const hint = typeof actionVm.hint === "string" && actionVm.hint.length > 0
        ? actionVm.hint
        : "Ritual impact";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "action-btn";
      button.dataset.actionType = actionType;
      button.innerHTML = `${label}<div class="action-btn__hint">${hint}</div>`;

      button.addEventListener("click", async () => {
        if (!this.#onAction) return;
        this.#isBusy = true;
        this.#applyDisabledState();
        this.#setError("");
        try {
          await this.#onAction(actionType);
        } catch (err) {
          this.#setError(err instanceof Error ? err.message : "Action failed.");
        } finally {
          this.#isBusy = false;
          this.#applyDisabledState();
        }
      });

      this.#containerEl.appendChild(button);
      this.#buttons.push(button);
    }
  }

  setDisabled(isDisabled) {
    this.#isExternallyDisabled = Boolean(isDisabled);
    this.#applyDisabledState();
  }

  #setError(message) {
    if (!this.#errorEl) return;
    this.#errorEl.textContent = message;
  }

  #applyDisabledState() {
    const disabled = this.#isExternallyDisabled || this.#isBusy;
    for (const button of this.#buttons) button.disabled = disabled;
  }

  static #fallbackLabel(actionType) {
    return actionType
      .split("_")
      .map((part) => part.slice(0, 1) + part.slice(1).toLowerCase())
      .join(" ");
  }
}
