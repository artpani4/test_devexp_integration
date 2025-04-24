// server.ts
import { Hono } from "https://deno.land/x/hono@v3.12.4/mod.ts";
import { serveStatic } from "https://deno.land/x/hono@v3.12.4/middleware.ts";

const clients = new Set<WebSocket>();

const app = new Hono();

// Статичная страница на /
app.get("/", serveStatic({ root: "./public/" }));

// Обработка WebSocket-подключений
app.get("/ws", (c) => {
  const { socket, response } = Deno.upgradeWebSocket(c.req.raw);

  socket.onopen = () => clients.add(socket);
  socket.onclose = () => clients.delete(socket);

  socket.onmessage = (e) => {
    for (const client of clients) {
      if (client !== socket) client.send(e.data);
    }
  };

  return response;
});

// Стартуем сервер на Deno.serve
Deno.serve({ port: 3000 }, app.fetch);
