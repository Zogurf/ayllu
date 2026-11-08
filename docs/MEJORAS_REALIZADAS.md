# Mejoras realizadas en Ayllu

Este documento detalla los archivos modificados en la rama `codex/mejoras-ayllu` para que el equipo pueda ubicar cada cambio y continuar el trabajo.

## Backend y base de datos

- `supabase/migrations/202611080004_shared_services_moderation_resources.sql`
  - Añade tablas y políticas RLS para servicios locales, avales, recursos críticos, modo de emergencia, denuncias, historial de moderación y conversaciones.
  - Añade RPC para publicar/editar/retirar servicios, dar o quitar avales, guardar recursos, activar/cerrar emergencias, cambiar estados de reportes, consultar información privada autorizada, denunciar y moderar contenido.
  - Añade conversaciones y mensajes persistentes. Solo participantes pueden leer conversaciones, mensajes y recibos; el servidor comprueba la pertenencia al distrito.
  - Amplía favores con edición de título y descripción, visibilidad y versión.
  - Comprueba en el servidor el consentimiento antes de publicar el teléfono para contacto por WhatsApp.

## Aplicación

- `ayllu-app/src/components/PublishFavorModal.tsx`
  - Presenta los errores de validación dentro del formulario para que también se vean en web.
  - Aclara que WhatsApp no está verificado.
- `ayllu-app/src/components/PublishServiceModal.tsx`
  - Muestra errores de validación dentro del formulario, en vez de depender de alertas del sistema.
- `ayllu-app/src/screens/DirectoryScreen.tsx`
  - Quita la insignia de proveedor verificado que no tenía una verificación real.
- `ayllu-app/src/storage/mockData.ts`
  - Marca como no verificados los servicios de demostración.
- `ayllu-app/src/services/shared.ts`
  - Incluye el estado de moderación al convertir reportes recibidos del servidor.
- `ayllu-app/src/context/AppContext.tsx`
  - Excluye del tablero los reportes ocultos por moderación.
- `ayllu-app/src/types/index.ts`
  - Añade el campo opcional de visibilidad para reportes de emergencia.
- `ayllu-app/src/screens/EmergencyDashboardScreen.tsx`
  - Muestra los datos privados y la edad usando los campos devueltos por el RPC autorizado.

## Guías del proyecto

- `mejoras.md`
  - Marca el trabajo implementado y mantiene pendientes las pruebas que requieren cuentas, dispositivos o un proyecto Supabase.
- `README.md`
  - Actualiza el estado real de servicios, mensajería, emergencias, recursos y moderación.
- `SUPABASE_SETUP.md`
  - Documenta la migración nueva, cómo aplicarla y qué flujos requieren backend configurado.

## Pendiente para continuar

1. Aplicar las migraciones en un proyecto Supabase de pruebas con `npx supabase db push --dry-run --remote` y luego `npx supabase db push --remote`.
2. Probar permisos, consentimiento y sincronización con dos cuentas y dos dispositivos.
3. Revisar especialmente el acceso a datos privados, cambios de cuenta con borradores y reintentos offline antes de usar datos reales.

La implementación está en el commit `35ae8c8` de `codex/mejoras-ayllu`. La migración nueva no se ha aplicado a un proyecto Supabase desde este entorno.
