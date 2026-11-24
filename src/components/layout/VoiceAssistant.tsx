import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Command, HelpCircle, Mic, MicOff, Send, Volume2, VolumeX, X } from 'lucide-react';
import { COMANDOS_VOZ_GUIA } from '../../constants/catalog';
import {
  isSpeechRecognitionSupported,
  parseVoiceCommand,
  speakPtBr,
  startSingleUtteranceRecognition,
} from '../../services/voiceService';
import { useAppStore } from '../../store/useAppStore';

interface VoiceAssistantProps {
  onSaveActiveForm?: () => void;
  onOpenNewWanted?: () => void;
  onOpenNewEvent?: () => void;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  onSaveActiveForm,
  onOpenNewWanted,
  onOpenNewEvent,
}) => {
  const {
    db,
    activeSuite,
    activeEvento,
    setActiveTab,
    setSearchQuery,
    setStatusFilter,
    setCategoriaFilter,
    newItemModal,
    openNewItemModal,
    closeNewItemModal,
    updateVoiceDraft,
    setPoliciesOpen,
    updateConfig,
    notify,
    retidosCount,
    faltamDia1Count,
  } = useAppStore();

  const [panelOpen, setPanelOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [lastTranscript, setLastTranscript] = useState('');
  const [lastFeedback, setLastFeedback] = useState('');
  const [manualCommand, setManualCommand] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  const stopRecRef = useRef<(() => void) | null>(null);
  const speechSupported = isSpeechRecognitionSupported();

  const executeTranscript = useCallback(
    (transcript: string) => {
      setLastTranscript(transcript);
      const action = parseVoiceCommand(transcript, {
        isFormOpen: newItemModal.open,
        customTypes: db.tiposPersonalizados,
      });

      let feedback = '';

      switch (action.type) {
        case 'NAVIGATE': {
          const labels: Record<typeof action.tab, string> = {
            evento: 'Eventos',
            itens: 'Achados e Perdidos',
            procurados: 'Itens Procurados',
            destinar: 'Destinar Itens Retidos',
            relatorio: 'Relatório Final',
            presidencia_foco: 'Presidência do Congresso — Evento em Foco',
            presidencia_programa: 'Programa, Oradores e Ensaios',
            presidencia_demos: 'Participantes de Demonstrações e Entrevistas',
            presidencia_av: 'Guia de Áudio e Vídeo',
            presidencia_agenda: 'Agenda, Lembretes e Documentos',
            sentinela_estudo: 'Resumo de A Sentinela — Estudo e Ordem de Entrada',
            sentinela_palco: 'Resumo de A Sentinela — Palco e Galeria',
            sentinela_imagens: 'Resumo de A Sentinela — Imagens a Exibir',
            sentinela_audio: 'Resumo de A Sentinela — Áudio Completo',
            equipe: 'Equipe e Voluntários',
            sincronizar: 'Exportar, Importar e Mesclar',
            arquitetura: 'Arquitetura MER e UML',
          };
          setActiveTab(action.tab);
          feedback = `Abrindo ${labels[action.tab]}.`;
          break;
        }
        case 'OPEN_NEW_ITEM': {
          openNewItemModal({
            presetCategoria: action.presetCategoria,
            presetValor: action.presetValor,
          });
          feedback =
            action.presetCategoria === 'Criança'
              ? 'Abrindo registro prioritário de pessoa perdida. Lembre-se da política 56: não fazer anúncios no microfone, avisar Indicadores, SA e SC.'
              : action.presetCategoria === 'Guardado'
                ? 'Abrindo formulário de Guarda-Volumes.'
                : 'Abrindo cadastro de novo item.';
          break;
        }
        case 'OPEN_NEW_EVENT': {
          setActiveTab('evento');
          onOpenNewEvent?.();
          feedback = 'Abrindo criação de novo evento.';
          break;
        }
        case 'OPEN_NEW_WANTED': {
          setActiveTab('procurados');
          onOpenNewWanted?.();
          feedback = 'Abrindo cadastro de item procurado.';
          break;
        }
        case 'OPEN_POLICIES': {
          setPoliciesOpen(true);
          feedback = 'Abrindo orientações oficiais do departamento, parágrafos 54 a 58.';
          break;
        }
        case 'SEARCH': {
          setActiveTab('itens');
          setSearchQuery(action.query);
          feedback = `Buscando por ${action.query}.`;
          break;
        }
        case 'FILTER_STATUS': {
          setActiveTab('itens');
          setStatusFilter(action.status);
          feedback = action.status === 'TODOS' ? 'Filtros limpos.' : `Filtrando por ${action.status}.`;
          break;
        }
        case 'FILTER_CATEGORIA': {
          setActiveTab('itens');
          setCategoriaFilter(action.categoria);
          feedback = `Filtrando categoria ${action.categoria}.`;
          break;
        }
        case 'SPEAK_SUMMARY': {
          if (activeSuite === 'presidencia') {
            const partes = activeEvento
              ? db.programaPartes.filter((p) => p.eventoId === activeEvento.id)
              : db.programaPartes;
            const avCount = activeEvento
              ? db.guiaAV.filter((g) => g.eventoId === activeEvento.id).length
              : db.guiaAV.length;
            feedback = `Presidência do Congresso: ${partes.length} partes no programa, ${faltamDia1Count} oradores ainda sem confirmação do primeiro dia e ${avCount} dicas no Guia de Áudio e Vídeo.`;
            break;
          }
          if (activeSuite === 'sentinela') {
            const coms = activeEvento
              ? db.sentinelaComentarios.filter((c) => c.eventoId === activeEvento.id)
              : db.sentinelaComentarios;
            const ensaiosOk = coms.filter((c) => c.ensaioPalcoFeito).length;
            feedback = `Resumo de A Sentinela: ${coms.length} comentários na ordem de entrada, ${ensaiosOk} com ensaio no palco concluído.`;
            break;
          }
          const evtItems = activeEvento ? db.itens.filter((i) => i.eventoId === activeEvento.id) : db.itens;
          const guardados = evtItems.filter((i) => i.status === 'Ainda Guardado' || i.status === 'Em Conferência').length;
          const entregues = evtItems.filter((i) => i.status === 'Já Entregue').length;
          feedback = activeEvento
            ? `Evento ${activeEvento.tipo} ${activeEvento.codigo}. Total de ${evtItems.length} itens: ${guardados} ainda guardados e ${entregues} entregues. Há ${retidosCount} itens retidos aguardando destinação.`
            : `Nenhum evento ativo. Total geral de ${db.itens.length} itens cadastrados.`;
          break;
        }
        case 'FILL_ITEM_FIELDS': {
          if (!newItemModal.open) {
            openNewItemModal({ voiceDraft: action.fields });
          } else {
            updateVoiceDraft(action.fields);
          }
          const keys = Object.keys(action.fields).join(', ');
          feedback = `Campos preenchidos por voz: ${keys}.`;
          break;
        }
        case 'SAVE_FORM': {
          if (newItemModal.open && onSaveActiveForm) {
            onSaveActiveForm();
            feedback = 'Salvando formulário.';
          } else {
            feedback = 'Nenhum formulário aberto para salvar.';
          }
          break;
        }
        case 'CANCEL_FORM': {
          if (newItemModal.open) {
            closeNewItemModal();
            feedback = 'Formulário fechado.';
          } else {
            setPanelOpen(false);
            feedback = 'Assistente fechado.';
          }
          break;
        }
        default: {
          feedback = `Comando não reconhecido: "${transcript}". Tente "novo item", "abrir destinar", "buscar garrafa" ou clique em Ajuda.`;
        }
      }

      setLastFeedback(feedback);
      notify(feedback, action.type === 'UNKNOWN' ? 'warning' : 'info', false);
      speakPtBr(feedback, db.config.vozFeedbackFalado);
    },
    [
      activeEvento,
      activeSuite,
      closeNewItemModal,
      db.config.vozFeedbackFalado,
      db.guiaAV,
      db.itens,
      db.programaPartes,
      db.sentinelaComentarios,
      db.tiposPersonalizados,
      faltamDia1Count,
      newItemModal.open,
      notify,
      onOpenNewEvent,
      onOpenNewWanted,
      onSaveActiveForm,
      openNewItemModal,
      retidosCount,
      setActiveTab,
      setCategoriaFilter,
      setPoliciesOpen,
      setSearchQuery,
      setStatusFilter,
      updateVoiceDraft,
    ],
  );

  const toggleListening = useCallback(() => {
    if (listening) {
      stopRecRef.current?.();
      setListening(false);
      setInterimText('');
      return;
    }

    setPanelOpen(true);
    setInterimText('');
    stopRecRef.current = startSingleUtteranceRecognition({
      onStart: () => setListening(true),
      onInterim: (txt) => setInterimText(txt),
      onFinal: (txt) => {
        setInterimText('');
        executeTranscript(txt);
      },
      onEnd: () => {
        setListening(false);
      },
      onError: (msg) => {
        setLastFeedback(msg);
        setListening(false);
      },
    });
  }, [executeTranscript, listening]);

  // Atalhos de teclado acessíveis: Alt+V (Voz) e Ctrl+K (Barra de Comando)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        toggleListening();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPanelOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleListening]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCommand.trim()) return;
    executeTranscript(manualCommand);
    setManualCommand('');
  };

  return (
    <div className="no-print">
      {/* Botão Flutuante de Acessibilidade por Voz (sempre acessível no polegar mobile ou desktop) */}
      <button
        type="button"
        onClick={toggleListening}
        aria-label={listening ? 'Parar comando de voz' : 'Ativar comando de voz (Alt+V)'}
        title="Assistente de Voz (Alt+V) — Fale para navegar ou preencher formulários"
        className={`fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition md:bottom-6 md:right-6 ${
          listening
            ? 'bg-rose-600 text-white voice-listening'
            : 'bg-gradient-to-br from-[#1e3a5f] to-teal-700 text-white hover:scale-105 active:scale-95'
        }`}
      >
        {listening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
      </button>

      {/* Painel flutuante de comandos de voz e texto */}
      {panelOpen && (
        <div className="fixed bottom-36 right-3 z-40 w-[calc(100vw-1.5rem)] max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl md:bottom-24 md:right-6">
          <div className="flex items-center justify-between bg-[#1e3a5f] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${listening ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'}`} />
              <div>
                <h3 className="text-sm font-bold leading-tight">Acessibilidade por Voz</h3>
                <p className="text-[11px] text-sky-200">
                  {listening ? 'Ouvindo comando em Português (pt-BR)...' : 'Atalho Alt+V • Fale ou digite um comando'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => updateConfig({ vozFeedbackFalado: !db.config.vozFeedbackFalado })}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
                title={db.config.vozFeedbackFalado ? 'Desativar retorno falado' : 'Ativar retorno falado'}
              >
                {db.config.vozFeedbackFalado ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => setShowGuide((s) => !s)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
                title="Exemplos de comandos"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  stopRecRef.current?.();
                  setListening(false);
                  setPanelOpen(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
                aria-label="Fechar painel de voz"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3 p-4">
            {/* Botão principal de microfone + status */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleListening}
                disabled={!speechSupported}
                className={`touch-target flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition ${
                  listening
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : speechSupported
                      ? 'bg-teal-700 hover:bg-teal-800'
                      : 'bg-slate-400 cursor-not-allowed'
                }`}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {listening ? 'Parar Escuta' : speechSupported ? 'Falar Comando Agora' : 'Microfone indisponível'}
              </button>
            </div>

            {interimText && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-900">
                <span className="text-[10px] font-bold uppercase text-sky-600">Ouvindo: </span>
                {interimText}
              </div>
            )}

            {lastTranscript && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <p className="text-slate-500">
                  <strong className="text-slate-700">Você disse:</strong> "{lastTranscript}"
                </p>
                {lastFeedback && <p className="mt-1 font-semibold text-teal-800">{lastFeedback}</p>}
              </div>
            )}

            {/* Barra de comando por texto (fallback universal e teste rápido!) */}
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Command className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={manualCommand}
                  onChange={(e) => setManualCommand(e.target.value)}
                  placeholder='Ex.: "Novo item" ou "Celular preto, valor alto"'
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-sky-600 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e3a5f] text-white hover:bg-[#152b47]"
                aria-label="Executar comando"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>

            {/* Chips de atalho rápido */}
            <div className="flex flex-wrap gap-1.5">
              {(activeSuite === 'presidencia'
                ? ['Abrir presidência', 'Abrir programa', 'Abrir demonstrações', 'Abrir guia áudio e vídeo', 'Ler resumo']
                : activeSuite === 'sentinela'
                  ? ['Abrir sentinela', 'Abrir palco', 'Abrir imagens', 'Abrir áudio completo', 'Ler resumo']
                  : ['Novo item', 'Abrir guarda-volumes', 'Abrir presidência', 'Abrir sentinela', 'Ler resumo']
              ).map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => executeTranscript(chip)}
                  className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-sky-100 hover:text-sky-900 transition"
                >
                  {chip}
                </button>
              ))}
            </div>

            {showGuide && (
              <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="font-bold text-slate-800">Guia de Comandos por Voz:</p>
                {COMANDOS_VOZ_GUIA.map((g) => (
                  <div key={g.categoria} className="border-b border-slate-200/70 pb-1 last:border-0">
                    <span className="font-bold text-[#1e3a5f]">{g.categoria}: </span>
                    <span className="text-slate-600">{g.exemplo}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
