/**
 * Presentation Layer: BossView
 * Renders entity meters and sigil state.
 */
export class BossView {
  #nameEl;
  #stageEl;
  #coreEl;
  #auraEl;
  #sigilLayerEl;
  #fractureEl;
  #hpTextEl;
  #hpFillEl;
  #rageTextEl;
  #rageFillEl;
  #corruptionTextEl;
  #corruptionFillEl;
  #phaseTextEl;
  #statusTextEl;
  #tipTextEl;
  #damageAnimator;
  #formatter;

  constructor({
    nameEl,
    stageEl,
    coreEl,
    auraEl,
    sigilLayerEl,
    fractureEl,
    hpTextEl,
    hpFillEl,
    rageTextEl,
    rageFillEl,
    corruptionTextEl,
    corruptionFillEl,
    phaseTextEl,
    statusTextEl,
    tipTextEl,
    damageAnimator,
    formatter = new Intl.NumberFormat("en-US"),
  }) {
    if (
      !nameEl ||
      !stageEl ||
      !coreEl ||
      !auraEl ||
      !sigilLayerEl ||
      !fractureEl ||
      !hpTextEl ||
      !hpFillEl ||
      !rageTextEl ||
      !rageFillEl ||
      !corruptionTextEl ||
      !corruptionFillEl ||
      !phaseTextEl ||
      !statusTextEl ||
      !tipTextEl
    ) {
      throw new Error("BossView missing required elements.");
    }

    this.#nameEl = nameEl;
    this.#stageEl = stageEl;
    this.#coreEl = coreEl;
    this.#auraEl = auraEl;
    this.#sigilLayerEl = sigilLayerEl;
    this.#fractureEl = fractureEl;
    this.#hpTextEl = hpTextEl;
    this.#hpFillEl = hpFillEl;
    this.#rageTextEl = rageTextEl;
    this.#rageFillEl = rageFillEl;
    this.#corruptionTextEl = corruptionTextEl;
    this.#corruptionFillEl = corruptionFillEl;
    this.#phaseTextEl = phaseTextEl;
    this.#statusTextEl = statusTextEl;
    this.#tipTextEl = tipTextEl;
    this.#damageAnimator = damageAnimator;
    this.#formatter = formatter;
  }

  render(state) {
    const boss = state.boss;
    const ui = state.ui || {};
    const bossText = ui.boss || {};
    const sigil = boss.sigil || {};

    const hpUnit = bossText.hpUnit || "HP";
    const phaseLabel = bossText.phase || "Phase";

    this.#nameEl.textContent = boss.name;
    this.#hpTextEl.textContent = `${this.#formatter.format(boss.currentHp)} / ${this.#formatter.format(boss.totalHp)} ${hpUnit}`;
    this.#rageTextEl.textContent = `${Math.round(boss.ragePercent || 0)}%`;
    this.#corruptionTextEl.textContent = `${Math.round(boss.corruptionPercent || 0)}%`;
    this.#phaseTextEl.textContent = `${phaseLabel} ${boss.phase || 1}`;
    this.#statusTextEl.textContent = typeof ui.statusText === "string" ? ui.statusText : "";
    this.#tipTextEl.textContent = typeof ui.tipText === "string" ? ui.tipText : "";

    this.#hpFillEl.style.width = `${Math.max(0, Math.min(100, boss.hpRemainingPercent || 0))}%`;
    this.#rageFillEl.style.width = `${Math.max(0, Math.min(100, boss.ragePercent || 0))}%`;
    this.#corruptionFillEl.style.width = `${Math.max(0, Math.min(100, boss.corruptionPercent || 0))}%`;

    const revealPercent = Number.isFinite(sigil.revealPercent) ? sigil.revealPercent : 0;
    this.#sigilLayerEl.style.setProperty("--sigil-reveal", `${Math.max(0, Math.min(100, revealPercent))}%`);

    this.#sigilLayerEl.classList.toggle("is-layer-3", Boolean(sigil.layers && sigil.layers.tier3));
    this.#sigilLayerEl.classList.toggle("is-layer-5", Boolean(sigil.layers && sigil.layers.tier5));
    this.#sigilLayerEl.classList.toggle("is-layer-8", Boolean(sigil.layers && sigil.layers.tier8));

    this.#fractureEl.classList.toggle("is-active", Boolean(sigil.fractureActive));
    this.#stageEl.classList.toggle("is-rage-pulse", Boolean(sigil.ragePulse));
    document.body.classList.toggle("is-rage-pulse", Boolean(sigil.ragePulse));

    this.#coreEl.style.setProperty("--entity-phase", String(boss.phase || 1));
    this.#auraEl.style.setProperty("--phase", String(boss.phase || 1));
  }

  playHit({ amount, isCrit = false, isHeavy = false } = {}) {
    if (!Number.isFinite(amount) || amount <= 0) return;

    this.#stageEl.classList.remove("is-hit");
    void this.#stageEl.offsetWidth;
    this.#stageEl.classList.add("is-hit");

    if (isHeavy) {
      this.#screenShake();
    }
    if (isCrit) {
      this.#hitStop();
    }

    const cleanup = () => this.#stageEl.classList.remove("is-hit");
    this.#stageEl.addEventListener("animationend", cleanup, { once: true });
    window.setTimeout(cleanup, 360);

    if (this.#damageAnimator) {
      this.#damageAnimator.spawn(amount, { isCrit });
    }
  }

  playBossDefeatCinematic() {
    this.#stageEl.classList.remove("is-defeat");
    void this.#stageEl.offsetWidth;
    this.#stageEl.classList.add("is-defeat");

    const cleanup = () => this.#stageEl.classList.remove("is-defeat");
    this.#stageEl.addEventListener("animationend", cleanup, { once: true });
    window.setTimeout(cleanup, 900);
  }

  playSigilGoldPulse() {
    this.#sigilLayerEl.classList.remove("is-gold-pulse");
    void this.#sigilLayerEl.offsetWidth;
    this.#sigilLayerEl.classList.add("is-gold-pulse");
    const cleanup = () => this.#sigilLayerEl.classList.remove("is-gold-pulse");
    this.#sigilLayerEl.addEventListener("animationend", cleanup, { once: true });
    window.setTimeout(cleanup, 1200);
  }

  #hitStop() {
    document.body.classList.remove("is-hit-stop");
    void document.body.offsetWidth;
    document.body.classList.add("is-hit-stop");
    window.setTimeout(() => document.body.classList.remove("is-hit-stop"), 50);
  }

  #screenShake() {
    document.body.classList.remove("is-screen-shake");
    void document.body.offsetWidth;
    document.body.classList.add("is-screen-shake");
    window.setTimeout(() => document.body.classList.remove("is-screen-shake"), 300);
  }
}
