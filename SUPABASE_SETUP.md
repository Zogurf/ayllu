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

El CLI pedirá la contraseña de la base de datos si la necesita. `--remote` es importante: sin esa opción, el CLI puede apuntar al stack local de Docker. `db push` aplica en orden las migraciones de `supabase/migrations/`: perfiles, ubigeos, favores, `202611080004_shared_services_moderation_resources.sql` para directorio, recursos, moderación, emergencias y chat, y `202611080005_emergency_audit_trail.sql` para la bitácora de emergencias. Revisa el `dry-run` antes de aplicar. Evita crear o modificar estas tablas manualmente en el Dashboard; conserva los cambios en migraciones.

## 3. Configurar Auth

En el Dashboard abre **Authentication → Providers** y habilita **Email**. Para la primera prueba, deja la confirmación de correo activada: crea la cuenta en la app, abre el correo de verificación y luego inicia sesión con ese correo y contraseña. El proyecto todavía no configura enlaces profundos de Ayllu para completar la sesión desde el correo.

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

`202611080003_community_favors.sql` crea `community_favors` y el RPC `sync_community_favor`; `202611080004_shared_services_moderation_resources.sql` agrega los flujos compartidos y `202611080005_emergency_audit_trail.sql` registra cambios de estado, asignaciones, lecturas autorizadas de datos privados y activación/cierre del modo. Requieren todas las migraciones anteriores y se aplican juntas con `npx supabase db push --remote`. La bitácora no almacena nombres, edades, teléfonos ni direcciones; solo coordinadores y administradores del barrio pueden consultarla. La política de conservación debe definirse para el despliegue.

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
