"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ElementalProfile, ElementSymbol } from "@/lib/types";
import { ELEMENTS } from "@/lib/elements";
import { formatMass } from "@/lib/estimation-engine";
import ElementCell from "./ElementCell";

interface PeriodicTableProps {
  profile: ElementalProfile;
  onElementClick: (symbol: ElementSymbol) => void;
}

// Label stubs that sit in the grid where lanthanide/actinide series branch off
const SERIES_LABELS = [
  { row: 6, col: 3, label: "57–71", sublabel: "Lanthanides", color: "#ff00ff" },
  { row: 7, col: 3, label: "89–103", sublabel: "Actinides", color: "#ff4488" },
];

// Gap row is row 8; lanthanides at row 9, actinides at row 10
// We map these directly using CSS grid-row / grid-column

export default function PeriodicTable({
  profile,
  onElementClick,
}: PeriodicTableProps) {
  const [hoveredSymbol, setHoveredSymbol] = useState<ElementSymbol | null>(null);

  const composition = profile.composition;

  // Find max percentage for normalization
  const maxPct = useMemo(() => {
    let max = 0;
    for (const contrib of Object.values(composition)) {
      if (contrib && contrib.percentage > max) max = contrib.percentage;
    }
    return max || 1;
  }, [composition]);

  const hoveredElement = useMemo(() => {
    if (!hoveredSymbol) return null;
    return ELEMENTS.find((e) => e.symbol === hoveredSymbol) ?? null;
  }, [hoveredSymbol]);

  const hoveredContrib = hoveredSymbol ? composition[hoveredSymbol] : undefined;

  const confidencePct = Math.round(profile.confidence * 100);
  const confidenceColor =
    profile.confidence > 0.6
      ? "#00ff88"
      : profile.confidence > 0.3
      ? "#ffff00"
      : "#ff4444";

  return (
    <div
      style={{
        width: "100%",
        background: "#0a0a1a",
        borderRadius: 12,
        padding: "16px 12px 12px",
        boxSizing: "border-box",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        position: "relative",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 0 60px rgba(0,0,0,0.8), inset 0 0 80px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 10,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <motion.h2
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              margin: 0,
              fontSize: "clamp(14px, 2vw, 22px)",
              fontWeight: 700,
              color: "#e0e0ff",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              textShadow: "0 0 20px rgba(120,120,255,0.4)",
            }}
          >
            {profile.name}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            style={{
              margin: "2px 0 0",
              fontSize: "clamp(10px, 1vw, 13px)",
              color: "rgba(180,180,220,0.6)",
              letterSpacing: "0.06em",
            }}
          >
            Elemental Composition Profile &bull;{" "}
            {formatMass(profile.totalMass_kg)} total
          </motion.p>
        </div>

        {/* Confidence badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 3,
          }}
        >
          <span
            style={{
              fontSize: "clamp(9px, 0.85vw, 12px)",
              color: "rgba(180,180,220,0.5)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Confidence
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* Bar */}
            <div
              style={{
                width: 80,
                height: 5,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${confidencePct}%` }}
                transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
                style={{
                  height: "100%",
                  background: confidenceColor,
                  boxShadow: `0 0 8px ${confidenceColor}`,
                  borderRadius: 3,
                }}
              />
            </div>
            <span
              style={{
                fontSize: "clamp(11px, 1.1vw, 16px)",
                fontWeight: 700,
                color: confidenceColor,
                textShadow: `0 0 10px ${confidenceColor}`,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {confidencePct}%
            </span>
          </div>
        </motion.div>
      </div>

      {/* Periodic table grid */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.004 } },
        }}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(18, 1fr)",
          gridTemplateRows: "repeat(10, 1fr)",
          gap: "clamp(1px, 0.25vw, 3px)",
          width: "100%",
        }}
      >
        {/* Series placeholder labels (col 3, rows 6 & 7) */}
        {SERIES_LABELS.map((sl) => (
          <div
            key={sl.sublabel}
            style={{
              gridRow: sl.row,
              gridColumn: sl.col,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: `rgba(${hexComponents(sl.color)}, 0.04)`,
              border: `1px dashed rgba(${hexComponents(sl.color)}, 0.25)`,
              borderRadius: 4,
              aspectRatio: "1/1",
            }}
          >
            <span
              style={{
                fontSize: "clamp(5px, 0.5vw, 8px)",
                color: sl.color,
                opacity: 0.7,
                fontFamily: "monospace",
                lineHeight: 1.2,
                textAlign: "center",
              }}
            >
              {sl.label}
            </span>
          </div>
        ))}

        {/* Gap row 8: leave empty — CSS grid auto-handles it */}

        {/* All elements */}
        {ELEMENTS.map((element, index) => {
          const contrib = composition[element.symbol as ElementSymbol];
          const inComposition = contrib !== undefined;

          return (
            <motion.div
              key={element.symbol}
              variants={{
                hidden: { opacity: 0, scale: 0.5 },
                visible: {
                  opacity: 1,
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 280,
                    damping: 22,
                    delay: index * 0.004,
                  },
                },
              }}
              onHoverStart={() => setHoveredSymbol(element.symbol as ElementSymbol)}
              onHoverEnd={() => setHoveredSymbol(null)}
              style={{
                gridRow: element.row,
                gridColumn: element.col,
                opacity: inComposition ? 1 : 0.12,
              }}
            >
              <ElementCell
                element={element}
                contribution={contrib}
                confidence={profile.confidence}
                isHighlighted={hoveredSymbol === element.symbol}
                onClick={() => onElementClick(element.symbol as ElementSymbol)}
              />
            </motion.div>
          );
        })}
      </motion.div>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoveredSymbol && hoveredElement && (
          <motion.div
            key="tooltip"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              bottom: 12,
              right: 12,
              background: "rgba(10,10,30,0.95)",
              border: `1px solid ${hoveredElement.color}`,
              borderRadius: 8,
              padding: "10px 14px",
              minWidth: 180,
              boxShadow: `0 0 20px rgba(${hexComponents(hoveredElement.color)}, 0.3), 0 4px 20px rgba(0,0,0,0.6)`,
              pointerEvents: "none",
              zIndex: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: hoveredElement.color,
                  textShadow: `0 0 12px ${hoveredElement.color}`,
                  lineHeight: 1,
                }}
              >
                {hoveredElement.symbol}
              </span>
              <span style={{ fontSize: 13, color: "rgba(200,200,240,0.8)", fontWeight: 500 }}>
                {hoveredElement.name}
              </span>
              <span style={{ fontSize: 11, color: "rgba(160,160,200,0.5)", marginLeft: "auto" }}>
                #{hoveredElement.number}
              </span>
            </div>

            <div style={{ fontSize: 11, color: "rgba(160,160,200,0.6)", marginBottom: 6 }}>
              {hoveredElement.category.replace(/_/g, " ")} &bull; {hoveredElement.mass} u
            </div>

            {hoveredContrib ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <TooltipRow
                  label="Composition"
                  value={`${hoveredContrib.percentage.toFixed(4)}%`}
                  color={hoveredElement.color}
                />
                <TooltipRow
                  label="Mass"
                  value={formatMass(hoveredContrib.mass_kg)}
                  color={hoveredElement.color}
                />
                <TooltipRow
                  label="Confidence"
                  value={`${Math.round((hoveredContrib.confidence ?? profile.confidence) * 100)}%`}
                  color={
                    (hoveredContrib.confidence ?? profile.confidence) > 0.6
                      ? "#00ff88"
                      : (hoveredContrib.confidence ?? profile.confidence) > 0.3
                      ? "#ffff00"
                      : "#ff4444"
                  }
                />
              </div>
            ) : (
              <div style={{ fontSize: 11, color: "rgba(160,160,200,0.4)", fontStyle: "italic" }}>
                Not in profile composition
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        style={{
          display: "flex",
          gap: 16,
          marginTop: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <LegendItem color="#ff0040" label="Alkali metals" />
        <LegendItem color="#ff6b00" label="Transition metals / Alkaline earth" />
        <LegendItem color="#00f0ff" label="Nonmetals" />
        <LegendItem color="#00ff88" label="Metalloids" />
        <LegendItem color="#00ccff" label="Post-transition" />
        <LegendItem color="#ffff00" label="Halogens" />
        <LegendItem color="#b000ff" label="Noble gases" />
        <LegendItem color="#ff00ff" label="Lanthanides" />
        <LegendItem color="#ff4488" label="Actinides" />

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <ConfidencePip color="#00ff88" label="High confidence" />
          <ConfidencePip color="#ffff00" label="Medium" />
          <ConfidencePip color="#ff4444" label="Low" />
        </div>
      </motion.div>
    </div>
  );
}

function TooltipRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontSize: 11, color: "rgba(160,160,200,0.55)" }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: 2,
          background: `rgba(${hexComponents(color)}, 0.2)`,
          border: `1px solid ${color}`,
          boxShadow: `0 0 4px ${color}`,
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: "clamp(8px, 0.7vw, 11px)", color: "rgba(180,180,220,0.45)" }}>
        {label}
      </span>
    </div>
  );
}

function ConfidencePip({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 5px ${color}`,
        }}
      />
      <span style={{ fontSize: "clamp(8px, 0.7vw, 11px)", color: "rgba(180,180,220,0.4)" }}>
        {label}
      </span>
    </div>
  );
}

// Helper: extract r,g,b components from a hex string as a comma-joined string
function hexComponents(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r},${g},${b}`;
}
