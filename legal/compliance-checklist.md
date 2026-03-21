# ✅ Checklist de Compliance — SaaS de Renta de Autos

Usa este checklist antes de lanzar tu producto a clientes de pago.

---

## 🏢 Legal (Empresa)
- [ ] LLC registrada en Florida (o estado elegido)
- [ ] EIN obtenido en IRS.gov (gratis)
- [ ] Operating Agreement creado y firmado
- [ ] Cuenta bancaria de negocio abierta (recomendado: Mercury Bank)
- [ ] Stripe y todos los servicios migrados al nombre de la LLC

## 📄 Documentos Legales
- [ ] Términos de Servicio publicados en el sitio web
- [ ] Política de Privacidad publicada en el sitio web
- [ ] Ambos documentos firmados/aceptados por nuevos usuarios (checkbox en registro)
- [ ] Contrato de cliente firmado para clientes enterprise/anuales

## 🔒 Seguridad Técnica (Supabase)
- [ ] Row Level Security (RLS) habilitado en todas las tablas
- [ ] Variables de entorno protegidas (.env en .gitignore, no en el código)
- [ ] HTTPS/SSL activo en el dominio
- [ ] Contraseñas almacenadas con hashing (bcrypt/argon2) — nunca en texto plano
- [ ] Backups automáticos de base de datos configurados
- [ ] Proceso documentado para restaurar backup

## 💳 Pagos (Stripe)
- [ ] Cuenta Stripe en nombre de la LLC
- [ ] Webhooks configurados para pagos fallidos y cancelaciones
- [ ] Recibos automáticos habilitados
- [ ] Proceso de reembolso documentado

## 🇪🇺 GDPR (si tienes clientes en Europa)
- [ ] Banner de cookies en el sitio web
- [ ] Consentimiento explícito antes de recopilar datos
- [ ] DPA (Data Processing Agreement) con Supabase firmado
- [ ] Proceso para responder solicitudes de eliminación de datos (<30 días)
- [ ] Registro de actividades de procesamiento de datos

## 🏛️ CCPA (si tienes clientes en California)
- [ ] Enlace "Do Not Sell My Personal Information" en el footer
- [ ] Proceso para responder solicitudes CCPA
- [ ] Verificación de identidad antes de entregar/eliminar datos

## 📧 Operacional
- [ ] Email de soporte profesional (support@[tudominio].com)
- [ ] Email de privacidad (privacy@[tudominio].com)
- [ ] Proceso de onboarding documentado para nuevos clientes
- [ ] Plan de respuesta a incidentes de seguridad (qué hacer si hay un breach)
- [ ] SLA (Service Level Agreement) definido — ej. 99.9% uptime

---

## 🚀 Para tu Primer Cliente de Pago
Mínimo necesario:
- ✅ LLC registrada
- ✅ ToS y Privacy Policy publicados
- ✅ Stripe en nombre de la empresa
- ✅ RLS habilitado en Supabase
- ✅ HTTPS activo
