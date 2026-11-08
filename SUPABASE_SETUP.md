# Conectar Ayllu con Supabase

El proyecto tiene preparado un primer flujo remoto: registro e inicio de sesión con correo y contraseña, creación del perfil y pertenencia al barrio, y envío idempotente de reportes de emergencia. Hace falta crear un proyecto Supabase y poner sus credenciales locales; todavía no hay conexión a un backend de producción.

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

El CLI pedirá la contraseña de la base de datos si la necesita. `--remote` es importante: sin esa opción, el CLI puede apuntar al stack local de Docker. `db push` aplica en orden las migraciones de `supabase/migrations/`: permisos y políticas RLS, RPC idempotente de reportes, perfil de usuario y barrios iniciales. Revisa el `dry-run` antes de aplicar. Evita crear o modificar estas tablas manualmente en el Dashboard; conserva los cambios en migraciones.

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

Auth y el perfil de barrio están conectados; el transporte Supabase implementado es el de reportes de emergencia. El directorio, favores, avales, recursos, cambios de estado, modo emergencia y moderación siguen almacenados localmente: aún requieren sus tablas/RPC/políticas y adaptadores de lectura/escritura. En Web los datos sensibles de reportes no se aceptan offline porque no hay SecureStore nativo.

Para regenerar tipos desde el esquema desplegado:

```bash
npx supabase gen types typescript --linked > ayllu-app/src/types/supabase.generated.ts
```

Revisa el archivo generado antes de incorporarlo a imports; hoy el cliente usa tipos genéricos para facilitar el primer despliegue.
