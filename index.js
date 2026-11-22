const { default: makeWASocket, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http');

// Ni untuk Render jangan kill bot
http.createServer((req, res) => res.end("BOT HD HIDUP")).listen(process.env.PORT || 10000);

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);

  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      const code = await sock.requestPairingCode("601121007038");
      console.log("PAIRING CODE:", code);
    }, 3000);
  }

  sock.ev.on('connection.update', (u) => {
    if (u.connection === 'open') console.log("BOT CONNECTED!");
    if (u.connection === 'close') start();
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message) return;
    const from = m.key.remoteJid;
    
    // Baca teks dari semua jenis mesej
    let msg = m.message;
    if (msg.ephemeralMessage) msg = msg.ephemeralMessage.message;
    if (msg.viewOnceMessage) msg = msg.viewOnceMessage.message;
    const text = (msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption || "").trim().toLowerCase();
    console.log("MESEJ MASUK:", text, "dari", from);

    if (text === '.menu' || text === 'menu' || text === 'hi' || text === '.hi' || text === 'bot') {
      await sock.sendMessage(from, { text: "BOT HD ✅\n\nHantar VIDEO kat sini, aku hantar balik jadi HD tak pecah!" });
      return;
    }

    if (msg.videoMessage) {
      await sock.sendMessage(from, { text: "Tengah jadikan HD... jap..." });
      try {
        const buffer = await downloadMediaMessage(m, 'buffer', {});
        await sock.sendMessage(from, {
          document: buffer,
          fileName: `HD_${Date.now()}.mp4`,
          mimetype: 'video/mp4',
          caption: "Siap! Ni video HD, tak pecah ✅"
        });
      } catch (e) {
        console.log(e);
        await sock.sendMessage(from, { text: "Gagal. Video besar sangat, cuba bawah 50MB." });
      }
    }
  });
}
start();
