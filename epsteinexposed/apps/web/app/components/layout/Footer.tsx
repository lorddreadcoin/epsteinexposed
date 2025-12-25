'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export function Footer() {
  const [copied, setCopied] = useState(false);
  
  const copyBTC = () => {
    navigator.clipboard.writeText('bc1qyh3yj9ga7dt2npgvdk2mywxt6krgye249md9ax');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-gray-950/95 backdrop-blur-md border-t border-cyan-900/30 py-3 px-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Branding */}
        <div className="flex items-center gap-2">
          <Image src="/vatra-logo.png" alt="Vatra Labs" width={28} height={28} className="rounded" />
          <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Built by Danks of Vatra Labs AI Company
          </span>
        </div>
        
        {/* Disclaimer */}
        <p className="text-base text-gray-400 text-center hidden md:block">
          Research & educational purposes only • Public DOJ documents
        </p>
        
        {/* Links & Donations */}
        <div className="flex items-center gap-3 text-base font-medium">
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500 mb-0.5">Follow on X.com</span>
            <Link 
              href="https://x.com/danksterintel" 
              target="_blank"
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              @danksterintel
            </Link>
          </div>
          
          <span className="text-gray-700">|</span>
          
          <span className="text-gray-500">Donate:</span>
          <Link 
            href="https://venmo.com/code?user_id=1936415466192896380&created=1766623404"
            target="_blank"
            className="px-2 py-1 bg-[#008CFF]/20 text-[#008CFF] rounded hover:bg-[#008CFF]/30 transition-colors flex items-center gap-1"
            title="Donate via Venmo"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.83 4.39c.8 1.24 1.17 2.54 1.17 4.15 0 5.18-4.39 11.19-7.98 16.46H7.16L3.5 4.39h5.66l1.96 11.03c1.49-2.41 3.29-5.93 3.29-8.57 0-1.29-.26-2.25-.66-2.97l5.08-.49z"/>
            </svg>
          </Link>
          <Link 
            href="https://cash.app/$dankstervision"
            target="_blank"
            className="px-2 py-1 bg-[#00D632]/20 text-[#00D632] rounded hover:bg-[#00D632]/30 transition-colors flex items-center gap-1"
            title="Donate via Cash App"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
            </svg>
          </Link>
          <button
            onClick={copyBTC}
            className="px-2 py-1 bg-[#F7931A]/20 text-[#F7931A] rounded hover:bg-[#F7931A]/30 transition-colors flex items-center gap-1"
            title="Copy Bitcoin address: bc1qyh3yj9ga7dt2npgvdk2mywxt6krgye249md9ax"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.525 2.107c-.345-.087-.705-.167-1.064-.25l.526-2.127-1.32-.33-.54 2.165c-.285-.067-.565-.132-.84-.2l-1.815-.45-.35 1.407s.975.225.955.236c.535.136.63.486.615.766l-1.477 5.92c-.075.166-.24.406-.614.314.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.54-2.17c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.257 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.68-1.93h.01zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.524 2.75 2.084v.006z"/>
            </svg>
            {copied ? '✓' : ''}
          </button>
        </div>
      </div>
    </footer>
  );
}
