"use server";

import { API_TOKEN, API_URL } from "@/lib/api-config";
import { z } from "zod";

// Schema de validação da resposta da API (Contrato de Interface)
// Schema de validação da resposta da API (Contrato de Interface)
const apiResponseSchema = z.object({
  http_status_cod: z.number(),
  data: z.array(
    z.object({
      resultado: z.number(),
      Nome: z.string(),
      Mae: z.string().nullable().optional(),
      Sexo: z.number(),
      DataNascimento: z.string(),
      CNS: z.string().nullable().optional(),
      Mensagem: z.string().nullable().optional(),
    })
  ).optional(),
});

type UserInfoResponse = {
  success: boolean;
  message?: string;
  data?: {
    name: string;
    motherName: string;
    birthDate: string; // Formato ISO YYYY-MM-DD
    cns?: string;
    sex: "M" | "F";
  };
};

export async function getUserInfo(cpf: string): Promise<UserInfoResponse> {
  // 1. Sanitização de Input
  const cleanCpf = cpf.replace(/\D/g, "");

  if (cleanCpf.length !== 11) {
    return { success: false, message: "CPF deve conter 11 dígitos." };
  }

  // 2. Validação de Configuração (Fail Fast)
  if (!API_URL || !API_TOKEN) {
    console.error("❌ Erro Crítico: Configuração da API ausente.");
    return { success: false, message: "Erro interno de configuração." };
  }

  try {
    // 3. Chamada Segura (Server-to-Server)
    const url = `${API_URL}/datanext/postcadSus`;
    console.log(`[getUserInfo] Fetching: ${url}`);
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cpf: cleanCpf }),
      next: { revalidate: 3600 }, // Cache por 1 hora para performance
    });

    console.log(`[getUserInfo] Response status: ${response.status}`);

    if (!response.ok) {
        console.error(`Erro API Uniodonto: ${response.status} - ${response.statusText}`);
        return { success: false, message: "Serviço indisponível no momento." };
    }

    const rawData = await response.json();
    console.log("[getUserInfo] Raw Data:", JSON.stringify(rawData, null, 2));
    
    // 4. Validação de Contrato (Parse Defensivo)
    const parsed = apiResponseSchema.safeParse(rawData);

    if (!parsed.success) {
      console.error("Erro de contrato de API (Schema Mismatch):", parsed.error);
      return { success: false, message: "Erro ao processar dados do parceiro." };
    }

    const userData = parsed.data.data?.[0];

    // Verifica lógica de negócio da API legada
    // Aceita resultado 1 ou 0 como sucesso (baseado em logs recentes)
    if (!userData || (userData.resultado !== 1 && userData.resultado !== 0)) {
      return { success: false, message: "CPF não localizado na base." };
    }

    // 5. Normalização de Dados (Data Transformation)
    const [day, month, year] = userData.DataNascimento.split("/");
    const formattedDate = `${year}-${month}-${day}`; 

    return {
      success: true,
      data: {
        name: userData.Nome,
        motherName: userData.Mae || "",
        birthDate: formattedDate,
        cns: userData.CNS || undefined,
        sex: userData.Sexo === 1 ? "M" : "F",
      },
    };

  } catch (error) {
    console.error("Erro fatal na action getUserInfo:", error);
    return { success: false, message: "Ocorreu um erro inesperado. Tente novamente." };
  }
}