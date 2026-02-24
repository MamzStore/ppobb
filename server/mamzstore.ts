const MAMZSTORE_BASE_URL = "http://47.236.159.198:5000";

export interface MamzTransactionResponse {
  status: boolean;
  message: string;
  data?: {
    ref_id: string;
    dest: string;
    sku: string;
    price: number;
    status: string;
    sn: string;
  };
}

export interface MamzStatusResponse {
  status: boolean;
  data?: {
    ref_id: string;
    status: string; // "Pending", "Sukses", "Gagal"
    sn: string;
  };
}

export async function createMamzTransaction(
  sku: string,
  dest: string,
  refId?: string
): Promise<MamzTransactionResponse> {
  const apiKey = process.env.MAMZSTORE_API_KEY;
  if (!apiKey) {
    throw new Error("MAMZSTORE_API_KEY not configured");
  }

  const payload: Record<string, string> = {
    api_key: apiKey,
    sku,
    dest,
  };
  if (refId) {
    payload.ref_id = refId;
  }

  const response = await fetch(`${MAMZSTORE_BASE_URL}/api/v1/transaction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data: MamzTransactionResponse = await response.json();
  return data;
}

export async function checkMamzStatus(refId: string): Promise<MamzStatusResponse> {
  const apiKey = process.env.MAMZSTORE_API_KEY;
  if (!apiKey) {
    throw new Error("MAMZSTORE_API_KEY not configured");
  }

  const response = await fetch(`${MAMZSTORE_BASE_URL}/api/v1/check_status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, ref_id: refId }),
  });

  const data: MamzStatusResponse = await response.json();
  return data;
}
