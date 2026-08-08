import type { NearbyPlace, PlaceCategoryId } from "../types/rota-types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const RADIUS_DEG = 0.018;
const REQUEST_TIMEOUT = 15000;

function bbox(lat: number, lng: number, radiusDeg: number = RADIUS_DEG): string {
  const south = lat - radiusDeg;
  const west = lng - radiusDeg;
  const north = lat + radiusDeg;
  const east = lng + radiusDeg;
  return `${south},${west},${north},${east}`;
}

function buildQuery(b: string, categoryFilter: PlaceCategoryId | null): string {
  const filter = categoryFilter === "all" || !categoryFilter
    ? `( node["shop"](${b}); node["industrial"](${b}); node["office"](${b}); node["amenity"](${b}); way["shop"](${b}); way["industrial"](${b}); way["office"](${b}); way["amenity"](${b}); )`
    : categoryFilter === "industrial"
      ? `( node["industrial"](${b}); way["industrial"](${b}); )`
      : categoryFilter === "shop"
        ? `( node["shop"](${b}); way["shop"](${b}); )`
        : categoryFilter === "office"
          ? `( node["office"](${b}); way["office"](${b}); )`
          : `( node["amenity"](${b}); way["amenity"](${b}); )`;

  return `
[out:json][timeout:20];
(
  ${filter}
);
out center body;
>;
out skel;
`.trim();
}

function elementToPlace(el: OverpassElement, categoryId: PlaceCategoryId): NearbyPlace | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;
  const name = el.tags?.name ?? el.tags?.brand ?? "";
  if (!name && !el.tags?.shop && !el.tags?.industrial && !el.tags?.office && !el.tags?.amenity) return null;
  const id = `${el.type}_${el.id}`;
  return {
    id,
    lat: Number(lat),
    lng: Number(lon),
    name: name || "İsimsiz",
    categoryId,
    osmType: el.type as "node" | "way",
    tags: el.tags,
  };
}

function inferCategory(el: OverpassElement): PlaceCategoryId {
  if (el.tags?.industrial) return "industrial";
  if (el.tags?.shop) return "shop";
  if (el.tags?.office) return "office";
  if (el.tags?.amenity) return "amenity";
  return "all";
}

interface OverpassElement {
  type: "node" | "way";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResult {
  elements?: OverpassElement[];
}

export async function fetchNearbyPlaces(
  latitude: number,
  longitude: number,
  categoryFilter: PlaceCategoryId | null
): Promise<NearbyPlace[]> {
  const b = bbox(latitude, longitude);
  const query = buildQuery(b, categoryFilter);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error("Overpass request failed");
    const data = (await res.json()) as OverpassResult;
    const elements = data.elements ?? [];
    const places: NearbyPlace[] = [];
    for (const el of elements) {
      const cat = categoryFilter === "all" || !categoryFilter ? inferCategory(el) : categoryFilter;
      const place = elementToPlace(el, cat);
      if (place) places.push(place);
    }
    return places;
  } finally {
    clearTimeout(timeout);
  }
}
