// IDs dos planos conforme seu sistema
export type PlanId = 'quality' | 'quality-plus' | 'smart' | 'kids' | 'light-plus';

interface PricingTier {
  monthly: number[]; // Índice 0 = 0 dependentes, 1 = 1 dependente, etc.
  enrollment: number[];
}

// Mapeamento baseado no OdontoPlanUtil do Dart
export const PRICING_TABLE: Record<PlanId, PricingTier> = {
  'quality': {
    // 0 dep: 72, 1 dep: 66, 2 deps: 62, 3+ deps: 60
    monthly: [72, 66, 62, 60], 
    enrollment: [18, 16, 14, 13]
  },
  'quality-plus': {
    monthly: [48, 44, 42, 40],
    enrollment: [16, 14, 12, 11]
  },
  'smart': {
    monthly: [30, 28, 27, 26],
    enrollment: [14, 12, 10, 9]
  },
  'kids': {
    monthly: [22, 21, 20, 20],
    enrollment: [12, 10, 8, 8]
  },
  'light-plus': {
    monthly: [10, 9, 8, 7],
    enrollment: [5, 5, 5, 5] // Assumindo fixo pois no Dart estava apenas '5'
  }
};

export function getTieredFee(planId: string, dependentsCount: number): number {
  const plan = PRICING_TABLE[planId as PlanId];
  if (!plan) return 0;
  
  // Se tiver mais dependentes do que a tabela prevê, pega o último valor (o mais barato)
  const index = Math.min(dependentsCount, plan.monthly.length - 1);
  return plan.monthly[index];
}

export function getEnrollmentFee(planId: string, dependentsCount: number): number {
  const plan = PRICING_TABLE[planId as PlanId];
  if (!plan) return 0;
  
  const index = Math.min(dependentsCount, plan.enrollment.length - 1);
  return plan.enrollment[index];
}