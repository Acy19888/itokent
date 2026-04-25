"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2, RotateCcw, Check } from "lucide-react";
import { saveLayout } from "@/lib/actions/restaurant";
import { FloorPlan, type FloorTable } from "@/components/restaurant/floor-plan";
import { MAX_SEATS_PER_TABLE } from "@/lib/restaurant-config";

interface EditableTable extends FloorTable {
  active: boolean;
  /** marker for unsaved new rows so the server can distinguish them from existing rows */
  isNew?: boolean;
}

interface Props {
  initialTables: EditableTable[];
}

export function LayoutEditor({ initialTables }: Props) {
  const t = useTranslations("RestaurantApp");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tables, setTables] = useState<EditableTable[]>(initialTables);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const dirty = useMemo(() => {
    if (deletedIds.length > 0) return true;
    if (tables.length !== initialTables.length) return true;
    for (const tt of tables) {
      if (tt.isNew) return true;
      const orig = initialTables.find((o) => o.id === tt.id);
      if (!orig) return true;
      if (
        orig.number !== tt.number ||
        orig.seats !== tt.seats ||
        orig.x !== tt.x ||
        orig.y !== tt.y ||
        orig.shape !== tt.shape ||
        orig.active !== tt.active
      ) {
        return true;
      }
    }
    return false;
  }, [tables, initialTables, deletedIds]);

  const updateTable = (id: string, patch: Partial<EditableTable>) => {
    setTables((cur) =>
      cur.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
  };

  const onAdd = () => {
    const nextNumber =
      tables.reduce((m, t) => Math.max(m, t.number), 0) + 1;
    const tempId = `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setTables((cur) => [
      ...cur,
      {
        id: tempId,
        number: nextNumber,
        seats: 4,
        x: 500,
        y: 300,
        shape: "ROUND",
        active: true,
        isNew: true,
      },
    ]);
    setEditingId(tempId);
  };

  const onDelete = (id: string) => {
    const tt = tables.find((t) => t.id === id);
    if (!tt) return;
    if (!tt.isNew) {
      setDeletedIds((d) => [...d, id]);
    }
    setTables((cur) => cur.filter((t) => t.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const onReset = () => {
    setTables(initialTables);
    setDeletedIds([]);
    setError(null);
  };

  const onSave = () => {
    setError(null);
    // Client-side: validate uniqueness of numbers
    const numbers = new Set<number>();
    for (const tt of tables) {
      if (numbers.has(tt.number)) {
        setError(t("layoutDuplicate"));
        return;
      }
      numbers.add(tt.number);
    }

    start(async () => {
      const res = await saveLayout({
        tables: tables.map((tt) => ({
          id: tt.isNew ? undefined : tt.id,
          number: tt.number,
          seats: tt.seats,
          x: tt.x,
          y: tt.y,
          shape: tt.shape,
          active: tt.active,
        })),
        deletedIds,
      });
      if (res.ok) {
        setFlash(t("layoutSaved"));
        setDeletedIds([]);
        router.refresh();
        setTimeout(() => setFlash(null), 2500);
      } else if (res.error === "DUPLICATE_NUMBER") {
        setError(t("layoutDuplicate"));
      } else {
        setError(t("layoutSaveError"));
      }
    });
  };

  const onDrag = (id: string, x: number, y: number) => {
    updateTable(id, { x, y });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-brass text-ink-900 font-medium shadow-sm hover:shadow-edel transition"
        >
          <Plus className="w-4 h-4" />
          {t("addTable")}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || pending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 text-cream-50 font-medium shadow-sm hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <Save className="w-4 h-4" />
          {pending ? t("saving") : t("saveLayout")}
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={!dirty || pending}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-ivory-50/20 text-cream-200 hover:border-ivory-50/40 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <RotateCcw className="w-4 h-4" />
          {t("resetLayout")}
        </button>
        <span className="text-xs text-cream-400 ml-auto">
          {tables.length} {t("tablesUnit")} ·{" "}
          {tables.reduce((s, t) => s + t.seats, 0)} {t("seatsUnit")}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-900/30 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
      {flash && (
        <div className="rounded-lg border border-teal-500/30 bg-teal-900/30 px-3 py-2 text-sm text-teal-100 flex items-center gap-2">
          <Check className="w-4 h-4" /> {flash}
        </div>
      )}

      <p className="text-xs text-cream-400">{t("dragHint")}</p>

      <FloorPlan
        tables={tables.filter((t) => t.active)}
        onTableClick={(t) => setEditingId(t.id)}
        onTableDrag={onDrag}
        highlightId={editingId ?? undefined}
        showChairs
      />

      {/* Per-table editor cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tables
          .slice()
          .sort((a, b) => a.number - b.number)
          .map((tt) => (
            <div
              key={tt.id}
              className={
                "rounded-xl border p-3 transition " +
                (editingId === tt.id
                  ? "border-brass-400 bg-itokent-900/80"
                  : "border-ivory-50/10 bg-itokent-900/40 hover:border-ivory-50/20")
              }
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-display text-lg text-cream-50">
                  {t("tableShort")} {tt.number}
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(tt.id)}
                  className="text-red-400 hover:text-red-300 p-1"
                  title={t("removeTable")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="block">
                  <span className="text-cream-400">{t("number")}</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={tt.number}
                    onChange={(e) =>
                      updateTable(tt.id, {
                        number: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="mt-1 w-full rounded-md bg-itokent-950 border border-ivory-50/15 px-2 py-1 text-cream-50"
                  />
                </label>
                <label className="block">
                  <span className="text-cream-400">{t("seatsField")}</span>
                  <input
                    type="number"
                    min={1}
                    max={MAX_SEATS_PER_TABLE}
                    value={tt.seats}
                    onChange={(e) =>
                      updateTable(tt.id, {
                        seats: Math.max(
                          1,
                          Math.min(
                            MAX_SEATS_PER_TABLE,
                            parseInt(e.target.value) || 1,
                          ),
                        ),
                      })
                    }
                    className="mt-1 w-full rounded-md bg-itokent-950 border border-ivory-50/15 px-2 py-1 text-cream-50"
                  />
                </label>
                <label className="block">
                  <span className="text-cream-400">{t("shape")}</span>
                  <select
                    value={tt.shape}
                    onChange={(e) =>
                      updateTable(tt.id, {
                        shape: e.target.value as "ROUND" | "SQUARE",
                      })
                    }
                    className="mt-1 w-full rounded-md bg-itokent-950 border border-ivory-50/15 px-2 py-1 text-cream-50"
                  >
                    <option value="ROUND">{t("shapeRound")}</option>
                    <option value="SQUARE">{t("shapeSquare")}</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 mt-4 col-span-2">
                  <input
                    type="checkbox"
                    checked={tt.active}
                    onChange={(e) =>
                      updateTable(tt.id, { active: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-cream-300">{t("activeTable")}</span>
                </label>
              </div>

              <div className="text-[10px] text-cream-500 mt-2">
                x: {tt.x} · y: {tt.y}{" "}
                {tt.isNew && <span className="text-brass-400 ml-2">{t("unsaved")}</span>}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
