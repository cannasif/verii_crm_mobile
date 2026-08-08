import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { fetchNearbyPlaces } from "../api/nearby-places";
import { fetchNearbyCustomers } from "../api/nearby-customers";
import type { CustomerLocationDto, NearbyPlace, PlaceCategoryId, Region } from "../types/rota-types";
import { rotaQueryKeys } from "../utils/query-keys";

const STALE_TIME_MS = 60 * 1000;
const DEFAULT_DELTA = 0.012;
const DEFAULT_RADIUS_KM = 15;

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return Number.NaN;
}

function isValidCoordinate(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function useRotaScreen() {
  const [locationPermission, setLocationPermission] = useState<"pending" | "granted" | "denied">("pending");
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategoryId | null>("all");
  const [locationError, setLocationError] = useState<string | null>(null);

  const requestLocation = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === "granted" ? "granted" : "denied");
      if (status !== "granted") return null;

      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        setLocationError("Konum servisleri kapalı. Lütfen cihaz ayarlarından konumu açın.");
        return null;
      }

      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        const { latitude, longitude } = lastKnown.coords;
        if (isValidCoordinate(latitude, longitude)) {
          setCurrentRegion({
            latitude,
            longitude,
            latitudeDelta: DEFAULT_DELTA,
            longitudeDelta: DEFAULT_DELTA,
          });
        }
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        mayShowUserSettingsDialog: true,
      });
      const { latitude, longitude } = loc.coords;
      if (!isValidCoordinate(latitude, longitude)) {
        setLocationError("Geçersiz konum koordinatları alındı.");
        return null;
      }
      setCurrentRegion({
        latitude,
        longitude,
        latitudeDelta: DEFAULT_DELTA,
        longitudeDelta: DEFAULT_DELTA,
      });
      return { lat: latitude, lng: longitude };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Konum alınamadı";
      setLocationError(msg);
      setLocationPermission("denied");
      return null;
    }
  }, []);

  const coords = useMemo(() => {
    if (!currentRegion) return null;
    return { lat: currentRegion.latitude, lng: currentRegion.longitude };
  }, [currentRegion]);

  const {
    data: places = [],
    isLoading: isLoadingPlaces,
    isFetching: isFetchingPlaces,
    refetch: refetchPlaces,
  } = useQuery({
    queryKey: rotaQueryKeys.nearbyPlaces(coords?.lat, coords?.lng, selectedCategory),
    queryFn: async () => {
      if (!coords) return [];
      return fetchNearbyPlaces(coords.lat, coords.lng, selectedCategory);
    },
    enabled: coords !== null,
    staleTime: STALE_TIME_MS,
  });

  const {
    data: customerLocations = [],
    isLoading: isLoadingCustomers,
    isFetching: isFetchingCustomers,
    refetch: refetchCustomers,
  } = useQuery({
    queryKey: rotaQueryKeys.nearbyCustomers(coords?.lat, coords?.lng),
    queryFn: async (): Promise<CustomerLocationDto[]> => {
      if (!coords) return [];
      return fetchNearbyCustomers({
        latitude: coords.lat,
        longitude: coords.lng,
        radiusKm: DEFAULT_RADIUS_KM,
        includeShippingAddresses: true,
      });
    },
    enabled: coords !== null,
    staleTime: STALE_TIME_MS,
  });

  const filteredPlaces = useMemo((): NearbyPlace[] => {
    const normalizedPlaces = places
      .map((place) => {
        const lat = toNumber(place.lat);
        const lng = toNumber(place.lng);
        if (!isValidCoordinate(lat, lng)) return null;
        return {
          ...place,
          lat,
          lng,
        };
      })
      .filter((place): place is NearbyPlace => place !== null);

    if (selectedCategory === "all" || !selectedCategory) return normalizedPlaces;
    return normalizedPlaces.filter((p) => p.categoryId === selectedCategory);
  }, [places, selectedCategory]);

  const safeCustomerLocations = useMemo((): CustomerLocationDto[] => {
    return customerLocations
      .map((location) => {
        const latitude = toNumber(location.latitude);
        const longitude = toNumber(location.longitude);
        if (!isValidCoordinate(latitude, longitude)) return null;
        return {
          ...location,
          latitude,
          longitude,
        };
      })
      .filter((location): location is CustomerLocationDto => location !== null);
  }, [customerLocations]);

  const onRegionChangeComplete = useCallback((region: Region) => {
    setCurrentRegion(region);
  }, []);

  const refreshLocationAndPlaces = useCallback(async () => {
    const pos = await requestLocation();
    if (pos) {
      await Promise.all([refetchPlaces(), refetchCustomers()]);
    }
  }, [requestLocation, refetchPlaces, refetchCustomers]);

  const isLoadingMapData = isLoadingPlaces || isFetchingPlaces || isLoadingCustomers || isFetchingCustomers;

  return {
    locationPermission,
    currentRegion,
    locationError,
    selectedCategory,
    setSelectedCategory,
    places: filteredPlaces,
    customerLocations: safeCustomerLocations,
    isLoadingPlaces,
    isFetchingPlaces,
    isLoadingCustomers,
    isFetchingCustomers,
    isLoadingMapData,
    requestLocation,
    refreshLocationAndPlaces,
    onRegionChangeComplete,
    coords,
  };
}
