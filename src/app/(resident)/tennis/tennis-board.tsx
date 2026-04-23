"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { bookTennisSlot, cancelTennisBooking } from "@/lib/actions/tennis";
import { cn, parseDateKey } from "@/lib/utils";
import { X, Check, ChevronRight } from "lucide-react";

interface Props {
  userId: string;
  selectedDateKey: string;
  days: string[]; // list of date keys
  courts: { id: string; name: string }[];
  bookings: {
    id: string;
    courtId: string;
    startHour: number;
    userId: string;
    userName: string;
  }[];
  myUpcoming: {
    id: string;
    courtName: string;
    dateISO: string;
    startHour: number;
  }[];
}

const HOURS = Array.from({ length: 11 }, (_, i) => 9 + i); // 9..19

export function TennisBoard({
  userId,
  selectedDateKey,
  days,
  courts,
  bookings,
  myUpcoming,
}: Props) {
  const t = useTranslations("Tennis");
  const common = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);

  const goDay = (key: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("d", key);
    router.replace(url.pathname + url.search);
  };

  const selectedDate = parseDateKey(selectedDateKey);

  // Map (courtId + hour) -> booking
  const slotMap = new Map<string, typeof bookings[number]>();
  for (const b of bookings) slotMap.set(`${b.courtId}-${b.startHour}`, b);

  const onBook = (courtId: string, hour: number) => {
    if (pending) return;
    start(async () => {
      const res = await bookTennisSlot({
        courtId,
        dateKey: selectedDateKey,
        startHour: hour,
      });
      if (res.ok) {
        setFlash(t("bookedSuccess"));
        setTimeout(() => setFlash(null), 2500);
        router.refresh();
      } else {
        setFlash(res.error === "SLOT_TAKEN" ? t("booked") : "—");
        setTimeout(() => setFlash(null), 2500);
        router.refresh();
      }
    });
  };

  const onCancel = (id: string) => {
    if (pending) return;
    start(async () => {
      await cancelTennisBooking({ id });
      setFlash(t("cancelledSuccess"));
      setTimeout(() => setFlash(null), 2500);
      router.refresh();
    });
  };

  const fmtDayShort = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const fmtDayLong = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" });

  const now = new Date();
  const isPastSlot = (hour: number) => {
    const slot = new Date(selectedDate);
    slot.setHours(hour, 0, 0, 0);
    return slot.getTime() < now.getTime();
  };

  return (
    <div className="space-y-6">
      {/* Date strip */}
      <div className="-mx-4 px-4 overflow-x-auto">
        <div className="flex gap-2 pb-2 min-w-max">
          {days.map((dk) => {
            const d = parseDateKey(dk);
            const active = dk === selectedDateKey;
            const isToday = dk === new Date().toISOString().slice(0, 10);
            return (
              <button
                key={dk}
                onClick={() => goDay(dk)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-xl min-w-[68px] transition",
                  active
                    ? "bg-gradient-forest text-cream-50 shadow-lg"
                    : "bg-white border border-forest-100 text-forest-600 hover:border-gold-400",
                )}
              >
                <span className={cn("text-[10px] uppercase tracking-wider", active ? "text-gold-300" : "text-forest-400")}>
                  {isToday ? common("today") : fmtDayShort.format(d)}
                </span>
                <span className="text-lg font-semibold">{d.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-center text-sm text-forest-700 font-medium">
        {fmtDayLong.format(selectedDate)}
      </div>

      {/* Slot grid per court */}
      <div className="space-y-4">
        {courts.map((court) => (
          <section key={court.id} className="card-luxury p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-gradient-gold" />
              <h3 className="font-display text-lg text-forest-900">{court.name}</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {HOURS.map((h) => {
                const b = slotMap.get(`${court.id}-${h}`);
                const mine = b?.userId === userId;
                const past = isPastSlot(h);

                if (past && !b) {
                  return (
                    <div
                      key={h}
                      className="rounded-lg px-2 py-3 text-center text-xs bg-forest-50/50 text-forest-300 line-through"
                    >
                      {String(h).padStart(2, "0")}:00
                    </div>
                  );
                }

                if (b) {
                  return (
                    <div
                      key={h}
                      className={cn(
                        "rounded-lg px-2 py-3 text-center text-xs",
                        mine ? "slot-mine" : "slot-booked",
                      )}
                    >
                      <div className="font-semibold">{String(h).padStart(2, "0")}:00</div>
                      <div className="text-[10px] truncate mt-0.5 opacity-80">
                        {mine ? t("yourBooking") : b.userName.split(" ")[0]}
                      </div>
                      {mine && (
                        <button
                          onClick={() => onCancel(b.id)}
                          disabled={pending}
                          className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-forest-700 hover:text-red-700"
                        >
                          <X className="w-3 h-3" /> {t("cancel")}
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <button
                    key={h}
                    onClick={() => onBook(court.id, h)}
                    disabled={pending}
                    className="slot-available rounded-lg px-2 py-3 text-center text-xs"
                  >
                    <div className="font-semibold">{String(h).padStart(2, "0")}:00</div>
                    <div className="text-[10px] opacity-70">{t("available")}</div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Flash */}
      {flash && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-forest-900 text-cream-50 px-5 py-3 rounded-full shadow-luxury flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 text-gold-400" /> {flash}
        </div>
      )}

      {/* My upcoming */}
      {myUpcoming.length > 0 && (
        <section>
          <h3 className="font-display text-xl text-forest-900 mb-3">{t("myBookings")}</h3>
          <ul className="space-y-2">
            {myUpcoming.map((b) => {
              const d = new Date(b.dateISO);
              return (
                <li key={b.id} className="card-luxury p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center text-gold-700 font-semibold text-xs">
                    {String(b.startHour).padStart(2, "0")}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-forest-900">
                      {b.courtName} · {String(b.startHour).padStart(2, "0")}:00 – {String(b.startHour + 1).padStart(2, "0")}:00
                    </div>
                    <div className="text-xs text-forest-500">{fmtDayLong.format(d)}</div>
                  </div>
                  <button
                    onClick={() => onCancel(b.id)}
                    disabled={pending}
                    className="text-xs text-red-600 hover:text-red-700 p-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
