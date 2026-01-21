"use server";

// Definição da resposta da API Externa
interface UniodontoUserResponse {
  cadSus: {
    http_status_cod: number;
    msg: string;
    data: Array<{
      resultado: number;
      CNS: string;
      Nome: string;
      Mae: string;
      Pai: string;
      Sexo: number;
      DataNascimento: string; // Vem como "DD/MM/YYYY"
      Mensagem: string;
    }>;
  };
}

export async function getUserInfo(cpf: string) {
  // 1. Limpeza do CPF (deixa apenas números)
  const cleanCpf = cpf.replace(/\D/g, "");

  if (cleanCpf.length !== 11) {
    return { success: false, message: "CPF inválido" };
  }

  try {
    // 2. Chamada Segura à API (Rodando no Servidor)
    const response = await fetch(
      `https://bevendasonline.uniodontogoiania.com.br:3092/getUserInfo?cpf=${cleanCpf}`,
      {
        method: "GET", // O Curl indicava data '' mas parâmetros na URL costumam ser GET. Testaremos assim.
        headers: {
          "Authorization": "Basic YXV0aERldkNyZWF0ZTpvdXQyMDIz", // Sua credencial segura aqui
          "Content-Type": "application/json",
        },
        cache: "no-store", // Garante dados frescos
      }
    );

    if (!response.ok) {
      return { success: false, message: "Erro ao consultar base de dados." };
    }

    const data: UniodontoUserResponse = await response.json();

    // 3. Validação do Retorno
    const userData = data.cadSus?.data?.[0];

    if (!userData || userData.resultado !== 1) {
        // resultado !== 1 geralmente significa não encontrado ou erro na lógica deles
        return { success: false, message: "CPF não encontrado na base." };
    }

    // 4. Formatação de Dados para o Formulário
    // Converter Data de "03/02/1996" para "1996-02-03" (Padrão HTML Date Input)
    const [day, month, year] = userData.DataNascimento.split("/");
    const formattedDate = `${year}-${month}-${day}`;

    return {
      success: true,
      data: {
        name: userData.Nome,
        motherName: userData.Mae,
        birthDate: formattedDate,
        cns: userData.CNS,
        sex: userData.Sexo
      }
    };

  } catch (error) {
    console.error("Erro na API Uniodonto:", error);
    return { success: false, message: "Falha na comunicação com o servidor." };
  }
}