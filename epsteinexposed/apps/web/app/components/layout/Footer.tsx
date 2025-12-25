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
          <Image src="/logo.png" alt="Logo" width={28} height={28} className="rounded" />
          <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Built by <Link href="https://x.com/danksterintel" target="_blank" className="hover:underline">@danksterintel</Link> of Vatra Labs AI Company
          </span>
        </div>
        
        {/* Disclaimer */}
        <p className="text-base text-gray-400 text-center hidden md:block">
          Research & educational purposes only • Public DOJ documents
        </p>
        
        {/* Links & Donations */}
        <div className="flex items-center gap-3 text-base font-medium">
          <Link 
            href="https://x.com/danksterintel" 
            target="_blank"
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            @danksterintel
          </Link>
          
          <span className="text-gray-700">|</span>
          
          <span className="text-gray-500">Donate:</span>
          <Link 
            href="https://venmo.com/code?user_id=1936415466192896380&created=1766623404"
            target="_blank"
            className="px-2 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
          >
            Venmo
          </Link>
          <Link 
            href="https://cash.app/$dankstervision"
            target="_blank"
            className="px-2 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
          >
            Cash
          </Link>
          <button
            onClick={copyBTC}
            className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded hover:bg-orange-500/30 transition-colors"
            title="bc1qyh3yj9ga7dt2npgvdk2mywxt6krgye249md9ax"
          >
            {copied ? '✓ Copied!' : 'BTC'}
          </button>
        </div>
      </div>
    </footer>
  );
}
