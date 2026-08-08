import { useQueries } from "@tanstack/react-query";
import { activityLookupApi } from "../api/activity-api";
import type { ActivityLookupDto } from "../types/activity-types";
import { activityQueryKeys } from "../utils/query-keys";

export function useActivityLookups() {
  const [paymentTypes, meetingTypes, topicPurposes, shippings] = useQueries({
    queries: [
      {
        queryKey: activityQueryKeys.paymentTypes(),
        queryFn: () => activityLookupApi.getPaymentTypes(),
        staleTime: 10 * 60 * 1000,
      },
      {
        queryKey: activityQueryKeys.meetingTypes(),
        queryFn: () => activityLookupApi.getMeetingTypes(),
        staleTime: 10 * 60 * 1000,
      },
      {
        queryKey: activityQueryKeys.topicPurposes(),
        queryFn: () => activityLookupApi.getTopicPurposes(),
        staleTime: 10 * 60 * 1000,
      },
      {
        queryKey: activityQueryKeys.shippings(),
        queryFn: () => activityLookupApi.getShippings(),
        staleTime: 10 * 60 * 1000,
      },
    ],
  });

  return {
    paymentTypes: (paymentTypes.data ?? []) as ActivityLookupDto[],
    meetingTypes: (meetingTypes.data ?? []) as ActivityLookupDto[],
    topicPurposes: (topicPurposes.data ?? []) as ActivityLookupDto[],
    shippings: (shippings.data ?? []) as ActivityLookupDto[],
    isLoading:
      paymentTypes.isLoading ||
      meetingTypes.isLoading ||
      topicPurposes.isLoading ||
      shippings.isLoading,
  };
}
