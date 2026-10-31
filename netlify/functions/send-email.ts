import nodemailer from 'nodemailer';

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = await req.json();
    const {
      to,
      from,
      fromName,
      subject,
      type,
      link,
      recoveryLink,
      invitationLink,
      tempPassword,
      fullName,
      smtp,
    } = payload;

    if (!to || !to.includes('@')) {
      return new Response(JSON.stringify({ error: 'Dirección de destinatario no válida' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const senderEmail = from || 'anromago@hotmail.com';
    const senderTitle = fromName || 'Fontanería Roma';
    const isInvitation = type === 'invitation';
    const targetLink = link || invitationLink || recoveryLink || '';
    const recipientName = fullName || to.split('@')[0];

    const emailSubject =
      subject ||
      (isInvitation
        ? `Invitación y acceso a Gestión Partes de Trabajo — ${senderTitle}`
        : `Restablecer contraseña — ${senderTitle}`);

    const emailHtml =
      html ||
      (isInvitation
        ? `
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
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800;">${senderTitle}</h1>
              <p style="color: #94a3b8; margin: 4px 0 0; font-size: 13px;">Gestión de Partes de Trabajo e Instalaciones</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">¡Bienvenido/a al equipo!</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                Hola <strong>${recipientName}</strong>, has sido dado/a de alta en la aplicación corporativa de <strong>${senderTitle}</strong>.
              </p>
              <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; line-height: 1.6;">
                <div><strong>👤 Usuario / Email:</strong> <span style="font-family: monospace; color: #2563eb;">${to}</span></div>
                ${tempPassword ? `<div style="margin-top: 6px;"><strong>🔑 Contraseña temporal:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${tempPassword}</span></div>` : ''}
              </div>
              <p style="font-size: 13px; color: #475569;">
                Para entrar directamente y activar tu cuenta, pulsa en el siguiente botón:
              </p>
              <div style="text-align: center; margin: 26px 0;">
                <a href="${targetLink}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-size: 14px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);">
                  🚀 Acceder a la Aplicación
                </a>
              </div>
              <p style="font-size: 11px; color: #64748b; line-height: 1.4;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                <a href="${targetLink}" style="color: #2563eb; word-break: break-all;">${targetLink}</a>
              </p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
              <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.4;">
                • Por seguridad, se te pedirá definir tu contraseña definitiva en el primer acceso.<br>
                • Mensaje oficial remitido por <strong>${senderTitle} &lt;${senderEmail}&gt;</strong>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
      : `
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
                <a href="${targetLink}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-size: 14px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);">
                  🔗 Abrir enlace para cambiar contraseña
                </a>
              </div>
              <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
                Si el botón anterior no funciona, copia y pega la siguiente dirección en tu navegador:<br>
                <a href="${targetLink}" style="color: #2563eb; word-break: break-all;">${targetLink}</a>
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
</html>`;

    // Si hay servidor SMTP configurado (host y usuario):
    if (smtp && smtp.host && smtp.user) {
      const port = Number(smtp.port) || 587;
      const isSecure = port === 465 || smtp.encryption === 'ssl_tls';

      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: port,
        secure: isSecure,
        auth: {
          user: smtp.user,
          pass: smtp.password || '',
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      const info = await transporter.sendMail({
        from: `"${senderTitle}" <${senderEmail}>`,
        to: to,
        subject: emailSubject,
        html: emailHtml,
      });

      console.log(`[SMTP SUCCESS] Correo enviado a ${to} (ID: ${info.messageId})`);
      return new Response(
        JSON.stringify({
          success: true,
          message: `Correo enviado con éxito a ${to} a través del servidor SMTP (${smtp.host}).`,
          messageId: info.messageId,
          recipient: to,
          sender: senderEmail,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Si el servidor SMTP no tiene host o usuario configurado en la app:
    return new Response(
      JSON.stringify({
        success: false,
        error:
          'El servidor SMTP no está configurado en Datos de la Empresa (falta host, usuario o contraseña). Configúralo en Datos Maestros / Configuración de Empresa para envíos automáticos.',
        needsSmtpConfig: true,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[SMTP ERROR]', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Error en la conexión con el servidor SMTP',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
