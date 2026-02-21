"use client";

interface Props {
  mode: "hero" | "widget";
  onClick?: () => void;
}

export default function VoiceOrb({ mode, onClick }: Props) {
  const isHero = mode === "hero";

  return (
    <button
      onClick={onClick}
      className={`relative rounded-full transition-all duration-700 ease-in-out group ${
        isHero ? "w-32 h-32" : "w-12 h-12"
      }`}
      style={{
        background: "radial-gradient(circle, #1C1C22 0%, #141418 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Breathing glow */}
      <div
        className="absolute inset-0 rounded-full animate-orb-breathe"
        style={{
          background:
            "radial-gradient(circle, rgba(232,169,75,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Hover glow */}
      <div
        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(circle, rgba(232,169,75,0.2) 0%, transparent 70%)",
        }}
      />

      {/* Outer ring pulse */}
      {isHero && (
        <div
          className="absolute -inset-3 rounded-full animate-orb-ring"
          style={{
            border: "1px solid rgba(232,169,75,0.1)",
          }}
        />
      )}

      {/* Mic icon */}
      <svg
        className={`mx-auto transition-all duration-700 ${
          isHero ? "w-10 h-10" : "w-5 h-5"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        style={{ color: isHero ? "#E8A94B" : "#A09A92" }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
        />
      </svg>

      {/* Label — hero only */}
      {isHero && (
        <span
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap transition-opacity duration-500"
          style={{ color: "#A09A92" }}
        >
          Tap to speak
        </span>
      )}
    </button>
  );
}
