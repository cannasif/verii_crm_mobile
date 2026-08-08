import { useQuery } from "@tanstack/react-query";
import { contactApi } from "../api/contact-api";
import type { ContactDto } from "../types/contact";
import { contactQueryKeys } from "../utils/query-keys";

export function useContact(id: number | undefined) {
  return useQuery<ContactDto, Error>({
    queryKey: contactQueryKeys.detail(id),
    queryFn: () => contactApi.getById(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}
