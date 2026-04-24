/**
 * Lightweight email client using Resend's REST API.
 *
 * We intentionally do NOT use the `resend` npm package — fetching the REST
 * endpoint directly keeps the dependency footprint small and avoids bundler
 * issues inside Server Actions.
 *
 * If RESEND_API_KEY is missing, sendEmail() no-ops and returns { ok: false }.
 * Callers should treat email failures as non-fatal: a booking must succeed
 * even if the confirmation email cannot be delivered.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping email to", opts.to);
    return { ok: false, error: "NOT_CONFIGURED" };
  }

  const from =
    process.env.EMAIL_FROM || "İtokent Urla <onboarding@resend.dev>";

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[email] send failed", res.status, body);
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e: any) {
    console.error("[email] send error", e?.message);
    return { ok: false, error: e?.message || "UNKNOWN" };
  }
}

// ─── Tennis confirmation template ────────────────────────────────────────
type Locale = "tr" | "en";

export function tennisConfirmationEmail(params: {
  locale: Locale;
  userName: string;
  courtName: string;
  dateKey: string; // YYYY-MM-DD
  startHour: number;
}): { subject: string; html: string } {
  const tr = params.locale !== "en";
  const start = `${String(params.startHour).padStart(2, "0")}:00`;
  const end = `${String(params.startHour + 1).padStart(2, "0")}:00`;

  // Use noon so locale formatting doesn't flip to the previous day under any TZ.
  const d = new Date(`${params.dateKey}T12:00:00Z`);
  const dateLabel = new Intl.DateTimeFormat(tr ? "tr-TR" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(d);

  const subject = tr
    ? `Tenis rezervasyonunuz onaylandı · ${dateLabel} · ${start}`
    : `Your tennis booking is confirmed · ${dateLabel} · ${start}`;

  const L = tr
    ? {
        heading: "Rezervasyonunuz Onaylandı",
        greeting: (name: string) => `Merhaba ${name},`,
        intro:
          "Tenis kortu rezervasyonunuz için teşekkür ederiz. Detaylar aşağıdadır:",
        court: "Kort",
        date: "Tarih",
        time: "Saat",
        cancelNote:
          "Rezervasyonunuzu iptal etmek isterseniz, sakin portalı üzerinden yapabilirsiniz.",
        closing: "İyi oyunlar!",
        footer: "İtokent Urla · Sakin Portalı",
      }
    : {
        heading: "Booking Confirmed",
        greeting: (name: string) => `Hello ${name},`,
        intro:
          "Thank you for your tennis court reservation. Here are the details:",
        court: "Court",
        date: "Date",
        time: "Time",
        cancelNote:
          "If you need to cancel, you can do so from the resident portal at any time.",
        closing: "Enjoy your game!",
        footer: "İtokent Urla · Resident Portal",
      };

  const html = `<!DOCTYPE html>
<html lang="${tr ? "tr" : "en"}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f8f4ea;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ea;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#153020 0%,#2f7487 100%);padding:32px 40px;text-align:center;">
              <div style="color:#f8f4ea;font-size:28px;letter-spacing:5px;font-weight:600;font-family:'Cormorant Garamond',Georgia,serif;">İTOKENT</div>
              <div style="color:#e9c96a;font-style:italic;font-size:22px;margin-top:6px;font-family:'Brush Script MT',cursive;">Urla</div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="color:#153020;font-size:24px;margin:0 0 16px;font-weight:normal;font-family:'Cormorant Garamond',Georgia,serif;">
                ${L.heading}
              </h1>
              <p style="color:#4a4a4a;font-size:15px;line-height:1.6;margin:0 0 8px;">
                ${L.greeting(escapeHtml(params.userName))}
              </p>
              <p style="color:#4a4a4a;font-size:15px;line-height:1.6;margin:0 0 24px;">
                ${L.intro}
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ea;border-left:4px solid #c29a44;border-radius:6px;margin:0 0 24px;">
                <tr><td style="padding:20px 24px;">
                  <div style="margin-bottom:14px;">
                    <div style="color:#8b7355;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;">${L.court}</div>
                    <div style="color:#153020;font-size:17px;font-weight:600;margin-top:3px;">${escapeHtml(params.courtName)}</div>
                  </div>
                  <div style="margin-bottom:14px;">
                    <div style="color:#8b7355;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;">${L.date}</div>
                    <div style="color:#153020;font-size:17px;font-weight:600;margin-top:3px;">${escapeHtml(dateLabel)}</div>
                  </div>
                  <div>
                    <div style="color:#8b7355;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;">${L.time}</div>
                    <div style="color:#153020;font-size:17px;font-weight:600;margin-top:3px;">${start} – ${end}</div>
                  </div>
                </td></tr>
              </table>

              <p style="color:#4a4a4a;font-size:14px;line-height:1.6;margin:0 0 28px;">
                ${L.cancelNote}
              </p>

              <p style="color:#4a4a4a;font-size:14px;line-height:1.6;margin:0;">
                ${L.closing}<br/>
                <strong style="color:#153020;">İtokent Urla</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#0a1e13;padding:20px 40px;text-align:center;">
              <div style="color:#a8b7ad;font-size:11px;letter-spacing:1px;font-family:Arial,sans-serif;">${L.footer}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

// ─── Tennis cancellation template ────────────────────────────────────────
export function tennisCancellationEmail(params: {
  locale: Locale;
  userName: string;
  courtName: string;
  dateKey: string;
  startHour: number;
}): { subject: string; html: string } {
  const tr = params.locale !== "en";
  const start = `${String(params.startHour).padStart(2, "0")}:00`;
  const end = `${String(params.startHour + 1).padStart(2, "0")}:00`;

  const d = new Date(`${params.dateKey}T12:00:00Z`);
  const dateLabel = new Intl.DateTimeFormat(tr ? "tr-TR" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(d);

  const subject = tr
    ? `Tenis rezervasyonunuz iptal edildi · ${dateLabel} · ${start}`
    : `Your tennis booking has been cancelled · ${dateLabel} · ${start}`;

  const L = tr
    ? {
        heading: "Rezervasyonunuz İptal Edildi",
        greeting: (n: string) => `Merhaba ${n},`,
        intro:
          "Tenis kortu rezervasyonunuz başarıyla iptal edilmiştir. İptal edilen rezervasyonun detayları aşağıdadır:",
        court: "Kort",
        date: "Tarih",
        time: "Saat",
        rebookNote:
          "Yeni bir rezervasyon yapmak isterseniz, sakin portalı üzerinden her zaman yapabilirsiniz.",
        closing: "İyi günler dileriz.",
        footer: "İtokent Urla · Sakin Portalı",
      }
    : {
        heading: "Booking Cancelled",
        greeting: (n: string) => `Hello ${n},`,
        intro:
          "Your tennis court reservation has been cancelled. Here are the details of the cancelled booking:",
        court: "Court",
        date: "Date",
        time: "Time",
        rebookNote:
          "If you'd like to make a new reservation, you can do so from the resident portal at any time.",
        closing: "Have a good one.",
        footer: "İtokent Urla · Resident Portal",
      };

  const html = `<!DOCTYPE html>
<html lang="${tr ? "tr" : "en"}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f8f4ea;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ea;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(135deg,#153020 0%,#2f7487 100%);padding:32px 40px;text-align:center;">
          <div style="color:#f8f4ea;font-size:28px;letter-spacing:5px;font-weight:600;font-family:'Cormorant Garamond',Georgia,serif;">İTOKENT</div>
          <div style="color:#e9c96a;font-style:italic;font-size:22px;margin-top:6px;font-family:'Brush Script MT',cursive;">Urla</div>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="color:#153020;font-size:24px;margin:0 0 16px;font-weight:normal;font-family:'Cormorant Garamond',Georgia,serif;">${L.heading}</h1>
          <p style="color:#4a4a4a;font-size:15px;line-height:1.6;margin:0 0 8px;">${L.greeting(escapeHtml(params.userName))}</p>
          <p style="color:#4a4a4a;font-size:15px;line-height:1.6;margin:0 0 24px;">${L.intro}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-left:4px solid #b91c1c;border-radius:6px;margin:0 0 24px;">
            <tr><td style="padding:20px 24px;">
              <div style="margin-bottom:14px;"><div style="color:#8b7355;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;">${L.court}</div><div style="color:#7f1d1d;font-size:17px;font-weight:600;margin-top:3px;text-decoration:line-through;">${escapeHtml(params.courtName)}</div></div>
              <div style="margin-bottom:14px;"><div style="color:#8b7355;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;">${L.date}</div><div style="color:#7f1d1d;font-size:17px;font-weight:600;margin-top:3px;text-decoration:line-through;">${escapeHtml(dateLabel)}</div></div>
              <div><div style="color:#8b7355;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;">${L.time}</div><div style="color:#7f1d1d;font-size:17px;font-weight:600;margin-top:3px;text-decoration:line-through;">${start} – ${end}</div></div>
            </td></tr>
          </table>
          <p style="color:#4a4a4a;font-size:14px;line-height:1.6;margin:0 0 28px;">${L.rebookNote}</p>
          <p style="color:#4a4a4a;font-size:14px;line-height:1.6;margin:0;">${L.closing}<br/><strong style="color:#153020;">İtokent Urla</strong></p>
        </td></tr>
        <tr><td style="background:#0a1e13;padding:20px 40px;text-align:center;"><div style="color:#a8b7ad;font-size:11px;letter-spacing:1px;font-family:Arial,sans-serif;">${L.footer}</div></td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, html };
}

// Basic HTML escaping for user-supplied strings injected into the template.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Shared layout helpers ───────────────────────────────────────────────
/** Standard İtokent header (forest→teal gradient). */
function shellHeader(): string {
  return `<tr><td style="background:linear-gradient(135deg,#153020 0%,#2f7487 100%);padding:32px 40px;text-align:center;">
    <div style="color:#f8f4ea;font-size:28px;letter-spacing:5px;font-weight:600;font-family:'Cormorant Garamond',Georgia,serif;">İTOKENT</div>
    <div style="color:#e9c96a;font-style:italic;font-size:22px;margin-top:6px;font-family:'Brush Script MT',cursive;">Urla</div>
  </td></tr>`;
}
function shellFooter(footer: string): string {
  return `<tr><td style="background:#0a1e13;padding:20px 40px;text-align:center;"><div style="color:#a8b7ad;font-size:11px;letter-spacing:1px;font-family:Arial,sans-serif;">${footer}</div></td></tr>`;
}
function wrapShell(bodyInner: string, footer: string, title: string, tr: boolean): string {
  return `<!DOCTYPE html>
<html lang="${tr ? "tr" : "en"}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f8f4ea;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ea;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.06);">
        ${shellHeader()}
        <tr><td style="padding:40px;">${bodyInner}</td></tr>
        ${shellFooter(footer)}
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ─── Restaurant confirmation / cancellation ────────────────────────────
export function restaurantConfirmationEmail(params: {
  locale: Locale;
  userName: string;
  date: Date;
  partySize: number;
  notes?: string | null;
}): { subject: string; html: string } {
  const tr = params.locale !== "en";
  const dateLabel = new Intl.DateTimeFormat(tr ? "tr-TR" : "en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul",
  }).format(params.date);
  const subject = tr
    ? `Restoran rezervasyonunuz onaylandı · ${dateLabel}`
    : `Your restaurant reservation is confirmed · ${dateLabel}`;
  const L = tr
    ? { heading: "Rezervasyonunuz Onaylandı", greeting: (n: string) => `Merhaba ${n},`,
        intro: "Restoran rezervasyonunuz alınmıştır. Detaylar:",
        when: "Zaman", guests: "Kişi sayısı", notesL: "Not",
        closing: "Afiyet olsun!", footer: "İtokent Urla · Sakin Portalı" }
    : { heading: "Reservation Confirmed", greeting: (n: string) => `Hello ${n},`,
        intro: "Your restaurant reservation is confirmed. Details:",
        when: "When", guests: "Guests", notesL: "Note",
        closing: "Enjoy your meal.", footer: "İtokent Urla · Resident Portal" };

  const detail = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ea;border-left:4px solid #c29a44;border-radius:6px;margin:0 0 24px;">
      <tr><td style="padding:20px 24px;">
        <div style="margin-bottom:14px;"><div style="color:#8b7355;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;">${L.when}</div><div style="color:#153020;font-size:17px;font-weight:600;margin-top:3px;">${escapeHtml(dateLabel)}</div></div>
        <div${params.notes ? " style=\"margin-bottom:14px;\"" : ""}><div style="color:#8b7355;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;">${L.guests}</div><div style="color:#153020;font-size:17px;font-weight:600;margin-top:3px;">${params.partySize}</div></div>
        ${params.notes ? `<div><div style="color:#8b7355;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;">${L.notesL}</div><div style="color:#153020;font-size:15px;font-style:italic;margin-top:3px;">"${escapeHtml(params.notes)}"</div></div>` : ""}
      </td></tr>
    </table>`;

  const body = `
    <h1 style="color:#153020;font-size:24px;margin:0 0 16px;font-weight:normal;font-family:'Cormorant Garamond',Georgia,serif;">${L.heading}</h1>
    <p style="color:#4a4a4a;font-size:15px;line-height:1.6;margin:0 0 8px;">${L.greeting(escapeHtml(params.userName))}</p>
    <p style="color:#4a4a4a;font-size:15px;line-height:1.6;margin:0 0 24px;">${L.intro}</p>
    ${detail}
    <p style="color:#4a4a4a;font-size:14px;line-height:1.6;margin:0;">${L.closing}<br/><strong style="color:#153020;">İtokent Urla</strong></p>`;
  return { subject, html: wrapShell(body, L.footer, subject, tr) };
}

export function restaurantCancellationEmail(params: {
  locale: Locale;
  userName: string;
  date: Date;
  partySize: number;
}): { subject: string; html: string } {
  const tr = params.locale !== "en";
  const dateLabel = new Intl.DateTimeFormat(tr ? "tr-TR" : "en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul",
  }).format(params.date);
  const subject = tr
    ? `Restoran rezervasyonunuz iptal edildi · ${dateLabel}`
    : `Your restaurant reservation has been cancelled · ${dateLabel}`;
  const L = tr
    ? { heading: "Rezervasyon İptal Edildi", greeting: (n: string) => `Merhaba ${n},`,
        intro: "Restoran rezervasyonunuz iptal edilmiştir. İptal edilen detaylar:",
        when: "Zaman", guests: "Kişi sayısı",
        rebook: "Yeni bir masa ayırtmak isterseniz sakin portalını kullanabilirsiniz.",
        closing: "İyi günler dileriz.", footer: "İtokent Urla · Sakin Portalı" }
    : { heading: "Reservation Cancelled", greeting: (n: string) => `Hello ${n},`,
        intro: "Your restaurant reservation has been cancelled. Cancelled details:",
        when: "When", guests: "Guests",
        rebook: "If you'd like to book a new table, use the resident portal.",
        closing: "Have a good one.", footer: "İtokent Urla · Resident Portal" };

  const detail = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-left:4px solid #b91c1c;border-radius:6px;margin:0 0 24px;">
      <tr><td style="padding:20px 24px;">
        <div style="margin-bottom:14px;"><div style="color:#8b7355;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;">${L.when}</div><div style="color:#7f1d1d;font-size:17px;font-weight:600;margin-top:3px;text-decoration:line-through;">${escapeHtml(dateLabel)}</div></div>
        <div><div style="color:#8b7355;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;">${L.guests}</div><div style="color:#7f1d1d;font-size:17px;font-weight:600;margin-top:3px;text-decoration:line-through;">${params.partySize}</div></div>
      </td></tr>
    </table>`;
  const body = `
    <h1 style="color:#153020;font-size:24px;margin:0 0 16px;font-weight:normal;font-family:'Cormorant Garamond',Georgia,serif;">${L.heading}</h1>
    <p style="color:#4a4a4a;font-size:15px;line-height:1.6;margin:0 0 8px;">${L.greeting(escapeHtml(params.userName))}</p>
    <p style="color:#4a4a4a;font-size:15px;line-height:1.6;margin:0 0 24px;">${L.intro}</p>
    ${detail}
    <p style="color:#4a4a4a;font-size:14px;line-height:1.6;margin:0 0 28px;">${L.rebook}</p>
    <p style="color:#4a4a4a;font-size:14px;line-height:1.6;margin:0;">${L.closing}<br/><strong style="color:#153020;">İtokent Urla</strong></p>`;
  return { subject, html: wrapShell(body, L.footer, subject, tr) };
}

// ─── Event RSVP confirmation / cancellation ────────────────────────────
export function eventRsvpEmail(params: {
  locale: Locale;
  userName: string;
  eventTitle: string;
  startsAt: Date;
  endsAt: Date;
  location: string;
  hasFee: boolean;
}): { subject: string; html: string } {
  const tr = params.locale !== "en";
  const dateLabel = new Intl.DateTimeFormat(tr ? "tr-TR" : "en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul",
  }).format(params.startsAt);
  const subject = tr
    ? `Etkinlik katılımınız kaydedildi · ${params.eventTitle}`
    : `Your RSVP is recorded · ${params.eventTitle}`;
  const L = tr
    ? { heading: "Katılımınız Kaydedildi", greeting: (n: string) => `Merhaba ${n},`,
        intro: `"${params.eventTitle}" etkinliğine katılımınız alınmıştır.`,
        when: "Zaman", where: "Yer",
        payHint: "Yerinizi kesinleştirmek için lütfen portal üzerinden ödemeyi tamamlayın.",
        closing: "Görüşmek üzere!", footer: "İtokent Urla · Sakin Portalı" }
    : { heading: "You're On the Guest List", greeting: (n: string) => `Hello ${n},`,
        intro: `Your RSVP for "${params.eventTitle}" has been recorded.`,
        when: "When", where: "Where",
        payHint: "Please complete your payment in the portal to secure your spot.",
        closing: "See you there!", footer: "İtokent Urla · Resident Portal" };

  const detail = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ea;border-left:4px solid #c29a44;border-radius:6px;margin:0 0 24px;">
      <tr><td style="padding:20px 24px;">
        <div style="margin-bottom:14px;"><div style="color:#8b7355;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;">${L.when}</div><div style="color:#153020;font-size:17px;font-weight:600;margin-top:3px;">${escapeHtml(dateLabel)}</div></div>
        <div><div style="color:#8b7355;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;">${L.where}</div><div style="color:#153020;font-size:17px;font-weight:600;margin-top:3px;">${escapeHtml(params.location)}</div></div>
      </td></tr>
    </table>`;
  const body = `
    <h1 style="color:#153020;font-size:24px;margin:0 0 16px;font-weight:normal;font-family:'Cormorant Garamond',Georgia,serif;">${L.heading}</h1>
    <p style="color:#4a4a4a;font-size:15px;line-height:1.6;margin:0 0 8px;">${L.greeting(escapeHtml(params.userName))}</p>
    <p style="color:#4a4a4a;font-size:15px;line-height:1.6;margin:0 0 24px;">${L.intro}</p>
    ${detail}
    ${params.hasFee ? `<p style="color:#b45309;font-size:14px;line-height:1.6;margin:0 0 28px;">⚠ ${L.payHint}</p>` : ""}
    <p style="color:#4a4a4a;font-size:14px;line-height:1.6;margin:0;">${L.closing}<br/><strong style="color:#153020;">İtokent Urla</strong></p>`;
  return { subject, html: wrapShell(body, L.footer, subject, tr) };
}

export function eventRsvpCancelEmail(params: {
  locale: Locale;
  userName: string;
  eventTitle: string;
  startsAt: Date;
}): { subject: string; html: string } {
  const tr = params.locale !== "en";
  const dateLabel = new Intl.DateTimeFormat(tr ? "tr-TR" : "en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul",
  }).format(params.startsAt);
  const subject = tr
    ? `Etkinlik katılımınız iptal edildi · ${params.eventTitle}`
    : `Your RSVP has been cancelled · ${params.eventTitle}`;
  const L = tr
    ? { heading: "Katılımınız İptal Edildi", greeting: (n: string) => `Merhaba ${n},`,
        intro: `"${params.eventTitle}" etkinliği için katılımınız iptal edilmiştir.`,
        when: "Zaman",
        rebook: "Fikrinizi değiştirirseniz portaldan tekrar katılım bildirebilirsiniz.",
        closing: "İyi günler.", footer: "İtokent Urla · Sakin Portalı" }
    : { heading: "RSVP Cancelled", greeting: (n: string) => `Hello ${n},`,
        intro: `Your RSVP for "${params.eventTitle}" has been cancelled.`,
        when: "When",
        rebook: "You can re-RSVP from the portal at any time.",
        closing: "Take care.", footer: "İtokent Urla · Resident Portal" };
  const detail = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-left:4px solid #b91c1c;border-radius:6px;margin:0 0 24px;">
      <tr><td style="padding:20px 24px;">
        <div><div style="color:#8b7355;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;">${L.when}</div><div style="color:#7f1d1d;font-size:17px;font-weight:600;margin-top:3px;text-decoration:line-through;">${escapeHtml(dateLabel)}</div></div>
      </td></tr>
    </table>`;
  const body = `
    <h1 style="color:#153020;font-size:24px;margin:0 0 16px;font-weight:normal;font-family:'Cormorant Garamond',Georgia,serif;">${L.heading}</h1>
    <p style="color:#4a4a4a;font-size:15px;line-height:1.6;margin:0 0 8px;">${L.greeting(escapeHtml(params.userName))}</p>
    <p style="color:#4a4a4a;font-size:15px;line-height:1.6;margin:0 0 24px;">${L.intro}</p>
    ${detail}
    <p style="color:#4a4a4a;font-size:14px;line-height:1.6;margin:0 0 28px;">${L.rebook}</p>
    <p style="color:#4a4a4a;font-size:14px;line-height:1.6;margin:0;">${L.closing}<br/><strong style="color:#153020;">İtokent Urla</strong></p>`;
  return { subject, html: wrapShell(body, L.footer, subject, tr) };
}

// ─── Broadcast: new event / new announcement ────────────────────────────
/** Newsletter-style broadcast email. `body` is plain text, rendered safely. */
export function broadcastEmail(params: {
  locale: Locale;
  userName: string;
  kind: "event" | "announcement";
  title: string;
  body: string;
  eventMeta?: { startsAt: Date; location: string; feeDisplay?: string | null };
}): { subject: string; html: string } {
  const tr = params.locale !== "en";
  const L = tr
    ? { eventNew: "Yeni Etkinlik", annNew: "Yeni Duyuru",
        greeting: (n: string) => `Merhaba ${n},`,
        when: "Zaman", where: "Yer", fee: "Ücret",
        cta: "Portalda görüntüle", footer: "İtokent Urla · Sakin Portalı" }
    : { eventNew: "New Event", annNew: "New Announcement",
        greeting: (n: string) => `Hello ${n},`,
        when: "When", where: "Where", fee: "Fee",
        cta: "View in portal", footer: "İtokent Urla · Resident Portal" };

  const kindLabel = params.kind === "event" ? L.eventNew : L.annNew;
  const subject = `${kindLabel} · ${params.title}`;

  const dateLabel = params.eventMeta
    ? new Intl.DateTimeFormat(tr ? "tr-TR" : "en-GB", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul",
      }).format(params.eventMeta.startsAt)
    : null;

  const meta = params.eventMeta
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ea;border-left:4px solid #c29a44;border-radius:6px;margin:0 0 24px;">
         <tr><td style="padding:20px 24px;">
           <div style="margin-bottom:14px;"><div style="color:#8b7355;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;">${L.when}</div><div style="color:#153020;font-size:17px;font-weight:600;margin-top:3px;">${escapeHtml(dateLabel!)}</div></div>
           <div${params.eventMeta.feeDisplay ? " style=\"margin-bottom:14px;\"" : ""}><div style="color:#8b7355;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;">${L.where}</div><div style="color:#153020;font-size:17px;font-weight:600;margin-top:3px;">${escapeHtml(params.eventMeta.location)}</div></div>
           ${params.eventMeta.feeDisplay ? `<div><div style="color:#8b7355;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;">${L.fee}</div><div style="color:#153020;font-size:17px;font-weight:600;margin-top:3px;">${escapeHtml(params.eventMeta.feeDisplay)}</div></div>` : ""}
         </td></tr>
       </table>`
    : "";

  const bodyHtml = escapeHtml(params.body).replace(/\n/g, "<br/>");
  const tag = params.kind === "event" ? "#e9c96a" : "#2f7487";
  const bodyInner = `
    <div style="display:inline-block;background:${tag};color:#153020;font-size:11px;letter-spacing:2px;text-transform:uppercase;padding:4px 10px;border-radius:999px;font-family:Arial,sans-serif;margin-bottom:14px;">${kindLabel}</div>
    <h1 style="color:#153020;font-size:24px;margin:0 0 16px;font-weight:normal;font-family:'Cormorant Garamond',Georgia,serif;">${escapeHtml(params.title)}</h1>
    <p style="color:#4a4a4a;font-size:15px;line-height:1.6;margin:0 0 16px;">${L.greeting(escapeHtml(params.userName))}</p>
    ${meta}
    <div style="color:#4a4a4a;font-size:15px;line-height:1.7;margin:0 0 28px;">${bodyHtml}</div>
    <p style="color:#4a4a4a;font-size:14px;line-height:1.6;margin:0;"><strong style="color:#153020;">İtokent Urla</strong></p>`;
  return { subject, html: wrapShell(bodyInner, L.footer, subject, tr) };
}
