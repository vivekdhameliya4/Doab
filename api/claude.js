// api/claude.js  — Vercel Serverless Function
// This replaces server.js when deployed to Vercel.
// Vercel automatically serves any file in /api as a serverless endpoint.

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(500).json({
      error: { message: "ANTHROPIC_API_KEY environment variable is not set in Vercel." }
    });
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
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}

// Tell Vercel to allow large request bodies (for invoice images)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "25mb",
    },
  },
};
