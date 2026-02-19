/**
 * Presentation Layer: TutorialOverlay
 * UI-only step-by-step guide. No gameplay logic.
 */
export class TutorialOverlay {
  #rootEl;
  #titleEl;
  #counterEl;
  #bodyEl;
  #skipBtn;
  #prevBtn;
  #nextBtn;
  #doneBtn;
  #isOpen = false;
  #stepIndex = 0;
  #steps = [];
  #onComplete = null;
  #stepFormat = "Step {current}/{total}";

  constructor({ rootEl, titleEl, counterEl, bodyEl, skipBtn, prevBtn, nextBtn, doneBtn }) {
    if (!rootEl || !titleEl || !counterEl || !bodyEl || !skipBtn || !prevBtn || !nextBtn || !doneBtn) {
      throw new Error("TutorialOverlay missing required elements.");
    }

    this.#rootEl = rootEl;
    this.#titleEl = titleEl;
    this.#counterEl = counterEl;
    this.#bodyEl = bodyEl;
    this.#skipBtn = skipBtn;
    this.#prevBtn = prevBtn;
    this.#nextBtn = nextBtn;
    this.#doneBtn = doneBtn;

    this.#skipBtn.addEventListener("click", () => this.#complete());
    this.#prevBtn.addEventListener("click", () => this.#prev());
    this.#nextBtn.addEventListener("click", () => this.#next());
    this.#doneBtn.addEventListener("click", () => this.#complete());
  }

  render(vm, handlers = {}) {
    const tutorial = vm && typeof vm === "object" ? vm : {};
    const shouldShow = Boolean(tutorial.shouldShow);
    const steps = Array.isArray(tutorial.steps) ? tutorial.steps : [];

    if (!shouldShow || steps.length === 0) {
      this.#isOpen = false;
      this.#rootEl.classList.remove("is-active");
      return;
    }

    if (!this.#isOpen) {
      this.#stepIndex = 0;
    }

    this.#isOpen = true;
    this.#steps = steps;
    this.#onComplete = typeof handlers.onComplete === "function" ? handlers.onComplete : null;
    this.#stepFormat = typeof tutorial.stepFormat === "string" && tutorial.stepFormat.length > 0
      ? tutorial.stepFormat
      : "Step {current}/{total}";

    this.#rootEl.classList.add("is-active");
    this.#titleEl.textContent = tutorial.title || "Tutorial";
    this.#skipBtn.textContent = tutorial.skipLabel || "Skip";
    this.#prevBtn.textContent = tutorial.prevLabel || "Back";
    this.#nextBtn.textContent = tutorial.nextLabel || "Next";
    this.#doneBtn.textContent = tutorial.doneLabel || "Done";

    this.#paintStep();
  }

  #paintStep() {
    const total = this.#steps.length;
    const current = this.#stepIndex + 1;
    const safe = this.#steps[this.#stepIndex] || "";

    this.#counterEl.textContent = this.#stepFormat
      .replace("{current}", String(current))
      .replace("{total}", String(total));
    this.#bodyEl.textContent = safe;

    this.#prevBtn.disabled = this.#stepIndex <= 0;
    this.#nextBtn.hidden = this.#stepIndex >= total - 1;
    this.#doneBtn.hidden = this.#stepIndex < total - 1;
  }

  #prev() {
    if (!this.#isOpen) return;
    this.#stepIndex = Math.max(0, this.#stepIndex - 1);
    this.#paintStep();
  }

  #next() {
    if (!this.#isOpen) return;
    this.#stepIndex = Math.min(this.#steps.length - 1, this.#stepIndex + 1);
    this.#paintStep();
  }

  #complete() {
    this.#isOpen = false;
    this.#rootEl.classList.remove("is-active");
    if (this.#onComplete) {
      this.#onComplete();
    }
  }
}
