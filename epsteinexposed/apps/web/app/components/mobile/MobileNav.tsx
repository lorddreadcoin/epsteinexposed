'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, X, Search, MessageSquare, Clock, 
  GitCompare, Settings, HelpCircle, Share2
} from 'lucide-react';

interface MobileNavProps {
  onOpenSearch?: () => void;
  onOpenChat?: () => void;
  onOpenTimeline?: () => void;
  onOpenComparison?: () => void;
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
  activeTab?: 'graph' | 'chat' | 'timeline';
}

export function MobileNav({
  onOpenSearch,
  onOpenChat,
  onOpenTimeline,
  onOpenComparison,
  onOpenSettings,
  onOpenHelp,
  activeTab = 'graph',
}: MobileNavProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const navItems = [
    { id: 'graph', icon: Share2, label: 'Graph', action: () => {} },
    { id: 'search', icon: Search, label: 'Search', action: onOpenSearch },
    { id: 'chat', icon: MessageSquare, label: 'Chat', action: onOpenChat },
    { id: 'menu', icon: Menu, label: 'More', action: () => setIsDrawerOpen(true) },
  ];
  
  const drawerItems = [
    { icon: Clock, label: 'Timeline View', action: onOpenTimeline },
    { icon: GitCompare, label: 'Compare Entities', action: onOpenComparison },
    { icon: Settings, label: 'Settings', action: onOpenSettings },
    { icon: HelpCircle, label: 'Help & Shortcuts', action: onOpenHelp },
  ];
  
  return (
    <>
      {/* Bottom Navigation Bar - Mobile Only */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#12121a]/95 backdrop-blur-sm border-t border-[#ffffff10] sm:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={item.action}
              className={`
                flex flex-col items-center justify-center w-full h-full gap-1
                transition-colors
                ${activeTab === item.id 
                  ? 'text-[#00d4ff]' 
                  : 'text-[#606070] active:text-white'
                }
              `}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
      
      {/* Slide-out Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 sm:hidden"
              onClick={() => setIsDrawerOpen(false)}
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-[#12121a] border-l border-[#ffffff10] z-50 sm:hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-[#ffffff10]">
                <h2 className="text-lg font-semibold text-white">Menu</h2>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 text-[#606070] hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 space-y-2">
                {drawerItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      item.action?.();
                      setIsDrawerOpen(false);
                    }}
                    className="flex items-center gap-3 w-full p-3 rounded-lg text-[#a0a0b0] 
                               hover:bg-[#ffffff08] hover:text-white transition-colors"
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#ffffff10]">
                <div className="text-center">
                  <p className="text-xs text-[#606070]">Epstein Exposed</p>
                  <p className="text-[10px] text-[#404050]">11,622 documents indexed</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
