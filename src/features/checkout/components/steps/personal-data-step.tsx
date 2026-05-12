"use client";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/features/cart/store/cart-store";
import { getUserInfo } from "@/features/checkout/actions/get-user-info";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, ChevronRight, Loader2, Plus, Trash2, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";

// ─── Máscara DD/MM/AAAA ──────────────────────────────────────────────────────
function applyDateMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Converte DD/MM/AAAA → YYYY-MM-DD para persistência/API */
function toIsoDate(masked: string): string {
  const parts = masked.split("/");
  if (parts.length !== 3 || parts[2].length !== 4) return masked;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/** Converte YYYY-MM-DD → DD/MM/AAAA para exibição (recebida da API) */
function fromIsoDate(iso: string): string {
  if (!iso) return "";
  // Já está mascarado?
  if (iso.includes("/")) return iso;
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

// ─── Verifica se uma data DD/MM/AAAA representa menor de 18 anos ─────────────
function isMinor(birthDate: string): boolean {
  if (!birthDate || birthDate.length < 10) return false;
  const [d, m, y] = birthDate.split("/").map(Number);
  if (!d || !m || !y) return false;
  const today = new Date();
  const birth = new Date(y, m - 1, d);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age < 18;
}

// ─── Validador de data no formato DD/MM/AAAA ─────────────────────────────────
const isValidDate = (val: string) => {
  if (!val || val.length < 10) return false;
  const [d, m, y] = val.split("/").map(Number);
  if (!d || !m || !y || y < 1900 || y > new Date().getFullYear()) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
};

// ─── Validador de CPF (Algoritmo Oficial) ────────────────────────────────────
function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, "");
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleanCPF)) return false;
  let sum = 0;
  let remainder;
  for (let i = 1; i <= 9; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
  return true;
}

// ─── Validador de Telefone (Obrigatório 11 dígitos e começar com 9) ──────────
function validatePhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, "");
  // Exige exatamente 11 dígitos e o primeiro dígito após o DDD deve ser '9'
  return cleanPhone.length === 11 && cleanPhone.charAt(2) === "9";
}

// ─── Máscara de Telefone (Formato: 62 9 96509914) ────────────────────────────
function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 3) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  
  // Celular: 62 9 96509914
  if (digits.length > 10) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 3)} ${digits.slice(3)}`;
  }
  
  // Fixo: 62 33334444
  return `${digits.slice(0, 2)} ${digits.slice(2)}`;
}

// ─── Máscara de CPF ──────────────────────────────────────────────────────────
function applyCpfMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

// --- SCHEMAS ---
const dependentSchema = z.object({
  fullName: z.string().min(5, "Nome completo obrigatório"),
  cpf: z.string().refine(validateCPF, "CPF inválido"),
  birthDate: z.string().refine(isValidDate, "Data inválida (DD/MM/AAAA)"),
  sex: z.string().min(1, "Selecione o sexo"),
  relationship: z.string().min(1, "Parentesco obrigatório"),
});

const personalDataSchema = z
  .object({
    fullName: z.string().min(5, "Nome completo obrigatório"),
    email: z.string().email("E-mail inválido"),
    phone: z.string().refine(validatePhone, "Telefone inválido (DDD + número)"),
    cpf: z.string().refine(validateCPF, "CPF inválido"),
    birthDate: z.string().refine(isValidDate, "Data inválida (DD/MM/AAAA)"),
    motherName: z.string().optional(),
    sex: z.string().min(1, "Selecione o sexo"),
    dependents: z.array(dependentSchema).default([]),
  })
  .superRefine((data, ctx) => {
    const holderCpf = data.cpf.replace(/\D/g, "");

    // CPF não pode se repetir entre titular e dependentes
    const seenCpfs = new Set<string>([holderCpf]);
    data.dependents.forEach((dep, i) => {
      const depCpf = dep.cpf.replace(/\D/g, "");
      if (depCpf === holderCpf) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dependents", i, "cpf"],
          message: "CPF igual ao do titular não é permitido",
        });
      } else if (seenCpfs.has(depCpf)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dependents", i, "cpf"],
          message: "CPF duplicado entre os dependentes",
        });
      } else {
        seenCpfs.add(depCpf);
      }
    });
  });

type PersonalDataForm = z.infer<typeof personalDataSchema>;

interface PersonalDataStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function PersonalDataStep({ onNext, onBack }: PersonalDataStepProps) {
  const { setDependentsCount, setHolder } = useCartStore();

  const [isLoadingCpf, setIsLoadingCpf] = useState(false);
  const [loadingDependentIndex, setLoadingDependentIndex] = useState<number | null>(null);
  const [cpfFeedback, setCpfFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Máscaras de data — mantidas em estado separado para controlled inputs
  const [birthDateDisplay, setBirthDateDisplay] = useState("");
  const [depBirthDates, setDepBirthDates] = useState<string[]>([]);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<PersonalDataForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(personalDataSchema) as any,
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      cpf: "",
      birthDate: "",
      sex: "",
      motherName: "",
      dependents: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "dependents",
  });

  // Sincroniza a contagem de dependentes com a Store Global
  useEffect(() => {
    setDependentsCount(fields.length);
    setDepBirthDates((prev) => {
      const updated = [...prev];
      while (updated.length < fields.length) updated.push("");
      return updated.slice(0, fields.length);
    });
  }, [fields.length, setDependentsCount]);

  // --- BUSCA DADOS TITULAR ---
  const handleCpfBlur = async () => {
    const cpf = getValues("cpf");
    const cleanCpf = cpf?.replace(/\D/g, "") || "";
    if (cleanCpf.length !== 11) return;

    setIsLoadingCpf(true);
    setCpfFeedback(null);

    const result = await getUserInfo(cleanCpf);
    setIsLoadingCpf(false);

    if (result.success && result.data) {
      setValue("fullName", result.data.name);
      const masked = fromIsoDate(result.data.birthDate);
      setBirthDateDisplay(masked);
      setValue("birthDate", masked);
      if (result.data.motherName) setValue("motherName", result.data.motherName);
      setValue("sex", result.data.sex);
      setCpfFeedback({ type: "success", msg: `Olá, ${result.data.name.split(" ")[0]}! Encontramos seu cadastro.` });
      setFocus("email");
    } else {
      setCpfFeedback({ type: "error", msg: "Cadastro não localizado. Preencha manualmente." });
    }
  };

  // --- BUSCA DADOS DEPENDENTE ---
  const handleDependentCpfBlur = async (index: number) => {
    const dependentes = getValues("dependents");
    const cpf = dependentes[index].cpf;
    const cleanCpf = cpf?.replace(/\D/g, "") || "";
    if (cleanCpf.length !== 11) return;

    setLoadingDependentIndex(index);
    const result = await getUserInfo(cleanCpf);
    setLoadingDependentIndex(null);

    if (result.success && result.data) {
      setValue(`dependents.${index}.fullName`, result.data.name);
      const masked = fromIsoDate(result.data.birthDate);
      setDepBirthDates((prev) => {
        const updated = [...prev];
        updated[index] = masked;
        return updated;
      });
      setValue(`dependents.${index}.birthDate`, masked);
      setValue(`dependents.${index}.sex`, result.data.sex);
    }
  };

  const onSubmit = async (data: PersonalDataForm) => {
    setHolder({
      name: data.fullName,
      cpf: data.cpf.replace(/\D/g, ""),
      email: data.email,
      phone: data.phone.replace(/\D/g, ""),
      birthDate: toIsoDate(data.birthDate),
      motherName: data.motherName,
      sex: data.sex as "M" | "F",
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    onNext();
  };

  // ─── Helpers de Input ─────────────────────────────────────────────────────
  const handleBirthDateChange = (raw: string) => {
    const masked = applyDateMask(raw);
    setBirthDateDisplay(masked);
    setValue("birthDate", masked, { shouldValidate: true });
  };

  const handleDepBirthDateChange = (index: number, raw: string) => {
    const masked = applyDateMask(raw);
    setDepBirthDates((prev) => {
      const updated = [...prev];
      updated[index] = masked;
      return updated;
    });
    setValue(`dependents.${index}.birthDate`, masked, { shouldValidate: true });
  };


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">

      {/* HEADER DA SEÇÃO */}
      <div className="flex items-center gap-3">
        <div className="bg-brand-wine/10 p-2 rounded-full">
          <User className="w-6 h-6 text-brand-wine" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dados do Titular</h2>
          <p className="text-sm text-gray-500">Identificação de quem será o responsável.</p>
        </div>
      </div>


      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

        {/* --- CAMPOS TITULAR --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* CPF — PRIMEIRO (busca automática preenche os demais) */}
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">CPF</label>
            <div className="relative">
              <input
                {...register("cpf")}
                onChange={(e) => {
                  const masked = applyCpfMask(e.target.value);
                  e.target.value = masked;
                  setValue("cpf", masked, { shouldValidate: true });
                }}
                onBlur={handleCpfBlur}
                className={cn(
                  "w-full p-3 rounded-lg border outline-none transition-all pr-10",
                  errors.cpf
                    ? "border-red-300 focus:ring-2 focus:ring-red-200"
                    : "border-gray-300 focus:ring-2 focus:ring-brand-wine/20 focus:border-brand-wine"
                )}
                placeholder="000.000.000-00"
                maxLength={14}
              />
              {isLoadingCpf && (
                <div className="absolute right-3 top-3.5">
                  <Loader2 className="w-5 h-5 animate-spin text-brand-wine" />
                </div>
              )}
            </div>
            {cpfFeedback && (
              <div
                className={cn(
                  "text-xs flex items-center gap-1.5 mt-1 font-medium",
                  cpfFeedback.type === "success" ? "text-green-600" : "text-orange-600"
                )}
              >
                {cpfFeedback.type === "success" ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
                {cpfFeedback.msg}
              </div>
            )}
            {errors.cpf && <span className="text-xs text-red-500 font-medium">{errors.cpf.message}</span>}
          </div>


          {/* Nome Completo */}
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Nome Completo</label>
            <input
              {...register("fullName")}
              className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-wine/20 outline-none transition-all"
              placeholder="Seu nome completo"
            />
            {errors.fullName && <span className="text-xs text-red-500 font-medium">{errors.fullName.message}</span>}
          </div>

          {/* E-mail */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">E-mail</label>
            <input
              type="email"
              {...register("email")}
              className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-wine/20 outline-none"
              placeholder="seu@email.com"
            />
            {errors.email && <span className="text-xs text-red-500 font-medium">{errors.email.message}</span>}
          </div>

          {/* Celular */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Celular</label>
            <input
              {...register("phone")}
              onChange={(e) => {
                const masked = applyPhoneMask(e.target.value);
                e.target.value = masked;
                setValue("phone", masked, { shouldValidate: true });
              }}
              className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-wine/20 outline-none"
              placeholder="62 9 96509914"
              maxLength={15}
            />
            {errors.phone && <span className="text-xs text-red-500 font-medium">{errors.phone.message}</span>}
          </div>

          {/* Sexo */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Sexo</label>
            <select
              {...register("sex")}
              className={cn(
                "w-full p-3 rounded-lg border bg-white focus:ring-2 focus:ring-brand-wine/20 focus:border-brand-wine outline-none h-[50px]",
                errors.sex ? "border-red-300" : "border-gray-300"
              )}
            >
              <option value="">Selecione...</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
            {errors.sex && <span className="text-xs text-red-500 font-medium">{errors.sex.message}</span>}
          </div>

          {/* Data de Nascimento — máscara DD/MM/AAAA */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Data de Nascimento</label>
            <input
              type="text"
              value={birthDateDisplay}
              onChange={(e) => handleBirthDateChange(e.target.value)}
              className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-wine/20 outline-none"
              placeholder="DD/MM/AAAA"
              maxLength={10}
            />
            {errors.birthDate && <span className="text-xs text-red-500 font-medium">{errors.birthDate.message}</span>}
          </div>

          {/* Nome da Mãe */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Nome da Mãe</label>
            <input
              {...register("motherName")}
              className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-wine/20 outline-none"
            />
          </div>
        </div>

        {/* --- SEÇÃO DEPENDENTES --- */}
        <div className="pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Dependentes</h2>
                <p className="text-xs text-gray-500">Adicione familiares ao plano.</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ fullName: "", cpf: "", birthDate: "", sex: "", relationship: "" })}
              className="text-brand-wine border-brand-wine/30 hover:bg-brand-wine/5 gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200 relative animate-in slide-in-from-top-2">
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <h4 className="text-sm font-bold text-gray-700 mb-3">Dependente {index + 1}</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* CPF Dependente */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">CPF</label>
                    <div className="relative">
                      <input
                        {...register(`dependents.${index}.cpf` as const)}
                        onChange={(e) => {
                          const masked = applyCpfMask(e.target.value);
                          e.target.value = masked;
                          setValue(`dependents.${index}.cpf`, masked, { shouldValidate: true });
                        }}
                        onBlur={() => handleDependentCpfBlur(index)}
                        className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                        placeholder="000.000.000-00"
                        maxLength={14}
                      />
                      {loadingDependentIndex === index && (
                        <div className="absolute right-3 top-2.5">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        </div>
                      )}
                    </div>
                    {errors.dependents?.[index]?.cpf && (
                      <span className="text-xs text-red-500">{errors.dependents[index]?.cpf?.message}</span>
                    )}
                  </div>

                  {/* Parentesco */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Parentesco</label>
                    <select
                      {...register(`dependents.${index}.relationship` as const)}
                      className="w-full p-2.5 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500/20 outline-none text-sm h-[42px]"
                    >
                      <option value="">Selecione...</option>
                      <option value="Conjuge">Cônjuge</option>
                      <option value="Filho">Filho(a)</option>
                      <option value="Pai/Mae">Pai/Mãe</option>
                    </select>
                    {errors.dependents?.[index]?.relationship && (
                      <span className="text-xs text-red-500">{errors.dependents[index]?.relationship?.message}</span>
                    )}
                  </div>

                  {/* Nome Dependente */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-medium text-gray-600">Nome Completo</label>
                    <input
                      {...register(`dependents.${index}.fullName` as const)}
                      className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
                    />
                    {errors.dependents?.[index]?.fullName && (
                      <span className="text-xs text-red-500">{errors.dependents[index]?.fullName?.message}</span>
                    )}
                  </div>

                  {/* Data de Nascimento Dependente — máscara DD/MM/AAAA */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Nascimento</label>
                    <input
                      type="text"
                      value={depBirthDates[index] || ""}
                      onChange={(e) => handleDepBirthDateChange(index, e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
                      placeholder="DD/MM/AAAA"
                      maxLength={10}
                    />
                    {errors.dependents?.[index]?.birthDate && (
                      <span className="text-xs text-red-500">{errors.dependents[index]?.birthDate?.message}</span>
                    )}
                  </div>

                  {/* Sexo Dependente */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Sexo</label>
                    <select
                      {...register(`dependents.${index}.sex` as const)}
                      className="w-full p-2.5 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500/20 outline-none text-sm h-[42px]"
                    >
                      <option value="">Selecione...</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                    </select>
                    {errors.dependents?.[index]?.sex && (
                      <span className="text-xs text-red-500">{errors.dependents[index]?.sex?.message}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {fields.length === 0 && (
              <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                Nenhum dependente adicionado.
              </div>
            )}
          </div>
        </div>

        {/* Botões de Navegação */}
        <div className="pt-6 flex gap-4 border-t border-gray-100">
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
            disabled={isSubmitting}
            className="w-2/3 h-12 bg-brand-wine hover:bg-brand-wine-medium text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? "Salvando..." : "Ir para Pagamento"}
            {!isSubmitting && <ChevronRight className="w-5 h-5" />}
          </Button>
        </div>

      </form>
    </div>
  );
}