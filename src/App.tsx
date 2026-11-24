import React, { useCallback, useRef, useState } from 'react';
import { PolicyModal } from './components/common/PolicyModal';
import { AppShell } from './components/layout/AppShell';
import { VoiceAssistant } from './components/layout/VoiceAssistant';
import { AgendaLembretesView } from './components/views/AgendaLembretesView';
import { ArchitectureView } from './components/views/ArchitectureView';
import { DashboardEventsView } from './components/views/DashboardEventsView';
import { DestinationDeckView } from './components/views/DestinationDeckView';
import { EquipeVoluntariosView } from './components/views/EquipeVoluntariosView';
import { FinalReportView } from './components/views/FinalReportView';
import { GuiaAVView } from './components/views/GuiaAVView';
import { ItemDetailModal } from './components/views/ItemDetailModal';
import { ItemFormModal } from './components/views/ItemFormModal';
import { ItemsListView } from './components/views/ItemsListView';
import { ParticipacoesDemosView } from './components/views/ParticipacoesDemosView';
import { PresidenciaHubView } from './components/views/PresidenciaHubView';
import { ProgramaView } from './components/views/ProgramaView';
import { SentinelaView } from './components/views/SentinelaView';
import { SyncHubView } from './components/views/SyncHubView';
import { WantedItemsView } from './components/views/WantedItemsView';
import { AppProvider, useAppStore } from './store/useAppStore';

const AppContent: React.FC = () => {
  const { activeTab, setActiveTab, policiesOpen, setPoliciesOpen } = useAppStore();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedParteId, setSelectedParteId] = useState<string | null>(null);
  const [forceNewEvent, setForceNewEvent] = useState(false);
  const [forceNewWanted, setForceNewWanted] = useState(false);

  const activeFormSaveRef = useRef<(() => void) | null>(null);
  const registerSaveHandler = useCallback((fn: (() => void) | null) => {
    activeFormSaveRef.current = fn;
  }, []);

  const handleOpenParteFromHub = useCallback(
    (parteId: string) => {
      setSelectedParteId(parteId);
      setActiveTab('presidencia_programa');
    },
    [setActiveTab],
  );

  return (
    <AppShell>
      {/* App Embutido 1: Perdidos & Achados + Guarda-Volumes */}
      {activeTab === 'evento' && (
        <DashboardEventsView
          forceOpenNewForm={forceNewEvent}
          onResetForceOpen={() => setForceNewEvent(false)}
        />
      )}
      {activeTab === 'itens' && <ItemsListView onSelectItem={(item) => setSelectedItemId(item.id)} />}
      {activeTab === 'procurados' && (
        <WantedItemsView
          onSelectItem={(item) => setSelectedItemId(item.id)}
          forceOpenNew={forceNewWanted}
          onResetForceOpen={() => setForceNewWanted(false)}
        />
      )}
      {activeTab === 'destinar' && <DestinationDeckView onSelectItem={(item) => setSelectedItemId(item.id)} />}
      {activeTab === 'relatorio' && <FinalReportView />}

      {/* App Embutido 2: Presidência do Congresso */}
      {activeTab === 'presidencia_foco' && <PresidenciaHubView onOpenParte={handleOpenParteFromHub} />}
      {activeTab === 'presidencia_programa' && (
        <ProgramaView selectedParteId={selectedParteId} onSelectParte={setSelectedParteId} />
      )}
      {activeTab === 'presidencia_demos' && <ParticipacoesDemosView />}
      {activeTab === 'presidencia_av' && <GuiaAVView />}
      {activeTab === 'presidencia_agenda' && <AgendaLembretesView />}

      {/* App Embutido 3: Resumo de A Sentinela */}
      {activeTab === 'sentinela_estudo' && <SentinelaView mode="estudo" />}
      {activeTab === 'sentinela_palco' && <SentinelaView mode="palco" />}
      {activeTab === 'sentinela_imagens' && <SentinelaView mode="imagens" />}
      {activeTab === 'sentinela_audio' && <SentinelaView mode="audio" />}

      {/* Ferramentas Compartilhadas */}
      {activeTab === 'equipe' && <EquipeVoluntariosView />}
      {activeTab === 'sincronizar' && <SyncHubView />}
      {activeTab === 'arquitetura' && <ArchitectureView />}

      {/* Modais Globais */}
      <ItemFormModal registerSaveHandler={registerSaveHandler} />
      <ItemDetailModal itemId={selectedItemId} onClose={() => setSelectedItemId(null)} />
      <PolicyModal open={policiesOpen} onClose={() => setPoliciesOpen(false)} />

      {/* Assistente de Acessibilidade por Voz (Global + Formulário + 3 Apps) */}
      <VoiceAssistant
        onSaveActiveForm={() => activeFormSaveRef.current?.()}
        onOpenNewEvent={() => setForceNewEvent(true)}
        onOpenNewWanted={() => setForceNewWanted(true)}
      />
    </AppShell>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
