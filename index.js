// index.js — FINAL WORKING VERSION (WITH BLOCKCHAIN EXPLORER FIX)

const fs = require("fs");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Block, Blockchain } = require("./blockchain");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ---------------- CONFIG ----------------
const SECRET_KEY = process.env.JWT_SECRET || "supersecretkey";
const AES_KEY = process.env.AES_KEY || "12345678901234567890123456789012";
const AES_IV = process.env.AES_IV || "1234567890123456";

const PORT = process.env.PORT || 3000;

const ENC_KEY = Buffer.from(AES_KEY, "utf8");
const IV = Buffer.from(AES_IV, "utf8");

const CHAIN_FILE = "chain.json";
const VOTERS_FILE = "voters.json";

// ---------------- LOAD PRIVATE KEY ----------------
let PRIVATE_KEY = null;
try {
  PRIVATE_KEY = fs.readFileSync("private.pem", "utf8");
} catch {
  console.log("⚠️ private.pem not found, using fallback");
}

const KEY_PASSPHRASE = process.env.KEY_PASSPHRASE || "";

// ---------------- BLOCKCHAIN ----------------
let voteChain;

if (fs.existsSync(CHAIN_FILE)) {
  voteChain = new Blockchain();
  voteChain.chain = JSON.parse(fs.readFileSync(CHAIN_FILE));
} else {
  voteChain = new Blockchain();
  fs.writeFileSync(CHAIN_FILE, JSON.stringify(voteChain.chain, null, 2));
}

function saveChain() {
  fs.writeFileSync(CHAIN_FILE, JSON.stringify(voteChain.chain, null, 2));
}

// ---------------- OLD USERS ----------------
const voters = {};

for (let i = 1; i <= 200; i++) {
  const id = "22MCET" + String(i).padStart(3, "0");

  voters[id] = {
    password: "mcet" + String(i).padStart(3, "0"),
    hasVoted: false
  };
}

// ---------------- NEW USERS ----------------
function readVoters() {
  if (!fs.existsSync(VOTERS_FILE)) {
    fs.writeFileSync(VOTERS_FILE, "[]");
  }
  return JSON.parse(fs.readFileSync(VOTERS_FILE));
}

function writeVoters(data) {
  fs.writeFileSync(VOTERS_FILE, JSON.stringify(data, null, 2));
}

// ---------------- CANDIDATES ----------------
const candidates = [
  { id: "C1", name: "Rahul Sharma", department: "CS", position: "President" },
  { id: "C2", name: "Ananya Reddy", department: "Mech", position: "President" }
];

app.get("/candidates", (req, res) => {
  res.json(candidates);
});

// ---------------- REGISTER ----------------
app.post("/register", (req, res) => {
  const { voterId, password } = req.body;

  let votersData = readVoters();

  const exists = votersData.find(v => v.voterId === voterId);
  if (exists) return res.send("User already exists");

  votersData.push({ voterId, password, hasVoted: false });
  writeVoters(votersData);

  res.send("Registered successfully");
});

// ---------------- LOGIN ----------------
app.post("/login", (req, res) => {
  const { voterId, password } = req.body;

  let votersData = readVoters();

  const newUser = votersData.find(
    v => v.voterId === voterId && v.password === password
  );

  if (newUser) {
    const token = jwt.sign({ voterId }, SECRET_KEY, { expiresIn: "5m" });
    return res.json({ token });
  }

  if (!voters[voterId] || voters[voterId].password !== password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ voterId }, SECRET_KEY, { expiresIn: "5m" });
  res.json({ token });
});

// ---------------- AUTH ----------------
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).send("No token");

  jwt.verify(token, SECRET_KEY, (err, data) => {
    if (err) return res.status(403).send("Invalid token");
    req.voterId = data.voterId;
    next();
  });
}

// ---------------- AES ----------------
function encryptVote(vote) {
  const cipher = crypto.createCipheriv("aes-256-cbc", ENC_KEY, IV);
  let enc = cipher.update(vote, "utf8", "base64");
  enc += cipher.final("base64");
  return enc;
}

// ---------------- VOTE ----------------
app.post("/vote", authenticate, (req, res) => {
  const { candidateId, password } = req.body;
  const voterId = req.voterId;

  let votersData = readVoters();

  let user = votersData.find(v => v.voterId === voterId);

  if (!user && voters[voterId]) {
    user = voters[voterId];
  }

  if (!user || user.password !== password)
    return res.status(403).send("Password incorrect");

  if (user.hasVoted)
    return res.status(403).send("Already voted");

  const encryptedVote = encryptVote(candidateId);

  let signature = "fallback-signature";

  if (PRIVATE_KEY) {
    try {
      const signer = crypto.createSign("SHA256");
      signer.update(encryptedVote);
      signer.end();

      signature = signer.sign(
        { key: PRIVATE_KEY, passphrase: KEY_PASSPHRASE },
        "base64"
      );
    } catch {
      console.log("⚠️ Signing failed, using fallback");
    }
  }

  const newBlock = new Block(
    voteChain.chain.length,
    Date.now(),
    { voterId, vote: encryptedVote, signature },
    voteChain.getLatestBlock().hash
  );

  voteChain.addBlock(newBlock);
  saveChain();

  const index = votersData.findIndex(v => v.voterId === voterId);
  if (index !== -1) {
    votersData[index].hasVoted = true;
    writeVoters(votersData);
  }

  if (voters[voterId]) {
    voters[voterId].hasVoted = true;
  }

  res.send("Vote cast successfully");
});

// ---------------- RESULTS ----------------
app.get("/results", (req, res) => {
  const result = {};

  for (let i = 1; i < voteChain.chain.length; i++) {
    const { vote } = voteChain.chain[i].data;

    try {
      const decipher = crypto.createDecipheriv("aes-256-cbc", ENC_KEY, IV);
      let dec = decipher.update(vote, "base64", "utf8");
      dec += decipher.final("utf8");

      result[dec] = (result[dec] || 0) + 1;
    } catch {}
  }

  res.json(result);
});

// ---------------- CHAIN (FIX) ----------------
app.get("/chain", (req, res) => {
  res.json(voteChain.chain);
});

// ---------------- START ----------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});