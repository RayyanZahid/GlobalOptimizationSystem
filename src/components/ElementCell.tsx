"use client";

import { motion } from "framer-motion";
import { ElementData, ElementContribution } from "@/lib/types";
import { formatMass } from "@/lib/estimation-engine";

interface ElementCellProps {
  element: ElementData;
  contribution: ElementContribution | undefined;
  confidence: number;
  isHighlighted: boolean;
  onClick: () => void;
}

function getConfidenceStyle(confidence: number): {
  filter: string;
  opacity: number;
} {
  if (confidence < 0.3) {
    return { filter: "blur(2px)", opacity: 0.25 };
  } else if (confidence < 0.6) {
    return { filter: "blur(0.8px)", opacity: 0.55 };
  }
  return { filter: "blur(0px)", opacity: 1 };
}

function buildGlow(color: string, intensity: number, isHighlighted: boolean): string {
  // intensity: 0–1, maps to glow radius / spread
  const baseAlpha = 0.15 + intensity * 0.6;
  const spreadSmall = 2 + intensity * 6;
  const spreadMed = 4 + intensity * 14;
  const spreadLarge = 6 + intensity * 30;

  const glowColor = hexToRgba(color, baseAlpha);
  const highlight = isHighlighted ? `, 0 0 ${spreadLarge * 1.4}px ${color}` : "";

  return (
    `0 0 ${spreadSmall}px ${glowColor}, ` +
    `0 0 ${spreadMed}px ${glowColor}, ` +
    `0 0 ${spreadLarge}px ${hexToRgba(color, baseAlpha * 0.5)}` +
    highlight
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function ElementCell({
  element,
  contribution,
  confidence,
  isHighlighted,
  onClick,
}: ElementCellProps) {
  const hasContribution = contribution !== undefined && contribution.percentage > 0;

  // Glow intensity: 0 when absent, scales with sqrt of percentage for perceptual linearity
  const glowIntensity = hasContribution
    ? Math.min(1, Math.sqrt(contribution.percentage / 100) * 3.5)
    : 0;

  const { filter, opacity } = getConfidenceStyle(
    hasContribution ? (contribution.confidence ?? confidence) : 0
  );

  const borderOpacity = hasContribution
    ? 0.35 + glowIntensity * 0.65
    : 0.08;

  const bgOpacity = hasContribution
    ? 0.06 + glowIntensity * 0.12
    : 0.02;

  const borderColor = hexToRgba(element.color, borderOpacity);
  const bgColor = hexToRgba(element.color, bgOpacity);
  const boxShadow = hasContribution
    ? buildGlow(element.color, glowIntensity, isHighlighted)
    : isHighlighted
    ? `0 0 8px ${hexToRgba(element.color, 0.4)}`
    : "none";

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: hasContribution ? opacity : opacity * 0.4, scale: 1 }}
      whileHover={{
        scale: 1.15,
        zIndex: 10,
        boxShadow: buildGlow(element.color, Math.max(glowIntensity, 0.5) * 1.4, true),
        transition: { duration: 0.12 },
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "1 / 1",
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 4,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2px",
        boxSizing: "border-box",
        filter,
        boxShadow,
        transition:
          "box-shadow 0.2s ease, filter 0.2s ease, border-color 0.2s ease",
        outline: isHighlighted ? `1px solid ${element.color}` : "none",
        outlineOffset: "1px",
        overflow: "hidden",
      }}
      title={`${element.name} (${element.symbol})${contribution ? ` — ${contribution.percentage.toFixed(3)}%` : ""}`}
    >
      {/* Atomic number */}
      <span
        style={{
          position: "absolute",
          top: 2,
          left: 3,
          fontSize: "clamp(5px, 0.55vw, 9px)",
          lineHeight: 1,
          color: hexToRgba(element.color, 0.7),
          fontFamily: "monospace",
          fontWeight: 400,
          userSelect: "none",
        }}
      >
        {element.number}
      </span>

      {/* Element symbol */}
      <span
        style={{
          fontSize: "clamp(8px, 1.1vw, 18px)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: hasContribution ? element.color : hexToRgba(element.color, 0.35),
          textShadow: hasContribution
            ? `0 0 8px ${hexToRgba(element.color, 0.8)}, 0 0 20px ${hexToRgba(element.color, 0.4)}`
            : "none",
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        {element.symbol}
      </span>

      {/* Mass / percentage label */}
      {hasContribution && (
        <span
          style={{
            position: "absolute",
            bottom: 2,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: "clamp(4px, 0.45vw, 7px)",
            lineHeight: 1,
            color: hexToRgba(element.color, 0.75),
            fontFamily: "monospace",
            userSelect: "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            padding: "0 1px",
          }}
        >
          {contribution.percentage >= 0.1
            ? `${contribution.percentage.toFixed(1)}%`
            : formatMass(contribution.mass_kg)}
        </span>
      )}

      {/* Confidence indicator pip */}
      {hasContribution && (
        <span
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            width: 3,
            height: 3,
            borderRadius: "50%",
            background:
              (contribution.confidence ?? confidence) > 0.6
                ? "#00ff88"
                : (contribution.confidence ?? confidence) > 0.3
                ? "#ffff00"
                : "#ff4444",
            boxShadow:
              (contribution.confidence ?? confidence) > 0.6
                ? "0 0 4px #00ff88"
                : (contribution.confidence ?? confidence) > 0.3
                ? "0 0 4px #ffff00"
                : "0 0 4px #ff4444",
          }}
        />
      )}
    </motion.button>
  );
}
