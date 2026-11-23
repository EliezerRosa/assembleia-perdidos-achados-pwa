import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { exportToAcrobatTxt, exportToSpreadsheet, importFromSpreadsheetBuffer } from '../services/excelService';
import { createEmptyDatabase } from '../services/storageService';

describe('excelService — Compatibilidade com Planilha Perdidos e Achados (Guarda-Volumes)', () => {
  it('importa formato exato das 25 colunas da planilha Glide/Excel e ignora linhas vazias e duplicadas', async () => {
    const sampleRows = [
      // Linha vazia (igual linha 2 do Excel real)
      {},
      {
        'Form Página': 1,
        fk_id_Eventos: 'evt_glide_01',
        DESTINO: '',
        Evento: 'Ainda Guardado',
        'Evento Tipo': 'Assembleia',
        'Evento Código': 'ES-005.27.1',
        'X Evento Data': '26/1/2027',
        'Evento Data': '26/1/2027',
        Etiqueta: 1,
        'Tipo de Item': 'Garrafa Térmica ',
        Valor: 'Médio',
        Categoria: 'Perdido',
        Fotox: 'https://example.com/foto1.jpg',
        Descrição: 'Preta 500ml',
        STATUS: 'Já Entregue',
        'Data-Hora-Guardado': '2027-01-26 09:47:44',
        'Quem-Trouxe-Nome-Tels': 'Indicador Entrada',
        'Data-Hora-Despachado': '2027-01-26 13:57:00',
        'Quem-Pegou-Nome-Tels': 'Retirante Exemplo',
        'Dono-Nome-Tels': 'Dono Exemplo',
        Congregação: 'Central',
        Endereço: 'Rua 1, 100',
        '🔒 Row ID': 'row_abc_1',
      },
      {
        'Form Página': 2,
        fk_id_Eventos: 'evt_glide_02',
        DESTINO: 'DOAR',
        'Evento Tipo': 'Congresso',
        'Evento Código': 'CO-2026',
        'X Evento Data': '18/8/2026',
        'Evento Data': '',
        Etiqueta: 5,
        'Tipo de Item': 'Anel',
        Valor: 'Baixo',
        Categoria: 'Perdido',
        Fotox: '',
        Descrição: 'Prateado',
        STATUS: 'DESPACHADO',
        'Data-Hora-Guardado': '2026-08-18 11:26:14',
        'Quem-Trouxe-Nome-Tels': 'Voluntária Limpeza',
        'Data-Hora-Despachado': '2026-12-11 22:50:45',
        'Quem-Pegou-Nome-Tels': 'Superintendente de Assembleia',
        '🔒 Row ID': 'row_abc_2',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Itens');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;

    const db = createEmptyDatabase();
    const res1 = importFromSpreadsheetBuffer(out, 'teste.xlsx', db);

    expect(res1.summary.rowsProcessed).toBe(2);
    expect(res1.summary.eventosCriados).toBe(2);
    expect(res1.summary.itensImportados).toBe(2);
    expect(res1.db.itens[0].tipoItem).toBe('Garrafa Térmica');
    expect(res1.db.itens[0].status).toBe('Já Entregue');
    expect(res1.db.itens[0].rastreio).toHaveLength(2);
    expect(res1.db.itens[1].destino).toBe('DOAR');

    // Reimportar o mesmo arquivo não duplica registros (idempotência por Row ID)
    const res2 = importFromSpreadsheetBuffer(out, 'teste.xlsx', res1.db);
    expect(res2.summary.itensImportados).toBe(0);
    expect(res2.summary.itensIgnoradosDuplicados).toBe(2);

    // Exportar de volta para XLSX e CSV funciona sem erros
    const xlsxExport = exportToSpreadsheet(res1.db, 'xlsx');
    expect(xlsxExport.filename.endsWith('.xlsx')).toBe(true);
    expect(xlsxExport.blob.size).toBeGreaterThan(0);

    const csvExport = exportToSpreadsheet(res1.db, 'csv');
    expect(csvExport.filename.endsWith('.csv')).toBe(true);

    const txtExport = exportToAcrobatTxt(res1.db);
    expect(txtExport.filename).toBe('PA.txt');
    const txtContent = await txtExport.blob.text();
    expect(txtContent).toContain('Form Página\tEvento Código\tEvento Data\tSTATUS\tDESC\tRow ID');
    expect(txtContent).toContain('Etiqueta = 1');
  });
});
