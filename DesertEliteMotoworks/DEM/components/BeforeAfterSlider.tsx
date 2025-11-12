'use client';
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BeforeAfterProps {
  before: string;
  after: string;
  title: string;
  description?: string;
}

export default function BeforeAfterSlider({ before, after, title, description }: BeforeAfterProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Custom image positioning based on vehicle
  const getImageStyle = () => {
    if (title.includes('Porsche 911')) {
      return { objectPosition: 'center 35%' }; // Push up to show more of the car
    }
    if (title.includes('Mustang Fastback')) {
      return { objectPosition: 'center 35%' }; // Push up to show more of the car
    }
    if (title.includes('Camaro SS')) {
      return { objectPosition: 'center 30%', transform: 'scale(0.85)' }; // Zoom out slightly and push up
    }
    return { objectPosition: 'center center' }; // Default
  };

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const position = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, position)));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) handleMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) handleMove(e.touches[0].clientX);
  };

  const handleInteractionStart = () => setIsDragging(true);
  const handleInteractionEnd = () => setIsDragging(false);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    const handleGlobalTouchEnd = () => setIsDragging(false);
    
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchend', handleGlobalTouchEnd);
    
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      className="relative w-full aspect-video rounded-2xl overflow-hidden group shadow-2xl"
    >
      <div
        ref={containerRef}
        className="relative w-full h-full cursor-ew-resize select-none"
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onMouseDown={handleInteractionStart}
        onTouchStart={handleInteractionStart}
      >
        {/* After image (full) */}
        <div className="absolute inset-0 bg-zinc-900">
          <img 
            src={after} 
            alt="After restoration" 
            className="w-full h-full object-cover"
            style={getImageStyle()}
            draggable={false}
          />
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="absolute top-6 right-6 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 
                       text-black font-bold rounded-lg shadow-lg text-sm md:text-base"
          >
            AFTER
          </motion.div>
        </div>

        {/* Before image (clipped) */}
        <div 
          className="absolute inset-0 overflow-hidden transition-all duration-100"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img 
            src={before} 
            alt="Before restoration" 
            className="w-full h-full object-cover"
            style={getImageStyle()}
            draggable={false}
          />
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="absolute top-6 left-6 px-5 py-2.5 bg-zinc-800/90 backdrop-blur-sm 
                       text-white font-bold rounded-lg shadow-lg text-sm md:text-base"
          >
            BEFORE
          </motion.div>
        </div>

        {/* Slider line and handle */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Handle - DRAGGABLE */}
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                       w-16 h-16 bg-white rounded-full shadow-2xl
                       flex items-center justify-center cursor-grab active:cursor-grabbing
                       border-4 border-zinc-900 z-50"
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
            animate={isDragging ? { scale: 1.1 } : {}}
            onMouseDown={handleInteractionStart}
            onTouchStart={handleInteractionStart}
          >
            <div className="flex items-center space-x-0.5">
              <ChevronLeft className="w-6 h-6 text-zinc-900" />
              <ChevronRight className="w-6 h-6 text-zinc-900" />
            </div>
          </motion.div>

          {/* Top and bottom indicators */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full shadow-lg border-2 border-zinc-900" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full shadow-lg border-2 border-zinc-900" />
        </div>
      </div>

      {/* Title and description overlay */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-0 left-0 right-0 p-6 md:p-8 
                   bg-gradient-to-t from-black/95 via-black/80 to-transparent"
      >
        <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-2">{title}</h3>
        {description && (
          <p className="text-zinc-300 text-sm md:text-base">{description}</p>
        )}
        <p className="text-amber-400 text-sm mt-2 font-medium">
          {isDragging ? 'Release to stop' : 'Drag to reveal transformation'}
        </p>
      </motion.div>

      {/* Hint animation on first load */}
      <motion.div
        initial={{ opacity: 1, x: 0 }}
        animate={{ opacity: 0, x: 20 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      >
        <motion.div
          animate={{ x: [-10, 10, -10] }}
          transition={{ duration: 1.5, repeat: 2 }}
          className="text-white text-lg font-bold bg-black/70 px-6 py-3 rounded-full backdrop-blur-sm"
        >
          Drag to compare →
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
