"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ShieldCheck, Lock } from "lucide-react";

export function SelectionHeader() {
  return (
    <div className="relative bg-white pt-8 pb-12 overflow-hidden">
      
      {/* Background Decorativo (Baseado nas formas do BrandBook) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
         {/* Glow Roxo Suave (Paleta Secundária) */}
         <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-brand-purple/10 blur-[100px]" />
         {/* Glow Ciano Suave (Paleta Secundária) */}
         <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-cyan/10 blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 flex flex-col items-center text-center relative z-10">
        
        {/* LOGO OFICIAL */}
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 relative"
        >
            {/* Coloque o arquivo 'logo_name_city.png' na pasta /public */}
            <div className="relative w-[280px] h-[80px] md:w-[320px] md:h-[90px]">
                <Image 
                    src="/logo_name_city.png" 
                    alt="Uniodonto Goiânia" 
                    fill
                    className="object-contain"
                    priority
                />
            </div>
        </motion.div>

        {/* Headline Focada em Conversão */}
        <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 leading-tight tracking-tight"
        >
            Você chegou ao lugar certo para <br className="hidden md:block" />
            <span className="text-brand-wine-DEFAULT relative inline-block">
                transformar seu sorriso
                {/* Sublinhado estilo "Sorriso" do BrandBook */}
                <svg className="absolute w-[110%] h-4 -bottom-2 -left-[5%] text-brand-cyan opacity-50" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0 5 Q 50 12 100 5" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" />
                </svg>
            </span>
        </motion.h1>

        <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 max-w-2xl text-lg md:text-xl mb-8 leading-relaxed"
        >
            A segurança da maior cooperativa odontológica do mundo, <br className="hidden sm:block"/>
            agora a um clique de você. <strong>Sem carência* e contratação imediata.</strong>
        </motion.p>

        {/* Badges de Segurança (Gatilhos Mentais) */}
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-3 text-xs md:text-sm font-semibold text-gray-600"
        >
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full border border-gray-100 shadow-sm">
                <Lock className="w-3.5 h-3.5 text-green-600" />
                Ambiente Seguro
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full border border-gray-100 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-wine-DEFAULT" />
                Regulamentado ANS
            </div>
        </motion.div>
      </div>
    </div>
  );
}