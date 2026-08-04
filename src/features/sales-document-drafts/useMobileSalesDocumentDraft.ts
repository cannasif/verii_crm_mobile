import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";

const AUTOSAVE_DELAY_MS = 750;
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface MobileSalesDocumentDraftPayload<TForm, TLine, TRate> {
  formValues: TForm;
  lines: TLine[];
  exchangeRates: TRate[];
  notes: string[];
}

interface StoredDraft<TForm, TLine, TRate> {
  expiresAt: number;
  payload: MobileSalesDocumentDraftPayload<TForm, TLine, TRate>;
}

interface UseMobileSalesDocumentDraftOptions<TForm, TLine, TRate> {
  documentType: "demand" | "quotation" | "order";
  rootKey: "demand" | "quotation" | "order";
  userId?: number | string | null;
  branchCode?: number | string | null;
  formValues: TForm;
  lines: TLine[];
  exchangeRates: TRate[];
  notes: string[];
  restore: (payload: MobileSalesDocumentDraftPayload<TForm, TLine, TRate>) => void;
}

function hasMeaningfulDraft<TForm, TLine, TRate>(
  payload: MobileSalesDocumentDraftPayload<TForm, TLine, TRate>,
  rootKey: "demand" | "quotation" | "order"
): boolean {
  if (payload.lines.length > 0 || payload.notes.some((note) => note.trim().length > 0)) return true;

  const root = (payload.formValues as Record<string, unknown> | null)?.[rootKey];
  if (!root || typeof root !== "object") return false;
  const header = root as Record<string, unknown>;
  return Boolean(
    header.potentialCustomerId ||
      header.erpCustomerCode ||
      header.offerNo ||
      header.description ||
      header.documentSerialTypeId
  );
}

export function useMobileSalesDocumentDraft<TForm, TLine, TRate>(
  options: UseMobileSalesDocumentDraftOptions<TForm, TLine, TRate>
) {
  const { t } = useTranslation();
  const [loadResolved, setLoadResolved] = useState(false);
  const restoringRef = useRef(false);
  const restoreRef = useRef(options.restore);
  restoreRef.current = options.restore;

  const storageKey = useMemo(() => {
    if (options.userId == null || options.userId === "") return null;
    return [
      "v3rii",
      "sales-document-draft",
      options.userId,
      options.branchCode ?? "default",
      options.documentType,
    ].join(":");
  }, [options.branchCode, options.documentType, options.userId]);

  const clearDraft = useCallback(async () => {
    if (!storageKey) return;
    await AsyncStorage.removeItem(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) {
      setLoadResolved(true);
      return;
    }

    let active = true;
    setLoadResolved(false);
    void (async () => {
      const raw = await AsyncStorage.getItem(storageKey);
      if (!active) return;
      if (!raw) {
        setLoadResolved(true);
        return;
      }

      try {
        const stored = JSON.parse(raw) as StoredDraft<TForm, TLine, TRate>;
        if (
          stored.expiresAt <= Date.now() ||
          !hasMeaningfulDraft(stored.payload, options.rootKey)
        ) {
          await AsyncStorage.removeItem(storageKey);
          if (active) setLoadResolved(true);
          return;
        }

        Alert.alert(
          t("header.unsavedDraftTitle", "Kaydedilmemiş taslak bulundu"),
          t(
            "header.unsavedDraftMessage",
            "Daha önce yarım bıraktığınız belgeyi geri yüklemek ister misiniz?"
          ),
          [
            {
              text: t("common.delete", "Sil"),
              style: "destructive",
              onPress: () => {
                void AsyncStorage.removeItem(storageKey).finally(() => {
                  if (active) setLoadResolved(true);
                });
              },
            },
            {
              text: t("header.restoreDraft", "Geri yükle"),
              onPress: () => {
                restoringRef.current = true;
                restoreRef.current(stored.payload);
                setLoadResolved(true);
                setTimeout(() => {
                  restoringRef.current = false;
                }, 0);
              },
            },
          ],
          { cancelable: false }
        );
      } catch {
        await AsyncStorage.removeItem(storageKey);
        if (active) setLoadResolved(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [options.rootKey, storageKey, t]);

  useEffect(() => {
    if (!storageKey || !loadResolved || restoringRef.current) return;

    const payload: MobileSalesDocumentDraftPayload<TForm, TLine, TRate> = {
      formValues: options.formValues,
      lines: options.lines,
      exchangeRates: options.exchangeRates,
      notes: options.notes,
    };
    const timeout = setTimeout(() => {
      if (!hasMeaningfulDraft(payload, options.rootKey)) {
        void AsyncStorage.removeItem(storageKey);
        return;
      }
      const stored: StoredDraft<TForm, TLine, TRate> = {
        expiresAt: Date.now() + DRAFT_TTL_MS,
        payload,
      };
      void AsyncStorage.setItem(storageKey, JSON.stringify(stored));
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [
    loadResolved,
    options.exchangeRates,
    options.formValues,
    options.lines,
    options.notes,
    options.rootKey,
    storageKey,
  ]);

  return { clearDraft };
}
