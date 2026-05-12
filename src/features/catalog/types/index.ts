export interface IPlanFeature {
    text: string;
    included: boolean;
  }
  
  export interface IPlan {
    id: string;
    name: string;
    description: string;
    price: number;
    period: string; // ex: "/mês"
    highlight?: boolean; // Se é o destaque visual
    colorTheme: "wine" | "cyan" | "blue" | "green" | "orange"; 
    ctaText: string;
    features: IPlanFeature[];
    
    // NOVOS CAMPOS BASEADOS NOS SEUS DADOS
    copay: boolean; // True se tiver taxa por serviço
    observation?: string; // Texto explicativo da taxa

    // IDs do banco (apps.contrato) — usados para criar proposta
    nroContrato?: number;         // apps.contrato.nro_contrato (ex: 207002)

    // IDs do DataSys — usados para insertClient no DataSys
    datasysContractId?: number;   // id_contrato DataSys (ex: 56429)
    datasysPlanId?: number;       // id_plano DataSys (ex: 1699)
  }