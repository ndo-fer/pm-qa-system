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

// Inisialisasi klien WA dengan opsi yang lebih kompatibel
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: ".wwebjs_auth"
  }),
  // Menentukan userAgent modern untuk menghindari blokir/hang WhatsApp Web
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ]
  }
});

// Event ketika halaman sedang memuat
client.on("loading_screen", (percent, message) => {
  console.log(`[GATEWAY] Memuat halaman WhatsApp Web: ${percent}% - ${message}`);
});

// Event ketika QR Code digenerate untuk discan
client.on("qr", (qr) => {
  console.log("\n========================================================");
  console.log("PINDAI QR CODE DI BAWAH INI DENGAN WHATSAPP HP ANDA:");
  console.log("========================================================\n");
  qrcode.generate(qr, { small: true });
});

// Event ketika berhasil diautentikasi (sebelum siap)
client.on("authenticated", () => {
  console.log("[GATEWAY] Autentikasi berhasil, sinkronisasi data...");
});

// Event ketika autentikasi gagal
client.on("auth_failure", (msg) => {
  console.error("[GATEWAY ERROR] Autentikasi gagal:", msg);
});

// Event ketika state koneksi berubah
client.on("change_state", (state) => {
  console.log(`[GATEWAY] State koneksi berubah: ${state}`);
});

// Event ketika terputus
client.on("disconnected", async (reason) => {
  console.log(`[GATEWAY] Klien terputus (disconnected): ${reason}. Mencoba inisialisasi ulang dalam 10 detik...`);
  try {
    await client.destroy();
  } catch (e) {
    console.error("[GATEWAY ERROR] Gagal menutup klien lama:", e);
  }
  setTimeout(() => {
    client.initialize().catch((err) => {
      console.error("[GATEWAY ERROR] Gagal inisialisasi ulang client:", err);
    });
  }, 10000);
});

// Event ketika berhasil login dan siap digunakan
client.on("ready", () => {
  console.log("\n========================================================");
  console.log("GATEWAY WHATSAPP SIAP & BERHASIL LOGIN!");
  if (client.info) {
    console.log(`Login sebagai: ${client.info.wid.user} (${client.info.pushname})`);
  }
  console.log("========================================================\n");
});

// GET status endpoint
app.get("/status", (req, res) => {
  if (client.info) {
    return res.json({
      ready: true,
      user: client.info.wid.user,
      pushname: client.info.pushname,
      platform: client.info.platform
    });
  }
  return res.json({ ready: false, message: "Client not ready yet" });
});

// GET check number registration endpoint
app.get("/check-number/:phone", async (req, res) => {
  const phone = req.params.phone;
  let formattedPhone = phone.replace(/[^0-9]/g, "");
  if (formattedPhone.startsWith("0")) {
    formattedPhone = "62" + formattedPhone.slice(1);
  } else if (formattedPhone.startsWith("8")) {
    formattedPhone = "62" + formattedPhone;
  }
  const jid = `${formattedPhone}@c.us`;
  try {
    const isRegistered = await client.isRegisteredUser(jid);
    return res.json({ phone, jid, isRegistered });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// API Endpoint untuk menerima instruksi pengiriman pesan dari Next.js
app.post("/send-message", async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: "Parameter 'to' dan 'message' wajib diisi." });
  }

  try {
    // Format nomor HP agar sesuai format WhatsApp JID
    let formattedPhone = to.replace(/[^0-9]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "62" + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith("8")) {
      formattedPhone = "62" + formattedPhone;
    }
    const jid = `${formattedPhone}@c.us`;

    // Kirim pesan
    await client.sendMessage(jid, message);
    console.log(`[GATEWAY] Pesan berhasil dikirim ke: ${jid}`);
    return res.status(200).json({ success: true, target: jid });
  } catch (error) {
    console.error("[GATEWAY ERROR] Gagal mengirim pesan:", error);
    return res.status(500).json({ error: "Gagal mengirim pesan melalui WhatsApp Web." });
  }
});

// Mulai server API dan Klien WhatsApp
app.listen(PORT, () => {
  console.log(`Gateway API server berjalan di http://localhost:${PORT}`);
  console.log("Menghubungkan ke WhatsApp Web...");
  client.initialize().catch((err) => {
    console.error("[GATEWAY ERROR] Gagal inisialisasi client:", err);
  });
});
