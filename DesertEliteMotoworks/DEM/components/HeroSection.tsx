'use client';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Star, Phone, Calendar, ArrowRight, ChevronDown, BadgeCheck, Shield, Award, Sparkles } from 'lucide-react';

export default function HeroSection() {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Luxury Background Image with Overlays */}
      <div className="absolute inset-0">
        {/* Main background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/images/hero-luxury-bg.png')`,
            backgroundPosition: 'center center',
            backgroundSize: 'cover',
          }}
        />
        
        {/* Lighter gradient overlays - let the image shine through */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
        
        {/* Subtle vignette effect for depth - lighter */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0.5) 100%)'
        }} />
        
        {/* Very subtle blur - keep image sharp */}
        <div className="absolute inset-0 backdrop-blur-[0.5px]" />
        
        {/* Animated amber accent glow (complements gold in image) */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-amber-900/15 via-transparent to-amber-900/10"
          animate={{
            opacity: [0.3, 0.5, 0.3],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Subtle animated grain texture for luxury feel */}
        <div 
          className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Floating light particles (subtle, premium effect) */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-amber-400/20 rounded-full blur-sm"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -40, 0],
              opacity: [0, 0.6, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeInOut"
            }}
          />
        ))}
        
        {/* Premium diagonal shine effect (like luxury car paint) */}
        <motion.div
          className="absolute inset-0 opacity-20"
          style={{
            background: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)',
            backgroundSize: '200% 200%',
          }}
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center justify-center">
        <div className="max-w-7xl mx-auto px-6 text-center">
          
          {/* Animated Trust Badge */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="inline-flex items-center space-x-3 px-6 py-3 mb-8
                       bg-black/60 backdrop-blur-xl border border-amber-500/40 rounded-full
                       shadow-2xl shadow-amber-500/30"
            style={{
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(217, 119, 6, 0.2)'
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              <Star className="w-5 h-5 fill-amber-400 text-amber-400 drop-shadow-lg" />
            </motion.div>
            <span className="animate-shimmer font-bold tracking-wider text-sm md:text-base"
                  style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.9)' }}>
              4.9 STARS · 64 REVIEWS · CA BAR LICENSED ARD00306932
            </span>
          </motion.div>

          {/* Main Headline with Staggered Animation */}
          <div className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black leading-none mb-4">
                <span className="block animate-shimmer"
                      style={{ 
                        textShadow: '0 0 40px rgba(251,191,36,1), 0 0 80px rgba(251,191,36,0.6), 0 4px 20px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,1)',
                        filter: 'drop-shadow(0 0 30px rgba(251,191,36,0.8)) brightness(1.2)',
                        WebkitTextStroke: '1px rgba(217, 119, 6, 0.3)'
                      }}>
                  AUTOMOTIVE
                </span>
              </h1>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black leading-none mb-4">
                <span className="block bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent"
                      style={{ 
                        textShadow: '0 0 30px rgba(255,255,255,0.8), 0 4px 20px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,1)',
                        filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.5)) brightness(1.3)',
                        WebkitTextStroke: '1px rgba(255, 255, 255, 0.2)'
                      }}>
                  EXCELLENCE
                </span>
              </h1>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black">
                <span className="block animate-shimmer"
                      style={{ 
                        textShadow: '0 0 40px rgba(251,191,36,1), 0 0 80px rgba(251,191,36,0.6), 0 4px 20px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,1)',
                        filter: 'drop-shadow(0 0 35px rgba(251,191,36,0.9)) brightness(1.2)',
                        WebkitTextStroke: '1px rgba(217, 119, 6, 0.3)'
                      }}>
                  REDEFINED
                </span>
              </h1>
            </motion.div>
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="text-xl md:text-2xl lg:text-3xl mb-12 max-w-4xl mx-auto font-light leading-relaxed"
          >
            <span className="text-zinc-100" 
                  style={{ textShadow: '0 0 20px rgba(255,255,255,0.5), 0 2px 12px rgba(0, 0, 0, 0.9), 0 1px 4px rgba(0, 0, 0, 1)' }}>
              Where million-dollar restorations meet white-glove service.
            </span>
            <br />
            <span className="animate-shimmer font-bold" 
                  style={{ 
                    textShadow: '0 0 30px rgba(251,191,36,0.9), 0 0 60px rgba(251,191,36,0.5), 0 2px 10px rgba(0, 0, 0, 1)',
                    filter: 'brightness(1.2)'
                  }}>
              The Coachella Valley's only CA BAR licensed luxury facility.
            </span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16"
          >
            <motion.a
              href="#contact"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group relative px-10 py-5 bg-gradient-to-r from-amber-500 to-amber-600 
                         text-black text-lg md:text-xl font-bold rounded-full overflow-hidden
                         shadow-2xl shadow-amber-500/50 hover:shadow-amber-500/70 transition-all"
            >
              <div className="relative z-10 flex items-center space-x-3">
                <Calendar className="w-6 h-6" />
                <span>Schedule Private Consultation</span>
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="w-6 h-6" />
                </motion.div>
              </div>
            </motion.a>

            <motion.a
              href="tel:+17608998244"
              whileHover={{ scale: 1.05, borderColor: 'rgba(245, 158, 11, 1)' }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-5 border-2 border-white/30 backdrop-blur-xl
                         text-white text-lg md:text-xl font-bold rounded-full
                         hover:bg-white/10 transition-all shadow-xl"
            >
              <span className="flex items-center space-x-3">
                <Phone className="w-6 h-6" />
                <span>(760) 899-8244</span>
              </span>
            </motion.a>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.6 }}
            className="flex flex-wrap justify-center gap-6 md:gap-8 text-sm text-zinc-400"
          >
            <motion.div 
              className="flex items-center space-x-2 group cursor-pointer"
              whileHover={{ scale: 1.1 }}
            >
              <BadgeCheck className="w-5 h-5 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)] group-hover:drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
              <span className="group-hover:text-amber-400 transition-colors" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>CA BAR Licensed</span>
            </motion.div>
            <motion.div 
              className="flex items-center space-x-2 group cursor-pointer"
              whileHover={{ scale: 1.1 }}
            >
              <Shield className="w-5 h-5 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)] group-hover:drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
              <span className="group-hover:text-amber-400 transition-colors" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>Lifetime Warranty</span>
            </motion.div>
            <motion.div 
              className="flex items-center space-x-2 group cursor-pointer"
              whileHover={{ scale: 1.1 }}
            >
              <Award className="w-5 h-5 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)] group-hover:drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
              <span className="group-hover:text-amber-400 transition-colors" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>ASE Certified</span>
            </motion.div>
            <motion.div 
              className="flex items-center space-x-2 group cursor-pointer"
              whileHover={{ scale: 1.1 }}
            >
              <Sparkles className="w-5 h-5 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)] group-hover:drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
              <span className="group-hover:text-amber-400 transition-colors" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>White Glove Service</span>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Animated Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex flex-col items-center text-amber-400 cursor-pointer"
          onClick={() => document.getElementById('stats')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <span className="text-xs tracking-widest mb-2 font-semibold">DISCOVER MORE</span>
          <ChevronDown className="w-6 h-6" />
        </motion.div>
      </motion.div>
    </section>
  );
}
