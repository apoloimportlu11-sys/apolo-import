# Project Overview

## Goals
- Sitio + admin de Apolo Lubricantes: catálogo, cotizaciones, contacto, gestión comercial

## Scope
- In scope: Next.js App Router storefront, admin Supabase, quotes/contact/chat APIs, SQL schema/scripts
- Out of scope (esta tarea): nuevas features de producto, cambios de deps/DB/prod

## Requirements
- [REQ-1]: Persistencia catálogo/CMS en Supabase con RLS
- [REQ-2]: Cotizaciones web → WhatsApp/CRM ligero
- [REQ-3]: Auth admin (email/Google) con rol en `public.users`

## Constraints
- Stack: Next 16, React 19, Tailwind 4, Supabase, Zod, Resend, OpenAI
- No secretos en docs; TypeScript build puede ignorar errores (`ignoreBuildErrors`)
- Docs: `docs/`; reglas: `.cursor/rules/`; guía: `AGENTS.md`

## Stakeholders
- Negocio Apolo Lubricantes (Ecuador): contenido y ventas
- Dev/ops: este repo + Supabase + email/chat providers
