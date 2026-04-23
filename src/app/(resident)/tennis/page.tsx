import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { TennisBoard } from "./tennis-board";
import { addDays, dateKey, startOfDay } from "@/lib/utils";

export default async function TennisPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;
  const t = await getTranslations("Tennis");
  const sp = await searchParams;

  const today = startOfDay(new Date());
  const selected = sp.d ? new Date(sp.d) : today;

  // Build 7-day date strip
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));

  const courts = await prisma.tennisCourt.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  const dayStart = startOfDay(selected);
  const dayEnd = addDays(dayStart, 1);

  const bookings = await prisma.tennisBooking.findMany({
    where: {
      date: { gte: dayStart, lt: dayEnd },
      status: "CONFIRMED",
    },
    include: { user: { select: { id: true, name: true, villaId: true } } },
  });

  const myUpcoming = await prisma.tennisBooking.findMany({
    where: {
      userId: session.user.id,
      status: "CONFIRMED",
      date: { gte: today },
    },
    include: { court: true },
    orderBy: [{ date: "asc" }, { startHour: "asc" }],
    take: 10,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-forest-900">{t("title")}</h1>
        <p className="text-sm text-forest-600 mt-1">{t("subtitle")}</p>
      </header>

      <TennisBoard
        userId={session.user.id}
        selectedDateKey={dateKey(selected)}
        days={days.map((d) => dateKey(d))}
        courts={courts.map((c) => ({ id: c.id, name: c.name }))}
        bookings={bookings.map((b) => ({
          id: b.id,
          courtId: b.courtId,
          startHour: b.startHour,
          userId: b.userId,
          userName: b.user.name,
        }))}
        myUpcoming={myUpcoming.map((b) => ({
          id: b.id,
          courtName: b.court.name,
          dateISO: b.date.toISOString(),
          startHour: b.startHour,
        }))}
      />
    </div>
  );
}
