# Conectar Ayllu con Supabase

El código incluye flujos remotos para registro e inicio de sesión, perfil y pertenencia al barrio, favores, servicios y avales, mensajería, reportes de emergencia, recursos y moderación. Hace falta crear un proyecto Supabase, aplicar las migraciones y configurar credenciales; aquí no se ha validado contra tu proyecto.

## 1. Crear el proyecto

En [Supabase](https://supabase.com/dashboard), crea un proyecto nuevo y guarda la contraseña de la base de datos en un gestor seguro. No la añadas al repositorio.

## 2. Aplicar el esquema

Desde la raíz del repositorio, instala/invoca el CLI, inicia sesión y vincula el proyecto. Reemplaza `<PROJECT_REF>` por el identificador visible en la URL del Dashboard.

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push --dry-run --remote
npx supabase db push --remote
```

El CLI pedirá la contraseña de la base de datos si la necesita. `--remote` es importante: sin esa opción, el CLI puede apuntar al stack local de Docker. `db push` aplica en orden las migraciones de `supabase/migrations/`: perfiles, ubigeos, favores, `202611080004_shared_services_moderation_resources.sql` para directorio, recursos, moderación, emergencias y chat, `202611080005_emergency_audit_trail.sql` para la bitácora, `202611080006_rate_limits.sql` para límites anti-spam y `202611080007_realtime_favors.sql` para la suscripción del muro. Revisa el `dry-run` antes de aplicar. Evita crear o modificar estas tablas manualmente en el Dashboard; conserva los cambios en migraciones.

## 3. Configurar Auth

En el Dashboard abre **Authentication → Providers** y habilita **Email**. Conserva la confirmación de correo activada. La app puede reenviar la confirmación y enviar enlaces de recuperación; al abrir un enlace válido, la app recibe la sesión PKCE y muestra el formulario para guardar una contraseña nueva. Supabase debe poder enviar los correos; para producción configura un proveedor SMTP con límites adecuados.

En **Authentication → URL Configuration**, agrega a **Redirect URLs**:

- `ayllu://auth/callback` para Android/iOS.
- El origen y la ruta exacta de la web local y publicada, por ejemplo `http://localhost:8081/` y `https://tu-dominio/`.

El enlace de confirmación del registro, el reenvío de confirmación y la recuperación usan el mismo retorno configurado por plataforma. Con PKCE, abre el enlace en el mismo navegador/dispositivo donde solicitaste el correo para que esté disponible el verificador de sesión. Un enlace expirado o ya utilizado muestra un aviso para solicitar otro.

## 4. Poner las credenciales en la app

Copia la plantilla y reemplaza los valores por **Project URL** y **Publishable key** del panel **Connect** de Supabase:

```bash
cp ayllu-app/.env.example ayllu-app/.env
```

El archivo debe quedar así:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY>
```

La publishable key puede estar en la app porque las tablas están protegidas por RLS. Nunca pongas `service_role`, una secret key ni la contraseña de Postgres en variables `EXPO_PUBLIC_*`.

## 5. Ejecutar y crear un usuario

Desde la raíz:

```bash
npm start
```

Abre en móvil con Expo Go o pulsa `w` para Web. Al detectar las variables, Ayllu muestra el acceso Supabase en vez del flujo de demostración. Crea la cuenta, confirma el correo si se solicita, vuelve e inicia sesión. Completa apodo, celular peruano y barrio; la app guarda el perfil mediante `complete_community_profile` y asigna el rol inicial `vecino`.

El Dashboard debe mostrar una fila de perfil en **Table Editor → profiles** y una pertenencia en **community_memberships**. Después crea un reporte de emergencia con consentimiento. En `emergency_reports` aparecerán categoría, título y descripción; la dirección y datos identificables quedan en `emergency_report_private`. La cola local solo elimina el reporte después de que el RPC confirme la operación.

## 6. Asignar un coordinador para la prueba

El registro público nunca puede asignar roles privilegiados. Para promover una cuenta de prueba, identifica su UUID en **Authentication → Users** y ejecuta en **SQL Editor**:

```sql
update public.community_memberships as membership
set role = 'coordinador'
from public.neighborhoods as neighborhood
where membership.neighborhood_id = neighborhood.id
  and membership.user_id = '<AUTH_USER_UUID>'::uuid
  and neighborhood.name = 'San Blas (Sector Central)';
```

Cierra sesión y vuelve a entrar para que la app vuelva a leer el rol. Hazlo solo con una cuenta de prueba controlada.

## Alcance actual

Auth y el perfil de barrio están conectados; hay transporte Supabase para reportes de emergencia y favores. El directorio, avales, recursos, cambios de estado de emergencias, modo emergencia y moderación siguen almacenados localmente: aún requieren sus tablas/RPC/políticas y adaptadores de lectura/escritura. En Web los datos sensibles de reportes no se aceptan offline porque no hay SecureStore nativo.

Para regenerar tipos desde el esquema desplegado:

```bash
npx supabase gen types typescript --linked > ayllu-app/src/types/supabase.generated.ts
```

Revisa el archivo generado antes de incorporarlo a imports; hoy el cliente usa tipos genéricos para facilitar el primer despliegue.

## Muro de favores compartido

`202611080003_community_favors.sql` crea `community_favors` y el RPC `sync_community_favor`; las migraciones `202611080004` y `202611080005` agregan flujos compartidos y trazabilidad de emergencias; `202611080006` limita publicaciones por usuario; y `202611080007` habilita Realtime para favores. Se aplican en orden con `npx supabase db push --remote`. Revisa primero `npx supabase db push --dry-run --remote`. Realtime requiere que Supabase habilite la publicación `supabase_realtime`; si no está disponible, el sondeo de 30 segundos sigue actualizando el muro. Los límites se prueban localmente en PGlite, pero estas migraciones todavía no se han aplicado al proyecto remoto. La bitácora no almacena nombres, edades, teléfonos ni direcciones y solo coordinadores/administradores del barrio pueden consultarla. La política de conservación debe definirse para el despliegue.

Los usuarios autenticados pueden leer publicaciones de su distrito; el filtro de la app mantiene el alcance de barrio seleccionado. Solo el autor puede editar, cambiar estado o retirar. La identidad y el barrio se obtienen del perfil del servidor. El teléfono solo se comparte con autorización explícita al elegir WhatsApp; el canal interno no publica el teléfono.

Las publicaciones nuevas y los cambios se guardan en la cola incluso con conexión. Permanecen pendientes hasta recibir confirmación, y los reintentos no duplican publicaciones ni revierten cambios ya confirmados. El muro se actualiza cada 30 segundos y con el botón Actualizar muro. Los favores antiguos con identificador `fav-` conservan su carácter local: el autor puede pulsar Compartir para publicar una copia en su barrio actual. Retirar requiere dos pulsaciones en la tarjeta para confirmar también en web.

WhatsApp abre una conversación con un mensaje preparado; el usuario decide enviarlo. El canal interno guarda conversaciones y mensajes en Supabase y muestra confirmaciones de entrega/lectura. La bandeja y el chat requieren la migración `202611080004` aplicada.

Prueba manual: inicia sesión con dos cuentas del mismo barrio, publica desde una, actualiza el muro en la otra, marca resuelto y retira desde la cuenta autora. Una cuenta de otro distrito no debe poder leer la publicación. Prueba además crear sin conexión y reconectar; el aviso pendiente debe desaparecer después de sincronizar.

Verificaciones automatizadas:

```bash
node --test tests/*.test.cjs
npx tsc --noEmit
npm run lint
# Desde la raíz, con PGlite instalado fuera del proyecto:
NODE_PATH=/tmp/ayllu-ubigeo-sql/node_modules node ayllu-app/scripts/check-favor-migrations.cjs
```
