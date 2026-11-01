"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AssignedHouse } from "@/lib/common-room/types";

type Cue = "door" | "book" | "magic";
// A deliberately quiet synthetic study, not a recording or a finished sound pack.
function createSound(house: AssignedHouse) {
  const context = new AudioContext({ latencyHint: "playback" });
  try {
    const master = context.createGain(), ambient = context.createGain(), effects = context.createGain();
    master.gain.value = .055; ambient.gain.value = 0; effects.gain.value = 0;
    ambient.connect(master); effects.connect(master); master.connect(context.destination);
    const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate), data = buffer.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < data.length; i++) { previous = (previous + (Math.random() * 2 - 1) * .02) / 1.02; data[i] = previous * 3.5; }
    const noise = context.createBufferSource(), filter = context.createBiquadFilter();
    noise.buffer = buffer; noise.loop = true; filter.type = house === "ravenclaw" ? "highpass" : "lowpass";
    filter.frequency.value = { slytherin: 180, gryffindor: 750, ravenclaw: 500, hufflepuff: 420 }[house];
    noise.connect(filter); filter.connect(ambient); noise.start();
    const tone = context.createOscillator(), toneGain = context.createGain();
    tone.type = "sine"; tone.frequency.value = { slytherin: 73.4, gryffindor: 98, ravenclaw: 130.8, hufflepuff: 146.8 }[house];
    toneGain.gain.value = .025; tone.connect(toneGain); toneGain.connect(ambient); tone.start();
    const voices = new Set<() => void>(); let closed = false;
    const stopVoices = () => { for (const stop of voices) stop(); };
    return {
      context, stopVoices,
      enable(background: boolean, cues: boolean) { const now = context.currentTime; ambient.gain.cancelScheduledValues(now); effects.gain.cancelScheduledValues(now); ambient.gain.setTargetAtTime(background ? .65 : 0, now, .09); effects.gain.setTargetAtTime(cues ? 1 : 0, now, .035); if (!cues) stopVoices(); },
      play(cue: Cue) {
        const now = context.currentTime, duration = cue === "magic" ? .45 : .18, gain = context.createGain(); let source: AudioScheduledSourceNode;
        if (cue === "book") { const paper = context.createBufferSource(); paper.buffer = buffer; source = paper; }
        else { const note = context.createOscillator(); note.type = "sine"; note.frequency.setValueAtTime(cue === "door" ? 92 : 523.25, now); note.frequency.exponentialRampToValueAtTime(cue === "door" ? 55 : 783.99, now + duration); source = note; }
        gain.gain.setValueAtTime(.0001, now); gain.gain.linearRampToValueAtTime(.18, now + .014); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
        source.connect(gain); gain.connect(effects);
        const dispose = () => { source.disconnect(); gain.disconnect(); voices.delete(stop); };
        const stop = () => { source.stop(); dispose(); };
        source.onended = dispose; source.start(); source.stop(now + duration + .025); voices.add(stop);
      },
      close() { if (closed) return; closed = true; stopVoices(); noise.stop(); tone.stop(); [noise, filter, tone, toneGain, ambient, effects, master].forEach((node) => node.disconnect()); void context.close().catch(() => {}); },
    };
  } catch (error) { void context.close().catch(() => {}); throw error; }
}
export function useRoomAudio(house: AssignedHouse) {
  const graph = useRef<ReturnType<typeof createSound> | null>(null);
  const desired = useRef({ ambient: false, effects: false }); const alive = useRef(true);
  const [unavailable, setUnavailable] = useState(false); const [paused, setPaused] = useState(false);
  useEffect(() => {
    alive.current = true;
    const visibility = () => { const sound = graph.current; if (!document.hidden || !sound) return; sound.stopVoices(); void sound.context.suspend().catch(() => {}); if (desired.current.ambient || desired.current.effects) setPaused(true); };
    document.addEventListener("visibilitychange", visibility);
    return () => { alive.current = false; document.removeEventListener("visibilitychange", visibility); if (graph.current) graph.current.context.onstatechange = null; graph.current?.close(); graph.current = null; };
  }, [house]);
  const setEnabled = useCallback(async (ambient: boolean, effects: boolean): Promise<boolean> => {
    desired.current = { ambient, effects };
    try {
      if (!ambient && !effects) { if (graph.current) { graph.current.enable(false, false); await graph.current.context.suspend(); } if (alive.current) setPaused(false); return true; }
      if (!graph.current) {
        const sound = createSound(house); graph.current = sound;
        sound.context.onstatechange = () => { if (alive.current && graph.current === sound) setPaused(sound.context.state !== "running" && (desired.current.ambient || desired.current.effects)); };
      }
      const sound = graph.current; sound.enable(ambient, effects);
      // Only this explicitly invoked UI action may create or resume an AudioContext.
      await sound.context.resume();
      if (!alive.current || graph.current !== sound) return false;
      if (document.hidden) await sound.context.suspend();
      setPaused(document.hidden); setUnavailable(false); return true;
    } catch { graph.current?.close(); graph.current = null; desired.current = { ambient: false, effects: false }; if (alive.current) { setUnavailable(true); setPaused(false); } return false; }
  }, [house]);
  const play = useCallback((cue: Cue) => { if (desired.current.effects && !document.hidden && graph.current?.context.state === "running") graph.current.play(cue); }, []);
  return { setEnabled, play, unavailable, paused };
}
