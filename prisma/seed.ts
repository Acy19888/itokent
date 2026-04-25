// Seed script: creates 250 villas, demo users, 2 tennis courts, sample data.
// Run with: npm run db:seed

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Create 250 villas
  const villaCount = await prisma.villa.count();
  if (villaCount === 0) {
    const villas = Array.from({ length: 250 }, (_, i) => ({
      number: i + 1,
      block: i < 125 ? "A" : "B",
    }));
    await prisma.villa.createMany({ data: villas });
    console.log("✅ Created 250 villas");
  }

  // 2. Tennis courts
  const courtCount = await prisma.tennisCourt.count();
  if (courtCount === 0) {
    await prisma.tennisCourt.createMany({
      data: [
        { name: "Court 1" },
        { name: "Court 2" },
      ],
    });
    console.log("✅ Created 2 tennis courts");
  }

  // 2b. Restaurant tables — initial 10 tables in two rows of 5.
  // Coordinates are in 1000×600 SVG space; staff can rearrange later.
  const tableCount = await prisma.restaurantTable.count();
  if (tableCount === 0) {
    const initialTables = [
      // Row 1 (y=200)
      { number: 1, seats: 4, x: 150, y: 200, shape: "ROUND" },
      { number: 2, seats: 4, x: 320, y: 200, shape: "ROUND" },
      { number: 3, seats: 4, x: 500, y: 200, shape: "ROUND" },
      { number: 4, seats: 4, x: 680, y: 200, shape: "ROUND" },
      { number: 5, seats: 6, x: 860, y: 200, shape: "SQUARE" },
      // Row 2 (y=420)
      { number: 6, seats: 2, x: 150, y: 420, shape: "ROUND" },
      { number: 7, seats: 2, x: 320, y: 420, shape: "ROUND" },
      { number: 8, seats: 4, x: 500, y: 420, shape: "ROUND" },
      { number: 9, seats: 4, x: 680, y: 420, shape: "ROUND" },
      { number: 10, seats: 6, x: 860, y: 420, shape: "SQUARE" },
    ];
    await prisma.restaurantTable.createMany({ data: initialTables });
    console.log("✅ Created 10 restaurant tables");
  }

  // 3. Demo users (Admin, Restaurant staff, a few residents)
  const villa1 = await prisma.villa.findUnique({ where: { number: 1 } });
  const villa42 = await prisma.villa.findUnique({ where: { number: 42 } });
  const villa108 = await prisma.villa.findUnique({ where: { number: 108 } });

  const passwordHash = await bcrypt.hash("demo1234", 10);

  const demoUsers = [
    {
      email: "admin@villa.com",
      name: "Mehmet Yılmaz",
      role: "ADMIN" as const,
      passwordHash,
      phone: "+90 555 000 0001",
    },
    {
      email: "restaurant@villa.com",
      name: "Restoran Yönetimi",
      role: "RESTAURANT_STAFF" as const,
      passwordHash,
      phone: "+90 555 000 0002",
    },
    {
      email: "cem@villa.com",
      name: "Cem Yüksel",
      role: "RESIDENT" as const,
      passwordHash,
      phone: "+90 555 100 0001",
      villaId: villa1?.id,
    },
    {
      email: "ayse@villa.com",
      name: "Ayşe Demir",
      role: "RESIDENT" as const,
      passwordHash,
      phone: "+90 555 100 0042",
      villaId: villa42?.id,
    },
    {
      email: "can@villa.com",
      name: "Can Öztürk",
      role: "RESIDENT" as const,
      passwordHash,
      phone: "+90 555 100 0108",
      villaId: villa108?.id,
    },
  ];

  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: u,
    });
  }
  console.log("✅ Created demo users (password: demo1234)");

  // 4. Sample announcements
  const admin = await prisma.user.findUnique({ where: { email: "admin@villa.com" } });
  if (admin) {
    const existingAnnouncements = await prisma.announcement.count();
    if (existingAnnouncements === 0) {
      await prisma.announcement.createMany({
        data: [
          {
            titleTr: "Havuz Bakımı",
            titleEn: "Pool Maintenance",
            bodyTr: "Ana havuz 25 Nisan Pazartesi günü bakım nedeniyle kapalı olacaktır. Anlayışınız için teşekkürler.",
            bodyEn: "The main pool will be closed for maintenance on Monday, April 25. Thank you for your understanding.",
            priority: "HIGH",
            authorId: admin.id,
          },
          {
            titleTr: "Yeni Güvenlik Prosedürleri",
            titleEn: "New Security Procedures",
            bodyTr: "1 Mayıs itibarıyla tüm misafirlerin önceden uygulama üzerinden bildirilmesi gerekmektedir.",
            bodyEn: "Starting May 1, all guests must be pre-registered via the app before arrival.",
            priority: "NORMAL",
            authorId: admin.id,
          },
        ],
      });
      console.log("✅ Created sample announcements");
    }

    // 5. Sample events
    const existingEvents = await prisma.event.count();
    if (existingEvents === 0) {
      const now = new Date();
      const inDays = (d: number) => {
        const date = new Date(now);
        date.setDate(date.getDate() + d);
        date.setHours(19, 0, 0, 0);
        return date;
      };
      await prisma.event.createMany({
        data: [
          {
            titleTr: "Yaz Açılış Gecesi",
            titleEn: "Summer Opening Night",
            descTr: "Canlı müzik, kokteyller ve mutfak şefimizin özel menüsüyle yaz sezonunu açıyoruz.",
            descEn: "Live music, cocktails, and a special menu by our chef to open the summer season.",
            location: "Clubhouse & Pool Deck",
            startsAt: inDays(5),
            endsAt: new Date(inDays(5).getTime() + 4 * 60 * 60 * 1000),
            createdById: admin.id,
          },
          {
            titleTr: "Tenis Turnuvası",
            titleEn: "Tennis Tournament",
            descTr: "Topluluk içi tenis turnuvası. Ödüller ve açık büfe kokteyl.",
            descEn: "Community tennis tournament. Prizes and open cocktail buffet.",
            location: "Tennis Courts",
            startsAt: inDays(14),
            endsAt: new Date(inDays(14).getTime() + 8 * 60 * 60 * 1000),
            createdById: admin.id,
          },
          {
            titleTr: "Şarap Tadım Akşamı",
            titleEn: "Wine Tasting Evening",
            descTr: "Seçkin Türk ve Fransız şaraplarının tadımı, sommelier eşliğinde.",
            descEn: "Tasting of select Turkish and French wines with a sommelier.",
            location: "Restaurant",
            startsAt: inDays(21),
            endsAt: new Date(inDays(21).getTime() + 3 * 60 * 60 * 1000),
            createdById: admin.id,
          },
        ],
      });
      console.log("✅ Created sample events");
    }
  }

  console.log("🌱 Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
