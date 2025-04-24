import { Application, Context, Router } from "@oak/oak";
import ChatServer from "./ChatServer.ts";

const app = new Application();
const router = new Router();
const chat = new ChatServer();

router.get("/start_web_socket", (ctx: Context) => chat.handleConnection(ctx));

app.use(router.routes());
app.use(router.allowedMethods());
app.use(async (ctx) => {
  await ctx.send({
    root: `${Deno.cwd()}/public`,
    index: "index.html",
  });
});

console.log("🚀 Chat app running at http://localhost:3000");
await app.listen({ port: 3000 });
