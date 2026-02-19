/**
 * Presentation Layer: CombatArenaView
 * Handles ritual warrior and boss entity combat-only animations.
 */
export class CombatArenaView {
  #stageEl;
  #playerEl;
  #bossEl;
  #slashLayerEl;

  constructor({ stageEl, playerEl, bossEl, slashLayerEl }) {
    if (!stageEl || !playerEl || !bossEl || !slashLayerEl) {
      throw new Error("CombatArenaView missing required elements.");
    }
    this.#stageEl = stageEl;
    this.#playerEl = playerEl;
    this.#bossEl = bossEl;
    this.#slashLayerEl = slashLayerEl;
  }

  render(state) {
    const rage = Number.isFinite(state?.boss?.ragePercent) ? state.boss.ragePercent : 0;
    const phase = Number.isFinite(state?.boss?.phase) ? state.boss.phase : 1;

    this.#bossEl.classList.toggle("is-rage", rage >= 70);
    this.#bossEl.classList.toggle("is-phase-2", phase === 2);
    this.#bossEl.classList.toggle("is-phase-3", phase === 3);
  }

  playAttack({ actionType, isCrit = false, isHeavy = false } = {}) {
    const normalized = typeof actionType === "string" ? actionType : "WORK";
    const style = CombatArenaView.#styleForAction(normalized);

    this.#pulseAttackClass(this.#playerEl, style.playerClass, 520);
    this.#pulseAttackClass(this.#bossEl, "is-stagger", 360);

    const slash = document.createElement("div");
    slash.className = `arena-slash ${style.slashClass}`;
    if (isCrit) slash.classList.add("is-crit");

    const trail = document.createElement("div");
    trail.className = `arena-trail ${style.trailClass}`;

    this.#slashLayerEl.appendChild(slash);
    this.#slashLayerEl.appendChild(trail);

    const cleanup = () => {
      slash.remove();
      trail.remove();
    };
    slash.addEventListener("animationend", cleanup, { once: true });
    window.setTimeout(cleanup, isHeavy ? 660 : 520);
  }

  #pulseAttackClass(target, className, durationMs) {
    target.classList.remove(className);
    void target.offsetWidth;
    target.classList.add(className);
    window.setTimeout(() => target.classList.remove(className), durationMs);
  }

  static #styleForAction(actionType) {
    const map = {
      WORK: {
        playerClass: "is-attack-overhead",
        slashClass: "is-slash-overhead",
        trailClass: "is-trail-heavy",
      },
      DEEP_WORK: {
        playerClass: "is-attack-thrust",
        slashClass: "is-slash-thrust",
        trailClass: "is-trail-precision",
      },
      NO_SUGAR: {
        playerClass: "is-attack-beam",
        slashClass: "is-slash-beam",
        trailClass: "is-trail-beam",
      },
      WALK: {
        playerClass: "is-attack-wind",
        slashClass: "is-slash-wind",
        trailClass: "is-trail-wind",
      },
    };

    return map[actionType] || map.WORK;
  }
}
