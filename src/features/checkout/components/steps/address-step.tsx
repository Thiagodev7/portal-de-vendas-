"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { validateZipCode } from "@/features/checkout/services/address-service";
import { cn } from "@/lib/utils";

// Schema de Validação
const addressSchema = z.object({
  cep: z.string().min(8, "CEP obrigatório"),
  street: z.string().min(1, "Rua obrigatória"),
  number: z.string().min(1, "Número obrigatório"),
  neighborhood: z.string().min(1, "Bairro obrigatório"),
  city: z.string().min(1, "Cidade obrigatória"),
  uf: z.string().min(2, "UF obrigatória"),
  complement: z.string().optional(),
});

type AddressForm = z.infer<typeof addressSchema>;

interface AddressStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function AddressStep({ onNext, onBack }: AddressStepProps) {
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [coverageSuccess, setCoverageSuccess] = useState(false);

  const { register, handleSubmit, setValue, getValues, setFocus, formState: { errors, isSubmitting } } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
  });

  // Função mágica que roda quando o CEP perde o foco (onBlur)
  const handleCepBlur = async () => {
    const cep = getValues("cep");
    if (!cep || cep.length < 8) return;

    setIsLoadingCep(true);
    setCepError(null);
    setCoverageSuccess(false);

    // Chama nosso serviço de validação
    const result = await validateZipCode(cep);

    setIsLoadingCep(false);

    if (!result.isValid) {
      // Se não atendemos a cidade ou CEP errado
      setCepError(result.error || "Erro desconhecido");
      // Limpa os campos para evitar cadastro errado
      setValue("street", "");
      setValue("neighborhood", "");
      setValue("city", "");
      setValue("uf", "");
    } else {
      // Sucesso! Atendemos essa cidade.
      setCoverageSuccess(true);
      if (result.data) {
        setValue("street", result.data.logradouro);
        setValue("neighborhood", result.data.bairro);
        setValue("city", result.data.localidade);
        setValue("uf", result.data.uf);
        setFocus("number"); // Joga o foco para o número
      }
    }
  };

  const onSubmit = async (data: AddressForm) => {
    // Aqui você salvaria no Zustand ou enviaria pro backend
    console.log("Endereço validado:", data);
    await new Promise(resolve => setTimeout(resolve, 500));
    onNext();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-3 mb-6">
         <div className="bg-brand-wine/10 p-2 rounded-full">
            <MapPin className="w-6 h-6 text-brand-wine" />
         </div>
         <div>
             <h2 className="text-xl font-bold text-gray-900">Endereço do Titular</h2>
             <p className="text-sm text-gray-500">Para envio da carteirinha e contrato.</p>
         </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        
        {/* CEP com Validação de Cobertura */}
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2 md:col-span-1">
                <label className="text-sm font-medium text-gray-700">CEP</label>
                <div className="relative">
                    <input 
                        {...register("cep")}
                        onBlur={handleCepBlur} // O pulo do gato está aqui
                        maxLength={9}
                        placeholder="00000-000"
                        className={cn(
                            "w-full p-3 rounded-lg border focus:ring-2 outline-none transition-all pr-10",
                            cepError ? "border-red-300 focus:ring-red-200 bg-red-50" : "border-gray-300 focus:ring-brand-wine/20 focus:border-brand-wine"
                        )}
                    />
                    {isLoadingCep && (
                        <div className="absolute right-3 top-3.5">
                            <Loader2 className="w-5 h-5 animate-spin text-brand-wine" />
                        </div>
                    )}
                </div>
                {errors.cep && <span className="text-xs text-red-500 font-medium">{errors.cep.message}</span>}
            </div>
        </div>

        {/* Mensagens de Feedback de Cobertura */}
        {cepError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-2 text-sm text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="font-medium">{cepError}</span>
            </div>
        )}

        {coverageSuccess && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-100 flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="font-bold">Boa notícia! Atendemos na sua região.</span>
            </div>
        )}

        {/* Campos de Endereço (Preenchidos Automaticamente) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Endereço (Logradouro)</label>
                <input 
                    {...register("street")}
                    className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-wine/20 outline-none transition-all"
                    readOnly={isLoadingCep} // Bloqueia enquanto carrega
                />
                {errors.street && <span className="text-xs text-red-500">{errors.street.message}</span>}
            </div>

            <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Número</label>
                <input 
                    {...register("number")}
                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-wine/20 focus:border-brand-wine outline-none"
                />
                {errors.number && <span className="text-xs text-red-500">{errors.number.message}</span>}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Bairro</label>
                <input 
                    {...register("neighborhood")}
                    className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 outline-none"
                    readOnly // Geralmente deixamos readonly se veio do CEP
                />
            </div>
            <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Complemento (Opcional)</label>
                <input 
                    {...register("complement")}
                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-wine/20 outline-none"
                    placeholder="Apto, Bloco, etc."
                />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Cidade</label>
                <input 
                    {...register("city")}
                    className="w-full p-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-500 outline-none cursor-not-allowed"
                    readOnly // Cidade sempre bloqueada pois depende da validação
                />
            </div>
            <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">UF</label>
                <input 
                    {...register("uf")}
                    className="w-full p-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-500 outline-none cursor-not-allowed"
                    readOnly
                />
            </div>
        </div>

        {/* Botões de Navegação */}
        <div className="pt-6 flex gap-4">
            <Button 
                type="button" 
                variant="outline"
                onClick={onBack}
                className="w-1/3 h-12 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50"
            >
                Voltar
            </Button>
            <Button 
                type="submit" 
                disabled={isSubmitting || !!cepError} // Bloqueia se tiver erro de CEP
                className="w-2/3 h-12 bg-brand-wine hover:bg-brand-wine-medium text-white font-bold rounded-xl shadow-lg transition-all"
            >
                {isSubmitting ? "Salvando..." : "Confirmar Endereço"}
            </Button>
        </div>

      </form>
    </div>
  );
}