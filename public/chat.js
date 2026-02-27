const socket = io(window.location.origin, {
  transports: ["websocket"]
});

const messagesEl = document.getElementById("messages");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");

const statusEl = document.getElementById("status");
const roomTitleEl = document.getElementById("roomTitle");

const myNameEl = document.getElementById("myName");
const myAvatarEl = document.getElementById("myAvatar");
const nameInput = document.getElementById("nameInput");
const saveNameBtn = document.getElementById("saveNameBtn");

const newRoomInput = document.getElementById("newRoomInput");
const newRoomBtn = document.getElementById("newRoomBtn");

let myName = localStorage.getItem("chat_name") || "Invitado";
let currentRoom = localStorage.getItem("chat_room") || "equipo";

function initialLetter(name){
  return (name || "?").trim().charAt(0).toUpperCase() || "?";
}
function setMe(){
  myNameEl.textContent = myName;
  myAvatarEl.textContent = initialLetter(myName);
  nameInput.value = myName === "Invitado" ? "" : myName;
}
setMe();

function setStatus(txt){ statusEl.textContent = txt; }

function clearMessages(){
  messagesEl.innerHTML = "";
}

function bubble({user, text, ts}){
  const isMe = user === myName;
  const wrap = document.createElement("div");
  wrap.className = "bubble" + (isMe ? " me" : "");

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = initialLetter(user);

  const content = document.createElement("div");

  const meta = document.createElement("div");
  meta.className = "meta";
  const time = new Date(ts || Date.now()).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
  meta.textContent = `${user} · ${time}`;

  const msg = document.createElement("div");
  msg.className = "msg";
  msg.textContent = text;

  content.appendChild(meta);
  content.appendChild(msg);

  if(!isMe) wrap.appendChild(avatar);
  wrap.appendChild(content);

  return wrap;
}

function addMessage(m){
  messagesEl.appendChild(bubble(m));
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function joinRoom(room){
  currentRoom = room;
  localStorage.setItem("chat_room", room);
  clearMessages();
  socket.emit("joinRoom", { room, user: myName });
  roomTitleEl.textContent = room === "equipo" ? "# Equipo (general)" : `# ${room}`;
}

function send(){
  const text = msgInput.value.trim();
  if(!text) return;
  socket.emit("mensaje", { room: currentRoom, user: myName, text, ts: Date.now() });
  msgInput.value = "";
  msgInput.focus();
}

// UI events
sendBtn.addEventListener("click", send);
msgInput.addEventListener("keydown", (e)=>{ if(e.key === "Enter") send(); });

saveNameBtn.addEventListener("click", ()=>{
  const v = nameInput.value.trim();
  myName = v ? v : "Invitado";
  localStorage.setItem("chat_name", myName);
  setMe();
  // Re-join para que el server lo registre bien
  joinRoom(currentRoom);
});

document.querySelectorAll(".room").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".room").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    joinRoom(btn.dataset.room);
  });
});

newRoomBtn.addEventListener("click", ()=>{
  const room = newRoomInput.value.trim().toLowerCase().replace(/\s+/g,"-");
  if(!room) return;

  // crear botón de room “al vuelo”
  const roomsBox = document.querySelector(".rooms");
  const section = roomsBox.querySelector(".section");
  const newBtn = document.createElement("button");
  newBtn.className = "room";
  newBtn.dataset.room = room;
  newBtn.innerHTML = `<span class="pill">#</span> ${room}`;
  section.insertAdjacentElement("afterend", newBtn);

  newBtn.addEventListener("click", ()=>{
    document.querySelectorAll(".room").forEach(b=>b.classList.remove("active"));
    newBtn.classList.add("active");
    joinRoom(room);
  });

  newRoomInput.value = "";
});

// socket events
socket.on("connect", ()=> setStatus("Conectado"));
socket.on("disconnect", ()=> setStatus("Desconectado"));
socket.on("mensaje", (m)=> addMessage(m));
socket.on("historial", (items)=> items.forEach(addMessage));

// entrar a sala al cargar
joinRoom(currentRoom);