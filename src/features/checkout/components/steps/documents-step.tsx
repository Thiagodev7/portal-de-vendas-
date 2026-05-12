"use client";

import { useCartStore, UploadedDocument } from "@/features/cart/store/cart-store";
import { AlertTriangle, CheckCircle, FileText, Trash2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DocumentsStepProps {
  onNext: () => void;
  onBack: () => void;
}

// Mapeamento: id do documento → id_tipo_documento DataSys
const REQUIRED_DOCS = [
  {
    id: "rg_cnh",
    label: "RG ou CNH",
    description: "Frente e verso do documento de identidade",
    icon: "🪪",
    accept: "image/*,application/pdf",
    idTipoDocumento: 590, // RG
  },
  {
    id: "cpf",
    label: "CPF",
    description: "Documento que contenha o CPF",
    icon: "📄",
    accept: "image/*,application/pdf",
    idTipoDocumento: 591, // CPF
  },
  {
    id: "comprovante_residencia",
    label: "Comprovante de Residência",
    description: "Emitido nos últimos 90 dias",
    icon: "🏠",
    accept: "image/*,application/pdf",
    idTipoDocumento: 592, // Comprovante de endereço
  },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Converte um File em base64 puro (sem o prefixo data:...) */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove o prefixo "data:image/png;base64," etc.
      const base64 = result.split(",")[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getExtensao(file: File): string {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "jpg";
}

export function DocumentsStep({ onNext, onBack }: DocumentsStepProps) {
  const { setUploadedDocuments } = useCartStore();
  const [files, setFiles] = useState<Record<string, File | null>>({
    rg_cnh: null,
    cpf: null,
    comprovante_residencia: null,
  });
  const [dragging, setDragging] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const allUploaded = REQUIRED_DOCS.every((doc) => files[doc.id] !== null);

  const handleFile = (id: string, file: File | null) => {
    if (!file) return;
    setFiles((prev) => ({ ...prev, [id]: file }));
  };

  const handleInputChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    handleFile(id, file);
    e.target.value = "";
  };

  const handleDrop = (id: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(null);
    const file = e.dataTransfer.files?.[0] ?? null;
    handleFile(id, file);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => ({ ...prev, [id]: null }));
  };

  const handleNext = async () => {
    if (!allUploaded) return;
    setConverting(true);
    try {
      // Converte todos os arquivos para base64 e salva no store
      const docs: UploadedDocument[] = await Promise.all(
        REQUIRED_DOCS.map(async (doc) => {
          const file = files[doc.id]!;
          const base64 = await fileToBase64(file);
          return {
            id: doc.id,
            label: doc.label,
            fileName: file.name,
            extensao: getExtensao(file),
            base64,
            idTipoDocumento: doc.idTipoDocumento,
          };
        })
      );
      setUploadedDocuments(docs);
      onNext();
    } catch {
      // Silencioso — não bloqueia o fluxo
      onNext();
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">

      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-amber-100 p-2 rounded-full">
          <UploadCloud className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Anexar Documentos</h2>
          <p className="text-sm text-gray-500">Envie os 3 documentos abaixo para continuar.</p>
        </div>
      </div>

      {/* Alerta */}
      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
        <div className="bg-amber-100 p-1.5 rounded-full shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Todos os documentos são obrigatórios</strong> para a ativação completa do seu plano. O botão de continuar só será liberado após o envio dos 3 arquivos.
        </p>
      </div>

      {/* Barra de progresso */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-green-500 rounded-full transition-all duration-500"
            style={{ width: `${(Object.values(files).filter(Boolean).length / REQUIRED_DOCS.length) * 100}%` }}
          />
        </div>
        <span className="text-xs font-bold text-gray-600 shrink-0">
          {Object.values(files).filter(Boolean).length}/{REQUIRED_DOCS.length} enviados
        </span>
      </div>

      {/* Upload de cada documento */}
      <div className="space-y-3">
        {REQUIRED_DOCS.map((doc) => {
          const uploadedFile = files[doc.id];
          const isDraggingOver = dragging === doc.id;

          return (
            <div key={doc.id}>
              <input
                ref={(el) => { inputRefs.current[doc.id] = el; }}
                type="file"
                accept={doc.accept}
                className="hidden"
                onChange={(e) => handleInputChange(doc.id, e)}
              />

              {uploadedFile ? (
                <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-green-300 bg-green-50 transition-all">
                  <div className="text-xl shrink-0">{doc.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                      <p className="font-bold text-sm text-green-800">{doc.label}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-green-600 shrink-0" />
                      <p className="text-xs text-green-700 truncate">{uploadedFile.name}</p>
                      <span className="text-xs text-green-600 shrink-0">· {formatFileSize(uploadedFile.size)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(doc.id)}
                    className="p-1.5 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors shrink-0"
                    title="Remover arquivo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => inputRefs.current[doc.id]?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(doc.id); }}
                  onDragLeave={() => setDragging(null)}
                  onDrop={(e) => handleDrop(doc.id, e)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all",
                    isDraggingOver
                      ? "border-brand-wine bg-brand-wine/5 scale-[1.01]"
                      : "border-gray-200 bg-gray-50 hover:border-amber-400 hover:bg-amber-50/40"
                  )}
                >
                  <div className="text-xl shrink-0">{doc.icon}</div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-gray-800">{doc.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{doc.description}</p>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors shrink-0",
                    isDraggingOver ? "bg-brand-wine text-white" : "bg-amber-100 text-amber-700"
                  )}>
                    <UploadCloud className="w-3.5 h-3.5" />
                    {isDraggingOver ? "Solte aqui" : "Selecionar"}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-gray-400">
        Formatos aceitos: <strong>JPG, PNG, PDF</strong> · Arraste e solte ou clique para selecionar
      </p>

      {allUploaded && (
        <div className="rounded-2xl border-2 border-green-300 bg-green-50 p-4 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-400">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm font-bold text-green-800">
            Todos os documentos prontos! Clique em continuar para seguir ao pagamento.
          </p>
        </div>
      )}

      {/* Botões */}
      <div className="pt-2 flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={converting}
          className="w-1/3 h-14 rounded-xl"
        >
          Voltar
        </Button>
        <Button
          type="button"
          onClick={handleNext}
          disabled={!allUploaded || converting}
          className={cn(
            "w-2/3 h-14 font-bold rounded-xl transition-all",
            allUploaded && !converting
              ? "bg-brand-wine hover:bg-brand-wine/90 text-white"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          {converting ? "Preparando..." : "Continuar para Pagamento"}
        </Button>
      </div>
    </div>
  );
}
