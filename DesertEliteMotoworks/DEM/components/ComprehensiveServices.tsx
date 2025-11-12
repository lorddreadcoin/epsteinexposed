'use client';

import { motion } from 'framer-motion';
import { Award, Wrench, Sparkles, Shield, Settings, Gauge, Radio, Truck, Zap, CheckCircle, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface ServiceCategory {
  icon: React.ReactNode;
  title: string;
  tagline: string;
  services: string[];
  featured?: boolean;
}

const serviceCategories: ServiceCategory[] = [
  {
    icon: <Award className="w-full h-full" />,
    title: "Elite Restorations & Custom Builds",
    tagline: "Concours-level craftsmanship for collectors and enthusiasts",
    services: [
      "Complete frame-off restorations",
      "Period-correct classic car restoration",
      "Restomod conversions & modernization",
      "Custom engine swaps & performance builds",
      "Show car preparation & detailing",
      "Documentation & provenance services",
    ],
    featured: true,
  },
  {
    icon: <Truck className="w-full h-full" />,
    title: "Truck & Off-Road Specialists",
    tagline: "From daily drivers to rock crawling beasts",
    services: [
      "Full suspension lift kits (2\" - 12\")",
      "Rock crawling suspension setups",
      "Overlanding & expedition builds",
      "Long-travel suspension systems",
      "Differential & axle upgrades",
      "Skid plate & armor installation",
      "Winch & recovery equipment",
      "Off-road lighting systems",
    ],
  },
  {
    icon: <Settings className="w-full h-full" />,
    title: "Precision Maintenance Services",
    tagline: "Expert care for daily drivers and luxury vehicles",
    services: [
      "Comprehensive oil service & fluid changes",
      "Brake system service & upgrades",
      "Suspension repair & replacement",
      "Steering system diagnostics & repair",
      "Cooling system service",
      "Belt & hose replacement",
      "Battery service & electrical diagnostics",
      "Pre-purchase inspections",
    ],
  },
  {
    icon: <Zap className="w-full h-full" />,
    title: "Performance Upgrades",
    tagline: "Unlock your vehicle's full potential",
    services: [
      "Engine performance tuning",
      "Exhaust system upgrades",
      "Cold air intake installation",
      "Turbo & supercharger installation",
      "Transmission upgrades",
      "Suspension performance packages",
      "Brake performance upgrades",
      "Dyno tuning services (partnered)",
    ],
  },
  {
    icon: <Radio className="w-full h-full" />,
    title: "Audio & Electronics Installation",
    tagline: "Premium sound systems and entertainment",
    services: [
      "Custom audio system design & installation",
      "Subwoofer box fabrication & builds",
      "Amplifier installation & tuning",
      "Interior TV & entertainment systems",
      "Backup camera & parking sensors",
      "Remote start & security systems",
      "LED lighting installations",
      "Complete wire harness fabrication",
    ],
  },
  {
    icon: <Gauge className="w-full h-full" />,
    title: "Diagnostic & Repair Services",
    tagline: "Advanced diagnostics for all makes and models",
    services: [
      "Computer diagnostics & programming",
      "Check engine light diagnosis",
      "Electrical system troubleshooting",
      "AC & heating system repair",
      "Fuel system service & repair",
      "Transmission diagnostics & service",
      "Emissions testing & repair",
      "Complex electrical repairs",
    ],
  },
  {
    icon: <Sparkles className="w-full h-full" />,
    title: "Specialty Services",
    tagline: "Unique solutions for unique needs",
    services: [
      "European & exotic vehicle specialists",
      "Classic car electrical conversions",
      "Custom fabrication work",
      "Welding & metal work",
      "Paint prep & body alignment",
      "Interior upgrades & modifications",
      "Machine work coordination (outsourced)",
      "Tire service coordination (outsourced)",
    ],
  },
  {
    icon: <Shield className="w-full h-full" />,
    title: "White Glove Concierge",
    tagline: "Premium service experience",
    services: [
      "Free vehicle pickup & delivery",
      "Daily photo & video progress updates",
      "Loaner vehicle program (select services)",
      "Dedicated service advisor",
      "Detailed service reports",
      "Maintenance reminder service",
      "Priority scheduling for existing clients",
      "After-hours emergency consultation",
    ],
    featured: true,
  },
];

function ServiceCategoryCard({ category, index }: { category: ServiceCategory; index: number }) {
  const [isExpanded, setIsExpanded] = useState(category.featured || false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`group relative rounded-2xl overflow-hidden transition-all duration-300 ${
        category.featured
          ? 'bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-2 border-amber-500/30'
          : 'bg-zinc-900/50 border border-zinc-800 hover:border-amber-500/30'
      }`}
    >
      {/* Featured badge */}
      {category.featured && (
        <div className="absolute top-4 right-4 px-3 py-1 bg-amber-500 text-black text-xs font-bold rounded-full">
          SIGNATURE SERVICE
        </div>
      )}

      {/* Header */}
      <div
        className="p-6 md:p-8 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start space-x-4 mb-4">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-12 h-12 md:w-16 md:h-16 text-amber-400 flex-shrink-0"
          >
            {category.icon}
          </motion.div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl md:text-2xl font-bold mb-2 group-hover:text-amber-400 transition-colors">
                  {category.title}
                </h3>
                <p className="text-zinc-400 text-sm md:text-base">{category.tagline}</p>
              </div>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                className="ml-4"
              >
                <ChevronDown className="w-6 h-6 text-amber-400" />
              </motion.div>
            </div>
          </div>
        </div>

        {/* Service count preview */}
        <div className="text-sm text-zinc-500 flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-amber-400" />
          <span>{category.services.length} specialized services</span>
        </div>
      </div>

      {/* Expandable services list */}
      <motion.div
        initial={false}
        animate={{
          height: isExpanded ? 'auto' : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <div className="px-6 md:px-8 pb-6 md:pb-8 border-t border-zinc-800/50">
          <div className="grid md:grid-cols-2 gap-3 mt-6">
            {category.services.map((service, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-start space-x-3 text-sm"
              >
                <CheckCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-300">{service}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ComprehensiveServices() {
  const [showAll, setShowAll] = useState(false);

  const displayedCategories = showAll ? serviceCategories : serviceCategories.slice(0, 4);

  return (
    <section id="services" className="py-24 md:py-32 bg-black relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 to-black" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 md:mb-20"
        >
          <p className="text-amber-400 text-sm font-semibold tracking-widest mb-4">
            COMPREHENSIVE SERVICES
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
              Full-Service Automotive Excellence
            </span>
          </h2>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto">
            From everyday maintenance to elite restorations, we handle it all with the same meticulous attention to detail
          </p>
        </motion.div>

        {/* Service Categories */}
        <div className="space-y-6">
          {displayedCategories.map((category, index) => (
            <ServiceCategoryCard key={index} category={category} index={index} />
          ))}
        </div>

        {/* Show More/Less Button */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <motion.button
            onClick={() => setShowAll(!showAll)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/50 
                       rounded-full font-semibold transition-all flex items-center space-x-3 mx-auto"
          >
            <span>{showAll ? 'Show Less' : 'View All Services'}</span>
            <motion.div
              animate={{ rotate: showAll ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDown className="w-5 h-5 text-amber-400" />
            </motion.div>
          </motion.button>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 p-8 md:p-12 bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl text-center"
        >
          <h3 className="text-2xl md:text-3xl font-bold mb-4">
            Don't See What You Need?
          </h3>
          <p className="text-zinc-400 mb-6 max-w-2xl mx-auto">
            We handle virtually every automotive service except in-house tire mounting and machine shop work 
            (which we coordinate with trusted partners). If it involves your vehicle, we can help.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="tel:+17608998244"
              className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-full 
                         transition-all shadow-lg shadow-amber-500/50 flex items-center space-x-2"
            >
              <span>Call to Discuss Your Project</span>
              <span className="font-normal">(760) 899-8244</span>
            </a>
            <a
              href="#contact"
              className="px-8 py-4 border-2 border-zinc-700 hover:border-amber-500 rounded-full 
                         font-semibold transition-all"
            >
              Request a Quote
            </a>
          </div>
        </motion.div>

        {/* Transparency Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 p-6 bg-zinc-900/30 border border-zinc-800 rounded-xl"
        >
          <h4 className="text-lg font-bold mb-3 text-center">Honest About What We Don't Do In-House</h4>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-zinc-400">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-zinc-600 rounded-full"></div>
              <span>Tire Mounting & Balancing <span className="text-amber-400">(We coordinate)</span></span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-zinc-600 rounded-full"></div>
              <span>Machine Shop Services <span className="text-amber-400">(We coordinate)</span></span>
            </div>
          </div>
          <p className="text-center text-xs text-zinc-500 mt-4">
            We partner with trusted specialists for these services and handle all coordination for you
          </p>
        </motion.div>

        {/* Service Guarantees */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center p-6 bg-zinc-900/50 rounded-xl border border-zinc-800"
          >
            <Shield className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <h4 className="font-bold mb-2">Lifetime Warranty</h4>
            <p className="text-sm text-zinc-400">On all labor performed</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-center p-6 bg-zinc-900/50 rounded-xl border border-zinc-800"
          >
            <Award className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <h4 className="font-bold mb-2">ASE Certified</h4>
            <p className="text-sm text-zinc-400">Master technicians on staff</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-center p-6 bg-zinc-900/50 rounded-xl border border-zinc-800"
          >
            <Sparkles className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <h4 className="font-bold mb-2">Premium Parts</h4>
            <p className="text-sm text-zinc-400">OEM or better quality</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
