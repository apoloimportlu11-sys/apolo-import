"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { VehicleVectorDecor } from "@/components/VehicleVectorDecor";

type ContactInfo = {
  icon: LucideIcon;
  title: string;
  content: string;
  href?: string;
};

export function Contact() {
  const { settings } = useBusinessSettings();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({
    type: null,
    message: "",
  });

  const cleanPhone = (settings.whatsapp || settings.phone || "51958400028").replace(/[^0-9]/g, "");

  const contactInfoList: ContactInfo[] = [
    {
      icon: MapPin,
      title: "Dirección",
      content: settings.address || "Las flores SJL, Lima, Perú",
      href: settings.maps_url || "https://www.google.com/maps?q=Las+flores+SJL&output=embed",
    },
    {
      icon: Phone,
      title: "Teléfono",
      content: settings.phone || "+51 958 400 028",
      href: `tel:${(settings.phone || "+51958400028").replace(/[^0-9+]/g, "")}`,
    },
    {
      icon: MessageCircle,
      title: "WhatsApp",
      content: settings.whatsapp || "+51 958 400 028",
      href: `https://wa.me/${cleanPhone}`,
    },
    {
      icon: Mail,
      title: "Email",
      content: settings.email || "apoloimportlu11@gmail.com",
      href: `mailto:${settings.email || "apoloimportlu11@gmail.com"}`,
    },
    {
      icon: Clock,
      title: "Horario",
      content: settings.hours || "Lun - Vie: 9:00 AM - 6:30 PM",
    },
  ];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privacyAccepted) {
      setStatus({
        type: "error",
        message: "Debes aceptar la política de privacidad para enviar el mensaje.",
      });
      return;
    }
    setLoading(true);
    setStatus({ type: null, message: "" });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "No se pudo enviar el mensaje");
      }

      setStatus({
        type: "success",
        message: "Mensaje enviado correctamente.",
      });

      setFormData({
        name: "",
        email: "",
        phone: "",
        message: "",
      });
      setPrivacyAccepted(false);
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Ocurrió un error al enviar el mensaje.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Google maps embed url fallback
  const mapEmbedUrl = settings.maps_url && settings.maps_url.includes("embed")
    ? settings.maps_url
    : "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d487.78884404766546!2d-77.01365181216998!3d-12.022114500000004!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9105cfbf69af8b91%3A0xc683fa1038c0b33e!2sLas%20flores%20SJL!5e0!3m2!1ses!2spe!4v1787330485651!5m2!1ses!2spe";

  return (
    <section id="contacto" className="py-20 bg-transparent relative overflow-hidden lg:[zoom:1.4]">
      {/* Ilustración Vectorial de Vehículos en el centro del lado izquierdo */}
      <VehicleVectorDecor size="lg" className="absolute left-4 2xl:left-8 3xl:left-14 top-1/2 -translate-y-1/2" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Contacto
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-4 text-foreground">
            ¿Necesitas <span className="text-primary">ayuda</span>?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Estamos aquí para asesorarte en {settings.business_name || "Apolo Lubricantes"}. Contáctanos y te ayudaremos a
            encontrar el producto ideal para tu vehículo.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-6">
              Información de contacto
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              {contactInfoList.map((info, index) => {
                const content = info.href ? (
                  <a
                    href={info.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-muted-foreground transition-colors hover:text-primary break-words"
                  >
                    {info.content}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground break-words">{info.content}</p>
                );

                return (
                  <div
                    key={index}
                    className="bg-background border border-border rounded-xl p-4 hover:border-primary/50 transition-colors shadow-sm"
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 text-primary">
                      <info.icon className="h-5 w-5" />
                    </div>
                    <h4 className="font-semibold text-foreground mb-1 text-sm">
                      {info.title}
                    </h4>
                    {content}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 overflow-hidden rounded-xl border border-primary/20 bg-primary/5">
              <div className="relative h-[280px] w-full">
                <iframe
                  title={`Ubicación de ${settings.business_name || "Apolo Lubricantes"}`}
                  src={mapEmbedUrl}
                  className="h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <div className="p-4">
                <a
                  href={settings.maps_url || "https://www.google.com/maps?q=Las+flores+SJL"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
                >
                  <MapPin className="h-4 w-4" />
                  Abrir en Google Maps
                </a>
              </div>
            </div>

            <div className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-xl">
              <h4 className="font-semibold text-foreground mb-2">
                ¿Eres distribuidor?
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Únete a la red oficial de distribuidores de {settings.business_name || "Apolo Lubricantes"} y accede a precios
                especiales, soporte técnico y más beneficios.
              </p>
              <a
                href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent("Hola, deseo información para ser distribuidor.")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs font-bold transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Solicitar información por WhatsApp
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-foreground mb-6">
              Envíanos un mensaje
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Nombre completo
                  </label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Tu nombre"
                    required
                    className="bg-background border-border text-foreground"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Teléfono
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+51 999 888 777"
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Correo electrónico
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="tu@email.com"
                  required
                  className="bg-background border-border text-foreground"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Mensaje
                </label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="¿En qué podemos ayudarte?"
                  rows={4}
                  required
                  className="bg-background border-border text-foreground resize-none"
                />
              </div>

              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  required
                />
                <span>
                  Acepto el tratamiento de mis datos según la{" "}
                  <Link href="/privacidad" className="text-primary underline-offset-2 hover:underline">
                    política de privacidad
                  </Link>
                  .
                </span>
              </label>

              {status.type && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`rounded-lg px-4 py-3 text-sm ${
                    status.type === "success"
                      ? "bg-green-500/10 text-green-700 dark:text-green-300 border border-green-500/20"
                      : "bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20"
                  }`}
                >
                  {status.message}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={loading || !privacyAccepted}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 cursor-pointer"
              >
                <Send className="h-4 w-4" />
                {loading ? "Enviando..." : "Enviar mensaje"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}