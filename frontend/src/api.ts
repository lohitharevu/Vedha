const API_BASE_URL = "http://127.0.0.1:8000";

export interface AnalyzeRequest {
  complaint: string;
  source: string;
  language: string;
}

export async function analyzeComplaintAPI(data: AnalyzeRequest): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Analysis failed (${response.status}): ${message}`);
  }

  return response.json();
}
