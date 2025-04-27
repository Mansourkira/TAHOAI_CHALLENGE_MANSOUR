import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { method } = req;

    // Build the backend URL with query parameters for GET requests
    let backendUrl = `${BACKEND_URL}/conversations`;
    if (method === "GET" && req.query) {
      const queryParams = new URLSearchParams();
      if (req.query.limit) queryParams.append("limit", String(req.query.limit));
      if (req.query.offset)
        queryParams.append("offset", String(req.query.offset));

      if (queryParams.toString()) {
        backendUrl += `?${queryParams.toString()}`;
      }
    }

    // Forward the request to the backend
    const response = await fetch(backendUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      ...(method !== "GET" && {
        body: JSON.stringify(req.body),
      }),
    });

    const data = await (method === "DELETE"
      ? response.text()
      : response.json());

    return res
      .status(response.status)
      .json(method === "DELETE" ? { success: true } : data);
  } catch (error) {
    console.error("Error in conversations API route:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
