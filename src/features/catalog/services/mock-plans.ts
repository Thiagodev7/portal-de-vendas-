import { IPlan } from "../types";

export const MOCK_PLANS: IPlan[] = [
  {
    id: "quality",
    name: "Uni Quality",
    description: "Cobertura completa imediata. O melhor plano para quem não quer esperar.",
    price: 72.00, 
    period: "/mês",
    highlight: true, // Destaque pois é o Ticket Médio mais alto e sem carência
    colorTheme: "wine",
    copay: false,
    ctaText: "Contratar Quality",
    features: [
      { text: "Sem Carência (Uso Imediato)", included: true },
      { text: "Plantão 24h (Goiânia e Anápolis)", included: true },
      { text: "Urgências e Consultas", included: true },
      { text: "Limpeza e Prevenção", included: true },
      { text: "Restaurações (Dentística)", included: true },
      { text: "Tratamento de Canal (Endodontia)", included: true },
      { text: "Tratamento de Gengiva (Periodontia)", included: true },
      { text: "Cirurgias e Extrações", included: true },
      { text: "Próteses (Blocos e Coroas)", included: true },
      { text: "Odontopediatria", included: true },
    ]
  },
  {
    id: "quality-plus",
    name: "Uni Quality Plus",
    description: "A mesma cobertura do Quality com mensalidade reduzida e carência.",
    price: 48.00, 
    period: "/mês",
    highlight: false,
    colorTheme: "wine",
    copay: false,
    ctaText: "Contratar Quality Plus",
    features: [
      { text: "Carência de 90 dias", included: true }, // Diferença principal do Dart
      { text: "Plantão 24h (Goiânia e Anápolis)", included: true },
      { text: "Urgências e Consultas", included: true },
      { text: "Limpeza e Prevenção", included: true },
      { text: "Restaurações (Dentística)", included: true },
      { text: "Tratamento de Canal (Endodontia)", included: true },
      { text: "Tratamento de Gengiva (Periodontia)", included: true },
      { text: "Cirurgias e Extrações", included: true },
      { text: "Próteses (Blocos e Coroas)", included: true },
      { text: "Odontopediatria", included: true },
    ]
  },
  {
    id: "smart",
    name: "Uni Smart",
    description: "Mensalidade econômica. Pague taxas pequenas apenas quando usar.",
    price: 30.00, 
    period: "/mês",
    highlight: false,
    colorTheme: "cyan",
    copay: true,
    observation: "Paga taxa por serviço (Coparticipação)",
    ctaText: "Contratar Smart",
    features: [
      { text: "Carência de 60 dias", included: true },
      { text: "Plantão 24h e Urgências", included: true },
      { text: "Consultas e Diagnóstico", included: true },
      { text: "Limpeza e Prevenção", included: true },
      { text: "Restaurações", included: true },
      { text: "Cirurgias e Extrações", included: true },
      { text: "Raspagem Supragengival", included: true },
      { text: "Tratamento de Canal", included: false }, // Não listado no Dart para Smart
      { text: "Próteses", included: false }, // Não listado no Dart para Smart
      { text: "Odontopediatria", included: true },
    ]
  },
  {
    id: "kids",
    name: "Uni Kids",
    description: "Cuidado especializado para o sorriso dos pequenos com baixo custo.",
    price: 22.00, 
    period: "/mês",
    highlight: false,
    colorTheme: "orange",
    copay: true,
    observation: "Paga taxa por serviço (Coparticipação)",
    ctaText: "Contratar Kids",
    features: [
      { text: "Carência de 60 dias", included: true },
      { text: "Odontopediatria Especializada", included: true },
      { text: "Urgências 24h", included: true },
      { text: "Prevenção e Aplicação de Flúor", included: true },
      { text: "Restaurações", included: true },
      { text: "Cirurgias (Extrações)", included: true },
      { text: "Raios-X (Radiografias)", included: true },
      { text: "Tratamento de Canal", included: false },
      { text: "Próteses", included: false },
    ]
  },
  {
    id: "light-plus",
    name: "Uni Light Plus",
    description: "Proteção essencial para emergências e prevenção.",
    price: 10.00, 
    period: "/mês",
    highlight: false,
    colorTheme: "green",
    copay: true,
    observation: "Paga taxa por serviço (Coparticipação)",
    ctaText: "Contratar Light",
    features: [
      { text: "Sem Carência (Conforme Dart)", included: true },
      { text: "Plantão 24h (Goiânia e Anápolis)", included: true },
      { text: "Urgências Odontológicas", included: true },
      { text: "Consultas", included: true },
      { text: "Prevenção em Saúde Bucal", included: true },
      { text: "Restaurações", included: false },
      { text: "Cirurgias", included: false },
      { text: "Canal", included: false },
      { text: "Próteses", included: false },
    ]
  }
];