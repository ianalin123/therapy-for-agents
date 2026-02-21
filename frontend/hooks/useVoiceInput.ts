"use client";

import { useCallback, useRef, useState } from "react";

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
}

export function useVoiceInput({ onTranscript }: UseVoiceInputOptions) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const getRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript?.trim()) {
        onTranscriptRef.current(transcript.trim());
      }
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      // "aborted" is normal when we call stop()
      if (event.error !== "aborted") {
        console.warn("[Voice] Error:", event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    return recognition;
  }, []);

  const toggleListening = useCallback(() => {
    const recognition = getRecognition();
    if (!recognition) {
      console.warn("[Voice] Speech recognition not supported in this browser");
      return;
    }

    if (isListening) {
      recognition.abort();
      setIsListening(false);
    } else {
      // Abort any lingering session before starting fresh
      try { recognition.abort(); } catch {}
      setTimeout(() => {
        try {
          recognition.start();
          setIsListening(true);
        } catch (e: any) {
          console.warn("[Voice] Could not start:", e.message);
          setIsListening(false);
        }
      }, 100);
    }
  }, [isListening, getRecognition]);

  const isSupported =
    typeof window !== "undefined" &&
    !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );

  return { isListening, isSupported, toggleListening };
}
