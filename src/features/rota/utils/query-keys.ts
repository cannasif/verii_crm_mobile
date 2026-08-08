import type { PlaceCategoryId } from "../types/rota-types";

export const rotaQueryKeys = {
  all: () => ["rota"] as const,
  nearbyPlaces: (
    latitude: number | undefined,
    longitude: number | undefined,
    category: PlaceCategoryId | null,
  ) => [...rotaQueryKeys.all(), "nearby", latitude, longitude, category] as const,
  nearbyCustomers: (latitude: number | undefined, longitude: number | undefined) =>
    [...rotaQueryKeys.all(), "nearbyCustomers", latitude, longitude] as const,
};
