import React, { useEffect, useState } from 'react';
import { Download, Smartphone, Wifi, WifiOff, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
          isOnline
            ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-400/30'
            : 'bg-amber-500/25 text-amber-100 border border-amber-300/40'
        }`}
        title={isOnline ? 'Conectado — dados salvos localmente em localStorage' : 'Modo Offline ativo — 100% funcional localmente!'}
      >
        {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{isOnline ? 'Offline-First' : 'Offline Ativo'}</span>
      </span>

      {!isStandalone && deferredPrompt && !dismissed && (
        <div className="flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-slate-900 shadow-sm">
          <button type="button" onClick={handleInstall} className="inline-flex items-center gap-1.5 hover:underline">
            <Download className="h-3.5 w-3.5" />
            <span>Instalar App (PC/Celular)</span>
          </button>
          <button type="button" onClick={() => setDismissed(true)} aria-label="Dispensar" className="ml-1 opacity-70 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {isStandalone && (
        <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-sky-100">
          <Smartphone className="h-3.5 w-3.5" />
          PWA Instalado
        </span>
      )}
    </div>
  );
};
