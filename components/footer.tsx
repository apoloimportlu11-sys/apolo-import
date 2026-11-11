"use client";

import Link from "next/link";
import Image from "next/image";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { MapPin, Phone, Mail, Clock, MessageCircle, Facebook, Instagram } from "lucide-react";
import { LightAtmosphere } from "@/components/home/light-atmosphere";

const footerLinks = {
  productos: [
    { name: "Automóvil", href: "/productos?category=automovil" },
    { name: "Camiones", href: "/productos?category=camiones" },
    { name: "Motocicletas", href: "/productos?category=motocicleta" },
    { name: "Vehículo pesado", href: "/productos?category=vehiculo-pesado" },
  ],
  empresa: [
    { name: "Nosotros", href: "/nosotros" },
    { name: "Contacto", href: "/contacto" },
    { name: "Distribuidores", href: "/contacto" },
    { name: "Cotización", href: "/cotizacion" },
  ],
};

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21 8.5a6.58 6.58 0 01-3.85-1.17A6.52 6.52 0 0114.5 3h-3v12.1a2.6 2.6 0 11-2.6-2.6c.3 0 .6.05.87.13V9.55a5.55 5.55 0 10 4.73 5.5V8.9a9.5 9.5 0 005.5 1.75V8.5z" />
    </svg>
  );
}

export function Footer() {
  const { settings } = useBusinessSettings();
  const cleanPhone = (settings.whatsapp || settings.phone || "51958400028").replace(/[^0-9]/g, "");
  const activeLogo =
    settings.logo_url &&
    !settings.logo_url.toLowerCase().includes("overts") &&
    !settings.logo_url.toLowerCase().includes("live_site")
      ? settings.logo_url
      : "/images/logoApolo.png";
  const name = settings.business_name || "Apolo Lubricantes";

  const socials = [
    {
      name: "Facebook",
      href: "https://www.facebook.com/profile.php?id=61587515016695",
      icon: Facebook,
    },
    {
      name: "Instagram",
      href: "https://www.instagram.com/apolo_lubricantes/",
      icon: Instagram,
    },
    {
      name: "TikTok",
      href: "https://www.tiktok.com/@apoloyovertslubricantes",
      icon: TikTokIcon,
    },
    {
      name: "WhatsApp",
      href: `https://wa.me/${cleanPhone}`,
      icon: MessageCircle,
    },
  ] as const;

  return (
    <footer className="relative border-t border-border bg-card text-foreground dark:border-white/10 dark:bg-[#141414] dark:text-white">
      <LightAtmosphere seam="gold" />
      <div className="relative z-10 border-b border-border bg-muted dark:border-white/10 dark:bg-[#1a1a1a]">
        <div className="mx-auto flex w-full flex-col items-start justify-between gap-5 px-4 py-8 sm:flex-row sm:items-center lg:px-8 xl:px-12">
          <div>
            <p className="font-display text-2xl font-semibold tracking-tight">
              ¿Listo para cotizar?
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Catálogo completo o conversación directa por WhatsApp.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/productos"
              className="btn-brand relative z-10 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-white hover:bg-red-500"
            >
              Ver catálogo
            </Link>
            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-wa relative z-10 inline-flex h-11 items-center gap-2 rounded-full border border-[color:var(--gold)] px-6 text-sm font-semibold text-[color:var(--gold)] hover:bg-[color:var(--gold)] hover:text-zinc-950"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full px-4 py-14 lg:px-8 xl:px-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block">
              <Image
                src={activeLogo}
                alt={name}
                width={180}
                height={180}
                loading="lazy"
                className="h-20 w-auto object-contain"
              />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {name}: tu socio en lubricantes para talleres, flotas y distribuidores.
            </p>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--gold)]">
              Productos
            </h4>
            <ul className="mt-4 space-y-2">
              {footerLinks.productos.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--gold)]">
              Empresa
            </h4>
            <ul className="mt-4 space-y-2">
              {footerLinks.empresa.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--gold)]">
              Contacto
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{settings.address || "Las flores SJL, Lima, Perú"}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <a href={`tel:${(settings.phone || "").replace(/\s/g, "")}`} className="hover:text-foreground">
                  {settings.phone || "+51 958 400 028"}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <a href={`mailto:${settings.email || "apoloimportlu11@gmail.com"}`} className="hover:text-foreground">
                  {settings.email || "apoloimportlu11@gmail.com"}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-primary" />
                <span>{settings.hours || "Lun - Vie: 9:00 AM - 6:30 PM"}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--gold)]">
              Redes
            </h4>
            <ul className="mt-4 space-y-3">
              {socials.map((social) => {
                const Icon = social.icon;
                return (
                  <li key={social.name}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={social.name}
                    >
                      <Icon className="h-4 w-4" />
                      {social.name}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-border dark:border-white/10">
        <div className="mx-auto flex w-full flex-col items-center justify-between gap-4 px-4 py-6 text-sm text-muted-foreground sm:flex-row lg:px-8 xl:px-12">
          <p>
            {new Date().getFullYear()} {name}. Todos los derechos reservados.
          </p>
          <div className="flex gap-6">
            <Link href="/nosotros" className="hover:text-foreground">
              Términos y condiciones
            </Link>
            <Link href="/contacto" className="hover:text-foreground">
              Política de privacidad
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
