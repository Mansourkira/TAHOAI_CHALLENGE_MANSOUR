import type { NextApiRequest, NextApiResponse } from "next";

type ChatResponse = {
  conversation_id: number;
  message: string;
  status: string;
};

type ErrorResponse = {
  error: string;
};

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, conversation_id } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        conversation_id: conversation_id || null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({
        error: errorData.detail || "Error communicating with backend",
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error in chat API route:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
