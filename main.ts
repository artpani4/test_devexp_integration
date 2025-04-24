// // main.ts
// import luminous from "@vseplet/luminous";

// const log = new luminous.Logger(
//   new luminous.OptionsBuilder().setName("TEST_SERVER").build(),
// );

// log.inf(`🧪 Server listening on http://localhost:3000 and ws://localhost:3000`);

// Deno.serve({ port: 3000 }, async (req: Request): Promise<Response> => {
//   const upgrade = req.headers.get("upgrade")?.toLowerCase();

//   // 🌀 WebSocket: Upgrade
//   if (upgrade === "websocket") {
//     const { socket, response } = Deno.upgradeWebSocket(req);
//     socket.binaryType = "arraybuffer";

//     log.inf(`[ws] Client connected`);

//     let handshakeDone = false;

//     socket.onmessage = async (event) => {
//       const raw = event.data instanceof ArrayBuffer
//         ? new Uint8Array(event.data)
//         : new TextEncoder().encode(event.data);

//       const newlineIndex = raw.indexOf(10);

//       if (!handshakeDone && newlineIndex !== -1) {
//         const metaStr = new TextDecoder().decode(raw.slice(0, newlineIndex))
//           .trim();
//         const body = raw.slice(newlineIndex + 1);
//         const bodyStr = new TextDecoder().decode(body);

//         let meta;
//         try {
//           meta = JSON.parse(metaStr);
//         } catch (err) {
//           log.err(`[ws] ❌ Failed to parse handshake meta`, err as Error);
//           return;
//         }

//         log.inf(`[ws] 🤝 Handshake meta: ${metaStr}`);
//         log.inf(`[ws] 🤝 Handshake body: ${bodyStr}`);

//         const responseMeta = {
//           id: meta.id,
//           status: 200,
//           headers: { "content-type": "text/plain" },
//         };
//         const metaBytes = new TextEncoder().encode(
//           JSON.stringify(responseMeta) + "\n",
//         );
//         const bodyBytes = new TextEncoder().encode(
//           `pong from WS (got: ${bodyStr})`,
//         );
//         const packet = new Uint8Array(metaBytes.length + bodyBytes.length);
//         packet.set(metaBytes);
//         packet.set(bodyBytes, metaBytes.length);

//         socket.send(packet);
//         handshakeDone = true;
//         return;
//       }

//       // 🔁 After handshake: echo
//       const msg = new TextDecoder().decode(raw);
//       log.inf(`[ws] Echoing message: ${msg}`);
//       socket.send(new TextEncoder().encode(`pong: ${msg}`));
//     };

//     socket.onclose = () => {
//       log.inf(`[ws] Client disconnected`);
//     };

//     return response;
//   }

//   // 🌍 HTTP: simple echo handler
//   const url = new URL(req.url);
//   const method = req.method;
//   const body = await req.text();

//   log.inf(`[http] ${method} ${url.pathname} — Body: ${body}`);
//   return new Response(`pong from HTTP server, got: ${body}`, {
//     status: 200,
//     headers: { "content-type": "text/plain" },
//   });
// });

Deno.serve((_req) => {
  return new Response(JSON.stringify(Deno.env.toObject(), null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
