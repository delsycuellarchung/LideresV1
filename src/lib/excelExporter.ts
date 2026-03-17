import ExcelJS from 'exceljs';

export interface ResponseEntry {
  id: string;
  createdAt: string;
  responses?: Record<string, string>;
  token?: string;
  evaluatorName?: string;
  evaluadoNombre?: string;
  evaluadoCodigo?: string;
}

const LABEL_TO_VALUE: Record<string, number> = {
  'nunca': 1,
  'rara vez': 2,
  'casi nunca': 3,
  'a veces': 4,
  'siempre': 5,
};

function mapLabelToNumeric(label?: string): number | null {
  if (!label) return null;
  const norm = label.trim().toLowerCase();
  if (norm in LABEL_TO_VALUE) return LABEL_TO_VALUE[norm];
  return null;
}

export async function exportToExcel(
  entries: ResponseEntry[],
  estilos: Array<{ pregunta: string }>,
  instrucciones: string[]
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Resultados');
  const headers = ['CÓDIGO', 'EVALUADO', 'EVALUADOR', 'FECHA'];
  headers.push(...instrucciones.map(i => i.toUpperCase().substring(0, 15)));

  worksheet.columns = [
    { header: 'CÓDIGO', key: 'codigo', width: 12 },
    { header: 'EVALUADO', key: 'evaluado', width: 30 },
    { header: 'EVALUADOR', key: 'evaluador', width: 28 },
    { header: 'FECHA', key: 'fecha', width: 18 },
    ...instrucciones.map(i => ({ header: i.toUpperCase().substring(0, 15), key: i, width: 11 })),
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerRow.height = 30;

  headerRow.eachCell(cell => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });

  let rowNumber = 2;
  entries.forEach((entry) => {
    estilos.forEach((estilo, estiloIdx) => {
      const row = worksheet.getRow(rowNumber);
      const key = `est-${estiloIdx}`;
      const selectedLabel = entry.responses?.[key];
      const numeric = selectedLabel ? mapLabelToNumeric(String(selectedLabel)) : null;
      row.getCell(1).value = entry.evaluadoCodigo || 'N/A';
      row.getCell(2).value = entry.evaluadoNombre || 'Evaluado (no disponible)';
      row.getCell(3).value = entry.evaluatorName || 'Desconocido';
      row.getCell(4).value = entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : 'N/A';

      instrucciones.forEach((ins, insIdx) => {
        const isSelected = selectedLabel === ins;
        const cellValue = isSelected && numeric !== null ? numeric : '';
        row.getCell(5 + insIdx).value = cellValue;

        const cell = row.getCell(5 + insIdx);
        if (isSelected && numeric !== null) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
          cell.font = { bold: true, color: { argb: 'FF4F46E5' } };
        }
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        };
      });
      row.eachCell((cell, colNumber) => {
        cell.font = { size: 10, color: { argb: 'FF0F172A' } };
        cell.alignment = { horizontal: colNumber >= 5 ? 'center' : 'left', vertical: 'middle' };
        if (!cell.border) {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          };
        }
      });

      row.height = 18;
      rowNumber++;
    });
  });

  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Resultados-Evaluaciones-${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
