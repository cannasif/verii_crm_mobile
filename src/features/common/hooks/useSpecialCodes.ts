import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useToastStore } from "../../../store/toast";
import { specialCodeApi } from "../api/specialCodeApi";
import type { SpecialCodeDto } from "../types/specialCode";

type SalesDocumentModuleKey = "quotation" | "demand" | "order";

export function useSpecialCodes(moduleKey: SalesDocumentModuleKey) {
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);
  const [specialCode1Options, setSpecialCode1Options] = useState<SpecialCodeDto[]>([]);
  const [specialCode2Options, setSpecialCode2Options] = useState<SpecialCodeDto[]>([]);
  const [isSpecialCodesLoading, setIsSpecialCodesLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsSpecialCodesLoading(true);

    Promise.all([specialCodeApi.getSpecialCodes(1), specialCodeApi.getSpecialCodes(2)])
      .then(([code1, code2]) => {
        if (!mounted) return;
        setSpecialCode1Options(code1);
        setSpecialCode2Options(code2);
      })
      .catch(() => {
        if (mounted) {
          showToast("error", t(`${moduleKey}.specialCodesLoadError`));
        }
      })
      .finally(() => {
        if (mounted) {
          setIsSpecialCodesLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [moduleKey, showToast, t]);

  return { specialCode1Options, specialCode2Options, isSpecialCodesLoading };
}
