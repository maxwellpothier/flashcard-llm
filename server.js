import express from "express";

const app = express();
app.use(express.json());

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "llama3.2:3b";

// Retry helper for Ollama requests
async function fetchWithRetry(url, options, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      // If Ollama returns an error, throw to trigger retry
      if (response.status >= 500) {
        throw new Error(`Ollama returned ${response.status}`);
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Retry ${i + 1}/${retries} after error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Check if Ollama is ready
async function isOllamaReady() {
  try {
    const response = await fetch("http://localhost:11434/api/tags", {
      method: "GET",
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Health check endpoint
app.get("/health", async (req, res) => {
  const ollamaReady = await isOllamaReady();
  if (ollamaReady) {
    res.json({ status: "healthy", ollama: "ready" });
  } else {
    res.status(503).json({ status: "unhealthy", ollama: "not ready" });
  }
});

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

  try {
    const response = await fetchWithRetry(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false
      }),
      signal: AbortSignal.timeout(120000) // 2 minute timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({
        error: "Ollama request failed",
        details: errorText
      });
    }

    const data = await response.json();

    if (!data.response) {
      return res.status(502).json({
        error: "Empty response from model"
      });
    }

    const json = JSON.parse(data.response.trim());
    res.json(json);
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return res.status(504).json({ error: "Request timed out" });
    }
    if (error instanceof SyntaxError) {
      return res.status(500).json({
        error: "Invalid JSON from model",
        raw: error.message
      });
    }
    res.status(500).json({
      error: "Internal server error",
      details: error.message
    });
  }
});

app.listen(3000, () => {
  console.log("Flashcard API running on http://localhost:3000");
});
