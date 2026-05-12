"use server";

import { API_TOKEN, API_URL } from "@/lib/api-config";

export interface DocumentPayload {
  id_pessoa: number;
  extensao: string;
  nome: string;
  descricao: string;
  xBase64: string;
  id_tipo_documento: number;
}

export interface UploadDocumentResult {
  success: boolean;
  label: string;
  error?: string;
  data?: unknown;
}

/**
 * Envia um único documento ao DataSys via integrador
 * POST /portal-de-vendas/datanext/pessoa-documento-set
 */
async function uploadSingleDocument(payload: DocumentPayload): Promise<UploadDocumentResult & { label: string }> {
  const label = `id_tipo=${payload.id_tipo_documento}`;
  try {
    const response = await fetch(`${API_URL}/portal-de-vendas/datanext/pessoa-documento-set`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg =
        (data && typeof data === "object" && "msg" in data)
          ? String(data.msg)
          : `Erro HTTP ${response.status}`;
      return { success: false, label, error: errorMsg, data };
    }

    return { success: true, label, data };
  } catch (error: unknown) {
    return {
      success: false,
      label,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Envia todos os documentos do beneficiário ao DataSys após o cadastro.
 * Cada documento é enviado individualmente (a API aceita 1 por request).
 *
 * @param idPessoa  - id_pessoa retornado pelo DataSys no insertClient
 * @param documents - lista de documentos em base64 do cart store
 */
export async function uploadBeneficiaryDocuments(
  idPessoa: number,
  documents: {
    label: string;
    fileName: string;
    extensao: string;
    base64: string;
    idTipoDocumento: number;
  }[]
): Promise<{ results: UploadDocumentResult[]; allSuccess: boolean }> {
  const results: UploadDocumentResult[] = [];

  for (const doc of documents) {
    const payload: DocumentPayload = {
      id_pessoa: idPessoa,
      extensao: doc.extensao,
      nome: doc.label.slice(0, 30),
      descricao: doc.label.slice(0, 30),
      xBase64: doc.base64,
      id_tipo_documento: doc.idTipoDocumento,
    };

    const result = await uploadSingleDocument(payload);
    results.push({ success: result.success, label: doc.label, error: result.error });
  }

  const allSuccess = results.every((r) => r.success);
  return { results, allSuccess };
}
