import { useCallback, useEffect, useRef, useState } from "react";
import Voice from "@react-native-voice/voice";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

interface UseSpeechToTextResult {
  startListening: (onResult: (text: string) => void) => Promise<void>;
  stopListening: () => Promise<void>;
  isListening: boolean;
}

export function useSpeechToText(): UseSpeechToTextResult {
  const [isListening, setIsListening] = useState(false);
  const callbackRef = useRef<((text: string) => void) | null>(null);

  const showToast = useToastStore((s) => s.showToast);
  const { t } = useTranslation();

  useEffect(() => {
    Voice.onSpeechResults = (event: any) => {
      const text = event?.value?.[0];

      if (text && callbackRef.current) {
        callbackRef.current(text);
      }
    };

    Voice.onSpeechEnd = () => {
      setIsListening(false);
    };

    Voice.onSpeechError = () => {
      setIsListening(false);
      showToast("error", t("common.voiceSearchStartError"));
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [showToast, t]);

  const startListening = useCallback(
    async (onResult: (text: string) => void) => {
      try {
        callbackRef.current = onResult;

        const available = await Voice.isAvailable();

        if (!available) {
          showToast("error", "Speech recognition not available");
          return;
        }

        await Voice.start("tr-TR");

        setIsListening(true);
      } catch {
        setIsListening(false);
        showToast("error", t("common.voiceSearchStartError"));
      }
    },
    [showToast, t]
  );

  const stopListening = useCallback(async () => {
    try {
      await Voice.stop();
    } finally {
      setIsListening(false);
    }
  }, []);

  return {
    startListening,
    stopListening,
    isListening,
  };
}