const myUsername = prompt("Enter your name:") || "Anonymous";
const url = new URL(
  `/start_web_socket?username=${myUsername}`,
  "ws://chat.localhost:4000",
);
url.protocol = url.protocol.replace("http", "ws");

const socket = new WebSocket(url);

socket.onmessage = async (event) => {
  let text = "";
  if (typeof event.data === "string") {
    text = event.data;
  } else if (event.data instanceof Blob) {
    text = await event.data.text();
  } else if (event.data instanceof ArrayBuffer) {
    text = new TextDecoder().decode(event.data);
  }

  try {
    const data = JSON.parse(text);
    switch (data.event) {
      case "update-users":
        updateUserList(data.usernames);
        break;
      case "send-message":
        addMessage(data.username, data.message);
        break;
    }
  } catch (err) {
    console.error("Failed to parse message:", text, err);
  }
};

function updateUserList(usernames) {
  const userList = document.getElementById("users");
  userList.replaceChildren();
  for (const name of usernames) {
    const li = document.createElement("li");
    li.textContent = name;
    userList.appendChild(li);
  }
}

function addMessage(user, msg) {
  const template = document.getElementById("message").content.cloneNode(true);
  template.querySelector("span").textContent = user;
  template.querySelector("p").textContent = msg;
  document.getElementById("conversation").prepend(template);
}

document.getElementById("form").onsubmit = (e) => {
  e.preventDefault();
  const input = document.getElementById("data");
  const message = input.value;
  if (!message.trim()) return;
  input.value = "";
  socket.send(JSON.stringify({ event: "send-message", message }));
};
