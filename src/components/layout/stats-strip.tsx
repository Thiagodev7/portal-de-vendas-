"use client";

import { motion } from "framer-motion";
import { Users, Building2, MapPin, Award } from "lucide-react";

const stats = [
  { id: 1, label: "Clientes Satisfeitos", value: "+450 Mil", icon: Users },
  { id: 2, label: "Dentistas Cooperados", value: "+2.500", icon: Building2 },
  { id: 3, label: "Pontos de Atendimento", value: "Nacional", icon: MapPin },
  { id: 4, label: "Anos de História", value: "40 Anos", icon: Award },
];

export function StatsStrip() {
  return (
    <section className="bg-brand-wine-ultra text-white py-12 relative overflow-hidden">
        {/* Pattern de fundo sutil */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        
        <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {stats.map((stat, index) => (
                    <motion.div 
                        key={stat.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        viewport={{ once: true }}
                        className="flex flex-col items-center text-center group cursor-default"
                    >
                        <div className="mb-4 p-3 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                            <stat.icon className="w-6 h-6 text-brand-cyan" />
                        </div>
                        <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1">{stat.value}</h3>
                        <p className="text-sm md:text-base text-gray-300 font-medium">{stat.label}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    </section>
  );
}