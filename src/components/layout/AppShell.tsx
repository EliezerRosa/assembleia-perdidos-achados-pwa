import React from 'react';
import {
  Archive,
  Bell,
  BookOpen,
  CalendarClock,
  CalendarDays,
  Contrast,
  FileText,
  Film,
  GitMerge,
  HardDrive,
  Headphones,
  Image as ImageIcon,
  ListOrdered,
  Mic2,
  Network,
  PackageSearch,
  Plus,
  Radio,
  SearchCheck,
  Type,
  Users,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { AppSuiteMode, NavTab } from '../../types/domain';
import { PwaInstallBanner } from '../common/PwaInstallBanner';

interface AppShellProps {
  children: React.ReactNode;
}

interface NavEntry {
  id: NavTab;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
  badge?: number;
  mobilePrimary?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const {
    db,
    activeTab,
    setActiveTab,
    activeSuite,
    switchSuite,
    activeEvento,
    setActiveEvento,
    storageUsage,
    toasts,
    dismissToast,
    openNewItemModal,
    setPoliciesOpen,
    updateConfig,
    retidosCount,
    procuradosAbertosCount,
    faltamDia1Count,
    sentinelaPendentesCount,
  } = useAppStore();

  const suiteTabs: Record<AppSuiteMode, NavEntry[]> = {
    achados: [
      { id: 'evento', label: 'Eventos', shortLabel: 'Evento', icon: CalendarDays, mobilePrimary: true },
      { id: 'itens', label: 'Achados & Guarda-Vol.', shortLabel: 'Itens', icon: PackageSearch, mobilePrimary: true },
      {
        id: 'procurados',
        label: 'Itens Procurados',
        shortLabel: 'Procurados',
        icon: SearchCheck,
        badge: procuradosAbertosCount,
        mobilePrimary: true,
      },
      {
        id: 'destinar',
        label: 'Destinar (SA)',
        shortLabel: 'Destinar',
        icon: Archive,
        badge: retidosCount,
        mobilePrimary: true,
      },
      { id: 'relatorio', label: 'Relatório Final', shortLabel: 'Relatório', icon: FileText, mobilePrimary: true },
    ],
    presidencia: [
      { id: 'presidencia_foco', label: 'Evento em Foco', shortLabel: 'Foco', icon: Radio, mobilePrimary: true },
      {
        id: 'presidencia_programa',
        label: 'Programa & Oradores',
        shortLabel: 'Programa',
        icon: CalendarClock,
        badge: faltamDia1Count,
        mobilePrimary: true,
      },
      { id: 'presidencia_demos', label: 'Demonstrações', shortLabel: 'Demos', icon: Users, mobilePrimary: true },
      { id: 'presidencia_av', label: 'Guia Áudio & Vídeo', shortLabel: 'Guia A/V', icon: Film, mobilePrimary: true },
      { id: 'presidencia_agenda', label: 'Agenda & Lembretes', shortLabel: 'Agenda', icon: Bell, mobilePrimary: true },
    ],
    sentinela: [
      { id: 'sentinela_estudo', label: 'Estudo & Ordem', shortLabel: 'Ordem', icon: ListOrdered, mobilePrimary: true },
      {
        id: 'sentinela_palco',
        label: 'Palco & Galeria',
        shortLabel: 'Palco',
        icon: Users,
        badge: sentinelaPendentesCount,
        mobilePrimary: true,
      },
      { id: 'sentinela_imagens', label: 'Imagens a Exibir', shortLabel: 'Imagens', icon: ImageIcon, mobilePrimary: true },
      { id: 'sentinela_audio', label: 'Áudio Completo', shortLabel: 'Áudio', icon: Headphones, mobilePrimary: true },
      { id: 'equipe', label: 'Equipe / Cadastro', shortLabel: 'Equipe', icon: Mic2, mobilePrimary: true },
    ],
  };

  const sharedTabs: NavEntry[] = [
    { id: 'evento', label: 'Eventos (Base)', shortLabel: 'Evento', icon: CalendarDays },
    { id: 'equipe', label: 'Equipe & Voluntários', shortLabel: 'Equipe', icon: Users },
    { id: 'sincronizar', label: 'Exportar / Mesclar', shortLabel: 'Sync', icon: GitMerge },
    { id: 'arquitetura', label: 'MER + UML', shortLabel: 'MER/UML', icon: Network },
  ];

  const currentSuiteNav = suiteTabs[activeSuite];

  const suiteMeta: Record<AppSuiteMode, { title: string; subtitle: string; badge?: number; icon: React.FC<{ className?: string }> }> = {
    achados: {
      title: 'Achados & Guarda-Vol.',
      subtitle: 'Perdidos e Achados',
      badge: retidosCount > 0 ? retidosCount : undefined,
      icon: PackageSearch,
    },
    presidencia: {
      title: 'Presidência',
      subtitle: 'Congresso • Programa & A/V',
      badge: faltamDia1Count > 0 ? faltamDia1Count : undefined,
      icon: Mic2,
    },
    sentinela: {
      title: 'A Sentinela',
      subtitle: 'Resumo • Palco & Ordem',
      badge: sentinelaPendentesCount > 0 ? sentinelaPendentesCount : undefined,
      icon: BookOpen,
    },
  };

  const cycleTheme = () => {
    const order = ['light', 'high-contrast'] as const;
    const next = db.config.tema === 'high-contrast' ? order[0] : order[1];
    updateConfig({ tema: next });
  };

  const cycleFont = () => {
    const order = ['normal', 'grande', 'extra'] as const;
    const idx = order.indexOf(db.config.tamanhoFonte);
    updateConfig({ tamanhoFonte: order[(idx + 1) % order.length] });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top App Bar */}
      <header className="no-print sticky top-0 z-30 border-b border-slate-800/20 bg-gradient-to-r from-[#1e3a5f] via-[#1c4469] to-[#0f5e63] text-white shadow-md">
        <div className="mx-auto max-w-7xl px-3 pt-2.5 pb-2 sm:px-5">
          <div className="flex items-center justify-between gap-2">
            {/* Brand + Active Event Selector */}
            <div className="flex min-w-0 items-center gap-2.5">
              <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="Ícone Suíte Eventos" className="h-9 w-9 shrink-0 rounded-xl shadow-xs" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-sm font-extrabold tracking-tight sm:text-base">
                    Suíte Eventos
                  </h1>
                  <span className="hidden rounded-md bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-200 sm:inline">
                    {suiteMeta[activeSuite].subtitle}
                  </span>
                </div>
                {db.eventos.length > 0 ? (
                  <select
                    aria-label="Evento ativo"
                    value={activeEvento?.id ?? ''}
                    onChange={(e) => setActiveEvento(e.target.value)}
                    className="mt-0.5 max-w-[205px] truncate rounded-md bg-white/10 px-2 py-0.5 text-xs font-medium text-sky-100 hover:bg-white/20 focus:outline-none sm:max-w-xs"
                  >
                    {db.eventos.map((ev) => (
                      <option key={ev.id} value={ev.id} className="text-slate-900">
                        {ev.tipo} • {ev.codigo} ({ev.data})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[11px] text-sky-200">Nenhum evento ativo</p>
                )}
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <PwaInstallBanner />

              <button
                type="button"
                onClick={() => setPoliciesOpen(true)}
                className="flex h-9 items-center gap-1.5 rounded-xl bg-white/10 px-2.5 text-xs font-bold text-white hover:bg-white/20 transition"
                title="Orientações Oficiais (§54–58)"
              >
                <BookOpen className="h-4 w-4 text-amber-300" />
                <span className="hidden lg:inline">Orientações</span>
              </button>

              <button
                type="button"
                onClick={cycleFont}
                className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
                title={`Tamanho da fonte: ${db.config.tamanhoFonte}`}
                aria-label="Alternar tamanho da fonte"
              >
                <Type className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={cycleTheme}
                className={`hidden sm:flex h-9 w-9 items-center justify-center rounded-xl transition ${
                  db.config.tema === 'high-contrast'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title="Alternar modo Alto Contraste"
                aria-label="Alternar modo alto contraste"
              >
                <Contrast className="h-4 w-4" />
              </button>

              {activeSuite === 'achados' && (
                <button
                  type="button"
                  onClick={() => openNewItemModal()}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-amber-400 px-3 text-xs font-extrabold text-slate-950 shadow-sm hover:bg-amber-300 active:scale-95 transition"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span className="hidden sm:inline">Novo Item</span>
                </button>
              )}
            </div>
          </div>

          {/* SELETOR DOS 3 APPS EMBUTIDOS (Achados | Presidência | Resumo de A Sentinela) */}
          <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5" role="tablist" aria-label="Apps embutidos">
            {(['achados', 'presidencia', 'sentinela'] as AppSuiteMode[]).map((mode) => {
              const meta = suiteMeta[mode];
              const Icon = meta.icon;
              const isSelected = activeSuite === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => switchSuite(mode)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
                    isSelected
                      ? 'bg-white text-[#1e3a5f] shadow-sm'
                      : 'bg-white/10 text-sky-100 hover:bg-white/20'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-teal-700' : 'text-amber-300'}`} />
                  <span>{meta.title}</span>
                  {meta.badge !== undefined && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                        isSelected ? 'bg-rose-600 text-white' : 'bg-amber-400 text-slate-950'
                      }`}
                    >
                      {meta.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* Desktop Sidebar */}
        <aside className="no-print sticky top-[98px] hidden h-[calc(100vh-98px)] w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-slate-200 bg-white p-3 md:flex">
          <div className="space-y-4">
            {/* Abas do App Embutido Ativo */}
            <div>
              <p className="mb-1.5 px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                App: {suiteMeta[activeSuite].title}
              </p>
              <nav className="space-y-1" aria-label="Navegação do módulo ativo">
                {currentSuiteNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                        isActive
                          ? 'bg-[#1e3a5f] text-white shadow-sm'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 ${isActive ? 'text-amber-300' : 'text-slate-500'}`} />
                        {item.label}
                      </span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            isActive ? 'bg-amber-400 text-slate-950' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Ferramentas Compartilhadas entre os 3 Apps */}
            <div className="border-t border-slate-100 pt-3">
              <p className="mb-1.5 px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Ferramentas da Suíte
              </p>
              <nav className="space-y-1" aria-label="Ferramentas compartilhadas">
                {sharedTabs
                  .filter((st) => !currentSuiteNav.some((c) => c.id === st.id))
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                          isActive
                            ? 'bg-teal-700 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className={`h-4 w-4 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
              </nav>
            </div>
          </div>

          {/* LocalStorage Meter & Device Info */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <div className="flex items-center justify-between font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-sky-700" />
                localStorage
              </span>
              <span className={storageUsage.nearLimit ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                {storageUsage.kbUsed} KB ({storageUsage.percentUsed}%)
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all ${
                  storageUsage.nearLimit ? 'bg-rose-500' : 'bg-teal-600'
                }`}
                style={{ width: `${Math.max(3, storageUsage.percentUsed)}%` }}
              />
            </div>
            <p className="mt-2 truncate text-[11px] text-slate-500" title={db.config.deviceName}>
              Equip.: <strong className="text-slate-700">{db.config.deviceName}</strong>
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 flex-1 px-3 pb-24 pt-4 sm:px-6 md:pb-10">
          {/* Mobile Secondary Utility Strip */}
          <div className="no-print mb-3 flex items-center gap-1.5 overflow-x-auto pb-1 md:hidden">
            {sharedTabs
              .filter((st) => !currentSuiteNav.some((c) => c.id === st.id))
              .map((nav) => {
                const Icon = nav.icon;
                const active = activeTab === nav.id;
                return (
                  <button
                    key={nav.id}
                    type="button"
                    onClick={() => setActiveTab(nav.id)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      active
                        ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {nav.shortLabel}
                  </button>
                );
              })}
            <button
              type="button"
              onClick={cycleTheme}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700"
            >
              <Contrast className="h-3.5 w-3.5" />
              Contraste
            </button>
          </div>

          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (5 abas dinâmicas do App Embutido Ativo!) */}
      <nav
        aria-label="Navegação inferior mobile"
        className="no-print pb-safe fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden"
      >
        <div className="grid grid-cols-5 px-1 pt-1.5">
          {currentSuiteNav.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center rounded-xl py-1 text-[10px] font-bold transition ${
                  active ? 'text-[#1e3a5f]' : 'text-slate-500'
                }`}
              >
                <span
                  className={`mb-0.5 flex h-7 w-12 items-center justify-center rounded-full ${
                    active ? 'bg-sky-100 text-[#1e3a5f]' : ''
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {item.shortLabel}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute right-2 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-extrabold text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Toasts */}
      <div className="no-print pointer-events-none fixed left-1/2 top-24 z-50 flex w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 flex-col gap-2">
        {toasts.map((t) => {
          const cls = {
            success: 'border-emerald-300 bg-emerald-50 text-emerald-950',
            info: 'border-sky-300 bg-sky-50 text-sky-950',
            warning: 'border-amber-300 bg-amber-50 text-amber-950',
            error: 'border-rose-300 bg-rose-50 text-rose-950',
          }[t.kind];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold shadow-lg ${cls}`}
            >
              <span>{t.text}</span>
              <button type="button" onClick={() => dismissToast(t.id)} aria-label="Fechar aviso">
                <X className="h-4 w-4 opacity-70" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
