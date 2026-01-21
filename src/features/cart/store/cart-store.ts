import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IPlan } from '@/features/catalog/types';

// Tipo para o Responsável Financeiro
export interface PayerInfo {
  isHolder: boolean; // Se é o próprio titular
  fullName?: string;
  cpf?: string;
  email?: string;
  phone?: string;
}

interface CartState {
  selectedPlan: IPlan | null;
  billingCycle: 'monthly' | 'yearly';
  dependentsCount: number;
  payer: PayerInfo; // NOVO CAMPO
  
  setPlan: (plan: IPlan, cycle: 'monthly' | 'yearly') => void;
  setDependentsCount: (count: number) => void;
  setPayer: (payer: PayerInfo) => void; // NOVA AÇÃO
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      selectedPlan: null,
      billingCycle: 'monthly',
      dependentsCount: 0,
      // Padrão: O titular é o pagador
      payer: { isHolder: true }, 
      
      setPlan: (plan, cycle) => set({ selectedPlan: plan, billingCycle: cycle }),
      setDependentsCount: (count) => set({ dependentsCount: count }),
      setPayer: (payer) => set({ payer }),
      
      clearCart: () => set({ selectedPlan: null, dependentsCount: 0, payer: { isHolder: true } }),
    }),
    {
      name: 'uniodonto-cart',
    }
  )
);