/**
 * Presentation Layer: CinematicTextView
 * Plays dramatic fullscreen callouts.
 */
export class CinematicTextView {
  #rootEl;
  #titleEl;
  #subEl;

  constructor({ rootEl, titleEl, subEl }) {
    if (!rootEl || !titleEl || !subEl) throw new Error("CinematicTextView missing required elements.");
    this.#rootEl = rootEl;
    this.#titleEl = titleEl;
    this.#subEl = subEl;
  }

  play(title, sub = "") {
    this.#titleEl.textContent = title;
    this.#subEl.textContent = sub;

    this.#rootEl.classList.remove("is-active");
    void this.#rootEl.offsetWidth;
    this.#rootEl.classList.add("is-active");

    const cleanup = () => this.#rootEl.classList.remove("is-active");
    this.#rootEl.addEventListener("animationend", cleanup, { once: true });
    window.setTimeout(cleanup, 1400);
  }
}
