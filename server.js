require("dotenv").config();
const express = require("express");
const cors    = require("cors");

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "25mb" }));

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Claude API proxy
app.post("/api/claude", async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(500).json({ error: { message: "ANTHROPIC_API_KEY not set in .env" } });
  }
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.listen(PORT, () => {
  console.log(`✅  Proxy server running → http://localhost:${PORT}`);
  console.log(`   API key: ${process.env.ANTHROPIC_API_KEY ? "✓ loaded" : "✗ MISSING — set it in .env"}`);
});
