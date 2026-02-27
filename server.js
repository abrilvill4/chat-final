require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { exec } = require("child_process");
const os = require("os");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});



app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));




const MessageSchema = new mongoose.Schema({
  room: String,
  user: String,
  text: String,
  ts: Number
});

const Message = mongoose.model("Message", MessageSchema);

const UserSchema = new mongoose.Schema({
  username: String,
  password: String
});

const User = mongoose.model("User", UserSchema);



app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/health", (req, res) => res.send("ok"));

app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      username,
      password: hashed
    });

    res.json({ message: "Usuario creado" });

  } catch (err) {
    res.status(500).json({ error: "Error al registrar" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "Usuario no existe" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Contraseña incorrecta" });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ token });

  } catch (err) {
    res.status(500).json({ error: "Error en login" });
  }
});



// Listar procesos
app.get("/procesos", (req, res) => {
  const comando = process.platform === "win32" ? "tasklist" : "ps aux";

  exec(comando, (err, stdout) => {
    if (err) return res.status(500).send("Error listando procesos");
    res.send(stdout);
  });
});

// Monitor CPU y memoria
app.get("/monitor", (req, res) => {
  res.json({
    cpuLoad: os.loadavg(),
    memory: {
      total: os.totalmem(),
      free: os.freemem()
    }
  });
});



io.on("connection", (socket) => {

  console.log("Usuario conectado:", socket.id);

  socket.on("joinRoom", async ({ room, user }) => {
    socket.join(room);

    const history = await Message.find({ room })
      .sort({ ts: 1 })
      .limit(50);

    socket.emit("historial", history);
  });

  socket.on("mensaje", async (data) => {
    const message = new Message(data);
    await message.save();

    io.to(data.room).emit("mensaje", data);
  });

  socket.on("disconnect", () => {
    console.log("Usuario desconectado:", socket.id);
  });
});



const PORT = process.env.PORT || 3000;
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Conectado a MongoDB");

    server.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
    });

  } catch (error) {
    console.error("Error conectando a MongoDB:", error);
    process.exit(1);
  }
}

startServer();

