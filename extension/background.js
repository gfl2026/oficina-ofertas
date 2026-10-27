// Oficina de Ofertas — background service worker
// Faz as chamadas pro Supabase (fora do content script pra não cair em bloqueio de CORS
// na origem do facebook.com — o background tem host_permissions pro domínio do Supabase).

const SUPABASE_URL = "https://gnqsgfnsqretbppogvqm.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImducXNnZm5zcXJldGJwcG9ndnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4OTk1MDksImV4cCI6MjEwODQ3NTUwOX0.hz8086i8gTei1dHOwnBkGK9KLPaPfDwB6OHdZfvA25Y";

function offersHeaders(extra) {
  return Object.assign(
    {
      apikey: SUPABASE_KEY,
      Authorization: "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json",
    },
    extra || {}
  );
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "SAVE_OFFER") {
    const row = Object.assign(
      {
        id:
          (self.crypto && self.crypto.randomUUID && self.crypto.randomUUID()) ||
          String(Date.now()) + "-" + Math.random().toString(16).slice(2),
        created_at: Date.now(),
        is_example: false,
      },
      msg.payload
    );

    fetch(SUPABASE_URL + "/rest/v1/offers", {
      method: "POST",
      headers: offersHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify(row),
    })
      .then(async (r) => {
        const text = await r.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (_e) {
          data = text;
        }
        if (!r.ok) {
          sendResponse({ ok: false, error: (data && data.message) || text || ("HTTP " + r.status) });
          return;
        }
        sendResponse({ ok: true, data });
      })
      .catch((err) => sendResponse({ ok: false, error: String(err) }));

    return true; // resposta assíncrona
  }

  if (msg && msg.type === "GET_NICHES") {
    fetch(SUPABASE_URL + "/rest/v1/offers?select=niche", {
      headers: offersHeaders(),
    })
      .then((r) => r.json())
      .then((rows) => {
        const niches = Array.from(
          new Set((rows || []).map((r) => r.niche).filter(Boolean))
        ).sort();
        sendResponse({ ok: true, niches });
      })
      .catch((err) => sendResponse({ ok: false, error: String(err) }));

    return true;
  }
});
