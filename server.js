import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "llama3.2:3b";

app.post("/flashcard", async (req, res) => {
  const { fact } = req.body;
  if (!fact) {
    return res.status(400).json({ error: "Missing fact" });
  }

  const prompt = `
You are a flashcard generator.

Return ONLY valid JSON in this exact format:
{
  "front": "short question or cloze",
  "back": "clear, concise answer"
}

No extra text. No markdown.

Fact:
"${fact}"
`;

  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false
    })
  });

  const data = await response.json();

  try {
    const json = JSON.parse(data.response.trim());
    res.json(json);
  } catch (e) {
    res.status(500).json({
      error: "Invalid JSON from model",
      raw: data.response
    });
  }
});

app.listen(3000, () => {
  console.log("Flashcard API running on http://localhost:3000");
});

