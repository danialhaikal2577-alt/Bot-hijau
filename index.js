

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('session');
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ["Ubuntu", "Chrome", "20.0.04"]
  });
  sock.ev.on('creds.update', saveCreds);

  if (!sock.authState.creds.registered) {
    const num = "601121007038";
    setTimeout(async () => {
      try {
        let code = await sock.requestPairingCode(num);
        console.log("PAIRING CODE KAU: " + code);
      } catch (e) { console.log("Gagal minta code: " + e.message); }
    }, 3000);
  }

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const m = messages[0];
      if (!m.message || m.key.fromMe) return;
      const from = m.key.remoteJid;
      const msg = m.message;
      const type = Object.keys(msg)[0];
      const isDoc = type === 'documentMessage';
      const isVideo = type === 'videoMessage';
      if (!isDoc && !isVideo) return;
      const content = msg[type];
      const fileName = content.fileName || `file_${Date.now()}`;
      const fileSize = content.fileLength ? Number(content.fileLength) : 0;
      await sock.sendMessage(from, { text: `📥 Downloading: ${fileName}\nSize: ${(fileSize / 1024 / 1024).toFixed(2)} MB\nTunggu...` }, { quoted: m });
      const stream = await downloadContentFromMessage(content, type.replace('Message', ''));
      let buffer = Buffer.from([]);
      for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }
      const savePath = path.join(__dirname, fileName);
      fs.writeFileSync(savePath, buffer);
      await sock.sendMessage(from, { text: `✅ Siap! File ${fileName} dah save kat server.\nSize: ${(buffer.length / 1024 / 1024).toFixed(2)} MB` }, { quoted: m });
    } catch (e) { console.log("Error download: " + e.message); }
  });

  sock.ev.on('connection.update', (u) => {
    if (u.connection === 'open') console.log("BOT DAH CONNECT!");
    if (u.connection === 'close') start();
  });
}
start();
