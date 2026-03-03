import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { sendFormEmail } from '@/lib/emailService';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    console.log('🔵 [API] POST /api/send-forms llamado');
    const body = await request.json();
    const { evaluators, formData, mensajePersonalizado } = body;

    console.log(`📋 [API] Recibidos ${evaluators?.length || 0} evaluadores`);

    if (!evaluators || !Array.isArray(evaluators) || evaluators.length === 0) {
      console.error('❌ [API] No evaluators provided');
      return NextResponse.json(
        { error: 'No evaluators provided' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const sendEmails = String(process.env.SEND_EMAILS || 'true').toLowerCase() !== 'false';
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const evaluator of evaluators) {
      try {
        const formToken = uuidv4();
        const email = evaluator.correo || evaluator.correo_evaluador || evaluator.email || null;
        const name = (evaluator.nombre_evaluador || evaluator.nombre || evaluator.nombreEvaluador || evaluator.nombre_evaluador_alt || '').toString().trim();
        const evaluadoName = (evaluator.nombre_evaluado || evaluator.nombre_alt || evaluator.nombreEvaluado || 'N/A').toString();

        // Valida si existe el correo
        if (!email || String(email).trim() === '') {
          failureCount++;
          results.push({
            success: false,
            evaluador: name,
            correo: null,
            evaluando: evaluadoName,
            error: 'No tiene correo asignado',
          });
          continue;
        }

        // enviar email (puede deshabilitarse con SEND_EMAILS=false)
        if (sendEmails) {
          try {
            console.log(`📧 [API] Enviando email a ${email} para ${evaluadoName}`);
            await sendFormEmail({
              evaluatorName: name || '',
              evaluatorEmail: email,
              evaluadoName: evaluadoName,
              evaluadoCargo: evaluator.cargo_evaluado || null,
              formLink: `${appUrl}/formulario/${formToken}`,
              mensajePersonalizado: mensajePersonalizado || '',
              formData: formData,
            });
            console.log(`✅ [API] Email enviado exitosamente a ${email}`);
          } catch (emailError: any) {
            console.error(`Email error for ${email}:`, emailError.message);
            failureCount++;
            results.push({
              success: false,
              evaluador: name,
              correo: email,
              evaluando: evaluadoName,
              error: `Error enviando email: ${emailError.message}`,
            });
            continue;
          }
        } else {
          console.log(`ℹ️ [API] SEND_EMAILS=false — simulando envío a ${email} para ${evaluadoName}`);
        }
        if (supabase) {
          try {
            await supabase
              .from('form_submissions')
              .insert({
                token: formToken,
                evaluator_email: email,
                evaluator_name: name,
                form_data: formData || {},
                responses: {
                  evaluado_nombre: evaluadoName,
                  evaluado_cargo: evaluator.cargo_evaluado || null,
                  evaluado_area: evaluator.area_evaluado || null,
                  evaluador_area: evaluator.area_evaluador || null,
                },
                status: 'pending',
              });
          } catch (dbError: any) {
            console.warn(`DB save error for ${email}:`, dbError.message);
          }
        }

        successCount++;
        results.push({
          success: true,
          evaluador: name,
          correo: email,
          evaluando: evaluadoName,
          token: formToken,
        });
      } catch (error: any) {
        console.error('Error processing evaluator:', error);
        failureCount++;
        results.push({
          success: false,
          evaluador: evaluator.nombre_evaluador || 'Unknown',
          correo: evaluator.correo || evaluator.correo_evaluador || 'N/A',
          evaluando: evaluator.nombre_evaluado || 'N/A',
          error: error.message || 'Error desconocido',
        });
      }
    }

    return NextResponse.json({
      successCount,
      failureCount,
      results,
    });
  } catch (error: any) {
    console.error('Error in send-forms API:', error);
    return NextResponse.json(
      { error: error.message || 'Error sending forms' },
      { status: 500 }
    );
  }
}
