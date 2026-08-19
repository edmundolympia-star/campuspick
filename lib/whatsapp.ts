type WhatsAppMessage = {
  body: string;
};

function whatsappConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const to = process.env.WHATSAPP_TO;
  const graphVersion = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";
  if (!accessToken || !phoneNumberId || !to) return null;
  return { accessToken, phoneNumberId, to, graphVersion };
}

export function hasWhatsAppConfig() {
  return Boolean(whatsappConfig());
}

export async function sendWhatsAppNotification(message: WhatsAppMessage) {
  const config = whatsappConfig();
  if (!config) return { skipped: true };

  const response = await fetch(`https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: config.to,
      type: "text",
      text: {
        preview_url: false,
        body: message.body
      }
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("WhatsApp notification failed", payload);
    return { error: payload };
  }

  return { ok: true };
}
