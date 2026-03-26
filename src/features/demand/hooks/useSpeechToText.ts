import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

type SpeechRecognitionModuleType = typeof import("expo-speech-recognition");

let speechRecognitionModule: SpeechRecognitionModuleType | null = null;

try {
  speechRecognitionModule = require("expo-speech-recognition") as SpeechRecognitionModuleType;
} catch {
  speechRecognitionModule = null;
}

const ExpoSpeechRecognitionModule = speechRecognitionModule?.ExpoSpeechRecognitionModule;
const useSafeSpeechRecognitionEvent =
  speechRecognitionModule?.useSpeechRecognitionEvent ?? (() => {});

interface UseSpeechToTextResult {
  startListening: (onResultText: (text: string) => void) => Promise<void>;
  isListening: boolean;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: SpeechRecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

export function useSpeechToText(): UseSpeechToTextResult {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onResultTextRef = useRef<((text: string) => void) | null>(null);
  const showToast = useToastStore((s) => s.showToast);
  const { t } = useTranslation();

  useSafeSpeechRecognitionEvent("start", () => {
    if (Platform.OS !== "web") {
      setIsListening(true);
    }
  });

  useSafeSpeechRecognitionEvent("end", () => {
    if (Platform.OS !== "web") {
      setIsListening(false);
    }
  });

  useSafeSpeechRecognitionEvent("result", (event) => {
    if (Platform.OS === "web") return;
    const transcript = event.results?.[0]?.transcript?.trim();
    if (transcript && onResultTextRef.current) {
      onResultTextRef.current(transcript);
    }
  });

  useSafeSpeechRecognitionEvent("error", () => {
    if (Platform.OS !== "web") {
      setIsListening(false);
      showToast("error", t("common.voiceSearchStartError"));
    }
  });

  const startListening = useCallback(
    async (onResultText: (text: string) => void) => {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
          try {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = "tr-TR";
            recognition.onresult = (e: { results: { item: (i: number) => { item: (j: number) => { transcript: string } } }; resultIndex: number }) => {
              const res = e.results.item(e.resultIndex);
              const transcript = res.item(0).transcript;
              onResultText(transcript);
            };
            recognition.onend = () => setIsListening(false);
            recognition.onerror = () => setIsListening(false);
            recognitionRef.current = recognition;
            recognition.start();
            setIsListening(true);
          } catch {
            showToast("error", t("common.voiceSearchStartError"));
          }
          return;
        }
      }

      try {
        if (!ExpoSpeechRecognitionModule) {
          showToast("info", t("common.voiceSearchStartError"));
          return;
        }
        onResultTextRef.current = onResultText;
        const permissionResult = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!permissionResult.granted) {
          showToast("info", t("common.voiceSearchPermissionRequired"));
          return;
        }

        ExpoSpeechRecognitionModule.start({
          lang: "tr-TR",
          interimResults: false,
          continuous: false,
          requiresOnDeviceRecognition: false,
        });
      } catch {
        setIsListening(false);
        showToast("error", t("common.voiceSearchStartError"));
      }
    },
    [showToast, t]
  );

  return { startListening, isListening };
}
