/**
 * Crea y publica plantillas Resend para Apolo.
 * Uso: node scripts/setup_resend_templates.js
 */
require("dotenv").config({ path: ".env.local", quiet: true });
const fs = require("fs");
const path = require("path");
const { Resend } = require("resend");

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error("Falta RESEND_API_KEY en .env.local");
  process.exit(1);
}

const resend = new Resend(apiKey);

const CONTACT_HTML = `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#0E0E0E;font-family:Arial,Helvetica,sans-serif;color:#f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0E0E0E;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="background:#141414;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(90deg,#C7940A,#F5C542);padding:18px 24px;">
                <h1 style="margin:0;font-size:20px;color:#0E0E0E;">Apolo Lubricantes</h1>
                <p style="margin:6px 0 0;font-size:13px;color:#1a1a1a;">Nuevo mensaje desde el formulario web</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#e5e5e5;">
                  Recibiste un mensaje de contacto desde <strong>lubricantesapolo.com</strong>.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;width:120px;">Nombre</td>
                    <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#fafafa;font-size:14px;">{{{CUSTOMER_NAME}}}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Correo</td>
                    <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#fafafa;font-size:14px;">{{{CUSTOMER_EMAIL}}}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Teléfono</td>
                    <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#fafafa;font-size:14px;">{{{CUSTOMER_PHONE}}}</td>
                  </tr>
                </table>
                <div style="margin-top:20px;padding:16px;background:#0E0E0E;border:1px solid #2a2a2a;border-radius:12px;">
                  <p style="margin:0 0 8px;color:#C7940A;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;font-weight:bold;">Mensaje</p>
                  <p style="margin:0;color:#e5e5e5;font-size:14px;line-height:1.6;">{{{CUSTOMER_MESSAGE}}}</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px 20px;color:#71717a;font-size:11px;">
                Responde a este correo para contactar al cliente (reply-to).
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();

async function ensureContactTemplate() {
  const existingId = process.env.RESEND_CONTACT_TEMPLATE_ID?.trim();
  if (existingId) {
    console.log("Plantilla de contacto ya configurada:", existingId);
    try {
      await resend.templates.publish(existingId);
      console.log("Plantilla re-publicada");
    } catch (e) {
      console.warn("Publish note:", e?.message || e);
    }
    return existingId;
  }

  const created = await resend.templates.create({
    name: "apolo-contact-form",
    html: CONTACT_HTML,
    variables: [
      { key: "CUSTOMER_NAME", type: "string", fallbackValue: "Cliente" },
      { key: "CUSTOMER_EMAIL", type: "string", fallbackValue: "sin-correo" },
      { key: "CUSTOMER_PHONE", type: "string", fallbackValue: "No proporcionado" },
      { key: "CUSTOMER_MESSAGE", type: "string", fallbackValue: "(sin mensaje)" },
    ],
  });

  if (created.error) throw new Error(created.error.message || JSON.stringify(created.error));
  const id = created.data?.id;
  if (!id) throw new Error("Resend no devolvió id de plantilla: " + JSON.stringify(created));

  const published = await resend.templates.publish(id);
  if (published.error) throw new Error(published.error.message || JSON.stringify(published.error));

  console.log("Plantilla creada y publicada:", id);
  return id;
}

function writeEnvTemplateId(templateId) {
  const envPath = path.join(process.cwd(), ".env.local");
  let text = fs.readFileSync(envPath, "utf8");
  if (/^RESEND_CONTACT_TEMPLATE_ID=/m.test(text)) {
    text = text.replace(
      /^RESEND_CONTACT_TEMPLATE_ID=.*$/m,
      `RESEND_CONTACT_TEMPLATE_ID=${templateId}`
    );
  } else {
    text += `\nRESEND_CONTACT_TEMPLATE_ID=${templateId}\n`;
  }
  fs.writeFileSync(envPath, text);
  console.log("Actualizado .env.local → RESEND_CONTACT_TEMPLATE_ID");
}

async function main() {
  const id = await ensureContactTemplate();
  writeEnvTemplateId(id);
  console.log("OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
