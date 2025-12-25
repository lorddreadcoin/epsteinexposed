'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles, MousePointer, MessageSquare, FileText } from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position?: 'center' | 'top-right' | 'bottom-left' | 'bottom-center';
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Epstein Exposed',
    description: 'The most comprehensive public investigation platform. We\'ve processed 11,622 DOJ documents and cross-referenced them with leaked flight logs and the infamous Black Book.',
    icon: <Sparkles className="w-8 h-8" />,
    position: 'center',
  },
  {
    id: 'graph',
    title: 'Interactive Entity Graph',
    description: 'Each node represents a person, location, or organization extracted from the documents. Node size indicates how many documents mention them. Connections show co-occurrences.',
    icon: <div className="w-8 h-8 rounded-full bg-[#00d4ff]/30 border-2 border-[#00d4ff]" />,
    position: 'center',
  },
  {
    id: 'select',
    title: 'Select & Analyze',
    description: 'Click a node to see details. CTRL+Click multiple nodes, then hit "Analyze Connection" to discover how they\'re linked across thousands of documents.',
    icon: <MousePointer className="w-8 h-8" />,
    position: 'center',
  },
  {
    id: 'chat',
    title: 'AI-Powered Investigation',
    description: 'Ask questions in natural language. Our AI searches through all documents and responds with citations you can click to view the actual source PDFs.',
    icon: <MessageSquare className="w-8 h-8" />,
    position: 'center',
  },
  {
    id: 'sources',
    title: 'Cross-Referenced Sources',
    description: 'Look for source badges: 📓 Black Book (1,971 contacts), ✈️ Flight Logs (700+ flights), 📄 DOJ Documents. Entities in multiple sources are HIGH-VALUE TARGETS.',
    icon: <FileText className="w-8 h-8" />,
    position: 'center',
  },
  {
    id: 'donate',
    title: 'Support the Mission',
    description: 'This platform is free and open to the public. Donations help maintain the infrastructure and support ongoing research. A portion of all donations is dedicated to supporting Epstein victims.',
    icon: <div className="w-8 h-8 flex items-center justify-center text-2xl">💚</div>,
    position: 'center',
  },
];

const STORAGE_KEY = 'epstein-exposed-onboarding-complete';

export function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      setTimeout(() => setIsOpen(true), 500);
    }
  }, []);
  
  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
  };
  
  const handleSkip = () => {
    handleComplete();
  };
  
  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };
  
  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const step = ONBOARDING_STEPS[currentStep];
  
  if (!step) return null;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={handleSkip}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed z-50 w-full max-w-lg bg-[#12121a] border border-[#ffffff15] rounded-2xl shadow-2xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 p-2 text-[#606070] hover:text-white rounded-lg hover:bg-[#ffffff10] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-8">
              <motion.div
                key={step.id}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00d4ff]/20 to-[#a855f7]/20 
                           border border-[#00d4ff]/30 flex items-center justify-center text-[#00d4ff] mb-6"
              >
                {step.icon}
              </motion.div>
              
              <motion.h2
                key={`title-${step.id}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-2xl font-bold text-white mb-3"
              >
                {step.title}
              </motion.h2>
              
              <motion.p
                key={`desc-${step.id}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-[#a0a0b0] leading-relaxed"
              >
                {step.description}
              </motion.p>
              
              <div className="flex items-center justify-center gap-2 mt-8">
                {ONBOARDING_STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`
                      w-2 h-2 rounded-full transition-all duration-300
                      ${i === currentStep 
                        ? 'w-6 bg-[#00d4ff]' 
                        : i < currentStep 
                          ? 'bg-[#00d4ff]/50' 
                          : 'bg-[#ffffff20]'
                      }
                    `}
                  />
                ))}
              </div>
              
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#ffffff10]">
                <button
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                    ${currentStep === 0
                      ? 'text-[#404050] cursor-not-allowed'
                      : 'text-[#a0a0b0] hover:text-white hover:bg-[#ffffff10]'
                    }
                  `}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSkip}
                    className="px-4 py-2 text-[#606070] hover:text-white transition-colors"
                  >
                    Skip tour
                  </button>
                  
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#00d4ff] text-black font-semibold 
                             rounded-lg hover:bg-[#00d4ff]/90 transition-colors"
                  >
                    {currentStep === ONBOARDING_STEPS.length - 1 ? 'Start Investigating' : 'Next'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function useResetOnboarding() {
  return () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };
}
