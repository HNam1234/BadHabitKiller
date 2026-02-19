/**
 * Presentation Layer: CampaignView
 * Renders campaign title and debt progress.
 */
export class CampaignView {
  #titleEl;
  #subtitleEl;
  #debtTextEl;
  #debtFillEl;
  #bossTypeEl;
  #themeEl;
  #formatter;

  constructor({
    titleEl,
    subtitleEl,
    debtTextEl,
    debtFillEl,
    bossTypeEl = null,
    themeEl = null,
    formatter = new Intl.NumberFormat("en-US"),
  }) {
    if (!titleEl || !subtitleEl || !debtTextEl || !debtFillEl) {
      throw new Error("CampaignView missing required elements.");
    }
    this.#titleEl = titleEl;
    this.#subtitleEl = subtitleEl;
    this.#debtTextEl = debtTextEl;
    this.#debtFillEl = debtFillEl;
    this.#bossTypeEl = bossTypeEl;
    this.#themeEl = themeEl;
    this.#formatter = formatter;
  }

  render(campaignVm) {
    const title = campaignVm && typeof campaignVm.title === "string" ? campaignVm.title : "Campaign";
    const subtitle = campaignVm && typeof campaignVm.subtitle === "string" ? campaignVm.subtitle : "";
    const debt = campaignVm && campaignVm.debt ? campaignVm.debt : {};

    const current = Number.isFinite(debt.current) ? debt.current : 0;
    const total = Number.isFinite(debt.total) ? debt.total : 1;
    const ratio = Number.isFinite(debt.ratio) ? debt.ratio : 1;
    const paid = Number.isFinite(debt.paid) ? debt.paid : Math.max(0, total - current);

    this.#titleEl.textContent = title;
    this.#subtitleEl.textContent = subtitle;
    this.#debtTextEl.textContent = `${this.#formatter.format(current)} / ${this.#formatter.format(total)} (${this.#formatter.format(paid)})`;
    this.#debtFillEl.style.width = `${Math.max(0, Math.min(100, (1 - ratio) * 100))}%`;
    if (this.#bossTypeEl) {
      this.#bossTypeEl.textContent = typeof campaignVm?.bossType === "string" ? campaignVm.bossType : "-";
    }
    if (this.#themeEl) {
      this.#themeEl.textContent = typeof campaignVm?.visualTheme === "string" ? campaignVm.visualTheme : "-";
    }
  }
}
