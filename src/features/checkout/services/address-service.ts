import { ALLOWED_CITIES, STREET_TYPES } from "../data/coverage-data";

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string; // Cidade
  uf: string;
  erro?: boolean;
}

interface AddressValidationResult {
  isValid: boolean;
  data?: ViaCepResponse;
  cityId?: number;
  streetTypeId?: number;
  error?: string;
}

export async function validateZipCode(cep: string): Promise<AddressValidationResult> {
  // 1. Limpa o CEP (remove traços e pontos)
  const cleanCep = cep.replace(/\D/g, "");

  if (cleanCep.length !== 8) {
    return { isValid: false, error: "CEP inválido." };
  }

  try {
    // 2. Busca na API do ViaCEP
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data: ViaCepResponse = await response.json();

    if (data.erro) {
      return { isValid: false, error: "CEP não encontrado." };
    }

    // 3. Validação Crítica: Verifica se atendemos a cidade
    const cityCode = ALLOWED_CITIES[data.localidade];

    if (!cityCode) {
      return { 
        isValid: false, 
        error: `Infelizmente, ainda não temos cobertura em ${data.localidade} - ${data.uf}.` 
      };
    }

    // 4. (Opcional) Identifica o tipo de logradouro (Rua, Av, etc)
    const firstWord = data.logradouro.split(" ")[0].toUpperCase();
    const streetTypeId = STREET_TYPES[firstWord] || STREET_TYPES["OUTRO"];

    return {
      isValid: true,
      data: data,
      cityId: cityCode,
      streetTypeId: streetTypeId
    };

  } catch (error) {
    return { isValid: false, error: "Erro ao consultar CEP. Tente novamente." };
  }
}