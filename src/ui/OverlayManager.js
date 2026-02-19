/**
 * Presentation Layer: OverlayManager
 * Handles visual overlay lifecycle and tab groups.
 */
export class OverlayManager {
  #overlays = new Map();

  register(name, { rootEl, closeEls = [] }) {
    if (typeof name !== "string" || !rootEl) return;

    this.#overlays.set(name, { rootEl });
    for (const closeEl of closeEls) {
      if (!closeEl || closeEl.dataset.overlayCloseWired) continue;
      closeEl.dataset.overlayCloseWired = "1";
      closeEl.addEventListener("click", () => this.close(name));
    }
  }

  open(name) {
    const overlay = this.#overlays.get(name);
    if (!overlay) return;
    overlay.rootEl.classList.add("is-open");
    overlay.rootEl.setAttribute("aria-hidden", "false");
  }

  close(name) {
    const overlay = this.#overlays.get(name);
    if (!overlay) return;
    overlay.rootEl.classList.remove("is-open");
    overlay.rootEl.setAttribute("aria-hidden", "true");
  }

  closeAll() {
    for (const [name] of this.#overlays.entries()) {
      this.close(name);
    }
  }

  setupTabs({ rootEl, buttonSelector, panelSelector, activeClass = "is-active", initialTabId = "" }) {
    if (!rootEl) {
      return {
        activate: () => {},
      };
    }

    const buttons = Array.from(rootEl.querySelectorAll(buttonSelector));
    const panels = Array.from(rootEl.querySelectorAll(panelSelector));
    if (buttons.length === 0 || panels.length === 0) {
      return {
        activate: () => {},
      };
    }

    const activate = (tabId) => {
      for (const button of buttons) {
        const isActive = button.dataset.tab === tabId;
        button.classList.toggle(activeClass, isActive);
        button.setAttribute("aria-selected", isActive ? "true" : "false");
      }
      for (const panel of panels) {
        const isActive = panel.dataset.tabPanel === tabId;
        panel.classList.toggle(activeClass, isActive);
        panel.setAttribute("aria-hidden", isActive ? "false" : "true");
      }
    };

    for (const button of buttons) {
      if (button.dataset.tabWired) continue;
      button.dataset.tabWired = "1";
      button.addEventListener("click", () => {
        activate(button.dataset.tab || "");
      });
    }

    const firstId = buttons[0].dataset.tab || "";
    activate(initialTabId || firstId);

    return { activate };
  }
}

