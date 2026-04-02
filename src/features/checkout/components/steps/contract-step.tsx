"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRight, FileText, ScrollText } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ContractStepProps {
  onNext: () => void;
  onBack: () => void;
}

// ─── Texto do Contrato ────────────────────────────────────────────────────────
// TODO: Substituir pelo texto definitivo fornecido pelo jurídico.
const CONTRACT_TEXT = `
CONTRATO DE PRESTAÇÃO DE SERVIÇOS ODONTOLÓGICOS
Uniodonto Goiânia – Cooperativa de Trabalho Odontológico

Pelo presente instrumento particular, a UNIODONTO GOIÂNIA – COOPERATIVA DE TRABALHO ODONTOLÓGICO, pessoa jurídica de direito privado, doravante denominada CONTRATADA, e o Beneficiário Titular, indicado no formulário de adesão eletrôfica, doravante denominado CONTRATANTE, firmam o presente Contrato de Prestação de Serviços Odontológicos, nas condições a seguir estipuladas:

─────────────────────────────────────────────────────────────

CLÁUSULA 1ª – DO OBJETO

O presente contrato tem por objeto a prestação de serviços odontológicos ao CONTRATANTE e seus dependentes, conforme plano selecionado, por meio da rede credenciada da UNIODONTO GOIÂNIA, nos termos da Lei nº 9.656/98 e demais normas regulamentadoras da ANS.

─────────────────────────────────────────────────────────────

CLÁUSULA 2ª – DO PLANO CONTRATADO

O CONTRATANTE selecionou o plano de cobertura odontológica disponível no portal de vendas eletrônico, cujas coberturas, procedimentos incluídos e excluídos estão descritos no Rol de Procedimentos da ANS e no Guia do Beneficiário disponível no sítio eletrônico da CONTRATADA.

─────────────────────────────────────────────────────────────

CLÁUSULA 3ª – DO PRAZO E DA VIGÊNCIA

3.1. O presente contrato vigorará pelo período selecionado pelo CONTRATANTE (mensal ou anual), renovando-se automaticamente por igual período, salvo manifestação expressa em contrário por qualquer das partes, com prazo mínimo de 30 (trinta) dias de antecedência.

3.2. A cobertura somente terá início após a compensação do primeiro pagamento e o cumprimento dos prazos de carência previstos em contrato.

─────────────────────────────────────────────────────────────

CLÁUSULA 4ª – DO VALOR E DA FORMA DE PAGAMENTO

4.1. O valor da mensalidade/anuidade é aquele apresentado ao CONTRATANTE durante o processo de adesão eletrônica, podendo ser reajustado anualmente nos termos da lei e das normas da ANS.

4.2. O pagamento deverá ser realizado na forma e prazo acordados no momento da contratação (cartão de crédito ou Pix).

4.3. O inadimplemento por período superior a 60 (sessenta) dias consecutivos ou 90 (noventa) dias não consecutivos, dentro de 1 (um) ano, importará na suspensão e posterior rescisão contratual, nos termos da RN ANS nº 412/2016.

─────────────────────────────────────────────────────────────

CLÁUSULA 5ª – DAS CARÊNCIAS

O CONTRATANTE sujeita-se aos prazos de carência estabelecidos pela ANS e pela CONTRATADA, conforme tabela disponível no Guia do Beneficiário, exceto nas situações de urgência e emergência, nas quais a cobertura mínima será garantida conforme legislação vigente.

─────────────────────────────────────────────────────────────

CLÁUSULA 6ª – DAS OBRIGAÇÕES DO CONTRATANTE

I – Fornecer informações corretas e atualizadas no momento da adesão;
II – Manter seus dados cadastrais atualizados junto à CONTRATADA;
III – Efetuar os pagamentos nas datas acordadas;
IV – Utilizar os serviços exclusivamente pela rede credenciada, salvo situações de urgência e emergência;
V – Comunicar à CONTRATADA qualquer alteração em seu quadro de dependentes.

─────────────────────────────────────────────────────────────

CLÁUSULA 7ª – DAS OBRIGAÇÕES DA CONTRATADA

I – Disponibilizar rede credenciada de prestadores para atendimento ao CONTRATANTE e seus dependentes;
II – Garantir a cobertura dos procedimentos previstos no Rol ANS e no plano contratado;
III – Prestar informações claras sobre coberturas, carências e rede credenciada;
IV – Processar os reembolsos cabíveis nos prazos previstos em lei.

─────────────────────────────────────────────────────────────

CLÁUSULA 8ª – DA RESCISÃO

8.1. O presente contrato poderá ser rescindido por qualquer das partes, mediante notificação com 30 (trinta) dias de antecedência.

8.2. A CONTRATADA poderá rescindir o contrato imediatamente em caso de fraude, uso indevido do plano ou falsidade nas informações prestadas.

─────────────────────────────────────────────────────────────

CLÁUSULA 9ª – DA PROTEÇÃO DE DADOS (LGPD)

Os dados pessoais coletados durante a contratação serão tratados em conformidade com a Lei nº 13.709/2018 (LGPD), sendo utilizados exclusivamente para fins de execução deste contrato e comunicações relacionadas ao plano contratado. O CONTRATANTE poderá exercer seus direitos de titular conforme previsto na legislação vigente.

─────────────────────────────────────────────────────────────

CLÁUSULA 10ª – DO FORO

Fica eleito o foro da comarca de Goiânia/GO para dirimir quaisquer controvérsias oriundas do presente contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

─────────────────────────────────────────────────────────────

Ao clicar em "Li e aceito o contrato", o CONTRATANTE declara ter lido, compreendido e aceito todos os termos e condições do presente instrumento, conferindo validade jurídica equivalente à assinatura manuscrita, nos termos da MP 2.200-2/2001 e da Lei nº 14.063/2020.
`.trim();

// ─── Componente ───────────────────────────────────────────────────────────────
export function ContractStep({ onNext, onBack }: ContractStepProps) {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    // Considera "lido" quando estiver a ≤ 50px do final
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
      setHasScrolled(true);
    }
  };

  // Se o contrato for curto o suficiente para caber sem scroll, libera direto
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight + 50) {
      setHasScrolled(true);
    }
  }, []);

  const canAccept = hasScrolled;
  const canProceed = accepted;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-brand-wine/10 p-2 rounded-full">
          <FileText className="w-6 h-6 text-brand-wine" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Contrato de Adesão</h2>
          <p className="text-sm text-gray-500">Leia o contrato antes de finalizar sua contratação.</p>
        </div>
      </div>

      {/* Caixa de Contrato com Scroll */}
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-72 md:h-96 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-mono scroll-smooth"
          style={{ scrollbarWidth: "thin" }}
        >
          {CONTRACT_TEXT}
        </div>

        {/* Indicador "role para baixo" — some quando lido */}
        {!hasScrolled && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
            <div className="flex items-center gap-1.5 bg-brand-wine text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg animate-bounce">
              <ScrollText className="w-3.5 h-3.5" />
              Role para baixo para ler o contrato completo
            </div>
          </div>
        )}
      </div>

      {/* Badge de leitura concluída */}
      {hasScrolled && (
        <div className="flex items-center gap-2 text-xs text-green-700 font-medium bg-green-50 border border-green-100 px-3 py-2 rounded-lg animate-in fade-in duration-300">
          <FileText className="w-4 h-4" />
          Contrato lido até o final.
        </div>
      )}

      {/* Checkbox de Aceite */}
      <label
        className={cn(
          "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all select-none",
          !canAccept ? "opacity-40 cursor-not-allowed border-gray-200 bg-gray-50" :
          accepted ? "border-brand-wine bg-brand-wine/5" : "border-gray-200 bg-white hover:border-brand-wine/40"
        )}
      >
        <input
          type="checkbox"
          checked={accepted}
          disabled={!canAccept}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-brand-wine shrink-0"
        />
        <span className="text-sm text-gray-800 leading-snug">
          <strong>Li e aceito os termos do Contrato de Prestação de Serviços Odontológicos</strong> da Uniodonto Goiânia,
          declarando que as informações prestadas são verdadeiras e que estou ciente das coberturas, carências e condições do plano selecionado.
        </span>
      </label>

      {!canAccept && (
        <p className="text-xs text-gray-400 text-center -mt-2">
          Role o contrato até o final para habilitar o aceite.
        </p>
      )}

      {/* Botões */}
      <div className="pt-2 flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-1/3 h-12 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          Voltar
        </Button>
        <Button
          type="button"
          disabled={!canProceed}
          onClick={onNext}
          className="w-2/3 h-12 bg-brand-wine hover:bg-brand-wine-medium text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Avançar para Pagamento
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
