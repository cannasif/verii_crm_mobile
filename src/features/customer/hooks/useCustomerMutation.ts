import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { customerApi } from "../api/customerApi";
import { useToastStore } from "../../../store/toast";
import type {
  CreateCustomerDto,
  CreateCustomerFromMobileDto,
  CreateCustomerFromMobileResultDto,
  UpdateCustomerDto,
  CustomerDto,
  CustomerImageDto,
  PagedResponse
} from "../types";

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation<CustomerDto, Error, CreateCustomerDto>({
    mutationFn: customerApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "list"] });
      showToast("success", t("customer.createSuccess"));
    },
    onError: (error) => {
      showToast("error", error.message || t("common.unknownError"));
    },
  });
}

export function useCreateCustomerFromMobile() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation<CreateCustomerFromMobileResultDto, Error, CreateCustomerFromMobileDto>({
    mutationFn: customerApi.createFromMobile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "list"] });
      showToast("success", t("customer.createSuccess"));
    },
    onError: (error) => {
      showToast("error", error.message || t("common.unknownError"));
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation<
    CustomerDto,
    Error,
    { id: number; data: UpdateCustomerDto },
    { previousData: CustomerDto | undefined }
  >({
    mutationFn: ({ id, data }) => customerApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["customer", "detail", id] });
      const previousData = queryClient.getQueryData<CustomerDto>(["customer", "detail", id]);
      if (previousData) {
        queryClient.setQueryData<CustomerDto>(["customer", "detail", id], {
          ...previousData,
          ...data,
        });
      }
      return { previousData };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customer", "list"] });
      queryClient.invalidateQueries({ queryKey: ["customer", "detail", variables.id] });
      showToast("success", t("customer.updateSuccess"));
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["customer", "detail", variables.id], context.previousData);
      }
      showToast("error", error.message || t("common.unknownError"));
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation<
    void,
    Error,
    number,
    { previousData: InfiniteData<PagedResponse<CustomerDto>> | undefined }
  >({
    mutationFn: customerApi.delete,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["customer", "list"] });
      const previousData = queryClient.getQueryData<InfiniteData<PagedResponse<CustomerDto>>>(["customer", "list"]);
      if (previousData) {
        queryClient.setQueryData<InfiniteData<PagedResponse<CustomerDto>>>(
          ["customer", "list"],
          {
            ...previousData,
            pages: previousData.pages.map((page) => ({
              ...page,
              items: page.items.filter((customer) => customer.id !== id),
              totalCount: page.totalCount - 1,
            })),
          }
        );
      }
      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "list"] });
      showToast("success", t("customer.deleteSuccess"));
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["customer", "list"], context.previousData);
      }
      showToast("error", error.message || t("common.unknownError"));
    },
  });
}

export function useUploadCustomerImage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation<
    CustomerImageDto[],
    Error,
    { customerId: number; imageUri: string; imageDescription?: string }
  >({
    mutationFn: ({ customerId, imageUri, imageDescription }) =>
      customerApi.uploadCustomerImage(customerId, imageUri, imageDescription),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customer", "images", variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ["customer", "detail", variables.customerId] });
      showToast("success", t("customer.imageUploadSuccess"));
    },
    onError: (error) => {
      showToast("error", error.message || t("customer.imageUploadError"));
    },
  });
}
