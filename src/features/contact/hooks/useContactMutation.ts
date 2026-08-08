import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { contactApi } from "../api/contact-api";
import { useToastStore } from "../../../store/toast";
import type { CreateContactDto, UpdateContactDto, ContactDto } from "../types/contact";
import type { PagedResponse } from "../types/common";
import { contactQueryKeys } from "../utils/query-keys";

export function useCreateContact() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation<ContactDto, Error, CreateContactDto>({
    mutationFn: contactApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: contactQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contactQueryKeys.byCustomer(data.customerId) });
      showToast("success", t("contact.createSuccess"));
    },
    onError: (error) => {
      showToast("error", error.message || t("common.unknownError"));
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation<
    ContactDto,
    Error,
    { id: number; data: UpdateContactDto },
    { previousData: ContactDto | undefined }
  >({
    mutationFn: ({ id, data }) => contactApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: contactQueryKeys.detail(id) });
      const previousData = queryClient.getQueryData<ContactDto>(contactQueryKeys.detail(id));
      if (previousData) {
        queryClient.setQueryData<ContactDto>(contactQueryKeys.detail(id), {
          ...previousData,
          ...data,
        });
      }
      return { previousData };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: contactQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contactQueryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: contactQueryKeys.byCustomer(data.customerId) });
      showToast("success", t("contact.updateSuccess"));
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(contactQueryKeys.detail(variables.id), context.previousData);
      }
      showToast("error", error.message || t("common.unknownError"));
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation<
    void,
    Error,
    number,
    { previousData: InfiniteData<PagedResponse<ContactDto>> | undefined }
  >({
    mutationFn: contactApi.delete,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: contactQueryKeys.lists() });
      const previousData = queryClient.getQueryData<InfiniteData<PagedResponse<ContactDto>>>(contactQueryKeys.lists());
      if (previousData) {
        queryClient.setQueryData<InfiniteData<PagedResponse<ContactDto>>>(
          contactQueryKeys.lists(),
          {
            ...previousData,
            pages: previousData.pages.map((page) => ({
              ...page,
              items: page.items.filter((contact) => contact.id !== id),
              totalCount: page.totalCount - 1,
            })),
          }
        );
      }
      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contactQueryKeys.byCustomers() });
      showToast("success", t("contact.deleteSuccess"));
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(contactQueryKeys.lists(), context.previousData);
      }
      showToast("error", error.message || t("common.unknownError"));
    },
  });
}
