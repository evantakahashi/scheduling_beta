"use client";

import { motion } from "framer-motion";
import { ATTRIBUTES } from "@/lib/attributes";
import type { UserAttribute, AttributeId } from "@/types/database";

interface AttributeRadarProps {
  userAttributes: UserAttribute[];
  size?: number;
}

// Calculate level from XP (exponential curve)
function getXpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

function calculateAttributeLevel(totalXp: number): number {
  let level = 1;
  let xpRemaining = totalXp;
  while (xpRemaining >= getXpForLevel(level)) {
    xpRemaining -= getXpForLevel(level);
    level++;
  }
  return level;
}

export function AttributeRadar({ userAttributes, size = 200 }: AttributeRadarProps) {
  const center = size / 2;
  const maxRadius = size * 0.4;
  const numPoints = ATTRIBUTES.length;
  const angleStep = (Math.PI * 2) / numPoints;

  // Build attribute map for quick lookup
  const attrMap = new Map<AttributeId, number>();
  userAttributes.forEach((ua) => {
    attrMap.set(ua.attribute_id, ua.total_xp);
  });

  // Calculate points for each attribute
  const maxLevel = 20; // Cap for visualization
  const points = ATTRIBUTES.map((attr, i) => {
    const xp = attrMap.get(attr.id) || 0;
    const level = Math.min(calculateAttributeLevel(xp), maxLevel);
    const normalizedValue = level / maxLevel;
    const angle = i * angleStep - Math.PI / 2; // Start from top
    const radius = normalizedValue * maxRadius;

    return {
      attr,
      xp,
      level,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
      labelX: center + Math.cos(angle) * (maxRadius + 25),
      labelY: center + Math.sin(angle) * (maxRadius + 25),
      gridX: center + Math.cos(angle) * maxRadius,
      gridY: center + Math.sin(angle) * maxRadius,
    };
  });

  // Create path for the radar shape
  const pathData = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ") + " Z";

  // Grid circles
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="overflow-visible"
    >
      {/* Background grid circles */}
      {gridLevels.map((level, i) => (
        <circle
          key={i}
          cx={center}
          cy={center}
          r={maxRadius * level}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.1}
          strokeWidth={1}
        />
      ))}

      {/* Grid lines from center to each vertex */}
      {points.map((p, i) => (
        <line
          key={i}
          x1={center}
          y1={center}
          x2={p.gridX}
          y2={p.gridY}
          stroke="currentColor"
          strokeOpacity={0.1}
          strokeWidth={1}
        />
      ))}

      {/* Radar fill shape */}
      <motion.path
        d={pathData}
        fill="url(#radarGradient)"
        fillOpacity={0.3}
        stroke="url(#radarStroke)"
        strokeWidth={2}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />

      {/* Points */}
      {points.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={4}
          fill={p.attr.color}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1, duration: 0.3 }}
        />
      ))}

      {/* Labels */}
      {points.map((p, i) => (
        <g key={i}>
          <text
            x={p.labelX}
            y={p.labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-lg"
          >
            {p.attr.icon}
          </text>
          <text
            x={p.labelX}
            y={p.labelY + 16}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[10px] fill-muted-foreground uppercase tracking-wider"
          >
            {p.level}
          </text>
        </g>
      ))}

      {/* Gradients */}
      <defs>
        <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f0ff" />
          <stop offset="100%" stopColor="#ff00aa" />
        </linearGradient>
        <linearGradient id="radarStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f0ff" />
          <stop offset="100%" stopColor="#ff00aa" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// List view of attributes with progress bars
export function AttributeList({ userAttributes }: { userAttributes: UserAttribute[] }) {
  const attrMap = new Map<AttributeId, number>();
  userAttributes.forEach((ua) => {
    attrMap.set(ua.attribute_id, ua.total_xp);
  });

  return (
    <div className="space-y-3">
      {ATTRIBUTES.map((attr) => {
        const xp = attrMap.get(attr.id) || 0;
        const level = calculateAttributeLevel(xp);
        const currentLevelXp = getXpForLevel(level);
        let xpIntoLevel = xp;
        for (let l = 1; l < level; l++) {
          xpIntoLevel -= getXpForLevel(l);
        }
        const progress = (xpIntoLevel / currentLevelXp) * 100;

        return (
          <div key={attr.id} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{attr.icon}</span>
                <span className="text-sm text-foreground">{attr.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Lv.{level}</span>
                <span className="text-xs text-muted-foreground/70">{xp} XP</span>
              </div>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: attr.color }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
