import React, { useCallback, useRef, useState } from 'react';
import { PolicyModal } from './components/common/PolicyModal';
import { AppShell } from './components/layout/AppShell';
import { VoiceAssistant } from './components/layout/VoiceAssistant';
import { ArchitectureView } from './components/views/ArchitectureView';
import { DashboardEventsView } from './components/views/DashboardEventsView';
import { DestinationDeckView } from './components/views/DestinationDeckView';
import { FinalReportView } from './components/views/FinalReportView';
import { ItemDetailModal } from './components/views/ItemDetailModal';
import { ItemFormModal } from './components/views/ItemFormModal';
import { ItemsListView } from './components/views/ItemsListView';
import { SyncHubView } from './components/views/SyncHubView';
import { WantedItemsView } from './components/views/WantedItemsView';
import { AppProvider, useAppStore } from './store/useAppStore';

const AppContent: React.FC = () => {
  const { activeTab, policiesOpen, setPoliciesOpen } = useAppStore();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [forceNewEvent, setForceNewEvent] = useState(false);
  const [forceNewWanted, setForceNewWanted] = useState(false);

  const activeFormSaveRef = useRef<(() => void) | null>(null);
  const registerSaveHandler = useCallback((fn: (() => void) | null) => {
    activeFormSaveRef.current = fn;
  }, []);

  return (
    <AppShell>
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
      {activeTab === 'sincronizar' && <SyncHubView />}
      {activeTab === 'arquitetura' && <ArchitectureView />}

      {/* Modais Globais */}
      <ItemFormModal registerSaveHandler={registerSaveHandler} />
      <ItemDetailModal itemId={selectedItemId} onClose={() => setSelectedItemId(null)} />
      <PolicyModal open={policiesOpen} onClose={() => setPoliciesOpen(false)} />

      {/* Assistente de Acessibilidade por Voz (Global + Formulário) */}
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
