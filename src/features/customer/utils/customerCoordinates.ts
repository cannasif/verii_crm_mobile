import { Platform } from "react-native";
import type { CustomerDto } from "../types";

const COORDINATE_DECIMALS = 6;

export function roundCoordinate(value: number): number {
  const factor = 10 ** COORDINATE_DECIMALS;
  return Math.round(value * factor) / factor;
}

export function hasValidCustomerCoordinates(customer: CustomerDto | null | undefined): boolean {
  if (!customer) return false;
  const { latitude, longitude } = customer;
  if (latitude == null || longitude == null) return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  return true;
}

export function buildCustomerMapUrl(customer: CustomerDto): string | null {
  if (hasValidCustomerCoordinates(customer)) {
    const lat = customer.latitude as number;
    const lng = customer.longitude as number;
    return Platform.select({
      ios: `maps:?ll=${lat},${lng}&q=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    }) ?? null;
  }

  const address = `${customer.address || ""} ${customer.cityName || ""}`.trim();
  if (!address) return null;

  const query = encodeURIComponent(address);
  return (
    Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`,
    }) ?? null
  );
}

export function canOpenCustomerMap(customer: CustomerDto | null | undefined): boolean {
  if (!customer) return false;
  return hasValidCustomerCoordinates(customer) || !!customer.address?.trim() || !!customer.cityName?.trim();
}
