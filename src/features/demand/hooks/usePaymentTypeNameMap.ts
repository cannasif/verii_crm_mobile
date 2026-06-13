import { useMemo } from "react";
import { usePaymentTypes } from "./usePaymentTypes";

export function usePaymentTypeNameMap(): ReadonlyMap<number, string> {
  const { data: paymentTypes } = usePaymentTypes();

  return useMemo(() => {
    const map = new Map<number, string>();
    for (const paymentType of paymentTypes ?? []) {
      const name = paymentType.name?.trim();
      if (name) {
        map.set(paymentType.id, name);
      }
    }
    return map;
  }, [paymentTypes]);
}
