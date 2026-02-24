const MAMZPAY_BASE_URL = "http://47.236.159.198:5005";

export interface MamzPayCreateResponse {
  status: boolean;
  message?: string;
  data?: {
    trx_id: string;
    amount: number;
    amount_unique: number;
    qr_string: string;
    expired_in: number; // seconds
  };
}

export interface MamzPayWebhookPayload {
  status: "PAID";
  ref_id: string;
  amount_received: number;
  trx_id_gateway: string;
}

export async function createMamzPayment(
  amount: number,
  refId: string,
  callbackUrl: string
): Promise<MamzPayCreateResponse> {
  const apiKey = process.env.MAMZPAY_API_KEY;
  if (!apiKey) {
    throw new Error("MAMZPAY_API_KEY not configured");
  }

  const response = await fetch(`${MAMZPAY_BASE_URL}/api/payment/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      amount,
      ref_id: refId,
      callback_url: callbackUrl,
    }),
  });

  const data: MamzPayCreateResponse = await response.json();
  return data;
}
