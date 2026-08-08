import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { shippingAddressApi } from "../api/shipping-address-api";
import { useToastStore } from "../../../store/toast";
import type { PagedResponse } from "../types/common";
import type { CreateShippingAddressDto, UpdateShippingAddressDto, ShippingAddressDto } from "../types/shipping-address";
import { shippingAddressQueryKeys } from "../utils/query-keys";

export function useCreateShippingAddress() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation<ShippingAddressDto, Error, CreateShippingAddressDto>({
    mutationFn: shippingAddressApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: shippingAddressQueryKeys.listPrefix() });
      queryClient.invalidateQueries({ queryKey: shippingAddressQueryKeys.byCustomer(data.customerId) });
      showToast("success", t("shippingAddress.createSuccess"));
    },
    onError: (error) => {
      showToast("error", error.message || t("common.unknownError"));
    },
  });
}

export function useUpdateShippingAddress() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation<
    ShippingAddressDto,
    Error,
    { id: number; data: UpdateShippingAddressDto },
    { previousData: ShippingAddressDto | undefined }
  >({
    mutationFn: ({ id, data }) => shippingAddressApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: shippingAddressQueryKeys.detail(id) });
      const previousData = queryClient.getQueryData<ShippingAddressDto>(
        shippingAddressQueryKeys.detail(id),
      );
      if (previousData) {
        queryClient.setQueryData<ShippingAddressDto>(shippingAddressQueryKeys.detail(id), {
          ...previousData,
          ...data,
        });
      }
      return { previousData };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: shippingAddressQueryKeys.listPrefix() });
      queryClient.invalidateQueries({ queryKey: shippingAddressQueryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: shippingAddressQueryKeys.byCustomer(data.customerId) });
      showToast("success", t("shippingAddress.updateSuccess"));
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          shippingAddressQueryKeys.detail(variables.id),
          context.previousData,
        );
      }
      showToast("error", error.message || t("common.unknownError"));
    },
  });
}

export function useDeleteShippingAddress() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation<
    void,
    Error,
    number,
    { previousData: InfiniteData<PagedResponse<ShippingAddressDto>> | undefined }
  >({
    mutationFn: shippingAddressApi.delete,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: shippingAddressQueryKeys.listPrefix() });
      const previousData = queryClient.getQueryData<InfiniteData<PagedResponse<ShippingAddressDto>>>(
        shippingAddressQueryKeys.listPrefix(),
      );
      if (previousData) {
        queryClient.setQueryData<InfiniteData<PagedResponse<ShippingAddressDto>>>(
          shippingAddressQueryKeys.listPrefix(),
          {
            ...previousData,
            pages: previousData.pages.map((page) => ({
              ...page,
              items: page.items.filter((address) => address.id !== id),
              totalCount: page.totalCount - 1,
            })),
          }
        );
      }
      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shippingAddressQueryKeys.listPrefix() });
      queryClient.invalidateQueries({ queryKey: shippingAddressQueryKeys.byCustomerPrefix() });
      showToast("success", t("shippingAddress.deleteSuccess"));
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(shippingAddressQueryKeys.listPrefix(), context.previousData);
      }
      showToast("error", error.message || t("common.unknownError"));
    },
  });
}
