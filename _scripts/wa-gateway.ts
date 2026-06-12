import express from "express";
import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const app = express();
app.use(express.json());

const PORT = 8000;
const GATEWAY_API_KEY = process.env.WA_GATEWAY_API_KEY;

// Middleware to verify API key — fail CLOSED if not configured
app.use((req, res, next) => {
  if (!GATEWAY_API_KEY) {
    console.error("[GATEWAY] FATAL: WA_GATEWAY_API_KEY is not set. Refusing all requests.");
    return res.status(503).json({ error: "Gateway not configured: WA_GATEWAY_API_KEY missing" });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${GATEWAY_API_KEY}`) {
    console.warn(`[GATEWAY WARNING] Unauthenticated request to ${req.path}`);
    return res.status(401).json({ error: "Unauthorized: Invalid API Key" });
  }
  next();
});

// =========================================================================
// WhatsApp Client Factory
// Creates a fresh Client instance every time it's called.
// This is the correct pattern because client.destroy() permanently kills the
// underlying Puppeteer browser process — the old instance cannot be reused.
// =========================================================================

let activeClient: Client | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY_MS = 60_000;

function createClientOptions() {
  return {
    authStrategy: new LocalAuth({ dataPath: ".wwebjs_auth" }),
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    puppeteer: {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    },
  };
}

function initWhatsAppClient() {
  const client = new Client(createClientOptions());
  activeClient = client;

  // --- Lifecycle Events ---

  client.on("loading_screen", (percent, message) => {
    console.log(`[GATEWAY] Memuat halaman WhatsApp Web: ${percent}% - ${message}`);
  });

  client.on("qr", (qr) => {
    console.log("\n========================================================");
    console.log("PINDAI QR CODE DI BAWAH INI DENGAN WHATSAPP HP ANDA:");
    console.log("========================================================\n");
    qrcode.generate(qr, { small: true });
  });

  client.on("authenticated", () => {
    console.log("[GATEWAY] Autentikasi berhasil, sinkronisasi data...");
  });

  client.on("auth_failure", (msg) => {
    console.error("[GATEWAY ERROR] Autentikasi gagal:", msg);
    // Auth failures may be unrecoverable without a new QR scan — log and wait.
  });

  client.on("change_state", (state) => {
    console.log(`[GATEWAY] State koneksi berubah: ${state}`);
  });

  client.on("ready", () => {
    reconnectAttempts = 0; // reset backoff counter on successful connection
    console.log("\n========================================================");
    console.log("GATEWAY WHATSAPP SIAP & BERHASIL LOGIN!");
    if (client.info) {
      console.log(`Login sebagai: ${client.info.wid.user} (${client.info.pushname})`);
    }
    console.log("========================================================\n");
  });

  client.on("disconnected", async (reason) => {
    reconnectAttempts++;
    // Exponential backoff: 10s, 20s, 40s, … capped at MAX_RECONNECT_DELAY_MS
    const delay = Math.min(10_000 * Math.pow(2, reconnectAttempts - 1), MAX_RECONNECT_DELAY_MS);
    console.log(
      `[GATEWAY] Klien terputus (disconnected): ${reason}. ` +
      `Percobaan ke-${reconnectAttempts}, mencoba ulang dalam ${delay / 1000}s...`
    );

    // Destroy the dead instance cleanly, then create a brand-new Client.
    try {
      await client.destroy();
    } catch (e) {
      console.error("[GATEWAY ERROR] Gagal menutup klien lama:", e);
    }
    activeClient = null;

    setTimeout(() => {
      console.log("[GATEWAY] Membuat instance client baru...");
      initWhatsAppClient();
    }, delay);
  });

  // --- Start Initialization ---
  client.initialize().catch((err) => {
    console.error("[GATEWAY ERROR] Gagal inisialisasi client:", err);
  });
}

// =========================================================================
// Express API Endpoints
// All endpoints read from `activeClient` so they always use the live instance.
// =========================================================================

// GET /status — health check
app.get("/status", (req, res) => {
  if (activeClient?.info) {
    return res.json({
      ready: true,
      user: activeClient.info.wid.user,
      pushname: activeClient.info.pushname,
      platform: activeClient.info.platform,
    });
  }
  return res.json({ ready: false, message: "Client not ready yet" });
});

// GET /check-number/:phone — verify if a number is on WhatsApp
app.get("/check-number/:phone", async (req, res) => {
  if (!activeClient?.info) {
    return res.status(503).json({ error: "Gateway not ready. Try again shortly." });
  }

  const phone = req.params.phone;
  let formattedPhone = phone.replace(/[^0-9]/g, "");
  if (formattedPhone.startsWith("0")) {
    formattedPhone = "62" + formattedPhone.slice(1);
  } else if (formattedPhone.startsWith("8")) {
    formattedPhone = "62" + formattedPhone;
  }
  const jid = `${formattedPhone}@c.us`;

  try {
    const isRegistered = await activeClient.isRegisteredUser(jid);
    return res.json({ phone, jid, isRegistered });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /send-message — send a WhatsApp message
app.post("/send-message", async (req, res) => {
  if (!activeClient?.info) {
    return res.status(503).json({ error: "Gateway not ready. Try again shortly." });
  }

  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: "Parameter 'to' dan 'message' wajib diisi." });
  }

  try {
    let formattedPhone = to.replace(/[^0-9]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "62" + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith("8")) {
      formattedPhone = "62" + formattedPhone;
    }
    const jid = `${formattedPhone}@c.us`;

    await activeClient.sendMessage(jid, message);
    console.log(`[GATEWAY] Pesan berhasil dikirim ke: ${jid}`);
    return res.status(200).json({ success: true, target: jid });
  } catch (error) {
    console.error("[GATEWAY ERROR] Gagal mengirim pesan:", error);
    return res.status(500).json({ error: "Gagal mengirim pesan melalui WhatsApp Web." });
  }
});

// =========================================================================
// Bootstrap
// =========================================================================
app.listen(PORT, () => {
  console.log(`Gateway API server berjalan di http://localhost:${PORT}`);
  console.log("Menghubungkan ke WhatsApp Web...");
  initWhatsAppClient();
});
