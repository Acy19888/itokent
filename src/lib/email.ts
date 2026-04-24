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
        <tr><td style="background:linear-gradient(135deg,#7f1d1d 0%,#991b1b 100%);padding:32px 40px;text-align:center;">
          <div style="color:#f8f4ea;font-size:28px;letter-spacing:5px;font-weight:600;font-family:'Cormorant Garamond',Georgia,serif;">İTOKENT</div>
          <div style="color:#fecaca;font-style:italic;font-size:22px;margin-top:6px;font-family:'Brush Script MT',cursive;">Urla</div>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="color:#7f1d1d;font-size:24px;margin:0 0 16px;font-weight:normal;font-family:'Cormorant Garamond',Georgia,serif;">${L.heading}</h1>
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
