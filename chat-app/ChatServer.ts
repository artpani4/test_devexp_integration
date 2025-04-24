import { Context } from "@oak/oak";

type WebSocketWithUsername = WebSocket & { username: string };
type AppEvent = { event: string; [key: string]: any };

export default class ChatServer {
  private connectedClients = new Map<string, WebSocketWithUsername>();

  public async handleConnection(ctx: Context) {
    const socket = await ctx.upgrade() as WebSocketWithUsername;
    const username = ctx.request.url.searchParams.get("username");

    if (!username || this.connectedClients.has(username)) {
      socket.close(1008, `Username ${username} is already taken or invalid`);
      return;
    }

    socket.username = username;
    socket.onopen = this.broadcastUsernames.bind(this);
    socket.onclose = () => {
      this.connectedClients.delete(username);
      this.broadcastUsernames();
    };
    socket.onmessage = (msg) => this.sendMessage(socket.username, msg);

    this.connectedClients.set(username, socket);
    console.log(`🔗 Client connected: ${username}`);
  }

  private async sendMessage(sender: string, msg: MessageEvent) {
    let text = "";

    if (typeof msg.data === "string") {
      text = msg.data;
    } else if (msg.data instanceof ArrayBuffer) {
      text = new TextDecoder().decode(msg.data);
    } else if (msg.data instanceof Blob) {
      text = await msg.data.text();
    } else {
      console.warn("Unknown message data type:", typeof msg.data);
      return;
    }

    const data = JSON.parse(text);
    if (data.event !== "send-message") return;

    this.broadcast({
      event: "send-message",
      username: sender,
      message: data.message,
    });
  }

  private broadcastUsernames() {
    const usernames = [...this.connectedClients.keys()];
    this.broadcast({ event: "update-users", usernames });
  }

  private broadcast(data: AppEvent) {
    const json = JSON.stringify(data);
    for (const client of this.connectedClients.values()) {
      client.send(json);
    }
  }
}
