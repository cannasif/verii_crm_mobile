import { useQueries } from "@tanstack/react-query";
import { activityLookupApi } from "../api";
import type { ActivityLookupDto } from "../types";

export function useActivityLookups() {
  const [paymentTypes, meetingTypes, topicPurposes, shippings] = useQueries({
    queries: [
      {
        queryKey: ["activity", "payment-types"],
        queryFn: () => activityLookupApi.getPaymentTypes(),
        staleTime: 10 * 60 * 1000,
      },
      {
        queryKey: ["activity", "meeting-types"],
        queryFn: () => activityLookupApi.getMeetingTypes(),
        staleTime: 10 * 60 * 1000,
      },
      {
        queryKey: ["activity", "topic-purposes"],
        queryFn: () => activityLookupApi.getTopicPurposes(),
        staleTime: 10 * 60 * 1000,
      },
      {
        queryKey: ["activity", "shippings"],
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
