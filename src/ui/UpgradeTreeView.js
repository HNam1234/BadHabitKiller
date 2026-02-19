/**
 * Presentation Layer: UpgradeTreeView
 * Renders upgrade paths as constellation networks.
 */
export class UpgradeTreeView {
  #containerEl;
  #isBusy = false;

  constructor(containerEl) {
    if (!containerEl) throw new Error("UpgradeTreeView requires a container element.");
    this.#containerEl = containerEl;
  }

  render(pathsVm, onPurchase) {
    this.#containerEl.innerHTML = "";
    const paths = Array.isArray(pathsVm) ? pathsVm : [];

    for (const path of paths) {
      const section = document.createElement("section");
      section.className = "constellation";
      section.innerHTML = `<div class="constellation__title">${path.label}</div>`;

      const mapEl = document.createElement("div");
      mapEl.className = "constellation__map";

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 100 100");
      svg.classList.add("constellation__links");

      const nodeById = new Map((path.nodes || []).map((node) => [node.id, node]));

      for (const link of path.links || []) {
        const from = nodeById.get(link.fromId);
        const to = nodeById.get(link.toId);
        if (!from || !to) continue;
        const fromPos = UpgradeTreeView.#resolveNodePosition(from);
        const toPos = UpgradeTreeView.#resolveNodePosition(to);

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", String(fromPos.x));
        line.setAttribute("y1", String(fromPos.y));
        line.setAttribute("x2", String(toPos.x));
        line.setAttribute("y2", String(toPos.y));
        line.classList.add("constellation__link");
        if (from.rank > 0 && to.rank > 0) line.classList.add("is-unlocked");
        svg.appendChild(line);
      }

      mapEl.appendChild(svg);

      for (const node of path.nodes || []) {
        const pos = UpgradeTreeView.#resolveNodePosition(node);
        const rune = document.createElement("button");
        rune.type = "button";
        rune.className = "rune-node";
        rune.style.left = `${pos.x}%`;
        rune.style.top = `${pos.y}%`;

        if (node.isLocked) rune.classList.add("is-locked");
        if (node.canPurchase) rune.classList.add("is-available");
        if (node.rank > 0) rune.classList.add("is-unlocked");
        if (node.isMaxed) rune.classList.add("is-maxed");

        rune.disabled = this.#isBusy || !node.canPurchase;
        rune.dataset.baseDisabled = !node.canPurchase ? "1" : "0";
        rune.title = `${node.name} | Rank ${node.rank}/${node.maxRank} | Cost ${node.cost}`;
        rune.innerHTML = `<span>${node.rank}/${node.maxRank}</span>`;

        rune.addEventListener("click", async () => {
          if (this.#isBusy || !node.canPurchase) return;
          this.#isBusy = true;
          this.#setDisabled(true);
          try {
            await onPurchase(node.id);
          } finally {
            this.#isBusy = false;
            this.#setDisabled(false);
          }
        });

        mapEl.appendChild(rune);
      }

      section.appendChild(mapEl);
      this.#containerEl.appendChild(section);
    }
  }

  #setDisabled(disabled) {
    const buttons = this.#containerEl.querySelectorAll("button");
    for (const button of buttons) {
      const baseDisabled = button.dataset.baseDisabled === "1";
      button.disabled = disabled || baseDisabled;
    }
  }

  static #resolveNodePosition(nodeVm) {
    const display = nodeVm && nodeVm.display ? nodeVm.display : null;
    const x = display && Number.isFinite(display.x) ? display.x : 50;
    const y = display && Number.isFinite(display.y) ? display.y : 50;
    return {
      x: Math.max(6, Math.min(94, x)),
      y: Math.max(10, Math.min(90, y)),
    };
  }
}
