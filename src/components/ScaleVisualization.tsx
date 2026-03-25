"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ElementalProfile, ElementSymbol, MaterialCategory, Scope } from "@/lib/types";
import { formatMass } from "@/lib/estimation-engine";
import PeriodicTable from "@/components/PeriodicTable";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScaleVisualizationProps {
  profile: ElementalProfile;
  scale: Scope;
  onElementClick: (symbol: ElementSymbol) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<MaterialCategory, string> = {
  biomass: "#00ff88",
  metals: "#ff6b00",
  minerals: "#00f0ff",
  fossil_fuels: "#ff0040",
};

const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  biomass: "Biomass",
  metals: "Metals",
  minerals: "Minerals",
  fossil_fuels: "Fossil Fuels",
};

const CATEGORIES: MaterialCategory[] = ["biomass", "metals", "minerals", "fossil_fuels"];

// Research-backed sustainable extraction rates (Bringezu 2015, UNEP IRP 2024)
const PLANET_CAPACITY_KG: Record<MaterialCategory, number> = {
  biomass: 20e12,       // 20 Gt/yr — sustainable harvest without deforestation
  metals: 10e12,        // 10 Gt/yr — circular economy target with high recycling
  minerals: 35e12,      // 35 Gt/yr — reduced construction demand + efficiency
  fossil_fuels: 2e12,   // 2 Gt/yr — Paris-aligned 2050 residual (CCS + feedstock)
};

// ---------------------------------------------------------------------------
// Helper: hex → "r,g,b"
// ---------------------------------------------------------------------------

function hexRGB(hex: string): string {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ].join(",");
}

// ---------------------------------------------------------------------------
// ScaleVisualization (router)
// ---------------------------------------------------------------------------

export default function ScaleVisualization({
  profile,
  scale,
  onElementClick,
}: ScaleVisualizationProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={scale}
        initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: "100%" }}
      >
        {scale === "person" && (
          <PeriodicTable profile={profile} onElementClick={onElementClick} />
        )}
        {scale === "city" && (
          <CityMetabolism profile={profile} onElementClick={onElementClick} />
        )}
        {scale === "country" && (
          <NationalMaterialBalance profile={profile} onElementClick={onElementClick} />
        )}
        {scale === "planet" && (
          <PlanetaryBoundaries profile={profile} onElementClick={onElementClick} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// CITY SCALE — City Metabolism
// ---------------------------------------------------------------------------

function CityMetabolism({
  profile,
  onElementClick,
}: {
  profile: ElementalProfile;
  onElementClick: (symbol: ElementSymbol) => void;
}) {
  const inbound = profile.flows.inbound;
  const outbound = profile.flows.outbound;

  const maxFlow = Math.max(
    ...CATEGORIES.map((c) => Math.max(inbound[c] ?? 0, outbound[c] ?? 0)),
    1
  );

  const netStock: Record<MaterialCategory, number> = {
    biomass: (inbound.biomass ?? 0) - (outbound.biomass ?? 0),
    metals: (inbound.metals ?? 0) - (outbound.metals ?? 0),
    minerals: (inbound.minerals ?? 0) - (outbound.minerals ?? 0),
    fossil_fuels: (inbound.fossil_fuels ?? 0) - (outbound.fossil_fuels ?? 0),
  };

  const totalIn = CATEGORIES.reduce((s, c) => s + (inbound[c] ?? 0), 0);
  const totalOut = CATEGORIES.reduce((s, c) => s + (outbound[c] ?? 0), 0);
  const totalStock = totalIn - totalOut;

  return (
    <div
      style={{
        background: "#060612",
        borderRadius: 16,
        padding: "28px 24px 24px",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 0 80px rgba(0,0,0,0.9), inset 0 0 60px rgba(0,0,0,0.5)",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background grid shimmer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(0,240,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.02) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 28, position: "relative" }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "clamp(16px, 2vw, 24px)",
            fontWeight: 800,
            color: "#e0e0ff",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            textShadow: "0 0 24px rgba(0,240,255,0.5)",
          }}
        >
          City Metabolism
        </h2>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 13,
            color: "rgba(160,160,220,0.55)",
            letterSpacing: "0.04em",
          }}
        >
          {profile.name} &bull; 500,000 people &bull; Annual throughput:{" "}
          <span style={{ color: "#00f0ff", fontWeight: 600 }}>
            {formatMass(totalIn)}
          </span>
        </p>
      </motion.div>

      {/* Main 3-column metabolism diagram */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: 0,
          alignItems: "center",
          position: "relative",
        }}
      >
        {/* INPUTS */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(160,160,220,0.5)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 6,
              textAlign: "right",
            }}
          >
            Inputs
          </div>
          {CATEGORIES.map((cat, i) => (
            <FlowBar
              key={cat}
              category={cat}
              value={inbound[cat] ?? 0}
              maxValue={maxFlow}
              direction="right"
              delay={0.15 + i * 0.07}
            />
          ))}
          <div
            style={{
              textAlign: "right",
              marginTop: 8,
              fontSize: 12,
              color: "rgba(160,160,220,0.45)",
            }}
          >
            Total:{" "}
            <span style={{ color: "#00ff88", fontWeight: 700 }}>
              {formatMass(totalIn)}
            </span>
          </div>
        </motion.div>

        {/* CITY CENTER */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3, type: "spring", stiffness: 200, damping: 18 }}
          style={{
            width: 120,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            padding: "16px 8px",
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* Glow ring */}
          <div
            style={{
              position: "absolute",
              width: 130,
              height: 130,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(0,240,255,0.08) 0%, transparent 70%)",
              boxShadow: "0 0 40px rgba(0,240,255,0.15)",
              pointerEvents: "none",
            }}
          />
          <div style={{ fontSize: "clamp(20px, 3vw, 32px)", lineHeight: 1.1, textAlign: "center" }}>
            🏗️🏢
          </div>
          <div style={{ fontSize: "clamp(18px, 2.5vw, 28px)", lineHeight: 1.1, textAlign: "center" }}>
            🏭🏠
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 10,
              color: "#00f0ff",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              textShadow: "0 0 8px #00f0ff",
              textAlign: "center",
            }}
          >
            Black Box
          </div>
          <div
            style={{
              fontSize: 9,
              color: "rgba(0,240,255,0.5)",
              letterSpacing: "0.06em",
              textAlign: "center",
            }}
          >
            Economy
          </div>
        </motion.div>

        {/* OUTPUTS */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(160,160,220,0.5)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Outputs
          </div>
          {CATEGORIES.map((cat, i) => (
            <FlowBar
              key={cat}
              category={cat}
              value={outbound[cat] ?? 0}
              maxValue={maxFlow}
              direction="left"
              delay={0.15 + i * 0.07}
            />
          ))}
          <div
            style={{
              textAlign: "left",
              marginTop: 8,
              fontSize: 12,
              color: "rgba(160,160,220,0.45)",
            }}
          >
            Total:{" "}
            <span style={{ color: "#ff6b00", fontWeight: 700 }}>
              {formatMass(totalOut)}
            </span>
          </div>
        </motion.div>
      </div>

      {/* STOCKS section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        style={{
          marginTop: 28,
          padding: "16px 20px",
          background: "rgba(0,240,255,0.03)",
          border: "1px solid rgba(0,240,255,0.12)",
          borderRadius: 10,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "rgba(0,240,255,0.6)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 12,
            fontWeight: 700,
          }}
        >
          Net Stock Addition — Materials Locked in Infrastructure
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          {CATEGORIES.map((cat, i) => {
            const stock = netStock[cat];
            const color = CATEGORY_COLORS[cat];
            return (
              <motion.div
                key={cat}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 + i * 0.06 }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: "10px 12px",
                  background: `rgba(${hexRGB(color)}, 0.05)`,
                  border: `1px solid rgba(${hexRGB(color)}, 0.2)`,
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: `rgba(${hexRGB(color)}, 0.7)`,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {CATEGORY_LABELS[cat]}
                </div>
                <div
                  style={{
                    fontSize: "clamp(11px, 1.2vw, 15px)",
                    fontWeight: 700,
                    color,
                    textShadow: `0 0 10px ${color}`,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  +{formatMass(Math.max(0, stock))}
                </div>
              </motion.div>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 13,
            color: "rgba(160,160,220,0.5)",
          }}
        >
          Total accumulation:{" "}
          <span
            style={{
              color: "#00f0ff",
              fontWeight: 700,
              textShadow: "0 0 10px rgba(0,240,255,0.6)",
            }}
          >
            {formatMass(Math.max(0, totalStock))} / year
          </span>{" "}
          building up as roads, buildings, and pipes.
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FlowBar — animated bar for City Metabolism
// ---------------------------------------------------------------------------

function FlowBar({
  category,
  value,
  maxValue,
  direction,
  delay,
}: {
  category: MaterialCategory;
  value: number;
  maxValue: number;
  direction: "left" | "right";
  delay: number;
}) {
  const color = CATEGORY_COLORS[category];
  const widthPct = Math.max(4, (value / maxValue) * 100);
  const isRight = direction === "right";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isRight ? "row-reverse" : "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      {/* Label + value */}
      <div
        style={{
          textAlign: isRight ? "right" : "left",
          flexShrink: 0,
          minWidth: 70,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: `rgba(${hexRGB(color)}, 0.8)`,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {CATEGORY_LABELS[category]}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color,
            textShadow: `0 0 8px ${color}`,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatMass(value)}
        </div>
      </div>

      {/* Bar track */}
      <div
        style={{
          flex: 1,
          height: 12,
          background: `rgba(${hexRGB(color)}, 0.08)`,
          borderRadius: 6,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Animated fill */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${widthPct}%` }}
          transition={{ duration: 0.8, delay, ease: "easeOut" }}
          style={{
            position: "absolute",
            top: 0,
            [isRight ? "right" : "left"]: 0,
            height: "100%",
            background: `linear-gradient(${isRight ? "to left" : "to right"}, ${color}, rgba(${hexRGB(color)}, 0.4))`,
            boxShadow: `0 0 10px ${color}`,
            borderRadius: 6,
          }}
        />

        {/* Animated flow particles */}
        <motion.div
          animate={{
            x: isRight ? ["-100%", "200%"] : ["200%", "-100%"],
          }}
          transition={{
            duration: 2.2,
            delay: delay + 0.6,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            position: "absolute",
            top: "20%",
            left: 0,
            width: "30%",
            height: "60%",
            background: `linear-gradient(${isRight ? "to left" : "to right"}, transparent, rgba(255,255,255,0.35), transparent)`,
            borderRadius: 4,
          }}
        />
      </div>

      {/* Arrow */}
      <div
        style={{
          fontSize: 14,
          color,
          textShadow: `0 0 8px ${color}`,
          flexShrink: 0,
        }}
      >
        {isRight ? "→" : "←"}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// COUNTRY SCALE — National Material Balance
// ---------------------------------------------------------------------------

function NationalMaterialBalance({
  profile,
  onElementClick,
}: {
  profile: ElementalProfile;
  onElementClick: (symbol: ElementSymbol) => void;
}) {
  const inbound = profile.flows.inbound;
  const outbound = profile.flows.outbound;
  const population = profile.population ?? 331000000;

  const totalIn = CATEGORIES.reduce((s, c) => s + (inbound[c] ?? 0), 0);
  const totalOut = CATEGORIES.reduce((s, c) => s + (outbound[c] ?? 0), 0);
  const perCapitaTonnes = totalIn / 1000 / population;

  // Rough GDP resource productivity: ~$21T GDP / totalIn in tonnes
  const gdpUSD = 21e12;
  const totalInTonnes = totalIn / 1000;
  const resourceProductivity = totalInTonnes > 0 ? gdpUSD / totalInTonnes : 0;

  // Stack heights: each bar segment proportional to category
  const bandHeight = 44;

  return (
    <div
      style={{
        background: "#060612",
        borderRadius: 16,
        padding: "28px 24px 24px",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 0 80px rgba(0,0,0,0.9)",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Grid bg */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,107,0,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,0,0.025) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 28, position: "relative" }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "clamp(16px, 2vw, 24px)",
            fontWeight: 800,
            color: "#e0e0ff",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            textShadow: "0 0 24px rgba(255,107,0,0.6)",
          }}
        >
          National Material Balance
        </h2>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 13,
            color: "rgba(160,160,220,0.55)",
            letterSpacing: "0.04em",
          }}
        >
          {profile.name} &bull; {(population / 1e6).toFixed(0)}M people &bull;{" "}
          <span style={{ color: "#ff6b00", fontWeight: 600 }}>
            {perCapitaTonnes.toFixed(1)} tonnes/capita/year
          </span>
        </p>
      </motion.div>

      {/* Sankey-like flow layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 80px 1fr",
          gap: 0,
          alignItems: "stretch",
          position: "relative",
          minHeight: CATEGORIES.length * (bandHeight + 8) + 40,
        }}
      >
        {/* LEFT: Domestic Extraction + Imports */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          style={{ display: "flex", flexDirection: "column", gap: 0 }}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(160,160,220,0.5)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 10,
              textAlign: "center",
              fontWeight: 700,
            }}
          >
            Extraction + Imports
          </div>
          {CATEGORIES.map((cat, i) => (
            <SankeyBand
              key={cat}
              category={cat}
              value={inbound[cat] ?? 0}
              total={totalIn}
              bandHeight={bandHeight}
              delay={0.15 + i * 0.08}
              side="left"
              perCapita={(inbound[cat] ?? 0) / 1000 / population}
            />
          ))}
          <div
            style={{
              textAlign: "center",
              marginTop: 12,
              fontSize: 13,
              color: "rgba(160,160,220,0.45)",
            }}
          >
            Total:{" "}
            <span style={{ color: "#00ff88", fontWeight: 700 }}>
              {formatMass(totalIn)}
            </span>
          </div>
        </motion.div>

        {/* CENTER: Economy block */}
        <motion.div
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 0.45, delay: 0.35 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px 4px",
            background: "rgba(255,107,0,0.06)",
            border: "1px solid rgba(255,107,0,0.2)",
            borderRadius: 8,
            margin: "24px 4px 0",
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "#ff6b00",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 800,
              textShadow: "0 0 8px #ff6b00",
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              transform: "rotate(180deg)",
            }}
          >
            Economy
          </div>
        </motion.div>

        {/* RIGHT: Exports + Emissions + Waste */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          style={{ display: "flex", flexDirection: "column", gap: 0 }}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(160,160,220,0.5)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 10,
              textAlign: "center",
              fontWeight: 700,
            }}
          >
            Exports + Emissions + Waste
          </div>
          {CATEGORIES.map((cat, i) => (
            <SankeyBand
              key={cat}
              category={cat}
              value={outbound[cat] ?? 0}
              total={totalOut}
              bandHeight={bandHeight}
              delay={0.15 + i * 0.08}
              side="right"
              perCapita={(outbound[cat] ?? 0) / 1000 / population}
            />
          ))}
          <div
            style={{
              textAlign: "center",
              marginTop: 12,
              fontSize: 13,
              color: "rgba(160,160,220,0.45)",
            }}
          >
            Total:{" "}
            <span style={{ color: "#ff0040", fontWeight: 700 }}>
              {formatMass(totalOut)}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Resource productivity footer */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.6 }}
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
        }}
      >
        <StatBox
          label="Resource Productivity"
          value={`$${resourceProductivity.toFixed(0)}`}
          unit="GDP per tonne"
          color="#ff6b00"
          delay={0.65}
        />
        <StatBox
          label="Per-Capita Throughput"
          value={perCapitaTonnes.toFixed(1)}
          unit="tonnes / person / year"
          color="#00ff88"
          delay={0.7}
        />
        <StatBox
          label="Net Domestic Stock"
          value={formatMass(Math.max(0, totalIn - totalOut))}
          unit="accumulated annually"
          color="#00f0ff"
          delay={0.75}
        />
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SankeyBand — a coloured stacked band for National Material Balance
// ---------------------------------------------------------------------------

function SankeyBand({
  category,
  value,
  total,
  bandHeight,
  delay,
  side,
  perCapita,
}: {
  category: MaterialCategory;
  value: number;
  total: number;
  bandHeight: number;
  delay: number;
  side: "left" | "right";
  perCapita: number;
}) {
  const color = CATEGORY_COLORS[category];
  const widthPct = total > 0 ? Math.max(8, (value / total) * 100) : 8;

  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
      style={{
        height: bandHeight,
        marginBottom: 8,
        transformOrigin: side === "left" ? "right center" : "left center",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `rgba(${hexRGB(color)}, 0.08)`,
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${widthPct}%` }}
          transition={{ duration: 0.7, delay: delay + 0.1, ease: "easeOut" }}
          style={{
            position: "absolute",
            top: 0,
            [side === "left" ? "right" : "left"]: 0,
            height: "100%",
            background: `linear-gradient(${side === "left" ? "to left" : "to right"}, ${color}, rgba(${hexRGB(color)}, 0.25))`,
            boxShadow: `0 0 16px rgba(${hexRGB(color)}, 0.5)`,
          }}
        />
        {/* Shimmer */}
        <motion.div
          animate={{
            x: side === "left" ? ["-100%", "250%"] : ["250%", "-100%"],
          }}
          transition={{
            duration: 2.8,
            delay: delay + 0.8,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            position: "absolute",
            top: "10%",
            left: 0,
            width: "25%",
            height: "80%",
            background:
              "linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent)",
            borderRadius: 4,
          }}
        />
      </div>

      {/* Label overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 10px",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color,
            textShadow: `0 0 8px ${color}`,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {CATEGORY_LABELS[category]}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "rgba(220,220,255,0.8)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatMass(value)} &bull; {perCapita.toFixed(2)}t/cap
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// StatBox — small KPI tile
// ---------------------------------------------------------------------------

function StatBox({
  label,
  value,
  unit,
  color,
  delay,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      style={{
        padding: "14px 16px",
        background: `rgba(${hexRGB(color)}, 0.04)`,
        border: `1px solid rgba(${hexRGB(color)}, 0.18)`,
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: `rgba(${hexRGB(color)}, 0.6)`,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "clamp(16px, 2vw, 22px)",
          fontWeight: 800,
          color,
          textShadow: `0 0 14px ${color}`,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10, color: "rgba(160,160,220,0.4)" }}>{unit}</div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// PLANET SCALE — Planetary Boundaries
// ---------------------------------------------------------------------------

const RING_RADIUS_BASE = 80;
const RING_GAP = 38;
const RING_STROKE = 28;

function PlanetaryBoundaries({
  profile,
  onElementClick,
}: {
  profile: ElementalProfile;
  onElementClick: (symbol: ElementSymbol) => void;
}) {
  const inbound = profile.flows.inbound;
  const totalKg = CATEGORIES.reduce((s, c) => s + (inbound[c] ?? 0), 0);

  // SVG viewBox size
  const rings = CATEGORIES.map((cat, i) => {
    const radius = RING_RADIUS_BASE + i * RING_GAP;
    const capacity = PLANET_CAPACITY_KG[cat];
    const current = inbound[cat] ?? 0;
    const ratio = capacity > 0 ? current / capacity : 0;
    const pct = Math.min(ratio, 1.5); // cap visually at 150%
    const color =
      ratio < 0.7 ? "#00ff88" : ratio <= 1.0 ? "#ffff00" : "#ff0040";
    const circumference = 2 * Math.PI * radius;
    const dashArray = `${circumference * Math.min(pct, 1)} ${circumference}`;
    const overCapacity = ratio > 1.0;

    return { cat, radius, capacity, current, ratio, pct, color, circumference, dashArray, overCapacity };
  });

  const svgSize = RING_RADIUS_BASE + CATEGORIES.length * RING_GAP + RING_STROKE + 20;
  const cx = svgSize;
  const cy = svgSize;

  return (
    <div
      style={{
        background: "#020208",
        borderRadius: 16,
        padding: "28px 24px 24px",
        border: "1px solid rgba(255,255,255,0.05)",
        boxShadow: "0 0 120px rgba(0,0,0,0.95), inset 0 0 100px rgba(0,0,0,0.7)",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Star field */}
      <StarField />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 24, position: "relative", zIndex: 1 }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "clamp(16px, 2vw, 26px)",
            fontWeight: 800,
            color: "#e0e0ff",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            textShadow: "0 0 30px rgba(100,100,255,0.7)",
          }}
        >
          Planetary Boundaries
        </h2>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 13,
            color: "rgba(160,160,220,0.55)",
            letterSpacing: "0.04em",
          }}
        >
          Earth&apos;s total material throughput &bull; 8.1 billion people &times; 12.5 tonnes each
        </p>
      </motion.div>

      {/* Main layout: rings + legend */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 32,
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* SVG ring diagram */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, delay: 0.1, type: "spring", stiffness: 80, damping: 14 }}
          style={{ position: "relative" }}
        >
          <svg
            width={svgSize * 2}
            height={svgSize * 2}
            viewBox={`0 0 ${svgSize * 2} ${svgSize * 2}`}
            style={{ overflow: "visible", maxWidth: "min(340px, 45vw)" }}
          >
            {/* Faint background rings */}
            {rings.map(({ cat, radius, color }) => (
              <circle
                key={`bg-${cat}`}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={`rgba(${hexRGB(color)}, 0.07)`}
                strokeWidth={RING_STROKE}
              />
            ))}

            {/* Capacity tick marks (at 100%) */}
            {rings.map(({ cat, radius, color }) => {
              const angle = -Math.PI / 2; // top
              const x1 = cx + (radius - RING_STROKE / 2 - 4) * Math.cos(angle);
              const y1 = cy + (radius - RING_STROKE / 2 - 4) * Math.sin(angle);
              const x2 = cx + (radius + RING_STROKE / 2 + 4) * Math.cos(angle);
              const y2 = cy + (radius + RING_STROKE / 2 + 4) * Math.sin(angle);
              return (
                <line
                  key={`tick-${cat}`}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={`rgba(${hexRGB(color)}, 0.4)`}
                  strokeWidth={2}
                />
              );
            })}

            {/* Active fill rings */}
            {rings.map(({ cat, radius, color, circumference, dashArray, overCapacity }, i) => (
              <motion.circle
                key={`fill-${cat}`}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={RING_STROKE - 4}
                strokeLinecap="round"
                strokeDashoffset={circumference * 0.25} // start at top
                strokeDasharray={dashArray}
                style={{
                  filter: `drop-shadow(0 0 ${overCapacity ? 12 : 6}px ${color})`,
                  transformOrigin: `${cx}px ${cy}px`,
                  rotate: "-90deg",
                }}
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{ strokeDasharray: dashArray }}
                transition={{ duration: 1.2, delay: 0.25 + i * 0.15, ease: "easeOut" }}
              />
            ))}

            {/* Pulsing over-capacity glow rings */}
            {rings
              .filter((r) => r.overCapacity)
              .map(({ cat, radius, color, circumference }) => (
                <motion.circle
                  key={`pulse-${cat}`}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth={RING_STROKE + 6}
                  strokeDasharray={`${circumference * 0.8} ${circumference}`}
                  strokeDashoffset={circumference * 0.25}
                  style={{
                    transformOrigin: `${cx}px ${cy}px`,
                    rotate: "-90deg",
                    mixBlendMode: "screen",
                  }}
                  animate={{ opacity: [0.05, 0.25, 0.05] }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              ))}

            {/* Center text */}
            <text
              x={cx}
              y={cy - 14}
              textAnchor="middle"
              fill="#e0e0ff"
              fontSize={22}
              fontWeight={800}
              fontFamily="Inter, sans-serif"
              style={{ textShadow: "0 0 20px rgba(180,180,255,0.8)" }}
            >
              ~100 Gt
            </text>
            <text
              x={cx}
              y={cy + 8}
              textAnchor="middle"
              fill="rgba(160,160,220,0.6)"
              fontSize={10}
              fontFamily="Inter, sans-serif"
            >
              per year
            </text>
            <text
              x={cx}
              y={cy + 24}
              textAnchor="middle"
              fill="rgba(160,160,220,0.4)"
              fontSize={9}
              fontFamily="Inter, sans-serif"
            >
              {formatMass(totalKg)}
            </text>
          </svg>
        </motion.div>

        {/* Legend + ring details */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          {rings.map(({ cat, current, capacity, ratio, color, overCapacity }, i) => (
            <motion.div
              key={cat}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              style={{
                padding: "12px 14px",
                background: `rgba(${hexRGB(color)}, 0.05)`,
                border: `1px solid rgba(${hexRGB(color)}, ${overCapacity ? 0.4 : 0.15})`,
                borderRadius: 10,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Over-capacity pulse background */}
              {overCapacity && (
                <motion.div
                  animate={{ opacity: [0, 0.12, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `radial-gradient(ellipse at center, rgba(${hexRGB(color)}, 0.3), transparent 70%)`,
                    pointerEvents: "none",
                  }}
                />
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      textShadow: `0 0 8px ${color}`,
                    }}
                  >
                    {CATEGORY_LABELS[cat]}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(160,160,220,0.5)", marginTop: 2 }}>
                    {formatMass(current)} / yr &bull; cap:{" "}
                    {formatMass(capacity)} / yr
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "clamp(13px, 1.5vw, 18px)",
                    fontWeight: 800,
                    color,
                    textShadow: `0 0 12px ${color}`,
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                  }}
                >
                  {(ratio * 100).toFixed(0)}%
                </div>
              </div>

              {/* Mini progress bar */}
              <div
                style={{
                  marginTop: 8,
                  height: 4,
                  background: `rgba(${hexRGB(color)}, 0.1)`,
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(ratio * 100, 100)}%` }}
                  transition={{ duration: 0.9, delay: 0.45 + i * 0.1, ease: "easeOut" }}
                  style={{
                    height: "100%",
                    background: color,
                    boxShadow: `0 0 8px ${color}`,
                    borderRadius: 2,
                  }}
                />
              </div>

              {overCapacity && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 9,
                    color: "#ff0040",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    fontWeight: 700,
                    textShadow: "0 0 8px #ff0040",
                  }}
                >
                  OVER CAPACITY — Exceeds Sustainable Rate
                </div>
              )}
            </motion.div>
          ))}

          {/* Bottom callout */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            style={{
              padding: "12px 14px",
              background: "rgba(100,100,255,0.04)",
              border: "1px solid rgba(100,100,255,0.12)",
              borderRadius: 10,
              fontSize: 11,
              color: "rgba(160,160,220,0.6)",
              lineHeight: 1.6,
            }}
          >
            <span style={{ color: "#e0e0ff", fontWeight: 700 }}>
              8.1B people &times; 12.5 t/yr
            </span>{" "}
            = ~100 billion tonnes extracted annually. Ring fill shows current
            extraction as % of estimated sustainable rate. Red rings are
            already beyond planetary limits.
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StarField — decorative background for Planet scale
// ---------------------------------------------------------------------------

const STARS = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 1.5 + 0.5,
  opacity: Math.random() * 0.4 + 0.1,
  delay: Math.random() * 4,
}));

function StarField() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {STARS.map((star) => (
        <motion.div
          key={star.id}
          animate={{ opacity: [star.opacity, star.opacity * 2.5, star.opacity] }}
          transition={{
            duration: 3 + star.delay,
            repeat: Infinity,
            ease: "easeInOut",
            delay: star.delay,
          }}
          style={{
            position: "absolute",
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            borderRadius: "50%",
            background: "#ffffff",
            boxShadow: `0 0 ${star.size * 2}px rgba(255,255,255,0.6)`,
          }}
        />
      ))}
    </div>
  );
}
