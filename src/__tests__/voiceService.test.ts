import { describe, expect, it } from 'vitest';
import { parseSpokenItemFields, parseVoiceCommand } from '../services/voiceService';

describe('voiceService — Comandos de Voz e Preenchimento de Formulários (pt-BR)', () => {
  it('interpreta comandos de navegação e atalhos especiais', () => {
    expect(parseVoiceCommand('Abrir destinar')).toEqual({ type: 'NAVIGATE', tab: 'destinar' });
    expect(parseVoiceCommand('Abrir relatório final')).toEqual({ type: 'NAVIGATE', tab: 'relatorio' });
    expect(parseVoiceCommand('Sincronizar dados')).toEqual({ type: 'NAVIGATE', tab: 'sincronizar' });
    expect(parseVoiceCommand('Abrir arquitetura UML')).toEqual({ type: 'NAVIGATE', tab: 'arquitetura' });
    expect(parseVoiceCommand('Novo item')).toEqual({ type: 'OPEN_NEW_ITEM' });
    expect(parseVoiceCommand('Abrir guarda-volumes')).toEqual({
      type: 'OPEN_NEW_ITEM',
      presetCategoria: 'Guardado',
    });
    expect(parseVoiceCommand('Criança perdida')).toEqual({
      type: 'OPEN_NEW_ITEM',
      presetCategoria: 'Criança',
      presetValor: 'Precioso',
    });
    expect(parseVoiceCommand('Buscar garrafa térmica')).toEqual({
      type: 'SEARCH',
      query: 'garrafa térmica',
    });
  });

  it('extrai múltiplos campos estruturados a partir de uma única frase falada', () => {
    const fields = parseSpokenItemFields(
      'Celular Samsung capa verde, valor alto, categoria perdido, quem trouxe Maria no banheiro feminino, página 2',
    );
    expect(fields.tipoItem).toBe('Celular');
    expect(fields.descricao).toContain('Celular Samsung capa verde');
    expect(fields.valor).toBe('Alto');
    expect(fields.categoria).toBe('Perdido');
    expect(fields.quemTrouxe).toBe('Maria');
    expect(fields.localAchado).toBe('Banheiro feminino');
    expect(fields.formPagina).toBe(2);
  });

  it('reconhece comandos de salvar e preencher quando o formulário está aberto', () => {
    expect(parseVoiceCommand('Salvar item', { isFormOpen: true })).toEqual({ type: 'SAVE_FORM' });
    const action = parseVoiceCommand('Valor precioso, congregação Jardim Atlântico', { isFormOpen: true });
    expect(action.type).toBe('FILL_ITEM_FIELDS');
    if (action.type === 'FILL_ITEM_FIELDS') {
      expect(action.fields.valor).toBe('Precioso');
      expect(action.fields.congregacao).toBe('Jardim Atlântico');
    }
  });
});
