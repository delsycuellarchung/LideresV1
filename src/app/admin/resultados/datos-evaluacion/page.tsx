"use client";

import React from 'react';
import { mapLabelToNumeric } from '@/lib/scaleMapper';
import ExcelJS from 'exceljs';

type Afirm = { codigo?: string; pregunta: string; tipo?: string | null; categoria?: string };
type RespEntry = { id: string; createdAt: string; responses?: Record<string, string>; token?: string; evaluatorName?: string; evaluadoNombre?: string; evaluadoCodigo?: string };

export default function DatosEvaluacionPage() {
  const [allResponses, setAllResponses] = React.useState<RespEntry[]>([]);
  const [afirmaciones, setAfirmaciones] = React.useState<Afirm[]>([]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem('form_responses') || '[]';
      setAllResponses(JSON.parse(raw) || []);
    } catch {
      setAllResponses([]);
    }

    try {
      const rawA = window.localStorage.getItem('formulario_afirmaciones') || '[]';
      setAfirmaciones(JSON.parse(rawA) || []);
    } catch {
      setAfirmaciones([]);
    }
  }, []);

  const competenciasAgrupadas = React.useMemo(() => {
    const map: Record<string, Afirm[]> = {};
    for (const a of afirmaciones) {
      if (a.categoria === 'competencia' && a.tipo) {
        if (!map[a.tipo]) map[a.tipo] = [];
        map[a.tipo].push(a);
      }
    }
    return map;
  }, [afirmaciones]);

  const estilosAgrupados = React.useMemo(() => {
    const map: Record<string, Afirm[]> = {};
    for (const a of afirmaciones) {
      if (a.categoria === 'estilo' && a.tipo) {
        if (!map[a.tipo]) map[a.tipo] = [];
        map[a.tipo].push(a);
      }
    }
    return map;
  }, [afirmaciones]);

  const codigosCompetencias = Object.keys(competenciasAgrupadas);
  const codigosEstilos = Object.keys(estilosAgrupados);
  const todasAfirmaciones = React.useMemo(() => afirmaciones.filter(a => a.codigo), [afirmaciones]);

  const exportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Datos Evaluacion');

      const codeHeaders = todasAfirmaciones.map(a => a.codigo || a.pregunta);

      // Build all rows in memory first
      const dataRows = allResponses.map(r => {
        const base: any[] = [];
        base[0] = r.evaluadoCodigo || '';
        base[1] = r.evaluadoNombre || '';
        base[2] = r.evaluatorName || '';
        base[3] = r.createdAt ? new Date(r.createdAt).toLocaleString() : '';

        const vals = codeHeaders.map(code => {
          const raw = r.responses?.[code] || '';
          const numeric = mapLabelToNumeric(String(raw));
          return numeric !== null ? numeric : (raw || '');
        });
        return base.concat(vals);
      });

      // Determine which code columns actually have any data
      const usedMask = codeHeaders.map((_, idx) => dataRows.some(row => {
        const v = row[4 + idx];
        return v !== null && v !== undefined && String(v).trim() !== '';
      }));

      // Build worksheet columns keeping only used ones to avoid empty columns
      const columns: any[] = [
        { header: 'CÓDIGO', key: 'codigo', width: 10 },
        { header: 'EVALUADO', key: 'evaluado', width: 28 },
        { header: 'EVALUADOR', key: 'evaluador', width: 24 },
        { header: 'FECHA', key: 'fecha', width: 18 },
      ];
      const keptIndices: number[] = [];
      usedMask.forEach((used, idx) => {
        if (used) {
          columns.push({ header: codeHeaders[idx], key: `c${idx}`, width: 10 });
          keptIndices.push(idx);
        }
      });

      worksheet.columns = columns;

      // Header styling
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, size: 11 };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      headerRow.height = 26;

      // Add rows using only kept columns
      dataRows.forEach(dr => {
        const base = [dr[0], dr[1], dr[2], dr[3]];
        const rest = keptIndices.map(i => dr[4 + i]);
        const row = worksheet.addRow(base.concat(rest));
        row.eachCell((cell, colNumber) => {
          cell.alignment = { horizontal: colNumber >= 5 ? 'center' : 'left', vertical: 'middle' };
          cell.font = { size: 10 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          };
        });
        row.height = 18;
      });

      worksheet.views = [{ state: 'frozen', ySplit: 1 }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `datos_evaluacion.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error exporting XLSX', e);
      alert('Error al exportar Excel');
    }
  };

  return (
    <section style={{ padding: '12px 24px 20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ margin: '-140px 0 0 0', fontSize: 28, fontWeight: 800 }}>DATOS EVALUACION</h1>
        </div>
        <div style={{ marginTop: 0, marginLeft: 12 }}>
          <button onClick={exportExcel} style={{ padding: '8px 12px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 700 }}>Exportar Excel</button>
        </div>
      </div>
      <div style={{ marginTop: 30, marginLeft: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#2f2f2f' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #dcdcdc', color: '#555', fontWeight: 600 }}>
              <th style={{ padding: '12px 14px', width: 140, minWidth: 120, textAlign: 'left' }}>Código</th>
              <th style={{ padding: '12px 14px', width: 340, minWidth: 240, textAlign: 'left' }}>Evaluado</th>
              <th style={{ padding: '12px 14px', width: 220, minWidth: 160, textAlign: 'left' }}>Evaluador</th>
              <th style={{ padding: '12px 14px', width: 140 }}>Fecha</th>
              {todasAfirmaciones.map((a, i) => {
                const rawLabel = a.codigo ? String(a.codigo) : `P${i + 1}`;
                const label = rawLabel; // show full code (keep numbers) so columns are unique
                return <th key={rawLabel} title={a.pregunta} style={{ padding: '8px 10px', minWidth: 90, textAlign: 'center', whiteSpace: 'normal' }}>{label}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {allResponses.length === 0 ? (
              <tr>
                <td colSpan={4 + todasAfirmaciones.length} style={{ padding: 20, textAlign: 'center', color: '#666' }}>No hay respuestas registradas aún.</td>
              </tr>
            ) : (
              allResponses.map((resp, idx) => (
                <tr key={resp.id || idx} style={{ borderBottom: '1px solid #ededed' }}>
                      <td style={{ padding: '12px 14px', width: 140, minWidth: 120 }}>{resp.evaluadoCodigo}</td>
                      <td style={{ padding: '12px 14px', width: 340, minWidth: 240 }}>{resp.evaluadoNombre}</td>
                      <td style={{ padding: '12px 14px', width: 220, minWidth: 160 }}>{resp.evaluatorName}</td>
                      <td style={{ padding: '12px 14px', width: 140 }}>{resp.createdAt ? new Date(resp.createdAt).toLocaleDateString() : ''}</td>
                      {todasAfirmaciones.map(a => {
                        const code = a.codigo || '';
                        const raw = resp.responses?.[code] || '';
                        const mapped = mapLabelToNumeric(raw as string);
                        const display = raw && typeof mapped === 'number' && !isNaN(mapped) ? `${raw} (${mapped})` : raw;
                        return <td key={code} style={{ padding: '8px 10px', minWidth: 90, textAlign: 'center' }}>{display}</td>;
                      })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const thNormal: React.CSSProperties = {
  padding: '14px 18px',
  textAlign: 'left'
};

const thSmall: React.CSSProperties = {
  padding: '14px 10px',
  textAlign: 'left',
  width: 70
};

const thCenter: React.CSSProperties = {
  padding: '14px 10px',
  textAlign: 'center'
};

const tdNormal: React.CSSProperties = {
  padding: '16px 18px'
};

const tdSmall: React.CSSProperties = {
  padding: '16px 10px',
  width: 70
};

const tdCenter: React.CSSProperties = {
  padding: '16px 10px',
  textAlign: 'center'
};