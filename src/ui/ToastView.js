/**
 * Presentation Layer: ToastView
 * Small reward/quest/tier notifications.
 */
export class ToastView {
  #containerEl;

  constructor(containerEl) {
    if (!containerEl) throw new Error("ToastView requires a container element.");
    this.#containerEl = containerEl;
  }

  show({ title, body }) {
    const toast = document.createElement("div");
    toast.className = "toast";

    const safeTitle = typeof title === "string" ? title : "Notification";
    const safeBody = typeof body === "string" ? body : "";

    toast.innerHTML = `<div class="toast__title">${safeTitle}</div><div class="toast__body">${safeBody}</div>`;
    this.#containerEl.appendChild(toast);

    // Remove after toast-out finishes (CSS animation-delay drives this).
    const onEnd = (event) => {
      if (event.animationName !== "toast-out") return;
      toast.removeEventListener("animationend", onEnd);
      toast.remove();
    };
    toast.addEventListener("animationend", onEnd);
    window.setTimeout(() => toast.remove(), 3000);
  }
}
