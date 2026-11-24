# Suíte Eventos PWA — Achados & Perdidos • Presidência do Congresso • Resumo de A Sentinela

🌐 **Acesso Online (GitHub Pages / Instalável como PWA):** https://eliezerrosa.github.io/assembleia-perdidos-achados-pwa/

Aplicativo **PWA (Progressive Web App)** **100% offline-first** desenvolvido para rodar em **PC (Windows/macOS/Linux)** e **Mobiles (Android/iOS)** em Assembleias e Congressos, reunindo os **3 Apps Embutidos** do ecossistema Glide `Eventos (New)` (`ANL4cdICJTsLdTONT7Hp`) em uma única suíte rápida, acessível por voz (`pt-BR`) e sem dependência de internet ou assinatura paga.

---

## Os 3 Apps Embutidos na Suíte

### 1. 📦 Perdidos & Achados + Guarda-Volumes
- **Foto → Etiqueta Gêmea → Foto (+ Foto de Entrega)** com compressão automática via Canvas (~40 KB) e carimbo opcional de etiqueta/hora.
- **Orientações Oficiais (§54–58)** automatizadas: §55 (*Não Expor* para Alto/Precioso/Carteira/Celular), §56 (*Pessoa/Criança Perdida* — proibido anunciar no microfone), §57 (*Contas* para dinheiro + Deck Swipe *Destinar SA* >= 60 dias com *Reverter Despacho* < 7 dias) e §58 (*Guarda-Volumes* com identificação obrigatória do dono exceto roupas).
- **Itens Procurados** com cruzamento de similaridade, trava **Abrir/Fechar Evento**, convite copiável para equipe, **Excel 25 colunas** + `PA.txt` Acrobat legado e impressão A4 oficial (**ANEXO 1** 15 linhas/pág + **Relatório Final**).

### 2. 🎙️ Presidência do Congresso
- **Painel Evento em Foco**: KPIs clicáveis (*Já Compareceram*, *Faltam 1º Dia*, *Ensaios no Palco*, *Dicas A/V & Demos*), cartão ao vivo **No Palco Agora / Próxima Parte** e **Folha do Presidente de Sessão** imprimível em A4 (6 turnos: Sex/Sáb/Dom × Manhã/Tarde).
- **Programa, Oradores & Ensaios**: Grade de 3 dias × 2 turnos com os 14 tipos e 3 formatos (`Ao Vivo`, `Vídeo`, `Áudio`), flag `Série`, **clonagem de orador** a partir de outra parte, **3 Substitutos** (`1º 🥇`, `2º 🥈`, `3º 🥉`) com promoção em 1 toque, **Check-in em 3 etapas** (`1º Dia`, `30m antes do dia`, `30m antes do palco`), **Ensaio no Palco** e mensagens WhatsApp prontas (incluindo *Salmo 134:3*).
- **Cronômetro Dual-Mode**: modo **Ao Vivo** (`INÍCIO da Parte` / `FIM da Parte` / `RESTAURAR`) e modo **Ensaio Pessoal** (sem encerrar a parte oficial), com alerta âmbar no **último minuto (`-1 min`)** e alerta vermelho pulsante de **estouro (`PASSOU DA HORA`)**.
- **Participantes de Demonstrações & Entrevistas (`Programa Parte`)**: gestão de Experiências, Demonstrações, Encenações, Entrevistas e Comentários vinculados às partes do programa, com orientações de palco e check-in de ensaio.
- **Guia de Áudio & Vídeo**: roteiro agrupado por Parte → Seção → Mídia com destaque para a **Dica Play** exata e chave **Ativar Play** (modo operação ao vivo vs modo edição), também embarcado diretamente dentro de cada parte do programa!
- **Agenda, Lembretes (7 perfis RBAC com *Já Lido e Feito*) e Documentos de Referência** (`CO-10`, `CO-160`, `CCO-pgm`, `CO-90`, `S-329`).

### 3. 📖 Resumo de A Sentinela
- **Estudo & Ordem de Entrada em Cascata**: reordenação rápida (`↑`/`↓`) recalculando automaticamente toda a cadeia cronológica `HH:MM:SS` a partir do horário de início (padrão `30s` por comentário) e comparando o total contra a duração prevista.
- **Coreografia de Palco (`ESQUERDA` / `DIREITA` / `TRIBUNA`)**: banner dourado de alto contraste (`#FFD700`) e **auditoria automática de alternância** alertando se dois comentaristas seguidos entram pelo mesmo lado!
- **Palco, Galeria de Comentaristas & Matriz de Substituições**: `Resumo Galeria` com fotos para os irmãos do Palco, check-in `1º Dia` + `Ensaio Palco (Domingo 8:30)` com convite WhatsApp em 1 toque, matriz de cobertura dos substitutos e quadro oficial de **Orientações de Palco e Comentários** (`w19.01 p.13 §18`, `w16.09 pp.18-19 §§5-8`, `th lição 5 p.8`).
- **Imagens a Exibir (Deck A/V)**: lista dedicada para Áudio e Vídeo com alerta vermelho **`👈👈👈 EXIBIR esta imagem`** em ordem exata de entrada.
- **Estúdio de Áudio Offline, Backup & Player `Áudio Completo`**: gravação local compacta (`MediaRecorder` 16 kbps) para *Pergunta*, *Comentário* e *Conectivo*, ditado por voz `pt-BR` (substituindo IA paga), **Salvar / Recuperar Comentário** (snapshot), player sequencial **`Áudio Completo`** com fallback TTS automático e mural **`Conversar Com Todos`**.

---

## Recursos Compartilhados da Suíte

- **Equipe & Voluntários**: cadastro único (com foto, congregação, 15 departamentos, 5 áreas e flags de elegibilidade) que alimenta Presidência, Demonstrações e A Sentinela.
- **Acessibilidade por Voz (`pt-BR`)**: comandos globais (`Alt+V` / `Ctrl+K`) para alternar entre os 3 apps, buscar, ditar campos e ouvir resumo falado (TTS), além de **Alto Contraste** e ajuste de fonte.
- **Exportar, Importar & Mesclar Multi-Dispositivo (`localStorage` v2)**: consolida pacotes `.json` entre vários celulares e PCs mantendo todos os 3 apps sincronizados e resolvendo colisões de etiquetas com segurança.
- **Modelagem MER + UML Granular (17 Entidades)**: documentada em [docs/MER.md](docs/MER.md), [docs/UML.md](docs/UML.md), [docs/ARQUITETURA.md](docs/ARQUITETURA.md) e no explorador gráfico SVG offline [docs/mer_uml_visual.html](docs/mer_uml_visual.html) (online: https://eliezerrosa.github.io/assembleia-perdidos-achados-pwa/mer-uml-visual.html).

---

## Como Executar

```bash
npm install
npm run dev        # Desenvolvimento local (PC + rede mobile)
npm run typecheck  # Verificação estrita TypeScript
npm test           # Suíte Vitest (18 testes em 6 arquivos)
npm run build      # Build de produção PWA (dist/)
```

---

## Privacidade & LGPD

- Nenhum dado pessoal real (nomes, telefones, endereços ou planilhas reais) é versionado neste repositório público.
- O botão de demonstração carrega apenas dados **100% fictícios** cobrindo todos os 3 apps embutidos.
