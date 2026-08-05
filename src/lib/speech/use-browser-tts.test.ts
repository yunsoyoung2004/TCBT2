import { describe, expect, it } from "vitest";
import { selectSpeechVoice } from "@/lib/speech/use-browser-tts";

function voice(lang: string, name: string) {
  return { lang, name, default: false, localService: true, voiceURI: name } as SpeechSynthesisVoice;
}

describe("browser TTS voice selection", () => {
  it("prefers Brazilian Portuguese and Korean locale matches", () => {
    const voices = [voice("pt-PT", "Portugal"), voice("pt-BR", "Brazil"), voice("ko-KR", "Korean")];
    expect(selectSpeechVoice(voices, "pt-BR")?.name).toBe("Brazil");
    expect(selectSpeechVoice(voices, "ko")?.name).toBe("Korean");
  });

  it("falls back to the same base language without selecting an unrelated voice", () => {
    expect(selectSpeechVoice([voice("pt-PT", "Portugal"), voice("en-US", "English")], "pt-BR")?.name).toBe("Portugal");
    expect(selectSpeechVoice([voice("en-US", "English")], "ko-KR")).toBeNull();
  });
});
