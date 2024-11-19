console.log("Iniciando servidor...");

let express = require("express");
let cors = require("cors");
let mongoose = require("mongoose");
let bcrypt = require("bcrypt");
let jwt = require("jsonwebtoken");
let User = require("./models/User");

let app = express();
require("dotenv").config();

// Configuração do CORS
console.log("Servidor Express inicializado.");
app.use(cors((e, o) => {
    e = e.header("Origin");
    if (e && (/^chrome-extension:\/\/[a-z0-9]{32}$/.test(e) || "https://extensao-chrome.squareweb.app" === e)) {
        o(null, { origin: true });
    } else {
        o(null, { origin: false });
    }
}));

app.options("*", cors());
app.use(express.json());
console.log("Middleware configurado.");

// Configuração da URI do MongoDB
const uri = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000;

// Conexão com o MongoDB
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true, dbName: process.env.DB_NAME })
    .then(() => console.log("MongoDB conectado"))
    .catch(e => console.log("Erro ao conectar no MongoDB:", e));

// Rota para verificar se o servidor está funcionando
app.get("/", (req, res) => {
    res.send("Servidor funcionando corretamente");
});

// Rota para registrar um novo usuário
app.post("/register", async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const userExists = await User.findOne({ username: username });
        if (userExists) {
            return res.status(400).json({ message: "Usuário já existe" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({ username, email, password: hashedPassword });

        await newUser.save();
        res.status(201).json({ message: "Usuário registrado com sucesso" });
    } catch (e) {
        res.status(500).json({ message: "Erro ao registrar usuário", error: e.message });
    }
});

// Rota para login de um usuário
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const ipAddress = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    console.log("Requisição recebida no login:", req.body);

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: "Usuário não encontrado" });
        }

        if (user.allowedIP && user.allowedIP !== ipAddress) {
            return res.status(403).json({ message: "Acesso negado: você está tentando acessar de um IP não autorizado." });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(400).json({ message: "Senha incorreta" });
        }

        if (!user.allowedIP) {
            user.allowedIP = ipAddress;
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
        user.loggedInFrom = ipAddress;
        await user.save();

        res.status(200).json({ message: "Login realizado com sucesso", token });
    } catch (e) {
        res.status(500).json({ message: "Erro ao fazer login", error: e.message });
    }

    console.log("Requisição recebida no login:", req.body);
});

// Rota para logout
app.post("/logout", async (req, res) => {
    const { username } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: "Usuário não encontrado" });
        }

        user.loggedInFrom = null;
        await user.save();
        res.status(200).json({ message: "Logout realizado com sucesso" });
    } catch (e) {
        res.status(500).json({ message: "Erro ao fazer logout", error: e.message });
    }
});

// Iniciando o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
