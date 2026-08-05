"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function normalizeSpeechLocale(locale: string) {
  const value = locale.toLowerCase();
  if (value.startsWith("pt")) return "pt-BR";
  if (value.startsWith("ko")) return "ko-KR";
  return locale || "en-US";
}

export function selectSpeechVoice(voices: SpeechSynthesisVoice[], locale: string) {
  const target = normalizeSpeechLocale(locale).toLowerCase();
  return voices.find((voice) => voice.lang.toLowerCase() === target)
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(target.split("-")[0]))
    ?? null;
}

export function useBrowserTts(locale: string) {
  const [supported, setSupported] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    return () => { if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel(); };
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeakingMessageId(null);
  }, []);

  const speak = useCallback((messageId: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window) || !text.trim()) return false;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = normalizeSpeechLocale(locale);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.voice = selectSpeechVoice(window.speechSynthesis.getVoices(), locale);
    utterance.onend = () => { utteranceRef.current = null; setSpeakingMessageId(null); };
    utterance.onerror = () => { utteranceRef.current = null; setSpeakingMessageId(null); };
    utteranceRef.current = utterance;
    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
    return true;
  }, [locale]);

  return { supported, speakingMessageId, speak, stop };
}
