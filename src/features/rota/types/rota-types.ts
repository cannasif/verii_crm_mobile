export type PlaceCategoryId = "all" | "industrial" | "shop" | "office" | "amenity";

export interface NearbyPlace {
  id: string;
  lat: number;
  lng: number;
  name: string;
  categoryId: PlaceCategoryId;
  osmType: "node" | "way";
  tags?: Record<string, string>;
}

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface RotaCategoryOption {
  id: PlaceCategoryId;
  labelKey: string;
  osmTag: string;
  osmValue?: string;
}

export type CustomerLocationSource = "main" | "shipping";

export interface CustomerLocationDto {
  id: number;
  customerId: number;
  customerCode?: string;
  name: string;
  addressDisplay: string;
  latitude: number;
  longitude: number;
  source: CustomerLocationSource;
  shippingAddressId?: number | null;
  customerTypeName?: string | null;
  phone?: string | null;
}
