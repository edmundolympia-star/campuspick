type EmailMessage = {
  subject: string;
  text: string;
  html?: string;
};

function emailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_EMAIL_FROM || "CampusPick <onboarding@resend.dev>";
  const to = process.env.ALERT_EMAIL_TO;
  if (!apiKey || !to) return null;
  return { apiKey, from, to };
}

export async function sendEmailNotification(message: EmailMessage) {
  const config = emailConfig();
  if (!config) return { skipped: true };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: config.from,
      to: [config.to],
      subject: message.subject,
      text: message.text,
      html: message.html
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Email notification failed", payload);
    return { error: payload };
  }

  return { ok: true };
}
