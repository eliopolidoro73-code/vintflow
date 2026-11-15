export type StudioPresets = {
  subTab?:
    | "photo"
    | "listing"
    | "antishadowban"
    | "negotiation"
    | "visibility";
  photoFormat?: string;
  studioBgId?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  paddingPct?: number;
  badgeText?: string;
  removeBg?: boolean;
  bgTolerance?: number;
  genBrand?: string;
  genCategory?: string;
  genSize?: string;
  genCondition?: string;
};

export type PersoPreferences = {
  studio?: StudioPresets;
  ui?: { lastTab?: string };
};

export function mergePreferences(
  current: PersoPreferences,
  patch: PersoPreferences,
): PersoPreferences {
  return {
    ...current,
    ...patch,
    studio: { ...current.studio, ...patch.studio },
    ui: { ...current.ui, ...patch.ui },
  };
}

export function parsePreferences(raw: unknown): PersoPreferences {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  return {
    studio:
      obj.studio && typeof obj.studio === "object"
        ? (obj.studio as StudioPresets)
        : undefined,
    ui:
      obj.ui && typeof obj.ui === "object"
        ? (obj.ui as PersoPreferences["ui"])
        : undefined,
  };
}