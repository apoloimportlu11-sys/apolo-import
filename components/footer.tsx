"use client";

import Link from "next/link";
import Image from "next/image";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { MapPin, Phone, Mail, Clock, MessageCircle } from "lucide-react";

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
  ],
};

export function Footer() {
  const { settings } = useBusinessSettings();
  const cleanPhone = (settings.whatsapp || settings.phone || "51958400028").replace(/[^0-9]/g, "");
  const activeLogo = (settings.logo_url && !settings.logo_url.toLowerCase().includes("overts") && !settings.logo_url.toLowerCase().includes("live_site"))
    ? settings.logo_url
    : "/images/logoApolo.png";

  return (
    <footer className="bg-background border-t border-border lg:[zoom:1.4]">
      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-block mb-2">
              <div className="px-4 py-2">
                <Image
                  src={activeLogo}
                  alt={settings.business_name || "Apolo Logo"}
                  width={120}
                  height={120}
                  loading="lazy"
                  className="object-contain h-14 w-auto"
                />
              </div>
            </Link>

            <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
              {settings.business_name || "Apolo Lubricantes"}: Tu socio confiable en lubricantes. Distribuimos aceites y fluidos
              de alta calidad para todo tipo de vehículos y maquinaria.
            </p>

            <div className="space-y-2 text-xs text-muted-foreground pt-1">
              <p className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{settings.address || "Las flores SJL, Lima, Perú"}</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{settings.phone || "+51 958 400 028"}</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{settings.email || "importacionesapolo2011@gmail.com"}</span>
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 pt-2">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Síguenos en redes:
              </span>
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <a
                  href="https://www.facebook.com/profile.php?id=61587515016695"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white border border-blue-600/20 hover:border-blue-600 transition-all shadow-xs cursor-pointer"
                  aria-label="Facebook"
                >
                  <svg
                    className="h-4 w-4 fill-current shrink-0 transition-transform group-hover:scale-110"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span className="text-xs font-semibold">Facebook</span>
                </a>
                <a
                  href="https://www.instagram.com/apolo_lubricantes/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-pink-600/10 hover:bg-gradient-to-tr hover:from-amber-500 hover:via-pink-500 hover:to-purple-600 text-pink-600 dark:text-pink-400 hover:text-white border border-pink-600/20 hover:border-transparent transition-all shadow-xs cursor-pointer"
                  aria-label="Instagram"
                >
                  <svg
                    className="h-4 w-4 fill-current shrink-0 transition-transform group-hover:scale-110"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  <span className="text-xs font-semibold">Instagram</span>
                </a>
                <a
                  href="https://www.tiktok.com/@apoloyovertslubricantes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-foreground/10 hover:bg-black dark:hover:bg-white text-foreground hover:text-white dark:hover:text-black border border-border transition-all shadow-xs cursor-pointer"
                  aria-label="TikTok"
                >
                  <svg
                    className="h-4 w-4 fill-current shrink-0 transition-transform group-hover:scale-110"
                    viewBox="0 0 24 24"
                  >
                    <path d="M21 8.5a6.58 6.58 0 01-3.85-1.17A6.52 6.52 0 0114.5 3h-3v12.1a2.6 2.6 0 11-2.6-2.6c.3 0 .6.05.87.13V9.55a5.55 5.55 0 10 4.73 5.5V8.9a9.5 9.5 0 005.5 1.75V8.5z" />
                  </svg>
                  <span className="text-xs font-semibold">TikTok</span>
                </a>
                <a
                  href={`https://wa.me/${cleanPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600 text-emerald-600 dark:text-emerald-400 hover:text-white border border-emerald-500/30 hover:border-emerald-600 transition-all shadow-xs cursor-pointer"
                  aria-label="WhatsApp"
                >
                  <MessageCircle className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                  <span className="text-xs font-semibold">WhatsApp</span>
                </a>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Productos</h4>
            <ul className="space-y-2">
              {footerLinks.productos.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Empresa</h4>
            <ul className="space-y-2">
              {footerLinks.empresa.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {new Date().getFullYear()} {settings.business_name || "Apolo Lubricantes"}. Todos los derechos
            reservados.
          </p>
          <div className="flex gap-6">
            <Link
              href="/nosotros"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Términos y condiciones
            </Link>
            <Link
              href="/contacto"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Política de privacidad
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
