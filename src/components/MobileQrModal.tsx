/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode, Smartphone, Copy, Check, ExternalLink, X, Terminal, ArrowUpRight } from 'lucide-react';

interface MobileQrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileQrModal: React.FC<MobileQrModalProps> = ({ isOpen, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'instant' | 'vercel'>('instant');

  // Live URL fallback to shared cloud run domain
  const currentUrl =
    typeof window !== 'undefined' && window.location.href.startsWith('http')
      ? window.location.href
      : 'https://ais-pre-ltix7zrah4acuml7argfll-195387025756.asia-east1.run.app';

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(currentUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#09090b',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code generation failed:', err));
    }
  }, [isOpen, currentUrl]);

  if (!isOpen) return null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Test on Mobile & Deploy to Vercel</h3>
              <p className="text-xs text-zinc-400">Live mobile camera testing guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 p-1">
          <button
            onClick={() => setActiveTab('instant')}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'instant' ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            Instant Mobile Testing (QR Code)
          </button>
          <button
            onClick={() => setActiveTab('vercel')}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'vercel' ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Vercel Deployment Guide
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {activeTab === 'instant' ? (
            <div className="flex flex-col items-center text-center space-y-3.5">
              <p className="text-xs text-zinc-300 max-w-sm">
                Your app is already live with HTTPS! Open your phone camera app, point it at this QR code to launch WebAR immediately:
              </p>

              {/* QR Code Container */}
              <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-cyan-500/20">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Scan QR Code to open on mobile" className="w-48 h-48 rounded-lg" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-zinc-400 text-xs">
                    Generating QR...
                  </div>
                )}
              </div>

              {/* URL Display & Copy */}
              <div className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 flex items-center justify-between gap-2 text-left">
                <span className="text-[11px] text-zinc-400 truncate font-mono select-all flex-1">
                  {currentUrl}
                </span>
                <button
                  onClick={handleCopyUrl}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>

              <div className="w-full text-left bg-cyan-950/20 border border-cyan-800/30 p-3 rounded-xl text-[11px] text-cyan-300">
                <span className="font-semibold">Mobile AR Tip:</span> When Safari or Chrome prompts for camera access, tap <strong>Allow</strong>. Hold your phone at waist/chest height pointing at the floor to place furniture.
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-xs text-zinc-300">
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <h4 className="font-semibold text-zinc-100 flex items-center gap-1.5 mb-1">
                  <span>1. Configuration Pre-installed</span>
                  <Check className="w-4 h-4 text-emerald-400" />
                </h4>
                <p className="text-zinc-400 text-[11px]">
                  We have added <code className="text-cyan-400">vercel.json</code> to the root directory with automatic Vite output to <code className="text-cyan-400">dist</code> and SPA routing rewrites.
                </p>
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <h4 className="font-semibold text-zinc-100 mb-1">2. Deploy via Vercel Dashboard (Easiest)</h4>
                <ol className="list-decimal list-inside space-y-1 text-zinc-400 text-[11px] leading-relaxed">
                  <li>Push this codebase to your GitHub account.</li>
                  <li>Go to <strong className="text-zinc-200">vercel.com/new</strong> and select your GitHub repository.</li>
                  <li>Vercel automatically detects Framework: <strong className="text-zinc-200">Vite</strong>.</li>
                  <li>Click <strong className="text-cyan-400">Deploy</strong>. Your custom URL (e.g. <code className="text-zinc-300">awgzo-webar.vercel.app</code>) is ready in ~45 seconds!</li>
                </ol>
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <h4 className="font-semibold text-zinc-100 mb-1">3. Deploy via Vercel CLI (Optional)</h4>
                <div className="bg-zinc-900 p-2.5 rounded-lg font-mono text-[11px] text-cyan-300 select-all border border-zinc-800">
                  npm i -g vercel<br />
                  vercel --prod
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/40 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500">Supports iOS Safari & Android Chrome WebAR</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
