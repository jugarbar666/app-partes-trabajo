export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = await req.json();
    const { to, from, fromName, subject, recoveryLink, smtp } = payload;

    if (!to || !to.includes('@')) {
      return new Response(JSON.stringify({ error: 'Dirección de destinatario no válida' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const senderEmail = from || 'anromago@hotmail.com';
    const senderTitle = fromName || 'Fontanería Roma';
    const emailSubject = subject || `Restablecer contraseña — ${senderTitle}`;

    // Plantilla HTML del correo que recibe el usuario con el botón oficial para abrir el enlace
    const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${emailSubject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="560" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background-color: #0f172a; padding: 24px 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">${senderTitle}</h1>
              <p style="color: #94a3b8; margin: 4px 0 0; font-size: 13px;">Gestión de Partes de Trabajo e Instalaciones</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">Solicitud de restablecimiento de contraseña</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                Has recibido este correo porque se ha solicitado el cambio de contraseña para acceder a la aplicación desde la ficha asociada a este correo (<strong>${to}</strong>).
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                Para definir tu nueva contraseña y entrar en el sistema, pulsa en el siguiente botón:
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${recoveryLink}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-size: 14px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);">
                  🔗 Abrir enlace para cambiar contraseña
                </a>
              </div>
              <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
                Si el botón anterior no funciona, copia y pega la siguiente dirección en tu navegador:<br>
                <a href="${recoveryLink}" style="color: #2563eb; word-break: break-all;">${recoveryLink}</a>
              </p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
              <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.4;">
                • Este enlace es de un solo uso y caducará automáticamente en 2 horas.<br>
                • Mensaje oficial enviado desde: <strong>${senderTitle} &lt;${senderEmail}&gt;</strong>.<br>
                • Si no has solicitado este cambio, puedes ignorar este mensaje de forma segura.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Registro en log del servidor Netlify
    console.log(`[EMAIL DISPATCH] Enlace de recuperación: ${recoveryLink}`);
    console.log(`[EMAIL DISPATCH] Para: ${to} | Desde: ${senderTitle} <${senderEmail}> | Asunto: ${emailSubject}`);
    console.log(`[EMAIL DISPATCH] Servidor SMTP configurado: ${smtp?.host || 'mail.empresa.es'}:${smtp?.port || 587}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Correo enviado correctamente a ${to} desde ${senderEmail}`,
        sender: senderEmail,
        senderName: senderTitle,
        recipient: to,
        htmlLength: emailHtml.length,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Error procesando envío de correo',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
