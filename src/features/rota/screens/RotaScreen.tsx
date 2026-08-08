import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text as RNText, Platform } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "../../../components/navigation";
import { useUIStore } from "../../../store/ui";
import { useRotaScreen } from "../hooks/useRotaScreen";
import { CategoryFilter } from "../components/CategoryFilter";
import { Location01Icon, RefreshIcon } from "hugeicons-react-native";
import type { CustomerLocationDto, NearbyPlace } from "../types/rota-types";

export function RotaScreen(): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    locationPermission,
    currentRegion,
    locationError,
    selectedCategory,
    setSelectedCategory,
    places,
    customerLocations,
    isLoadingMapData,
    requestLocation,
    refreshLocationAndPlaces,
    onRegionChangeComplete,
  } = useRotaScreen();

  const mapRef = useRef<MapView>(null);
  const { themeMode, colors } = useUIStore();
  const isDark = themeMode === "dark";
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const onMapReady = useCallback(() => {
    setMapReady(true);
  }, []);

  const showMap = locationPermission === "granted" && currentRegion !== null;
  const mapType = isDark && Platform.OS === "ios" ? "mutedStandard" : "standard";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScreenHeader
        title={t("rota.title")}
        showBackButton
        rightElement={
          showMap ? (
            <TouchableOpacity
              onPress={refreshLocationAndPlaces}
              style={[styles.refreshBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }]}
            >
              <RefreshIcon size={22} color={colors.text} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {locationPermission === "pending" && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#ec4899" />
          <RNText style={[styles.message, { color: colors.text }]}>{t("rota.requestingLocation")}</RNText>
        </View>
      )}

      {locationPermission === "denied" && (
        <View style={styles.centered}>
          <Location01Icon size={48} color={colors.textMuted} />
          <RNText style={[styles.message, { color: colors.text }]}>{locationError || t("rota.permissionDenied")}</RNText>
          <TouchableOpacity style={styles.retryButton} onPress={requestLocation}>
            <RNText style={styles.retryButtonText}>{t("rota.allowLocation")}</RNText>
          </TouchableOpacity>
        </View>
      )}

      {showMap && (
        <>
          <View style={[styles.filterWrap, { paddingHorizontal: 0, paddingTop: 8 }]}>
            <CategoryFilter
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              t={t}
            />
          </View>
          <View style={styles.mapWrap}>
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              initialRegion={currentRegion}
              onRegionChangeComplete={onRegionChangeComplete}
              onMapReady={onMapReady}
              showsUserLocation
              showsMyLocationButton
              mapType={mapType}
              loadingEnabled
              loadingIndicatorColor="#ec4899"
              loadingBackgroundColor={isDark ? "#1a1a2e" : "#f3f4f6"}
            >
              {places.map((place) => (
                <PlaceMarker key={place.id} place={place} />
              ))}
              {customerLocations.map((customerLocation) => (
                <CustomerMarker key={`customer_${customerLocation.source}_${customerLocation.id}`} location={customerLocation} t={t} />
              ))}
            </MapView>
            {(!mapReady || isLoadingMapData) && (
              <View style={[styles.loaderOverlay, { paddingTop: insets.top + 120 }]}>
                <ActivityIndicator size="small" color="#ec4899" />
                {!mapReady && (
                  <RNText style={[styles.message, { color: colors.text, fontSize: 13 }]}>{t("rota.loadingMap")}</RNText>
                )}
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}

function CustomerMarker({
  location,
  t,
}: {
  location: CustomerLocationDto;
  t: (key: string) => string;
}): React.ReactElement {
  const pinColor = location.source === "shipping" ? "#14b8a6" : "#ef4444";
  const sourceLabel = location.source === "shipping" ? t("rota.customerShippingAddress") : t("rota.customerMainAddress");
  const description = [sourceLabel, location.addressDisplay, location.phone].filter(Boolean).join("\n");

  return (
    <Marker
      coordinate={{ latitude: location.latitude, longitude: location.longitude }}
      title={location.name}
      description={description}
      pinColor={pinColor}
    />
  );
}

function PlaceMarker({ place }: { place: NearbyPlace }): React.ReactElement {
  const pinColor =
    place.categoryId === "industrial"
      ? "#f97316"
      : place.categoryId === "shop"
        ? "#22c55e"
        : place.categoryId === "office"
          ? "#3b82f6"
          : place.categoryId === "amenity"
            ? "#a855f7"
            : "#ec4899";

  return (
    <Marker
      coordinate={{ latitude: place.lat, longitude: place.lng }}
      title={place.name}
      pinColor={pinColor}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  message: {
    marginTop: 12,
    fontSize: 16,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#ec4899",
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  filterWrap: {
    paddingHorizontal: 16,
  },
  mapWrap: {
    flex: 1,
    position: "relative",
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
});
