"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Shield, Star, Users } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";

export function HeroPremium() {
  const { scrollY } = useScroll();
  // Efeito parallax suave no scroll
  const y1 = useTransform(scrollY, [0, 500], [0, 100]); 
  const y2 = useTransform(scrollY, [0, 500], [0, -100]);

  // URLs de imagens de alta qualidade (Placeholders do Unsplash)
  const images = {
    mainSmile: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=1000&auto=format&fit=crop", // Mulher sorrindo confiante
    family: "https://images.unsplash.com/photo-1542038784456-1ea0e93ca370?q=80&w=800&auto=format&fit=crop", // Família feliz
    doctor: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800&auto=format&fit=crop" // Dentista profissional
  };

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-white to-pink-50/30 pt-12 pb-24 lg:pt-32 lg:pb-40">
      
      {/* Background Decorativo (Orb de Luz da Marca) */}
      <div className="absolute top-0 right-0 -z-10 translate-x-1/3 -translate-y-1/4 opacity-15">
        <div className="h-[800px] w-[800px] rounded-full bg-brand-wine-DEFAULT blur-[100px]" />
      </div>
      <div className="absolute bottom-0 left-0 -z-10 -translate-x-1/3 translate-y-1/4 opacity-20">
        <div className="h-[600px] w-[600px] rounded-full bg-brand-cyan blur-[80px]" />
      </div>

      <div className="container mx-auto px-4 md:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          
          {/* LADO ESQUERDO: Copywriting Persuasivo */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col justify-center space-y-8 relative z-10"
          >
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center self-start rounded-full border border-brand-wine-light/30 bg-white/50 px-4 py-1.5 text-sm font-semibold text-brand-wine-DEFAULT backdrop-blur-md shadow-sm"
            >
              <Star className="mr-2 h-4 w-4 fill-brand-wine-DEFAULT text-brand-wine-DEFAULT" />
              <span>Plano Odontológico #1 de Goiás</span>
            </motion.div>
            
            <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl xl:text-7xl leading-[1.1]">
              O sorriso que você ama merece <span className="text-brand-wine-DEFAULT relative whitespace-nowrap">
                Uniodonto
                {/* Sublinhado Artístico */}
                <svg className="absolute -bottom-3 left-0 w-full h-4 text-brand-cyan -z-10 opacity-60" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 15 100 5" stroke="currentColor" strokeWidth="6" fill="none" />
                </svg>
              </span>
            </h1>
            
            <p className="max-w-[600px] text-lg text-gray-600 md:text-xl leading-relaxed">
              Junte-se a milhares de famílias que confiam na maior cooperativa odontológica do mundo. Sem surpresas, apenas sorrisos.
            </p>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Button size="lg" className="h-14 px-8 text-lg bg-brand-wine-DEFAULT hover:bg-brand-wine-medium shadow-xl shadow-brand-wine-DEFAULT/20 transition-transform hover:-translate-y-1 rounded-full">
                Ver Planos e Preços
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-2 border-gray-200 hover:bg-white hover:text-brand-wine-DEFAULT hover:border-brand-wine-light transition-all rounded-full bg-white/50 backdrop-blur-sm">
                Falar com Especialista
              </Button>
            </motion.div>

            {/* Social Proof Mini-Strip */}
            <div className="pt-6 flex items-center gap-4 text-sm font-medium text-gray-500">
              <div className="flex -space-x-3">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="h-10 w-10 rounded-full border-2 border-white bg-gray-200 overflow-hidden relative">
                     <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" className="object-cover w-full h-full" />
                  </div>
                ))}
              </div>
              <div>
                <div className="flex text-yellow-400">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <p><span className="font-bold text-gray-800">4.9/5</span> de satisfação</p>
              </div>
            </div>
          </motion.div>

          {/* LADO DIREITO: Composição Visual Avançada */}
          <div className="relative mx-auto w-full max-w-[600px] lg:max-w-none h-[500px] md:h-[600px]">
            
            {/* Círculo Principal (Máscara da imagem) */}
            <motion.div 
              style={{ y: y1 }}
              className="absolute top-0 right-0 w-4/5 h-4/5 z-10"
            >
              <div className="relative w-full h-full rounded-[3rem] overflow-hidden shadow-2xl border-[6px] border-white">
                <img 
                   src={images.mainSmile} 
                   alt="Sorriso Uniodonto" 
                   className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
                />
                
                {/* Overlay de Gradiente sutil */}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-wine-ultra/40 to-transparent" />
                
                <div className="absolute bottom-6 left-6 text-white">
                    <p className="font-bold text-xl">Dra. Mariana Silva</p>
                    <p className="text-sm opacity-90">Cooperada Uniodonto</p>
                </div>
              </div>
            </motion.div>

            {/* Card Flutuante 1: Família */}
            <motion.div 
              style={{ y: y2 }}
              initial={{ opacity: 0, scale: 0.8, x: -50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ delay: 0.6, type: "spring" }}
              className="absolute bottom-10 left-0 md:left-10 z-20 bg-white p-4 rounded-2xl shadow-xl max-w-[220px] border border-gray-100"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                   <Shield className="h-5 w-5 text-green-600" />
                </div>
                <div>
                    <p className="text-xs text-gray-400 font-bold uppercase">Cobertura</p>
                    <p className="font-bold text-gray-800">Familiar Total</p>
                </div>
              </div>
              <div className="h-24 w-full rounded-lg overflow-hidden relative">
                 <img src={images.family} className="object-cover w-full h-full" alt="Família" />
              </div>
            </motion.div>

            {/* Card Flutuante 2: Logo/Badge */}
            <motion.div
               animate={{ y: [0, -15, 0] }}
               transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
               className="absolute top-10 left-10 md:left-20 z-0 opacity-60 md:opacity-100"
            >
                <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-brand-wine-DEFAULT to-brand-wine-light flex items-center justify-center shadow-lg text-white font-bold text-3xl">
                    U
                </div>
            </motion.div>

          </div>
        </div>
      </div>
    </section>
  );
}