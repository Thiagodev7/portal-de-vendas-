"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
// 1. Adicione a importação de 'Variants' aqui
import { motion, Variants } from "framer-motion"; 

export function HeroSection() {
  
  // 2. Tipe explicitamente a variável como ': Variants'
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  // 3. Tipe esta também. Isso força o TS a entender que "spring" é um valor válido.
  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 } 
    },
  };

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-br from-white via-blue-50/30 to-purple-50/50 pt-10 pb-20 lg:pt-24 lg:pb-32">
      
      {/* Background Decorativo */}
      <div className="absolute top-0 right-0 -z-10 translate-x-1/3 -translate-y-1/4 opacity-10">
        <div className="h-[600px] w-[600px] rounded-full bg-primary blur-3xl" />
      </div>
      <div className="absolute bottom-0 left-0 -z-10 -translate-x-1/3 translate-y-1/4 opacity-20">
        <div className="h-[500px] w-[500px] rounded-full bg-secondary blur-3xl" />
      </div>

      <div className="container mx-auto px-4 md:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          
          {/* CONTEÚDO ESQUERDA */}
          <motion.div 
            className="flex flex-col justify-center space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary backdrop-blur-sm">
                <Sparkles className="mr-2 h-3.5 w-3.5 text-brand-wine-light" />
                <span className="text-xs md:text-sm">O plano odontológico mais completo de Goiás</span>
              </div>
              
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl xl:text-6xl">
                Sorria com a segurança de quem é <span className="text-primary relative whitespace-nowrap">
                  Líder
                  <svg className="absolute -bottom-2 left-0 w-full h-3 text-secondary/60 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                  </svg>
                </span>
              </h1>
              
              <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Planos individuais e familiares com cobertura completa, sem coparticipação e com a maior rede de dentistas cooperados.
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-col gap-3 min-[400px]:flex-row">
              <Button size="lg" className="h-14 px-8 text-base font-semibold shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-1 transition-all duration-300">
                Ver Planos Disponíveis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-base border-2 hover:bg-gray-50">
                Falar com Consultor
              </Button>
            </motion.div>

            <motion.div variants={itemVariants} className="pt-4 border-t border-gray-100 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-secondary" />
                <span>Sem carência*</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-secondary" />
                <span>Urgência 24h</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-secondary" />
                <span>Regulamentado ANS</span>
              </div>
            </motion.div>
          </motion.div>

          {/* CONTEÚDO DIREITA */}
          <motion.div 
            className="relative mx-auto w-full max-w-[500px] lg:max-w-none"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            {/* Cartão Flutuante Principal */}
            <div className="relative aspect-square md:aspect-[4/3] lg:aspect-square bg-gradient-to-br from-primary to-brand-wine-ultra rounded-[2rem] shadow-2xl overflow-hidden p-8 flex flex-col justify-between text-white border border-white/20">
              
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-secondary/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" />

              <div className="relative z-10">
                <div className="inline-block bg-white/20 backdrop-blur-md rounded-lg px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-4 border border-white/10">
                  Destaque
                </div>
                <h3 className="text-3xl font-bold mb-2">Uniodonto Ouro</h3>
                <p className="text-white/80">Cobertura total para você e sua família.</p>
              </div>

              <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 mt-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm">R$</span>
                  <span className="text-4xl font-bold">49</span>
                  <span className="text-xl">,90</span>
                  <span className="text-sm text-white/70">/mês</span>
                </div>
                <div className="mt-2 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-secondary" 
                    initial={{ width: 0 }}
                    animate={{ width: "80%" }}
                    transition={{ delay: 1, duration: 1.5 }}
                  />
                </div>
                <p className="text-xs mt-2 text-white/60">Mais de 5.000 vidas seguradas este mês</p>
              </div>
            </div>

            {/* Floating Card Pequeno */}
            <motion.div 
              className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 border border-gray-100 flex items-center gap-3 max-w-[200px]"
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            >
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 font-bold uppercase">Aprovado</span>
                <span className="text-sm font-bold text-gray-900">Nota Máxima ANS</span>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}