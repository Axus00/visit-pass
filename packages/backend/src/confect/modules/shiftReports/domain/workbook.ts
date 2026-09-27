import * as Predicate from 'effect/Predicate';

import type * as AuthorizationsDomain from '../../authorizations/domain';
import type * as VisitsDomain from '../../visits/domain';
import { formatLocalDateTime } from './localDateTime';
import type { ShiftReportContent, ShiftReportVisitRow } from './models';

type Cell = string | number | null;

type Row = ReadonlyArray<Cell>;

interface Sheet {
  readonly name: string;
  readonly columnWidths: ReadonlyArray<number>;
  readonly headerRow: boolean;
  readonly rows: ReadonlyArray<Row>;
}

const VISIT_TYPE_LABELS: Record<VisitsDomain.VisitType, string> = {
  temporary: 'Temporal',
  event: 'Evento',
  service: 'Servicio',
};

const VISIT_ORIGIN_LABELS: Record<VisitsDomain.VisitOrigin, string> = {
  pass: 'Pase QR',
  manual: 'Registro manual',
};

const PASS_REJECTION_LABELS: Record<
  AuthorizationsDomain.PassRejectionReason,
  string
> = {
  notFound: 'Pase no encontrado',
  cancelled: 'Pase cancelado',
  alreadyUsed: 'Pase ya usado',
  notYetValid: 'Pase aún no vigente',
  expired: 'Pase vencido',
  weekdayNotAllowed: 'Día no permitido',
  apartmentWithoutResident: 'Apartamento sin residentes',
  alreadyInside: 'Visitante ya adentro',
  replaced: 'Pase reemplazado',
};

const VISIT_COLUMNS = [
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
] as const;

const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml';

/** MIME type of the generated `.xlsx` file. */
export const XLSX_MIME_TYPE = `${XLSX_CONTENT_TYPE}.sheet`;

/** `0` → `A`, `25` → `Z`, `26` → `AA`. */
function toColumnName(index: number): string {
  const letter = String.fromCharCode(65 + (index % 26));
  const rest = Math.floor(index / 26);

  return rest === 0 ? letter : `${toColumnName(rest - 1)}${letter}`;
}

function isVoided(visit: ShiftReportVisitRow) {
  return Predicate.isNotUndefined(visit.voidedAt);
}

/**
 * The XML parts of the Reporte de turno workbook, keyed by their path inside
 * the `.xlsx` zip: a "Visitas" sheet with one row per Visita in Ingreso order,
 * voided ones last, and a "Resumen" sheet with the Turno and its totals. Dates
 * are text in the unit's time zone, so the file reads the same wherever it is
 * opened.
 */
export function buildShiftReportWorkbookParts(args: {
  readonly content: ShiftReportContent;
  readonly generatedAt: number;
}): Record<string, string> {
  const { content, generatedAt } = args;
  const { timeZone } = content;

  // Drops characters XML 1.0 forbids, then escapes markup.
  const escapeXml = (text: string) =>
    Array.from(text)
      .filter((character) => {
        // Lone surrogates and most control characters are out.
        const codePoint = character.codePointAt(0) ?? 0;

        return (
          codePoint === 0x9 ||
          codePoint === 0xa ||
          codePoint === 0xd ||
          (codePoint >= 0x20 && codePoint <= 0xd7ff) ||
          (codePoint >= 0xe000 && codePoint <= 0xfffd) ||
          codePoint >= 0x10000
        );
      })
      .join('')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const visits = [...content.visits].sort(
    (left, right) =>
      Number(isVoided(left)) - Number(isVoided(right)) ||
      left.enteredAt - right.enteredAt
  );

  const visitRows = visits.map((visit): Row => {
    const voidNote = isVoided(visit)
      ? `Anulada: ${visit.voidReason ?? 'sin motivo'}`
      : null;
    const overrideNote = Predicate.isUndefined(visit.overriddenRejection)
      ? null
      : `Ingreso forzado: ${PASS_REJECTION_LABELS[visit.overriddenRejection]}`;
    const notes = [voidNote, overrideNote].filter(Predicate.isNotNull);
    const observation = notes.length > 0 ? notes.join(' · ') : null;

    return [
      visit.visitorName,
      visit.visitorDocument ?? null,
      visit.apartmentLabel,
      VISIT_TYPE_LABELS[visit.visitType],
      VISIT_ORIGIN_LABELS[visit.origin],
      visit.plate ?? null,
      formatLocalDateTime(visit.enteredAt, timeZone),
      Predicate.isUndefined(visit.exitedAt)
        ? null
        : formatLocalDateTime(visit.exitedAt, timeZone),
      visit.entryPorterName,
      observation,
    ];
  });

  // Voided Visitas are listed but never counted.
  const countedVisits = content.visits.filter((visit) => !isVoided(visit));
  const count = (predicate: (visit: ShiftReportVisitRow) => boolean) =>
    countedVisits.filter(predicate).length;

  const summaryRows = [
    ['Reporte de turno', null],
    ['Unidad residencial', content.residentialUnitName],
    ['Portero', content.porterName],
    [
      'Inicio del turno',
      Predicate.isUndefined(content.shiftStartedAt)
        ? 'Sin iniciar'
        : formatLocalDateTime(content.shiftStartedAt, timeZone),
    ],
    [
      'Fin del turno',
      Predicate.isUndefined(content.shiftEndedAt)
        ? 'Turno abierto'
        : formatLocalDateTime(content.shiftEndedAt, timeZone),
    ],
    ['Generado', formatLocalDateTime(generatedAt, timeZone)],
    [null, null],
    ['Total de visitas', countedVisits.length],
    ['Por Pase QR', count((visit) => visit.origin === 'pass')],
    ['Registros manuales', count((visit) => visit.origin === 'manual')],
    ['Temporal', count((visit) => visit.visitType === 'temporary')],
    ['Evento', count((visit) => visit.visitType === 'event')],
    ['Servicio', count((visit) => visit.visitType === 'service')],
    [
      'Ingresos forzados',
      count((visit) => Predicate.isNotUndefined(visit.overriddenRejection)),
    ],
    [
      'Sin salida registrada',
      count((visit) => Predicate.isUndefined(visit.exitedAt)),
    ],
    [
      'Visitas anuladas (no incluidas)',
      content.visits.length - countedVisits.length,
    ],
  ] satisfies ReadonlyArray<Row>;

  const sheets: ReadonlyArray<Sheet> = [
    {
      name: 'Visitas',
      columnWidths: [28, 16, 18, 14, 16, 10, 18, 18, 24, 36],
      headerRow: true,
      rows: [VISIT_COLUMNS, ...visitRows],
    },
    {
      name: 'Resumen',
      columnWidths: [24, 36],
      headerRow: false,
      rows: summaryRows,
    },
  ];

  const sheetParts = Object.fromEntries(
    sheets.map((sheet, index) => {
      const columns = sheet.columnWidths
        .map(
          (width, columnIndex) =>
            `<col min="${columnIndex + 1}" max="${columnIndex + 1}" width="${width}" customWidth="1"/>`
        )
        .join('');

      const rows = sheet.rows
        .map((row, rowIndex) => {
          const rowNumber = rowIndex + 1;
          const isHeader = sheet.headerRow && rowIndex === 0;
          // Style 1 is the bold header font in `xl/styles.xml`.
          const styleAttribute = isHeader ? ' s="1"' : '';
          const cells = row
            .map((cell, columnIndex) => {
              const reference = `${toColumnName(columnIndex)}${rowNumber}`;

              if (Predicate.isNull(cell)) return '';
              if (Predicate.isNumber(cell))
                return `<c r="${reference}"${styleAttribute}><v>${cell}</v></c>`;

              return `<c r="${reference}" t="inlineStr"${styleAttribute}><is><t xml:space="preserve">${escapeXml(cell)}</t></is></c>`;
            })
            .join('');

          return `<row r="${rowNumber}">${cells}</row>`;
        })
        .join('');

      const frozenHeader = sheet.headerRow
        ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
        : '';

      const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${frozenHeader}<cols>${columns}</cols><sheetData>${rows}</sheetData></worksheet>`;

      return [`xl/worksheets/sheet${index + 1}.xml`, sheetXml];
    })
  );

  const sheetOverrides = sheets
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="${XLSX_CONTENT_TYPE}.worksheet+xml"/>`
    )
    .join('');

  const workbookSheets = sheets
    .map(
      (sheet, index) =>
        `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
    )
    .join('');

  const workbookRelationships = sheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
    )
    .join('');

  const stylesRelationshipId = `rId${sheets.length + 1}`;

  return {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${XLSX_CONTENT_TYPE}.sheet.main+xml"/>${sheetOverrides}<Override PartName="/xl/styles.xml" ContentType="${XLSX_CONTENT_TYPE}.styles+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRelationships}<Relationship Id="${stylesRelationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    ...sheetParts,
  };
}
