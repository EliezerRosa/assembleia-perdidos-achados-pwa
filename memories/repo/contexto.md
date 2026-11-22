# Memória do Repositório — assembleia-perdidos-achados-pwa

## Contexto de Domínio
- App PWA offline-first para o Departamento de **Perdidos e Achados & Guarda-Volumes** do Salão de Assembleias (Guarapari/ES — Circuito ES-005 e Congressos).
- Substitui e moderniza o app Glide anterior (`Eventos (New)`), removendo dependência de internet/nuvem paga e garantindo funcionamento em PC + Mobile com `localStorage` e mesclagem multi-dispositivo.

## Regras Críticas de Negócio (Invariantes)
1. **Fluxo Foto • Etiqueta • Foto**: Foto 1 do item com etiqueta `#N`, aplicação da 2ª etiqueta gêmea na `Form Página` do formulário físico, Foto 2 da etiqueta/formulário, e Foto 3 opcional na entrega.
2. **Orientações §54–58**:
   - §55: Valor `Alto`/`Precioso`, carteiras, bolsas, celulares e chaves NÃO ficam expostos; solicitante deve descrever antes da conferência.
   - §56: `Criança` / `Idoso` / `Adulto` perdidos NUNCA geram anúncio no microfone; avisar imediatamente Indicadores, SA e SC.
   - §57: Dinheiro não procurado vai ao Depto. de Contas no fim da assembleia; itens retidos `>= 60 dias` vão ao deck **Destinar (SA)** (`DOAR`, `VENDER`, `DESCARTAR`, `CONTAS`).
   - §58: `Guardado` (Guarda-Volumes), exceto roupas, exige Nome/Telefone, Congregação e Endereço do dono na entrada.
3. **LGPD / Privacidade**: NUNCA commitar planilhas reais (`*.xlsx`, `*.csv`) ou backups com nomes/telefones/endereços reais dos irmãos no Git. Usar apenas seed fictício em código.
4. **Multi-Dispositivo**: `mergeService.ts` unifica eventos por `(codigo, data)`, resolve colisões de etiqueta (padrão `renumerar` preservando `etiquetaOrigem`) e faz união cronológica de `rastreio[]` preservando fotos de ambos os lados.
