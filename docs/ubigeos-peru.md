# Ubicaciones de todo el Perú

El selector permite elegir departamento → provincia → distrito → barrio/sector.
Usa una copia local del catálogo de [RitchieRD/ubigeos-peru-data](https://github.com/RitchieRD/ubigeos-peru-data), commit `23cd3666b19f32bccdf36d90243c2a4462d6202c`, bajo CC0-1.0. Contiene 25 departamentos, 196 provincias y 1.892 distritos. No necesita API key ni conexión para consultar el catálogo.

Los nombres se conservan como están en la fuente; la búsqueda ignora mayúsculas y tildes. El catálogo es una copia comunitaria fijada a esa revisión, no una consulta oficial en tiempo real. Los barrios no forman parte del ubigeo: el vecino escribe el nombre; en el distrito de Cusco también se ofrecen los barrios de demostración anteriores.

## Activar en Supabase

Antes de abrir esta versión contra el backend, aplica en orden:

1. `supabase/migrations/202611080001_peru_ubigeo_catalog.sql`
2. `supabase/migrations/202611080002_nationwide_community_profiles.sql`

Deben estar aplicadas previamente las tres migraciones `202611070001`, `202611070002` y `202611070003`, que crean los perfiles, barrios y funciones originales.

Puedes usar el flujo habitual de migraciones de Supabase o pegar los archivos nuevos, en ese orden, en SQL Editor. Ejecútalos una sola vez. Después recarga Ayllu. No hace falta cambiar la configuración de Google.

Las migraciones nuevas crean `peru_districts` y agregan `district_ubigeo`/`province` a `neighborhoods`. Los UUID de los barrios existentes se conservan; los datos anteriores del distrito de Cusco reciben `080101`. No se transforma automáticamente ningún barrio ajeno a ese distrito.

El RPC `complete_community_profile_v2` valida el distrito en el servidor y crea/reutiliza el barrio dentro de ese ubigeo. Los barrios con el mismo nombre en distritos distintos tienen UUID distintos. Las membresías mantienen su rol si el barrio no cambia; al cambiar se elimina la membresía anterior y se asigna vecino. La función anterior se conserva para clientes antiguos, limitada al barrio actual o al catálogo anterior de Cusco.

La lectura de perfiles recupera departamento, provincia, distrito, ubigeo e identificador de barrio. Los reportes nuevos guardan esa identidad para no sincronizar con otro barrio homónimo. El filtro de distrito también limita servicios, favores, reportes y recursos locales por ubigeo. Los datos locales antiguos sin ubigeo se interpretan como la demostración anterior de Cusco.

Los datos operativos de ejemplo y los contactos de emergencia siguen siendo los del prototipo; este catálogo no proporciona contactos, servicios ni límites de barrios de todo el país. Tampoco calcula barrios colindantes fuera de la demostración de Cusco ni obtiene coordenadas GPS automáticamente.

## Actualizar el catálogo

Desde la raíz del repositorio:

```bash
python3 ayllu-app/scripts/update-ubigeo.py
```

El script descarga únicamente los tres JSON y LICENSE de la revisión fijada, comprueba códigos y jerarquía y genera el catálogo y su seed SQL. Para adoptar una nueva revisión cambia el commit y revisa el resultado. Si las migraciones ya se desplegaron, entrega las diferencias en una migración nueva; no reemplaces una migración aplicada.

## Verificación

Dentro de `ayllu-app`:

```bash
node --test tests/*.test.cjs
npx tsc --noEmit
npm run lint
npx expo export --platform web
```

Además se verificaron las migraciones en PostgreSQL local mediante PGlite: jerarquía, barrios homónimos, validaciones, conservación/cambio de roles, compatibilidad con el RPC anterior y rechazo de acceso anónimo. La interfaz se probó en modo demo web seleccionando Lima → Lima → Miraflores y guardando un barrio local. No se aplicaron migraciones al proyecto remoto.

Para repetir la comprobación SQL sin agregar dependencias a la app, instala PGlite en un directorio temporal y ejecuta desde `ayllu-app`:

```bash
npm install --prefix /tmp/ayllu-db-check @electric-sql/pglite
NODE_PATH=/tmp/ayllu-db-check/node_modules node scripts/check-ubigeo-migrations.cjs
```

El verificador usa una base efímera, simula `auth.uid()` y los roles de Supabase, y aplica los SQL originales. No se conecta al proyecto remoto.
