'use client';

import { motion } from 'framer-motion';
import { Wrench, Zap, Radio, Truck, Settings, Award, Gauge, Sparkles } from 'lucide-react';

const quickServices = [
  { icon: Award, label: "Elite Restorations" },
  { icon: Wrench, label: "Oil Changes" },
  { icon: Settings, label: "Brake Service" },
  { icon: Gauge, label: "Suspension Work" },
  { icon: Truck, label: "Lift Kits" },
  { icon: Zap, label: "Performance Upgrades" },
  { icon: Radio, label: "Audio Systems" },
  { icon: Sparkles, label: "Custom Fabrication" },
];

export default function ServicesQuickView() {
  return (
    <section className="py-16 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h3 className="text-2xl md:text-3xl font-bold text-zinc-300">
            We Specialize In <span className="text-amber-400">Everything</span> Automotive
          </h3>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {quickServices.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="flex flex-col items-center p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 
                           hover:border-amber-500/50 transition-all cursor-pointer group"
              >
                <Icon className="w-8 h-8 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs text-center text-zinc-400 group-hover:text-zinc-300 transition-colors">
                  {service.label}
                </span>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center text-zinc-500 text-sm mt-8"
        >
          <span className="text-zinc-400">Plus: Diagnostics, Electrical, AC Service, and More</span> • 
          <span className="text-amber-400 ml-1">Tire & Machine Work Coordinated</span>
        </motion.p>
      </div>
    </section>
  );
}
