# Arquitetura e Decisões Técnicas — Suíte Eventos PWA (v2)

## 1. Visão Geral

A **Suíte Eventos PWA** evoluiu de um aplicativo dedicado a **Perdidos e Achados & Guarda-Volumes** para uma **suíte offline-first unificada com 3 Apps Embutidos**, clonando e modernizando todos os fluxos operacionais do aplicativo Glide `Eventos (New)` (`ANL4cdICJTsLdTONT7Hp`):

1. **App 1 — Perdidos & Achados + Guarda-Volumes**: Foto → Etiqueta Gêmea → Foto, políticas §54–58, Itens Procurados, Deck Swipe Destinar SA (>=60d + reversão <7d), Excel 25 colunas, `PA.txt` Acrobat e impressão A4 (`ANEXO 1` 15 linhas/pág + `Relatório Final`).
2. **App 2 — Presidência do Congresso**: Painel *Evento em Foco*, grade 3 dias × 2 turnos, Oradores + 3 Substitutos (com clonagem rápida e promoção em 1 toque), Check-in em 3 etapas, Ensaio no Palco, Cronômetro Dual-Mode (*Ao Vivo* vs *Ensaio Pessoal*) com alertas `-1 min` e `PASSOU DA HORA`, Participantes de Demonstrações/Entrevistas (`Programa Parte`), Guia de Áudio & Vídeo com `Dica Play` e toggle `Ativar Play`, Agenda, Lembretes filtrados por 7 perfis RBAC e Documentos de Referência.
3. **App 3 — Resumo de A Sentinela**: Cabeçalho do estudo, Ordem de Entrada reordenável (`↑`/`↓`) com **motor cronológico em cascata em segundos** (30s padrão), coreografia de palco `ESQUERDA` / `DIREITA` / `TRIBUNA` com banner dourado `#FFD700` e alerta automático de lado consecutivo repetido, Galeria de Comentaristas, Matriz de Substituições, Deck **Imagens a Exibir** para A/V, Estúdio de Áudio offline (`MediaRecorder` 16 kbps + ditado `pt-BR` + Salvar/Recuperar snapshot), Player sequencial **`Áudio Completo`** com fallback TTS e mural `Conversar Com Todos`.

## 2. Stack e Persistência (Migração v1 → v2)

| Camada | Tecnologia | Decisão |
| --- | --- | --- |
| Build & Tipos | **Vite 6** + **TypeScript 5.8 (strict)** | Code-splitting (`vendor`, `xlsx`, `mermaid`) e tipagem estrita |
| UI & Ergonomia | **React 19** + **Tailwind CSS v4** + **Lucide** | Seletor de 3 Apps no topo, Sidebar no PC, Bottom Nav dinâmica de 5 abas por app no Mobile, Alto Contraste e `@media print` A4 |
| Offline / PWA | **vite-plugin-pwa (Workbox)** | Pré-cache completo para funcionamento 100% sem internet no Salão |
| Persistência | **`localStorage` (`assembleia_pa_db_v1`, schema v2)** | Migração automática e retrocompatível: bases v1 existentes abrem sem perder nenhum dado de Achados, inicializando os módulos de Presidência e Sentinela |
| Áudio & Voz | **Web Speech API (`pt-BR`)** + **`MediaRecorder` (16 kbps)** | Substitui integrações pagas de IA do Glide com ditado, leitura TTS e gravação local leve |
| Mesclagem | **`mergeService.ts` (`SyncBundle` v1/v2)** | Consolida todos os 3 apps entre vários celulares e PCs preservando retrocompatibilidade com pacotes v1 |
| Testes | **Vitest** | Testes unitários cobrindo Achados, Presidência, Sentinela, Voz, Merge e Excel |

## 3. Privacidade e LGPD

- Repositório **público** (necessário para GitHub Pages gratuito): **zero PII / zero dados reais** versionados no Git.
- O conjunto de demonstração (`createDemoSeedData`) contém exclusivamente dados sintéticos fictícios cobrindo os 3 apps embutidos.
