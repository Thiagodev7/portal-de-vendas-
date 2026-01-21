"use client";

import { useState } from "react";
import { MOCK_PLANS } from "../services/mock-plans";
import { PlanCard } from "./plan-card";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function PlansSection() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  return (
    <section className="pb-32 pt-2 relative overflow-hidden bg-white" id="planos">
      
      {/* Background Decorativo */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{ 
               backgroundImage: 'radial-gradient(#810e56 1.5px, transparent 1.5px)', 
               backgroundSize: '24px 24px' 
           }}>
      </div>

      <div className="container px-4 md:px-6 mx-auto relative z-10">
        
        {/* CONTROLE DE CICLO */}
        <div className="flex flex-col items-center justify-center mb-16">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">
                Como você prefere pagar?
            </span>
            
            <div className="bg-gray-100 p-1.5 rounded-full shadow-inner inline-flex relative">
              <button
                onClick={() => setBillingCycle("monthly")}
                className="relative px-8 py-3 w-36 rounded-full focus:outline-none transition-colors duration-200"
              >
                {billingCycle === "monthly" && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-brand-wine rounded-full shadow-lg shadow-brand-wine/30"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className={cn(
                    "relative z-10 text-sm font-bold transition-colors duration-200",
                    billingCycle === "monthly" ? "text-white" : "text-gray-500 hover:text-gray-900"
                )}>
                    Mensal
                </span>
              </button>

              <button
                onClick={() => setBillingCycle("yearly")}
                className="relative px-8 py-3 w-36 rounded-full focus:outline-none transition-colors duration-200 flex items-center justify-center gap-2"
              >
                {billingCycle === "yearly" && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-brand-wine rounded-full shadow-lg shadow-brand-wine/30"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className={cn(
                    "relative z-10 text-sm font-bold transition-colors duration-200 flex items-center gap-2",
                    billingCycle === "yearly" ? "text-white" : "text-gray-500 hover:text-gray-900"
                )}>
                    Anual
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide",
                      billingCycle === "yearly" ? "bg-white text-brand-wine" : "bg-green-100 text-green-700"
                    )}>
                      -10%
                    </span>
                </span>
              </button>
            </div>
        </div>

        {/* GRID DE PLANOS - CORRIGIDO PARA MOSTRAR TODOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 items-start justify-center max-w-[1400px] mx-auto">
          {MOCK_PLANS.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex h-full justify-center"
            >
              <PlanCard plan={plan} isAnnual={billingCycle === "yearly"} />
            </motion.div>
          ))}
        </div>

        {/* Link de Apoio */}
        <div className="mt-20 text-center border-t border-gray-100 pt-10">
             <p className="text-gray-500 text-sm">
                Precisa de ajuda para escolher? <br className="sm:hidden"/>
                <a href="#" className="text-brand-wine font-bold hover:underline transition-all ml-1">
                    Fale com nossos especialistas
                </a>
             </p>
        </div>

      </div>
    </section>
  );
}