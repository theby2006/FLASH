import { useEffect, useRef } from "react";

/**
 * Plays a looping phone-style ringtone via Web Audio (no asset file required).
 */
export function useCallRingtone(
  active: boolean,
  variant: "incoming" | "outgoing"
) {
  const ctxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const clearAll = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      if (ctxRef.current) {
        void ctxRef.current.close();
        ctxRef.current = null;
      }
    };

    if (!active) {
      clearAll();
      return;
    }

    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const playBurst = () => {
      const start = ctx.currentTime;
      const pattern =
        variant === "incoming"
          ? [
              { f: 440, at: 0, dur: 0.35 },
              { f: 554, at: 0.4, dur: 0.35 },
              { f: 440, at: 0.85, dur: 0.35 },
            ]
          : [
              { f: 480, at: 0, dur: 0.5 },
              { f: 620, at: 0.55, dur: 0.5 },
            ];

      pattern.forEach(({ f, at, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0, start + at);
        gain.gain.linearRampToValueAtTime(0.12, start + at + 0.04);
        gain.gain.linearRampToValueAtTime(0, start + at + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start + at);
        osc.stop(start + at + dur + 0.05);
      });
    };

    const resume = () => {
      if (ctx.state === "suspended") void ctx.resume();
    };
    resume();
    playBurst();
    intervalRef.current = setInterval(
      playBurst,
      variant === "incoming" ? 2200 : 2800
    );

    return clearAll;
  }, [active, variant]);
}
