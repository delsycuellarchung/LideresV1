import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';

const disableDb = String(process.env.DISABLE_DB || 'true').toLowerCase() === 'true';

export async function POST(request: NextRequest) {
  console.log('[APP UPLOAD] POST received', new Date().toISOString());

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('[APP UPLOAD] No file in formData');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('[APP UPLOAD] File received:', { name: file.name, size: file.size, type: file.type });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (buffer.length === 0) {
      console.error('[APP UPLOAD] Empty buffer');
      return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    }

    console.log('[APP UPLOAD] Parsing Excel, buffer size:', buffer.length);

    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        return NextResponse.json({ error: 'File has no sheets' }, { status: 400 });
      }

      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null }) as any[];

      if (jsonData.length === 0) {
        return NextResponse.json({ error: 'El archivo Excel está vacío' }, { status: 400 });
      }

      console.log('[APP UPLOAD] Parsed', jsonData.length, 'rows');

      if (disableDb) {
        try {
          const debugDir = path.join(process.cwd(), 'uploads-debug');
          if (!fs.existsSync(debugDir)) {
            fs.mkdirSync(debugDir, { recursive: true });
          }
          const debugFile = path.join(debugDir, 'last-import.json');
          await writeFile(
            debugFile,
            JSON.stringify({ rows: jsonData, filename: file.name, savedAt: new Date().toISOString() })
          );
          console.log('[APP UPLOAD] Saved to debug directory');
        } catch (writeErr) {
          console.warn('[APP UPLOAD] Write error:', writeErr);
        }

        return NextResponse.json({
          success: true,
          inserted: jsonData.length,
          rows: jsonData,
        });
      }

      return NextResponse.json({
        success: true,
        inserted: jsonData.length,
        rows: jsonData,
      });
    } catch (xlsxErr: any) {
      console.error('[APP UPLOAD] XLSX error:', xlsxErr?.message);
      return NextResponse.json(
        {
          error: 'Failed to parse Excel file',
          details: xlsxErr?.message,
        },
        { status: 400 }
      );
    }
  } catch (err: any) {
    console.error('[APP UPLOAD] Error:', err?.message);
    return NextResponse.json(
      {
        error: 'Server error',
        message: err?.message,
      },
      { status: 500 }
    );
  }
}
