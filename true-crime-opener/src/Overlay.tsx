import { loadFont as loadDisplay } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";
import { loadFont as loadSans } from "@remotion/google-fonts/IBMPlexSans";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { INK, RED, shotAt } from "./cuts";

const display = loadDisplay("normal", {
  weights: ["400"],
  subsets: ["latin"],
}).fontFamily;

const sans = loadSans("normal", {
  weights: ["400", "600"],
  subsets: ["latin"],
}).fontFamily;

const mono = loadMono("normal", {
  weights: ["400", "500"],
  subsets: ["latin"],
}).fontFamily;

function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

function slam(frame: number, start: number): number {
  return interpolate(frame, [start, start + 5], [1.14, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
}

export function Overlay() {
  const frame = useCurrentFrame();
  const shot = shotAt(frame);
  const seconds = Math.floor(frame / 30);
  const flash = Math.max(
    burst(frame, 72),
    burst(frame, 120),
    burst(frame, 220),
    burst(frame, 320),
    burst(frame, 660),
  );
  const glitch = frame - shot.from < 3;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background:
            shot.id === "title"
              ? "radial-gradient(ellipse at center, rgba(5,5,6,0.9) 0%, rgba(5,5,6,0.74) 46%, rgba(5,5,6,0.42) 100%)"
              : shot.id === "jemand" || shot.id === "luegt"
                ? "linear-gradient(180deg, rgba(5,5,6,0.2) 0%, rgba(5,5,6,0.55) 42%, rgba(5,5,6,0.62) 58%, rgba(5,5,6,0.28) 100%)"
                : "linear-gradient(180deg, rgba(5,5,6,0.28) 0%, rgba(5,5,6,0.05) 28%, rgba(5,5,6,0.05) 62%, rgba(5,5,6,0.72) 100%)",
        }}
      />
      <svg
        width="100%"
        height="100%"
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.18,
          mixBlendMode: "overlay",
        }}
      >
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            seed="4"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
      <AbsoluteFill
        style={{
          boxShadow: `inset 0 0 220px rgba(0,0,0,0.72), inset 0 0 140px rgba(255,42,26,${(0.28 * flash).toFixed(3)})`,
        }}
      />
      {flash > 0.02 ? (
        <AbsoluteFill style={{ backgroundColor: RED, opacity: flash * 0.42 }} />
      ) : null}
      <div
        style={{
          position: "absolute",
          top: 54,
          left: 48,
          right: 48,
          display: "flex",
          justifyContent: "space-between",
          fontFamily: `"${mono}", ui-monospace, monospace`,
          fontSize: 22,
          letterSpacing: "0.22em",
          color: "#a4a4aa",
        }}
      >
        <span>AKTE 00</span>
        <span>UNBENANNT</span>
        <span style={{ color: RED }}>FIKTIV</span>
      </div>
      <div
        style={{
          position: "absolute",
          top: 96,
          left: 48,
          right: 48,
          height: 2,
          background:
            "linear-gradient(90deg, rgba(255,42,26,0.9), rgba(255,42,26,0.15))",
        }}
      />
      {shot.id === "jemand" ? (
        <Hook word="JEMAND" frame={frame} start={0} glitch={glitch} kicker="COLD OPEN" />
      ) : null}
      {shot.id === "raum" ? (
        <Hook
          word="IN DIESEM RAUM"
          frame={frame}
          start={36}
          glitch={glitch}
          kicker="COLD OPEN"
          size={132}
        />
      ) : null}
      {shot.id === "luegt" ? (
        <Hook word="LÜGT." frame={frame} start={72} glitch={glitch} kicker="COLD OPEN" size={248} />
      ) : null}
      {shot.id === "mark1" ? (
        <Lower
          index="01"
          line="EINE SILHOUETTE"
          frame={frame}
          start={120}
        />
      ) : null}
      {shot.id === "mark2" ? (
        <Lower index="02" line="NOCH EIN SCHATTEN" frame={frame} start={220} />
      ) : null}
      {shot.id === "mark3" ? (
        <Lower index="03" line="JETZT VERKNÜPFT" frame={frame} start={320} />
      ) : null}
      {shot.id === "netz" ? (
        <CenterTitle
          frame={frame}
          start={420}
          kicker="NETZWERK"
          title="DAS NETZ"
          sub="DREI LINIEN. EINE LÜGE."
        />
      ) : null}
      {shot.id === "karte" ? (
        <div
          style={{
            position: "absolute",
            top: 150,
            left: 64,
            right: 64,
            transform: `scale(${slam(frame, 510)})`,
          }}
        >
          <div
            style={{
              fontFamily: `"${mono}", ui-monospace, monospace`,
              letterSpacing: "0.28em",
              fontSize: 22,
              color: RED,
            }}
          >
            SPUR OHNE NAMEN
          </div>
          <div
            style={{
              marginTop: 10,
              fontFamily: `"${display}", Impact, sans-serif`,
              fontSize: 112,
              lineHeight: 0.88,
              color: INK,
            }}
          >
            DIE KARTE
            <br />
            SCHWEIGT.
          </div>
        </div>
      ) : null}
      {shot.id === "title" ? <EndCard frame={frame} glitch={glitch} /> : null}
      {frame >= 36 && frame < 660 ? (
        <div
          style={{
            position: "absolute",
            left: 48,
            bottom: 112,
            fontFamily: `"${mono}", ui-monospace, monospace`,
            fontSize: 20,
            letterSpacing: "0.18em",
            color: "#9b9ba2",
          }}
        >
          DREI SCHATTEN · KEINE NAMEN
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: 48,
          bottom: 52,
          fontFamily: `"${mono}", ui-monospace, monospace`,
          fontSize: 20,
          letterSpacing: "0.18em",
          color: "#8e8e95",
        }}
      >
        TC {pad2(Math.floor(seconds / 60))}:{pad2(seconds % 60)}:{pad2(frame % 30)}
      </div>
    </AbsoluteFill>
  );
}

function burst(frame: number, at: number): number {
  const age = frame - at;
  if (age < 0 || age > 5) {
    return 0;
  }
  return (1 - age / 5) * 0.7;
}

function Hook({
  word,
  frame,
  start,
  glitch,
  kicker,
  size = 196,
}: {
  word: string;
  frame: number;
  start: number;
  glitch: boolean;
  kicker: string;
  size?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: 56,
        right: 56,
        top: "36%",
        textAlign: "center",
        transform: `scale(${slam(frame, start)})`,
      }}
    >
      <div
        style={{
          fontFamily: `"${mono}", ui-monospace, monospace`,
          letterSpacing: "0.42em",
          fontSize: 22,
          color: RED,
          marginBottom: 18,
        }}
      >
        {kicker}
      </div>
      <div style={{ position: "relative" }}>
        {glitch ? (
          <div
            style={{
              position: "absolute",
              left: 8,
              right: -8,
              top: 4,
              fontFamily: `"${display}", Impact, sans-serif`,
              fontSize: size,
              lineHeight: 0.86,
              color: RED,
              opacity: 0.75,
            }}
          >
            {word}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: `"${display}", Impact, sans-serif`,
            fontSize: size,
            lineHeight: 0.86,
            color: INK,
            textShadow: "0 10px 40px rgba(0,0,0,0.65)",
          }}
        >
          {word}
        </div>
      </div>
      <div
        style={{
          margin: "22px auto 0",
          height: 8,
          width: "46%",
          background: RED,
          transform: `scaleX(${interpolate(frame, [start, start + 7], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })})`,
        }}
      />
    </div>
  );
}

function Lower({
  index,
  line,
  frame,
  start,
}: {
  index: string;
  line: string;
  frame: number;
  start: number;
}) {
  const shown = interpolate(frame, [start, start + 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 64,
        right: 64,
        bottom: 210,
        opacity: shown,
        transform: `translateY(${(1 - shown) * 24}px)`,
        display: "flex",
        gap: 20,
        alignItems: "center",
      }}
    >
      <div style={{ width: 22, height: 22, background: RED }} />
      <div>
        <div
          style={{
            fontFamily: `"${display}", Impact, sans-serif`,
            fontSize: 96,
            lineHeight: 0.86,
            color: INK,
          }}
        >
          {index} · MARKIERT
        </div>
        <div
          style={{
            marginTop: 8,
            fontFamily: `"${sans}", Arial, sans-serif`,
            fontWeight: 600,
            fontSize: 26,
            letterSpacing: "0.16em",
            color: "#c6c6cc",
          }}
        >
          {line}
        </div>
      </div>
    </div>
  );
}

function CenterTitle({
  frame,
  start,
  kicker,
  title,
  sub,
}: {
  frame: number;
  start: number;
  kicker: string;
  title: string;
  sub: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: 64,
        right: 64,
        top: "62%",
        textAlign: "left",
        transform: `scale(${slam(frame, start)})`,
        transformOrigin: "left center",
      }}
    >
      <div
        style={{
          fontFamily: `"${mono}", ui-monospace, monospace`,
          color: RED,
          letterSpacing: "0.32em",
          fontSize: 22,
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          fontFamily: `"${display}", Impact, sans-serif`,
          fontSize: 168,
          lineHeight: 0.84,
          color: INK,
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 12,
          fontFamily: `"${sans}", Arial, sans-serif`,
          fontWeight: 600,
          letterSpacing: "0.14em",
          fontSize: 28,
          color: "#d0d0d4",
        }}
      >
        {sub}
      </div>
    </div>
  );
}

function EndCard({ frame, glitch }: { frame: number; glitch: boolean }) {
  const enter = interpolate(frame, [663, 672], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 64,
        right: 64,
        top: "30%",
        textAlign: "center",
        opacity: enter,
        transform: `scale(${slam(frame, 660)})`,
      }}
    >
      <div
        style={{
          fontFamily: `"${mono}", ui-monospace, monospace`,
          color: RED,
          letterSpacing: "0.38em",
          fontSize: 24,
        }}
      >
        EIN FIKTIVER FALL
      </div>
      <div
        style={{
          marginTop: 22,
          fontFamily: `"${display}", Impact, sans-serif`,
          fontSize: 132,
          lineHeight: 0.84,
          color: INK,
        }}
      >
        DAS ROTE
      </div>
      <div style={{ position: "relative" }}>
        {glitch ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              fontFamily: `"${display}", Impact, sans-serif`,
              fontSize: 248,
              lineHeight: 0.8,
              color: RED,
              transform: "translate(10px, 6px)",
            }}
          >
            NETZ
          </div>
        ) : null}
        <div
          style={{
            fontFamily: `"${display}", Impact, sans-serif`,
            fontSize: 248,
            lineHeight: 0.8,
            color: RED,
          }}
        >
          NETZ
        </div>
      </div>
      <div
        style={{
          width: 180,
          height: 6,
          background: RED,
          margin: "28px auto",
        }}
      />
      <div
        style={{
          fontFamily: `"${sans}", Arial, sans-serif`,
          fontWeight: 600,
          letterSpacing: "0.22em",
          fontSize: 32,
          color: INK,
        }}
      >
        WER LÜGT NOCH?
      </div>
    </div>
  );
}
