import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import * as Domain from '../domain';
import { encodeXlsx } from './xlsx';

const TIME_ZONE = 'America/Bogota';

/** 26/09/2026 14:05 in Bogotá (UTC-5). */
const ENTERED_AT = Date.UTC(2026, 8, 26, 19, 5);
const MINUTE = 60 * 1000;

const content: Domain.ShiftReportContent = {
  residentialUnitName: 'Conjunto Los Álamos',
  timeZone: TIME_ZONE,
  porterName: 'Pedro Pérez',
  shiftStartedAt: ENTERED_AT - 60 * MINUTE,
  shiftEndedAt: undefined,
  visits: [
    {
      visitorName: 'Mateo <Ramírez> & "Hijos"',
      visitorDocument: '1020304050',
      plate: 'ABC123',
      visitType: 'temporary',
      origin: 'pass',
      enteredAt: ENTERED_AT + 30 * MINUTE,
      exitedAt: ENTERED_AT + 90 * MINUTE,
      apartmentLabel: 'Torre 1 · 101',
      entryPorterName: 'Pedro Pérez',
    },
    {
      visitorName: 'Ana Gómez',
      visitorDocument: '99887766',
      visitType: 'service',
      origin: 'manual',
      overriddenRejection: 'expired',
      enteredAt: ENTERED_AT,
      apartmentLabel: 'Torre 2 · 402',
      entryPorterName: 'Pedro Pérez',
    },
    {
      visitorName: 'Registro duplicado',
      visitType: 'event',
      origin: 'manual',
      enteredAt: ENTERED_AT - 30 * MINUTE,
      voidedAt: ENTERED_AT,
      voidReason: 'Doble registro',
      apartmentLabel: 'Torre 1 · 101',
      entryPorterName: 'Pedro Pérez',
    },
  ],
};

const unzipWorkbook = () =>
  Object.fromEntries(
    Object.entries(
      unzipSync(
        encodeXlsx(
          Domain.buildShiftReportWorkbookParts({
            content,
            generatedAt: ENTERED_AT + 120 * MINUTE,
          })
        )
      )
    ).map(([path, bytes]) => [path, strFromU8(bytes)])
  );

describe('buildShiftReportWorkbookParts', () => {
  it('packs a workbook with a Visitas and a Resumen sheet', () => {
    const files = unzipWorkbook();

    expect(Object.keys(files).sort()).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/workbook.xml',
      'xl/worksheets/sheet1.xml',
      'xl/worksheets/sheet2.xml',
    ]);
    expect(files['xl/workbook.xml']).toContain('<sheet name="Visitas"');
    expect(files['xl/workbook.xml']).toContain('<sheet name="Resumen"');
  });

  it('lists Visitas in Ingreso order with voided ones last', () => {
    const sheetXml = unzipWorkbook()['xl/worksheets/sheet1.xml'] ?? '';
    // The text of every inline-string or numeric cell, row by row.
    const rows = [...sheetXml.matchAll(/<row [^>]*>(.*?)<\/row>/g)].map((row) =>
      [
        ...(row[1] ?? '').matchAll(
          /<c [^>]*>(?:<is><t[^>]*>(.*?)<\/t><\/is>|<v>(.*?)<\/v>)<\/c>/g
        ),
      ].map((cell) => cell[1] ?? cell[2] ?? '')
    );

    expect(rows).toEqual([
      [
        'Visitante',
        'Documento',
        'Apartamento',
        'Tipo de visita',
        'Origen',
        'Placa',
        'Ingreso',
        'Salida',
        'Portero de ingreso',
        'Observación',
      ],
      [
        'Ana Gómez',
        '99887766',
        'Torre 2 · 402',
        'Servicio',
        'Registro manual',
        '26/09/2026 14:05',
        'Pedro Pérez',
        'Ingreso forzado: Pase vencido',
      ],
      [
        'Mateo &lt;Ramírez&gt; &amp; &quot;Hijos&quot;',
        '1020304050',
        'Torre 1 · 101',
        'Temporal',
        'Pase QR',
        'ABC123',
        '26/09/2026 14:35',
        '26/09/2026 15:35',
        'Pedro Pérez',
      ],
      [
        'Registro duplicado',
        'Torre 1 · 101',
        'Evento',
        'Registro manual',
        '26/09/2026 13:35',
        'Pedro Pérez',
        'Anulada: Doble registro',
      ],
    ]);
  });

  it('summarizes the Turno without counting voided Visitas', () => {
    const sheetXml = unzipWorkbook()['xl/worksheets/sheet2.xml'] ?? '';
    // The text of every inline-string or numeric cell, row by row.
    const rows = [...sheetXml.matchAll(/<row [^>]*>(.*?)<\/row>/g)].map((row) =>
      [
        ...(row[1] ?? '').matchAll(
          /<c [^>]*>(?:<is><t[^>]*>(.*?)<\/t><\/is>|<v>(.*?)<\/v>)<\/c>/g
        ),
      ].map((cell) => cell[1] ?? cell[2] ?? '')
    );

    expect(rows).toEqual([
      ['Reporte de turno'],
      ['Unidad residencial', 'Conjunto Los Álamos'],
      ['Portero', 'Pedro Pérez'],
      ['Inicio del turno', '26/09/2026 13:05'],
      ['Fin del turno', 'Turno abierto'],
      ['Generado', '26/09/2026 16:05'],
      [],
      ['Total de visitas', '2'],
      ['Por Pase QR', '1'],
      ['Registros manuales', '1'],
      ['Temporal', '1'],
      ['Evento', '0'],
      ['Servicio', '1'],
      ['Ingresos forzados', '1'],
      ['Sin salida registrada', '1'],
      ['Visitas anuladas (no incluidas)', '1'],
    ]);
  });
});

describe('toShiftReportFileName', () => {
  it('names the file after the unit and the local start of the Turno', () => {
    expect(
      Domain.toShiftReportFileName({
        residentialUnitName: 'Conjunto Los Álamos (Etapa 2)',
        shiftStart: ENTERED_AT,
        timeZone: TIME_ZONE,
      })
    ).toBe('reporte-turno-conjunto-los-alamos-etapa-2-2026-09-26-1405.xlsx');
  });
});
