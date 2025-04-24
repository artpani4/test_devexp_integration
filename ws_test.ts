// ws_test_multi.ts

const WS_URL = "ws://art.localhost:4000";
const NUM_CLIENTS = 50;
const MAX_MESSAGES = 100;

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function createClient(id: string) {
  const socket = new WebSocket(WS_URL);
  socket.binaryType = "arraybuffer";

  let counter = 0;

  socket.onopen = () => {
    console.log(`[${id}] ✅ connected`);
    const interval = setInterval(() => {
      if (counter >= MAX_MESSAGES) {
        clearInterval(interval);
        socket.close();
        return;
      }

      const msg = `[${id}] ping #${counter + 1}`;
      socket.send(new TextEncoder().encode(msg));
      console.log(`[${id}] 📤 sent: ${msg}`);
      counter++;
    }, 500 + Math.random() * 200); // чуть разное время для разброса
  };

  socket.onmessage = async (e) => {
    let data: Uint8Array;

    if (typeof e.data === "string") {
      data = new TextEncoder().encode(e.data);
    } else if (e.data instanceof Blob) {
      data = new Uint8Array(await e.data.arrayBuffer());
    } else if (e.data instanceof ArrayBuffer) {
      data = new Uint8Array(e.data);
    } else {
      console.warn(`[${id}] ❓ Unsupported data type`);
      return;
    }

    const text = new TextDecoder().decode(data);
    console.log(`[${id}] 📥 received: "${text}" (${data.length} bytes)`);
  };

  socket.onclose = () => {
    console.log(`[${id}] ❌ disconnected`);
  };

  socket.onerror = (e) => {
    console.error(`[${id}] ❌ error`, e);
  };
}

for (let i = 0; i < NUM_CLIENTS; i++) {
  const id = crypto.randomUUID().slice(0, 6);
  createClient(id);
  await delay(250); // разброс старта клиентов
}
