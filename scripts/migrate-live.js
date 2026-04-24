/**
 * One-off live migration: bring Neon up to date with schema.prisma.
 * Additive-only, idempotent (IF NOT EXISTS everywhere) — safe to re-run.
 *
 * Run:
 *   cd villa-community
 *   node scripts/migrate-live.js
 *
 * Reads DATABASE_URL from .env via the existing Prisma client.
 */
const { PrismaClient } = require("@prisma/client");

const statements = [
  // Event fee columns
  `ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "feeAmount" INTEGER`,
  `ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "feeCurrency" TEXT DEFAULT 'TRY'`,

  // PartyHouseBooking fee columns
  `ALTER TABLE "PartyHouseBooking" ADD COLUMN IF NOT EXISTS "feeAmount" INTEGER`,
  `ALTER TABLE "PartyHouseBooking" ADD COLUMN IF NOT EXISTS "feeCurrency" TEXT DEFAULT 'TRY'`,
  `ALTER TABLE "PartyHouseBooking" ADD COLUMN IF NOT EXISTS "paid" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "PartyHouseBooking" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3)`,

  // EventAttendee table
  `CREATE TABLE IF NOT EXISTS "EventAttendee" (
     "id" TEXT NOT NULL,
     "eventId" TEXT NOT NULL,
     "userId" TEXT NOT NULL,
     "paid" BOOLEAN NOT NULL DEFAULT false,
     "paidAt" TIMESTAMP(3),
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "EventAttendee_pkey" PRIMARY KEY ("id")
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EventAttendee_eventId_userId_key"
     ON "EventAttendee"("eventId", "userId")`,
  `CREATE INDEX IF NOT EXISTS "EventAttendee_eventId_idx"
     ON "EventAttendee"("eventId")`,
  `CREATE INDEX IF NOT EXISTS "EventAttendee_userId_idx"
     ON "EventAttendee"("userId")`,
  // FKs — wrapped in DO blocks so re-running is idempotent
  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'EventAttendee_eventId_fkey'
     ) THEN
       ALTER TABLE "EventAttendee"
         ADD CONSTRAINT "EventAttendee_eventId_fkey"
         FOREIGN KEY ("eventId") REFERENCES "Event"("id")
         ON DELETE CASCADE ON UPDATE CASCADE;
     END IF;
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'EventAttendee_userId_fkey'
     ) THEN
       ALTER TABLE "EventAttendee"
         ADD CONSTRAINT "EventAttendee_userId_fkey"
         FOREIGN KEY ("userId") REFERENCES "User"("id")
         ON DELETE CASCADE ON UPDATE CASCADE;
     END IF;
   END $$`,
];

(async () => {
  const prisma = new PrismaClient();
  try {
    for (const s of statements) {
      const preview = s.trim().split("\n")[0].slice(0, 90);
      process.stdout.write(`→ ${preview} ... `);
      await prisma.$executeRawUnsafe(s);
      console.log("ok");
    }

    // Verify
    const cols = await prisma.$queryRawUnsafe(`
      SELECT table_name, column_name FROM information_schema.columns
       WHERE (table_name = 'Event' AND column_name IN ('feeAmount', 'feeCurrency'))
          OR (table_name = 'PartyHouseBooking' AND column_name IN ('feeAmount', 'feeCurrency', 'paid', 'paidAt'))
       ORDER BY table_name, column_name
    `);
    console.log("\nVerified columns:");
    for (const row of cols) console.log(`  ${row.table_name}.${row.column_name}`);

    const tbl = await prisma.$queryRawUnsafe(
      `SELECT to_regclass('public."EventAttendee"')::text AS exists`,
    );
    console.log("\nEventAttendee table:", tbl[0].exists);
    console.log("\n✓ Migration complete.");
  } finally {
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error("\nFAILED:", e.message);
  process.exit(1);
});
