export const API_URL = process.env.UNIODONTO_API_URL || "http://localhost:3077";

// Em produção, isso deve ser seguro.
// O token é usado para autenticação básica nas requisições server-side.
export const API_TOKEN = process.env.UNIODONTO_API_TOKEN;

if (!API_TOKEN) {
  console.warn(
    "⚠️ UNIODONTO_API_TOKEN não está definido. As chamadas para a API podem falhar."
  );
}
