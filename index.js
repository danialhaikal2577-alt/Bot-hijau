const { default: makeWASocket, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const pino = require('pino');

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);

  if (!sock.authState.creds.registered) {
    const num = "601121007038";
    setTimeout(async () => {
      const code = await sock.requestPairingCode(num);
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
    const text = (m.message.conversation || m.message.extendedTextMessage?.text || "").trim().toLowerCase();
    console.log("MESEJ MASUK:", text, "dari", from);

    if (text === '.menu' || text === 'menu' || text === 'hi' || text === '.hi' || text === 'bot') {
      await sock.sendMessage(from, { text: "BOT HD ✅\n\nHantar VIDEO kat sini, aku hantar balik jadi HD tak pecah!" });
      return;
    }

    if (m.message.videoMessage) {
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
