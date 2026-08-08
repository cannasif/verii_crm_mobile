import { useMutation } from "@tanstack/react-query";
import { quotationApi } from "../api/quotation-api";
import type { GenerateReportPdfRequest } from "../types/quotation-types";

type MutateOptions = {
  onSuccess?: (data: ArrayBuffer) => void;
  onError?: (error: unknown) => void;
};

export function useGenerateReportPdf(): {
  mutate: (params: GenerateReportPdfRequest, options?: MutateOptions) => void;
  mutateAsync: (params: GenerateReportPdfRequest) => Promise<ArrayBuffer>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
  data: ArrayBuffer | undefined;
  reset: () => void;
} {
  const mutation = useMutation({
    mutationKey: ["report-template", "generate-pdf"],
    mutationFn: (params: GenerateReportPdfRequest) =>
      quotationApi.generateReportPdf(params),
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error instanceof Error ? mutation.error : null,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
    reset: mutation.reset,
  };
}
