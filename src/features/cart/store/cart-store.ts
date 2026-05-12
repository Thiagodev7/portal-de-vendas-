import { IPlan } from '@/features/catalog/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Tipo para o Responsável Financeiro
export interface PayerInfo {
  isHolder: boolean;
  fullName?: string;
  cpf?: string;
  email?: string;
  phone?: string;
}

// Dados do titular capturados no PersonalDataStep
export interface HolderInfo {
  name: string;
  cpf: string;
  email: string;
  phone: string;
  birthDate: string; // YYYY-MM-DD
  motherName?: string;
  sex: "M" | "F";
  cns?: string;
}

// Tipo para o Endereço do Titular
export interface AddressInfo {
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  uf: string;
  complement?: string;
  cityId?: number; // IBGE
  streetTypeId?: number; // Datasys id_tipo_logradouro
}

// Documento enviado pelo beneficiário (armazenado como base64 em memória)
export interface UploadedDocument {
  id: string;            // rg_cnh | cpf | comprovante_residencia
  label: string;
  fileName: string;
  extensao: string;      // jpg, png, pdf ...
  base64: string;        // conteúdo do arquivo sem prefixo data:...
  idTipoDocumento: number;
}

interface CartState {
  selectedPlan: IPlan | null;
  billingCycle: 'monthly' | 'yearly';
  dependentsCount: number;
  payer: PayerInfo;
  address: AddressInfo | null;
  holder: HolderInfo | null;
  uploadedDocuments: UploadedDocument[]; // documentos em base64 (somente memória)

  setPlan: (plan: IPlan, cycle: 'monthly' | 'yearly') => void;
  setBillingCycle: (cycle: 'monthly' | 'yearly') => void;
  setDependentsCount: (count: number) => void;
  setPayer: (payer: PayerInfo) => void;
  setAddress: (address: AddressInfo) => void;
  setHolder: (holder: HolderInfo) => void;
  setUploadedDocuments: (docs: UploadedDocument[]) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      selectedPlan: null,
      billingCycle: 'monthly',
      dependentsCount: 0,
      payer: { isHolder: true },
      address: null,
      holder: null,
      uploadedDocuments: [],

      setPlan: (plan, cycle) => set({ selectedPlan: plan, billingCycle: cycle }),
      setBillingCycle: (cycle) => set({ billingCycle: cycle }),
      setDependentsCount: (count) => set({ dependentsCount: count }),
      setPayer: (payer) => set({ payer }),
      setAddress: (address) => set({ address }),
      setHolder: (holder) => set({ holder }),
      setUploadedDocuments: (docs) => set({ uploadedDocuments: docs }),

      clearCart: () => set({ selectedPlan: null, dependentsCount: 0, payer: { isHolder: true }, address: null, holder: null, uploadedDocuments: [] }),
    }),
    {
      name: 'uniodonto-cart',
      partialize: (state) => {
        // Ignora documentos grandes em base64 no localStorage para evitar QuotaExceededError
        const { uploadedDocuments, ...rest } = state;
        return rest;
      },
    }
  )
);