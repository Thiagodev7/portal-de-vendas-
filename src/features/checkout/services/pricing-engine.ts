import { getTieredFee, getEnrollmentFee } from "./pricing-data";

interface CalculationResult {
  baseFee: number;          // Valor unitário da mensalidade (com desconto de volume)
  enrollmentFee: number;    // Valor unitário da adesão
  proRataAmount: number;    // Valor proporcional do primeiro mês
  monthlyTotal: number;     // Total mensal recorrente (Fee * Pessoas)
  annualTotal: number;      // Total do primeiro ano (Pro-rata + 11 meses)
  totalDueNow: number;      // Quanto paga AGORA (depende se é mensal ou anual)
  peopleCount: number;      // Titular + Dependentes
}

export function calculateCheckout(
  planId: string, 
  dependentsCount: number, 
  billingCycle: 'monthly' | 'yearly'
): CalculationResult {
  
  const date = new Date();
  const day = date.getDate();
  const month = date.getMonth() + 1; // JS começa em 0
  const peopleCount = dependentsCount + 1; // Titular + Dependentes

  // 1. Busca valor na tabela progressiva
  const fee = getTieredFee(planId, dependentsCount);
  const enrollment = getEnrollmentFee(planId, dependentsCount);

  // 2. Lógica de Dias Restantes (Pro-rata) - Idêntico ao Dart
  let daysBase = 30;
  if (month === 2) daysBase = 28;

  let daysToEndOfMonth = daysBase - day;
  // Correção de segurança: se for dia 31 ou cálculo negativo, zera ou ajusta
  if (daysToEndOfMonth < 0) daysToEndOfMonth = 0;

  // Custo Pro-Rata (Primeiro mês proporcional)
  // Fórmula Dart: (days * (fee / base)) * people
  const costProRata = (daysToEndOfMonth * (fee / daysBase)) * peopleCount;

  // 3. Cálculo Anual (Regra: Pro-Rata + 11 Mensalidades Cheias)
  const annualBasePrice = (fee * peopleCount * 11) + costProRata;
  
  // Desconto de 10% no anual
  const annualPriceWithDiscount = annualBasePrice * 0.9;

  // 4. Totais
  const totalEnrollment = enrollment * peopleCount;
  
  // Total a Pagar AGORA
  let totalDueNow = 0;

  if (billingCycle === 'yearly') {
    // Anual: Paga o ano todo + Adesão
    totalDueNow = annualPriceWithDiscount + totalEnrollment;
  } else {
    // Mensal: Paga o Pro-Rata + Adesão
    // NOTA: Se o pro-rata for muito pequeno (fim do mês), algumas regras cobram o próximo mês junto.
    // Mas seguindo seu código Dart estrito:
    totalDueNow = costProRata + totalEnrollment;
  }

  return {
    baseFee: fee,
    enrollmentFee: enrollment,
    proRataAmount: costProRata,
    monthlyTotal: fee * peopleCount,
    annualTotal: annualPriceWithDiscount,
    totalDueNow: totalDueNow,
    peopleCount
  };
}