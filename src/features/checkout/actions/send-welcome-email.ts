"use server";

import { API_TOKEN, API_URL } from "@/lib/api-config";

interface SendWelcomeEmailParams {
  toEmail: string;
  holderName: string;
  planName: string;
  memberCard?: string | null;
}

interface SendWelcomeEmailResult {
  success: boolean;
  error?: string;
}

/**
 * Chama o integrador (POST /email/sendWelcome) para enviar
 * o e-mail de boas-vindas com o Manual do Cliente em anexo.
 */
export async function sendWelcomeEmail(
  params: SendWelcomeEmailParams
): Promise<SendWelcomeEmailResult> {
  try {
    const { toEmail, holderName, planName, memberCard } = params;

    const response = 
    
    await fetch(`${API_URL}/email/sendWelcome`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({ toEmail, holderName, planName, memberCard: memberCard ?? null }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg =
        errData && typeof errData === "object" && "error" in errData
          ? String((errData as { error?: unknown }).error)
          : `Erro HTTP ${response.status}`;
      return { success: false, error: msg };
    }

    return { success: true };
  } catch (err) {
    console.error("[sendWelcomeEmail] Erro:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro desconhecido",
    };
  }
}
