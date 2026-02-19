/**
 * Core Layer: LocalizationService
 * Loads locale dictionaries and provides resolved localized bundles.
 */
export class LocalizationService {
  #localeSources;
  #defaultLocale;
  #fetchFn;
  #bundles = new Map();
  #loadPromise = null;

  constructor({ localeSources, defaultLocale = "en", fetchFn = fetch }) {
    if (!localeSources || typeof localeSources !== "object") {
      throw new Error("LocalizationService requires localeSources map.");
    }
    const locales = Object.keys(localeSources);
    if (locales.length === 0) {
      throw new Error("LocalizationService requires at least one locale source.");
    }
    if (!(defaultLocale in localeSources)) {
      throw new Error("LocalizationService defaultLocale must exist in localeSources.");
    }
    if (typeof fetchFn !== "function") {
      throw new Error("LocalizationService requires a fetch function.");
    }

    this.#localeSources = { ...localeSources };
    this.#defaultLocale = defaultLocale;
    this.#fetchFn = fetchFn.bind(globalThis);
  }

  async loadAll() {
    if (this.#bundles.size === Object.keys(this.#localeSources).length) return;
    if (this.#loadPromise) return this.#loadPromise;

    this.#loadPromise = this.#loadAllInternal().catch((err) => {
      this.#loadPromise = null;
      throw err;
    });
    return this.#loadPromise;
  }

  resolveLocale(locale) {
    if (typeof locale === "string" && locale in this.#localeSources) return locale;
    return this.#defaultLocale;
  }

  getSupportedLocales() {
    return Object.keys(this.#localeSources);
  }

  getBundle(locale) {
    const resolved = this.resolveLocale(locale);
    if (!this.#bundles.has(resolved)) {
      throw new Error(`Locale bundle not loaded: ${resolved}`);
    }
    return this.#bundles.get(resolved);
  }

  async #loadAllInternal() {
    const entries = Object.entries(this.#localeSources);
    const tasks = entries.map(async ([locale, source]) => {
      const response = await this.#fetchFn(source, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load locale ${locale} (HTTP ${response.status}).`);
      }
      const json = await response.json();
      LocalizationService.#validateBundle(locale, json);
      this.#bundles.set(locale, json);
    });

    await Promise.all(tasks);
  }

  static #validateBundle(locale, bundle) {
    if (!bundle || typeof bundle !== "object") {
      throw new Error(`Locale ${locale} must be an object.`);
    }
    if (!bundle.meta || typeof bundle.meta !== "object") {
      throw new Error(`Locale ${locale} missing meta.`);
    }
    if (typeof bundle.meta.title !== "string" || bundle.meta.title.length === 0) {
      throw new Error(`Locale ${locale} missing meta.title.`);
    }
    if (!bundle.actions || typeof bundle.actions !== "object") {
      throw new Error(`Locale ${locale} missing actions.`);
    }
    if (!bundle.tutorial || typeof bundle.tutorial !== "object") {
      throw new Error(`Locale ${locale} missing tutorial.`);
    }
    if (!Array.isArray(bundle.tutorial.steps) || bundle.tutorial.steps.length === 0) {
      throw new Error(`Locale ${locale} tutorial.steps must be non-empty.`);
    }
  }
}
