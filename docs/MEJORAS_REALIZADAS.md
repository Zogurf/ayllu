# Mejoras realizadas en Ayllu

Este documento detalla los archivos modificados en la rama `ventu/mejoras-ayllu` para que el equipo pueda ubicar cada cambio y continuar el trabajo.

## Backend y base de datos

- `supabase/migrations/202611080006_rate_limits.sql`
  - Añade límites por autor: favores 10 por hora, servicios 5 por hora, denuncias 20 por hora, mensajes 60 cada 10 minutos y reportes de emergencia 10 por hora.
  - No cuenta como nuevo un reintento de una fila cuyo identificador ya existe.
- `supabase/migrations/202611080007_realtime_favors.sql`
  - Agrega `community_favors` a la publicación `supabase_realtime` cuando la publicación está disponible.

- `supabase/migrations/202611080005_emergency_audit_trail.sql`
  - Crea una bitácora append-only de estados, asignaciones, lecturas autorizadas de datos privados y activación/cierre del modo de emergencia.
  - Guarda actor, barrio, reporte, fecha y metadatos mínimos; no duplica nombres, edades, teléfonos ni direcciones.
  - Restringe la lectura a coordinadores y administradores del barrio mediante RLS. Debe definirse la retención para el entorno de despliegue.
  - Revoca el `SELECT` directo de `emergency_report_private` para que las consultas privadas queden registradas por el RPC autorizado.

- `supabase/migrations/202611080004_shared_services_moderation_resources.sql`
  - Añade tablas y políticas RLS para servicios locales, avales, recursos críticos, modo de emergencia, denuncias, historial de moderación y conversaciones.
  - Añade RPC para publicar/editar/retirar servicios, dar o quitar avales, guardar recursos, activar/cerrar emergencias, cambiar estados de reportes, consultar información privada autorizada, denunciar y moderar contenido.
  - Añade conversaciones y mensajes persistentes. Solo participantes pueden leer conversaciones, mensajes y recibos; el servidor comprueba la pertenencia al distrito.
  - Amplía favores con edición de título y descripción, visibilidad y versión.
  - Comprueba en el servidor el consentimiento antes de publicar el teléfono para contacto por WhatsApp.

## Aplicación

- `ayllu-app/src/utils/dialog.ts`
  - Añade `notify` y `confirmAction` para mostrar avisos y confirmaciones en web y móvil.
  - En móvil los avisos no son cancelables por gesto/tecla atrás, para no ejecutar acciones asociadas a su cierre accidental.
- `ayllu-app/src/screens/ProfileScreen.tsx`, `ayllu-app/src/screens/OnboardingScreen.tsx`, `ayllu-app/src/screens/EmergencyDashboardScreen.tsx` y `ayllu-app/src/components/ReportVulnerabilityModal.tsx`
  - Sustituye alertas incompatibles con web por los helpers; el consentimiento GPS y el reinicio de demostración usan confirmación.
- Accesibilidad en `ayllu-app/src/components/ContactActionModal.tsx`, `ayllu-app/src/components/ContentReportModal.tsx`, `ayllu-app/src/components/EmergencyAlertBanner.tsx`, `ayllu-app/src/components/Header.tsx`, `ayllu-app/src/components/ManageEmergencyModal.tsx`, `ayllu-app/src/components/MessagingInboxModal.tsx`, `ayllu-app/src/components/NeighborhoodModal.tsx`, `ayllu-app/src/components/OfflineSyncBanner.tsx`, `ayllu-app/src/components/PasswordRecoveryScreen.tsx`, `ayllu-app/src/components/PublishFavorModal.tsx`, `ayllu-app/src/components/PublishServiceModal.tsx`, `ayllu-app/src/components/SavedPlacesModal.tsx`, `ayllu-app/src/components/SupabaseAuthScreen.tsx`, `ayllu-app/src/components/TutorialModal.tsx`, `ayllu-app/src/screens/DirectoryScreen.tsx` y `ayllu-app/src/screens/FavoresScreen.tsx`
  - Añade roles de botón y etiquetas accesibles a controles táctiles y botones de solo icono.
- `ayllu-app/src/context/AppContext.tsx` y `ayllu-app/src/screens/FavoresScreen.tsx`
  - Actualiza el muro al recibir cambios Realtime, con espera breve para agrupar eventos; conserva el sondeo periódico como respaldo y la acción de paginación existente.
- `ayllu-app/src/lib/ubigeo.ts`
  - Vuelve a aplicar el alcance de barrios colindantes únicamente a la demo de Cusco.
- `ayllu-app/package.json` y `ayllu-app/tests/rateLimit.test.cjs`
  - Añade los comandos de `typecheck`/`test` y una prueba PGlite que cubre el límite de favores, el reintento idempotente y el aislamiento por cuenta.
- `.github/workflows/ci.yml`
  - Ejecuta instalación limpia, TypeScript, lint, pruebas y la comprobación de migraciones en push y pull request.

- `ayllu-app/src/components/SupabaseAuthScreen.tsx`
  - Agrega solicitud de recuperación de contraseña y reenvío de confirmación; ambos muestran respuestas neutrales y validan el correo.
  - Usa el retorno configurado para registro y correos de Auth.
- `ayllu-app/src/components/PasswordRecoveryScreen.tsx` y `ayllu-app/src/AppNavigator.tsx`
  - Detectan el evento `PASSWORD_RECOVERY` y permiten fijar y confirmar una contraseña nueva desde el enlace PKCE.
- `ayllu-app/src/lib/socialAuth.ts`
  - Reconoce errores de enlaces vencidos o reutilizados y limpia parámetros de error del callback web.

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
  - Incluye la lectura de los últimos 100 eventos de trazabilidad del barrio.
- `ayllu-app/src/context/AppContext.tsx`
  - Excluye del tablero los reportes ocultos por moderación.
- `ayllu-app/src/types/index.ts`
  - Añade el campo opcional de visibilidad para reportes de emergencia.
- `ayllu-app/src/screens/EmergencyDashboardScreen.tsx`
  - Muestra los datos privados y la edad usando los campos devueltos por el RPC autorizado.
- `ayllu-app/src/types/index.ts` y `ayllu-app/src/context/AppContext.tsx`
  - Tipan y distribuyen los eventos de auditoría a las pantallas autorizadas.

## Guías del proyecto

- `mejoras.md`
  - Marca el trabajo implementado y mantiene pendientes las pruebas que requieren cuentas, dispositivos o un proyecto Supabase.
- `README.md`
  - Actualiza el estado real de servicios, mensajería, emergencias, recursos y moderación.
- `SUPABASE_SETUP.md`
  - Documenta migraciones, la configuración de Auth y los retornos requeridos para correos.

## Pendiente para continuar

1. Aplicar las migraciones en un proyecto Supabase de pruebas con `npx supabase db push --dry-run --remote` y luego `npx supabase db push --remote`.
2. Probar Realtime con dos cuentas/dispositivos y confirmar que el sondeo respalda una interrupción.
3. Probar permisos, consentimiento y sincronización con dos cuentas y dos dispositivos.
4. Revisar especialmente el acceso a datos privados, cambios de cuenta con borradores y reintentos offline antes de usar datos reales.
5. Validar el workflow de CI en GitHub y revisar el contraste, el foco y el teclado con tecnologías de asistencia.

## Verificación local de este paquete (8 de noviembre de 2026)

- `npm run typecheck`: pasó.
- `npm run lint`: pasó.
- `npm test`: 23 de 23 pruebas pasaron, incluyendo límite de favores en PGlite y alcance colindante de Cusco.
- `node scripts/check-favor-migrations.cjs`: pasó con todas las migraciones del repo aplicadas en PGlite.
- No se ejecutó `npx supabase db push`; el proyecto remoto, Realtime con dos dispositivos y la app en navegador/móvil siguen pendientes.
- `npm ci` informó 12 vulnerabilidades moderadas en dependencias; no se ejecutó `npm audit fix`.

Los cambios históricos de servicios y moderación y el primer informe están registrados en los commits `35ae8c8` y `ac49f44`. Este paquete añade accesibilidad, diálogos compatibles con web, límites anti-spam, Realtime para favores y CI. Las migraciones `202611080006` y `202611080007` no se han aplicado al Supabase remoto desde este entorno.
