# Acceso con Google

La app conserva correo/contraseña y usa Supabase OAuth con PKCE para Google. El código se intercambia por una sesión; no se incluyen secretos de proveedores en el cliente. El perfil vecinal y los roles siguen usando las tablas y el RPC existentes.

## Supabase

1. Configura `ayllu-app/.env` con los valores de `.env.example`.
2. Aplica las migraciones existentes de `supabase/migrations` si aún no están aplicadas.
3. En Authentication > URL Configuration, agrega a Redirect URLs:
   - `ayllu://auth/callback` para Android/iOS.
   - La URL exacta donde abres la app web, por ejemplo `http://localhost:8081/` durante desarrollo y `https://tu-dominio/` en producción. Si se sirve en un subdirectorio, incluye ese path y su barra final tal como aparece en el navegador.
4. Configura Site URL con la dirección pública de la web. Los mismos Redirect URLs permiten confirmar cuentas, reenviar confirmaciones y recuperar contraseñas.
5. En Authentication > Providers, habilita Google con sus credenciales.

## Google Cloud

1. Configura la pantalla de consentimiento OAuth y los usuarios de prueba cuando corresponda.
2. Crea un cliente OAuth de tipo aplicación web para el flujo mediado por Supabase.
3. Registra el callback que indica Supabase, normalmente `https://<project-ref>.supabase.co/auth/v1/callback`, como Authorized redirect URI.
4. Copia Client ID y Client Secret al proveedor Google en Supabase.

Nunca pongas Client Secret ni una clave service_role en `EXPO_PUBLIC_*` o en el repositorio.

## Ejecutar y verificar

Instala dependencias con `npm ci` dentro de `ayllu-app`.

En móvil usa una development build con el esquema `ayllu`; Expo Go no es el entorno de prueba para este retorno OAuth. El cambio de scheme requiere reconstruir la app. La navegación existente no necesita una nueva pantalla de callback: el listener procesa el enlace y AppNavigator responde a la nueva sesión.

En web, el proveedor redirige a la misma pestaña y al mismo punto de entrada. PKCE necesita volver al mismo navegador y origen donde empezó el acceso. El callback se procesa al arrancar la app y se retira el código de la URL.

Comprueba con proveedores configurados:

- Google: cuenta nueva termina en onboarding; cuenta existente carga su perfil.
- Cerrar el navegador de autenticación permite volver a intentar.
- Un permiso rechazado o un código inválido muestra un error y permite reintentar.
- Reiniciar la app conserva la sesión y cerrar sesión vuelve al acceso.
- Cambiar de una cuenta existente a una nueva no precarga nombre, teléfono o barrio de la anterior.
- Correo/contraseña sigue funcionando; el flujo actual de confirmación de correo se conserva.
- Recuperación: el enlace permitido vuelve a la app, pide una contraseña nueva y la actualización se confirma antes de continuar.
- Confirmación: el registro y el reenvío usan el retorno de la plataforma; verifica llegada del mensaje, expiración y reenvío respetando los límites de Auth.

El almacenamiento operativo offline sigue siendo compartido por dispositivo como antes. Este cambio limpia los campos del perfil al cargar otra cuenta, pero no implementa una separación completa de todas las cachés por usuario.

## Instagram

No hay botón de acceso con Instagram. Su API con Instagram Login está dirigida a cuentas profesionales (negocios/creadores); una conexión profesional sería una funcionalidad separada del login vecinal.

Referencias:
- https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- https://supabase.com/docs/guides/auth/native-mobile-deep-linking
- https://docs.expo.dev/versions/v58.0.0/sdk/auth-session/
- https://docs.expo.dev/versions/v58.0.0/sdk/webbrowser/
