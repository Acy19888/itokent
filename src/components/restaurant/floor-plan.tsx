"use client";

import { FLOOR_PLAN } from "@/lib/restaurant-config";

export type TableShape = "ROUND" | "SQUARE";

export interface FloorTable {
  id: string;
  number: number;
  seats: number;
  x: number;
  y: number;
  shape: TableShape;
  active?: boolean;
}

export type TableState =
  | "free"      // bookable
  | "booked"    // someone else holds it for the slot
  | "mine"      // current user's reservation
  | "selected"  // user is hovering / picking it
  | "tooSmall"  // table.seats < partySize
  | "inactive"  // soft-deleted (staff editor only)
  | "neutral";  // staff editor default

export interface FloorPlanProps {
  tables: FloorTable[];
  /** Map table.number → state. Defaults to "free"/"neutral" depending on
   *  whether the user is in a booking flow. */
  stateByNumber?: Map<number, TableState>;
  /** Optional click handler — passes the clicked table. */
  onTableClick?: (t: FloorTable) => void;
  /** Optional drag handler — passes table id and new (x, y) in floor coords. */
  onTableDrag?: (id: string, x: number, y: number) => void;
  /** Show small chair circles around each table. */
  showChairs?: boolean;
  /** Visual scale: container CSS height auto-fits FLOOR_PLAN.height aspect. */
  className?: string;
  /** Highlight a single table (by id) with the "selected" outline. */
  highlightId?: string;
  /** When true, the SVG resizes to its container (preferred); otherwise it
   *  uses a fixed pixel height (useful in modals/small previews). */
  responsive?: boolean;
}

const TABLE_RADIUS = 36;     // round table radius
const TABLE_SQUARE = 64;     // square table side / 2 — half-side
const CHAIR_RADIUS = 8;
const CHAIR_OFFSET = 18;     // gap between table edge and chair

const STATE_STYLES: Record<TableState, { fill: string; stroke: string; chairFill: string; text: string }> = {
  free:     { fill: "#0d3d3a", stroke: "#5cb6a8", chairFill: "#1d6d62", text: "#dff5ef" },
  booked:   { fill: "#3a1c1c", stroke: "#a3433f", chairFill: "#7a2c2a", text: "#f3c8c6" },
  mine:     { fill: "#7a5a14", stroke: "#f7c948", chairFill: "#b08820", text: "#fff5d1" },
  selected: { fill: "#155e54", stroke: "#fff5d1", chairFill: "#1d8a7c", text: "#fff5d1" },
  tooSmall: { fill: "#1f2620", stroke: "#3e4a40", chairFill: "#2a332b", text: "#5e6c5f" },
  inactive: { fill: "#1a1f1c", stroke: "#3e4a40", chairFill: "#2a332b", text: "#6c7c6e" },
  neutral:  { fill: "#0d3d3a", stroke: "#9c8240", chairFill: "#1d6d62", text: "#dff5ef" },
};

function chairPositions(table: FloorTable) {
  const positions: { x: number; y: number }[] = [];
  if (table.shape === "ROUND") {
    const r = TABLE_RADIUS + CHAIR_OFFSET;
    for (let i = 0; i < table.seats; i++) {
      const angle = (i / table.seats) * Math.PI * 2 - Math.PI / 2;
      positions.push({
        x: table.x + Math.cos(angle) * r,
        y: table.y + Math.sin(angle) * r,
      });
    }
  } else {
    // Square: distribute chairs evenly across 4 sides (2,2,2,2 for 8;
    // 1,1,1,1 for 4; etc.). Keep it simple: top/bottom share extras.
    const perSide = Math.ceil(table.seats / 4);
    let placed = 0;
    const side = TABLE_SQUARE;
    const c = CHAIR_OFFSET + 4;
    // top
    for (let i = 0; i < perSide && placed < table.seats; i++, placed++) {
      const t = (i + 1) / (perSide + 1);
      positions.push({ x: table.x - side + t * (side * 2), y: table.y - side - c });
    }
    // bottom
    for (let i = 0; i < perSide && placed < table.seats; i++, placed++) {
      const t = (i + 1) / (perSide + 1);
      positions.push({ x: table.x - side + t * (side * 2), y: table.y + side + c });
    }
    // left
    for (let i = 0; i < perSide && placed < table.seats; i++, placed++) {
      const t = (i + 1) / (perSide + 1);
      positions.push({ x: table.x - side - c, y: table.y - side + t * (side * 2) });
    }
    // right
    for (let i = 0; i < perSide && placed < table.seats; i++, placed++) {
      const t = (i + 1) / (perSide + 1);
      positions.push({ x: table.x + side + c, y: table.y - side + t * (side * 2) });
    }
  }
  return positions;
}

export function FloorPlan({
  tables,
  stateByNumber,
  onTableClick,
  onTableDrag,
  showChairs = true,
  className,
  highlightId,
  responsive = true,
}: FloorPlanProps) {
  const draggable = !!onTableDrag;

  const handlePointerDown = (
    e: React.PointerEvent<SVGGElement>,
    t: FloorTable,
  ) => {
    if (!draggable) return;
    e.preventDefault();
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const move = (ev: PointerEvent) => {
      const pt = svg.createSVGPoint();
      pt.x = ev.clientX;
      pt.y = ev.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const local = pt.matrixTransform(ctm.inverse());
      onTableDrag?.(t.id, Math.round(local.x), Math.round(local.y));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      className={
        "relative rounded-2xl border border-brass-500/20 bg-itokent-950/60 p-2 " +
        (className ?? "")
      }
      style={{
        aspectRatio: responsive
          ? `${FLOOR_PLAN.width} / ${FLOOR_PLAN.height}`
          : undefined,
      }}
    >
      <svg
        viewBox={`0 0 ${FLOOR_PLAN.width} ${FLOOR_PLAN.height}`}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        {/* Background — wood texture-ish dots */}
        <defs>
          <pattern id="wood" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="#0a2a26" />
            <circle cx="20" cy="20" r="0.8" fill="#1a4d46" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wood)" rx="14" />

        {/* "Bar" / kitchen — top edge */}
        <rect
          x="20" y="20" width="960" height="32" rx="8"
          fill="#5a4423" stroke="#9c8240" strokeWidth="1.5"
        />
        <text
          x="500" y="42" textAnchor="middle"
          style={{ fontSize: 14, fontFamily: "serif", letterSpacing: "0.2em" }}
          fill="#fff5d1"
        >
          BAR
        </text>

        {/* Tables */}
        {tables.map((t) => {
          const state = stateByNumber?.get(t.number) ?? "neutral";
          const styles = STATE_STYLES[state];
          const isHighlighted = highlightId === t.id;
          const interactive = !!onTableClick && state !== "booked" && state !== "tooSmall" && state !== "inactive";

          return (
            <g
              key={t.id}
              style={{
                cursor: draggable
                  ? "grab"
                  : interactive
                    ? "pointer"
                    : "default",
              }}
              onPointerDown={(e) => handlePointerDown(e, t)}
              onClick={() => interactive && onTableClick?.(t)}
            >
              {/* Chairs */}
              {showChairs &&
                chairPositions(t).map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={CHAIR_RADIUS}
                    fill={styles.chairFill}
                    stroke={styles.stroke}
                    strokeWidth={1}
                  />
                ))}

              {/* Table */}
              {t.shape === "ROUND" ? (
                <circle
                  cx={t.x}
                  cy={t.y}
                  r={TABLE_RADIUS}
                  fill={styles.fill}
                  stroke={styles.stroke}
                  strokeWidth={isHighlighted ? 3.5 : 2}
                />
              ) : (
                <rect
                  x={t.x - TABLE_SQUARE}
                  y={t.y - TABLE_SQUARE}
                  width={TABLE_SQUARE * 2}
                  height={TABLE_SQUARE * 2}
                  rx={6}
                  fill={styles.fill}
                  stroke={styles.stroke}
                  strokeWidth={isHighlighted ? 3.5 : 2}
                />
              )}

              {/* Number label */}
              <text
                x={t.x}
                y={t.y + 5}
                textAnchor="middle"
                style={{
                  fontSize: 16,
                  fontFamily: "serif",
                  fontWeight: 600,
                  pointerEvents: "none",
                  userSelect: "none",
                }}
                fill={styles.text}
              >
                {t.number}
              </text>
              <text
                x={t.x}
                y={t.y + 20}
                textAnchor="middle"
                style={{
                  fontSize: 9,
                  pointerEvents: "none",
                  userSelect: "none",
                }}
                fill={styles.text}
              >
                {t.seats}p
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
