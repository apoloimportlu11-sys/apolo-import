import { NextResponse } from "next/server";
import { Resend } from "resend";
import { contactFormSchema } from "@/lib/validations/contact";

function buildContactHtml(input: {
  name: string;
  email: string;
  phone: string;
  message: string;
}) {
  const safe = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br/>");

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#0E0E0E;color:#f5f5f5;padding:24px;">
      <div style="max-width:560px;margin:0 auto;background:#141414;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(90deg,#C7940A,#F5C542);padding:18px 24px;">
          <h1 style="margin:0;font-size:20px;color:#0E0E0E;">Apolo Lubricantes</h1>
          <p style="margin:6px 0 0;font-size:13px;color:#1a1a1a;">Nuevo mensaje desde el formulario web</p>
        </div>
        <div style="padding:24px;">
          <p><strong>Nombre:</strong> ${safe(input.name)}</p>
          <p><strong>Correo:</strong> ${safe(input.email)}</p>
          <p><strong>Teléfono:</strong> ${safe(input.phone)}</p>
          <p><strong>Mensaje:</strong></p>
          <p>${safe(input.message)}</p>
        </div>
      </div>
    </div>
  `;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = contactFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Datos inválidos.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, email, phone, message } = parsed.data;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: "Falta RESEND_API_KEY en el archivo .env.local" },
        { status: 500 }
      );
    }

    const to =
      process.env.CONTACT_TO_EMAIL ||
      process.env.CREATE_ADMIN_EMAIL ||
      "apoloimportlu11@gmail.com";
    const from =
      process.env.RESEND_FROM_EMAIL ||
      "Apolo Lubricantes <onboarding@resend.dev>";
    const templateId = process.env.RESEND_CONTACT_TEMPLATE_ID?.trim();

    const resend = new Resend(apiKey);

    const payload = templateId
      ? {
          from,
          to: [to],
          replyTo: email,
          subject: `Nuevo mensaje desde la web - ${name}`,
          template: {
            id: templateId,
            variables: {
              CUSTOMER_NAME: name,
              CUSTOMER_EMAIL: email,
              CUSTOMER_PHONE: phone || "No proporcionado",
              CUSTOMER_MESSAGE: message,
            },
          },
        }
      : {
          from,
          to: [to],
          replyTo: email,
          subject: `Nuevo mensaje desde la web - ${name}`,
          html: buildContactHtml({
            name,
            email,
            phone: phone || "No proporcionado",
            message,
          }),
        };

    const { error } = await resend.emails.send(payload);

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { message: "Error al enviar el mensaje." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { message: "Mensaje enviado correctamente." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error enviando correo:", error);

    return NextResponse.json(
      { message: "Error al enviar el mensaje." },
      { status: 500 }
    );
  }
}
