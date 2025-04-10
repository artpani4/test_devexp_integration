const ws = new WebSocket("https://art.localhost:4000");

ws.onmessage = (e) => console.log("FROM SERVER:", e.data);
ws.onopen = () => {
  console.log("открыл!");
};

ws.onerror = (e) => {
  console.log("ERROR:", e);
};
