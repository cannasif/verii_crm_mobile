import { useCallback, useState } from "react";
import { Alert } from "react-native";
import * as Location from "expo-location";
import { useTranslation } from "react-i18next";
import { useToastStore } from "../../../store/toast";
import { buildUpdateCustomerDtoFromCustomer } from "../utils/buildUpdateCustomerDto";
import { roundCoordinate } from "../utils/customerCoordinates";
import { useUpdateCustomer } from "./useCustomerMutation";
import type { CustomerDto } from "../types";

interface UseUpdateCustomerLocationResult {
  requestLocationUpdate: () => void;
  isUpdatingLocation: boolean;
}

export function useUpdateCustomerLocation(
  customerId: number | undefined,
  customer: CustomerDto | undefined
): UseUpdateCustomerLocationResult {
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);
  const updateCustomer = useUpdateCustomer();
  const [isLocating, setIsLocating] = useState(false);

  const performLocationUpdate = useCallback(async () => {
    if (!customerId || !customer) return;

    setIsLocating(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        showToast("error", t("customer.locationPermissionDenied"));
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const latitude = roundCoordinate(position.coords.latitude);
      const longitude = roundCoordinate(position.coords.longitude);

      await updateCustomer.mutateAsync({
        id: customerId,
        data: buildUpdateCustomerDtoFromCustomer(customer, { latitude, longitude }),
      });
    } catch {
      showToast("error", t("customer.locationUpdateError"));
    } finally {
      setIsLocating(false);
    }
  }, [customer, customerId, showToast, t, updateCustomer]);

  const requestLocationUpdate = useCallback(() => {
    if (!customerId || !customer || isLocating || updateCustomer.isPending) return;

    Alert.alert(t("customer.updateLocationConfirmTitle"), t("customer.updateLocationConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.confirm"),
        onPress: () => {
          void performLocationUpdate();
        },
      },
    ]);
  }, [customer, customerId, isLocating, performLocationUpdate, t, updateCustomer.isPending]);

  return {
    requestLocationUpdate,
    isUpdatingLocation: isLocating || updateCustomer.isPending,
  };
}
