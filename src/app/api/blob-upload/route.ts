import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';

const disableDb = String(process.env.DISABLE_DB || 'true').toLowerCase() === 'true';

export async function POST(request: NextRequest) {
  try {
    console.log('[UPLOAD] POST received at', new Date().toISOString());
    const contentType = request.headers.get('content-type') || '';
    console.log('[UPLOAD] Content-Type:', contentType);

    let buffer: Buffer;

    if (contentType.includes('multipart/form-data')) {
      console.log('[UPLOAD] Parsing FormData...');
      const formData = await request.formData();
      const file = formData.get('file');

      if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: 'No file in FormData' }, { status: 400 });
      }

      console.log('[UPLOAD] File received:', file.name, 'size:', file.size);
      const arrayBuf = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuf);
    } else {
      console.log('[UPLOAD] Unsupported content type');
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }

    if (buffer.length === 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    }

    console.log('[UPLOAD] Buffer size:', buffer.length, 'bytes');
    console.log('[UPLOAD] Parsing Excel...');

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

    console.log('[UPLOAD] ✓ Parsed', jsonData.length, 'rows');

    if (disableDb) {
      try {
        const debugDir = path.join(process.cwd(), 'uploads-debug');
        if (!fs.existsSync(debugDir)) {
          fs.mkdirSync(debugDir, { recursive: true });
        }
        await writeFile(
          path.join(debugDir, 'last-import.json'),
          JSON.stringify({ rows: jsonData, savedAt: new Date().toISOString() })
        );
        console.log('[UPLOAD] ✓ Saved to last-import.json');
      } catch (e) {
        console.warn('[UPLOAD] Write error:', e);
      }
    }

    return NextResponse.json({
      success: true,
      inserted: jsonData.length,
      rows: jsonData,
    });
  } catch (err: any) {
    console.error('[UPLOAD] ✗ Error:', err?.message, err?.stack);
    return NextResponse.json(
      { error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}
