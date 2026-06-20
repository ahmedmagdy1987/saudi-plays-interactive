/* Optional media manifest. Paths are filled in once textless cinematic assets
   are generated & optimized into /public/media. Empty string = not available,
   so components must render NOTHING for it (no broken requests, graceful CSS
   fallback). */
export interface MediaAsset {
  /** poster/background image path under /public, or "" if unavailable */
  src: string;
  /** optional looping video path, or "" */
  video?: string;
  alt: string;
  /** decorative backgrounds are hidden from AT */
  decorative?: boolean;
}

export const media: Record<string, MediaAsset> = {
  hero: {
    src: "/media/hero.webp",
    video: "",
    alt: "أجواء ساحة ترفيه عامة في مدينة سعودية حديثة عند الغسق",
    decorative: true,
  },
  finale: {
    // retired: the §10 background is now supplied by the cinematic media backdrop
    // (SectionBackgroundStage, s10-finale) — an empty src renders nothing here, so
    // the finale no longer double-stacks two near-identical night-nation images.
    src: "",
    video: "",
    alt: "مشهد ليلي وطني يربط مدن المملكة بشبكة من الأضواء",
    decorative: true,
  },
  zones: {
    // retired: section experience visuals now come from the cinematic media backdrop
    src: "",
    alt: "حقل طاقة بصري يمثل تنوع تجارب الترفيه",
    decorative: true,
  },
};
