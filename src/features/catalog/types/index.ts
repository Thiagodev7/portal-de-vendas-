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
  }