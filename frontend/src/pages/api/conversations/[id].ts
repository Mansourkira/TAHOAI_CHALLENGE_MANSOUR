import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const { method } = req;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: "Invalid conversation ID" });
  }

  try {
    // Determine if we're updating a title
    const isUpdateTitle = method === "PUT" && req.url?.includes("/title");

    // Build the correct backend URL based on the operation
    let backendUrl = `${BACKEND_URL}/conversations/${id}`;
    if (isUpdateTitle) {
      backendUrl += "/title";
    }

    // Forward the request to the backend
    const response = await fetch(backendUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      ...(method !== "GET" &&
        method !== "DELETE" && {
          body: JSON.stringify(req.body),
        }),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: "Error communicating with backend" }));
      return res.status(response.status).json(errorData);
    }

    // For DELETE operations, return a success message
    if (method === "DELETE") {
      return res.status(204).end();
    }

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error(`Error in conversation [${id}] API route:`, error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
