import { useEffect, useRef, useState } from "react";

export function useSpeechToText({ lang = "he-IL", interim = true } = {}) {
  const recRef = useRef(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const rec = new SR();
    rec.interimResults = interim;
    rec.lang = lang;
    rec.continuous = true;

    rec.onresult = (e) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const txt = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalChunk += txt;
        else interimChunk += txt;
      }
      setTranscript((prev) =>
        finalChunk ? (prev ? prev + " " : "") + finalChunk.trim() : prev
      );
      // Store interim in state if you want to show gray “live” text.
    };

    rec.onerror = (e) => {
      setError(e.error || "speech-error");
      setListening(false);
    };
    rec.onend = () => setListening(false);

    recRef.current = rec;
    return () => rec.stop();
  }, [lang, interim]);

  const start = () => {
    setError("");
    if (!supported || !recRef.current) return;
    setListening(true);
    try {
      recRef.current.start();
    } catch (_) {/* ignore 'start' called twice */}
  };
  const stop = () => {
    if (!recRef.current) return;
    recRef.current.stop();
  };

  return { supported, listening, transcript, error, start, stop, setTranscript };
}
