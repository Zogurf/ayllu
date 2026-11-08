# Mejoras pendientes de Ayllu

Actualizado: 8 de noviembre de 2026.

Este documento recoge el trabajo pendiente según el código y las comprobaciones realizadas en el proyecto. Las casillas representan tareas por completar; una función implementada no equivale a una prueba completa en dispositivos reales.

## Punto de partida

- Autenticación por correo/contraseña y flujo OAuth con Google implementados; Google requiere configurar el proveedor y los retornos de cada entorno.
- Perfil y ubicación nacional mediante catálogo Ubigeo, barrios y membresías en Supabase.
- Favores: publicación, lectura por distrito, resolver/reabrir y retiro mediante Supabase, con cola persistente e idempotencia. La migración `202611080003_community_favors.sql` ya se aplicó al proyecto Ayllu durante esta sesión.
- Corrección implementada para que los pendientes de otra cuenta no oculten publicaciones compartidas. Falta confirmar el resultado en la versión actualizada de la app del usuario.
- Envío de reportes de emergencia mediante RPC autenticado, con datos privados separados y almacenamiento protegido en móvil.
- La migración `202611080004_shared_services_moderation_resources.sql` agrega RPC/RLS de servicios, avales, recursos, emergencias, acceso privado, denuncias, moderación y mensajería. Está en el repositorio; falta aplicarla y validarla en Supabase.
- Se retiró la insignia de verificación de los proveedores de demostración. Ayllu no verifica identidad ni teléfono.
- Botón para mostrar u ocultar contraseña en inicio de sesión y registro.

## Prioridad 1: completar y comprobar los flujos compartidos

### Favores y cambio de cuenta

- [ ] Validar de extremo a extremo con dos cuentas y dos dispositivos: publicar, actualizar el muro, resolver, reabrir y retirar. Confirmar que la segunda cuenta ve el mismo resultado.
- [ ] Comprobar los alcances de barrio y distrito y la exclusión de usuarios de otros distritos. Las pruebas SQL existentes cubren permisos, pero falta la comprobación completa desde las pantallas.
- [ ] Probar crear y modificar sin conexión, reiniciar la app y reconectar. Comprobar orden de operaciones, ausencia de duplicados y desaparición del aviso pendiente tras la confirmación.
- [ ] Probar cambios de cuenta con operaciones pendientes: conservar los borradores del autor y no enviarlos con la sesión de otra persona.
- [x] Mostrar en cada favor el error de sincronización y una acción para reintentar, además del aviso genérico de pendiente y la cola del perfil.
- [x] Mejorar la confirmación al retirar, con opción visible para cancelar y texto claro antes del segundo toque.

Criterio de cierre: el favor permanece después de recargar y cambiar de dispositivo; otra cuenta autorizada lo ve y no puede modificarlo.

### Servicios, directorio y avales

- [x] Crear tablas, migraciones y políticas RLS para servicios; conectar publicación, lectura, edición y retiro. Falta aplicar la migración en Supabase.
- [x] Implementar avales en el servidor con una restricción única por usuario y servicio, retiro del aval y conteos compartidos. Falta probar concurrencia.
- [x] Validar en el servidor que quien avala pertenezca al barrio del servicio.
- [x] Agregar transporte de servicios y avales a la cola persistente, también para acciones realizadas con conexión.
- [ ] Sustituir proveedores y contactos de demostración por registros administrables con fecha de actualización y responsable de validación.

Criterio de cierre: dos cuentas ven los mismos servicios y conteos; un reintento no crea servicios ni avales duplicados.

### Contacto y mensajería

- [x] Implementar conversaciones, participantes y mensajes persistentes, con RLS que limita la lectura a los participantes. Falta aplicar la migración y probar con dos cuentas.
- [x] Agregar bandeja, historial y estados de entrega/lectura basados en marcas del servidor.
- [x] Indicar en la publicación cuándo el chat necesita backend y permitirlo al usar el flujo conectado.
- [x] Revisar `ContactActionModal.tsx`: consulta RPC reales de conversación y mensaje; no muestra una confirmación simulada. Falta prueba de extremo a extremo.
- [x] Usar la utilidad común de WhatsApp para normalizar el número y mostrar errores; el RPC exige consentimiento para publicar el teléfono.
- [x] Quitar la etiqueta «verificado» de servicios sin verificación real.
- [ ] Quitar la etiqueta de teléfono o contacto «verificado» donde no exista una verificación real.

Criterio de cierre: ningún flujo anuncia un mensaje enviado sin confirmación; el teléfono no se publica cuando se elige contacto interno.

## Prioridad 2: emergencias, recursos y moderación

### Emergencias y recursos

- [x] Leer los reportes de Supabase para alimentar el tablero compartido; falta comprobar en un proyecto conectado.
- [x] Conectar cambios de estado y asignación al servidor, con rol de coordinador/administrador verificado en cada operación.
- [x] Implementar activación y cierre del modo emergencia con alcance territorial, autor y fecha.
- [x] Conectar recursos compartidos con validación de cantidad y control de versión.
- [x] Implementar la consulta autorizada de datos privados desde el tablero mediante RPC.
- [x] Agregar bitácora de cambios de estado, asignaciones, activación/cierre del modo y acceso a datos privados. La vista está limitada a coordinadores/administradores y no copia información sensible. Falta definir conservación/eliminación y validar en Supabase.
- [ ] Verificar rechazo de accesos directos no autorizados a tablas y RPC antes de considerar un uso fuera de la demostración.

Criterio de cierre: los coordinadores autorizados ven el mismo tablero; una cuenta vecina no obtiene direcciones ni teléfonos privados mediante consultas directas.

### Moderación

- [x] Guardar denuncias en Supabase y crear una bandeja compartida por ámbito territorial.
- [x] Permitir ocultar y restaurar contenido con permisos comprobados en el servidor.
- [x] Registrar motivo, moderador y fecha de cada decisión de moderación, y reflejarla en las lecturas del muro.
- [ ] Definir límites de publicación y denuncia para reducir spam y abuso.

## Prioridad 3: cuenta, ubicación y experiencia de uso

- [ ] Agregar recuperación y cambio de contraseña, reenvío de confirmación y retornos de correo comprobados en móvil y web.
- [x] Mostrar errores y confirmaciones de correo/contraseña dentro del formulario de login y registro.
- [ ] Revisar los usos restantes de `Alert.alert` en otros flujos que no ofrecen una experiencia equivalente en web. Las validaciones de publicación de favores y servicios ya aparecen dentro del formulario.
- [ ] Validar Google OAuth en Android, iOS y web con la configuración y las compilaciones correspondientes.
- [ ] Implementar verificación de teléfono si se seguirá ofreciendo como «verificado». Definir por separado qué significa verificar identidad.
- [ ] Implementar permisos y lectura real de GPS opcional. Actualmente no se guardan coordenadas obtenidas del dispositivo.
- [ ] Calcular distancias solo con ubicaciones válidas; revisar distancias y métricas de ejemplo de otros módulos.
- [ ] Definir barrios colindantes fuera de la demostración de Cusco; el catálogo Ubigeo no aporta límites ni adyacencia de barrios.
- [x] Agregar edición del contenido de un favor mediante RPC; falta comprobarla en Supabase.
- [x] Exponer en la interfaz la acción de cerrar un favor (`cerrada`), además de resolver y reabrir.
- [ ] Añadir paginación al muro: hoy la consulta carga como máximo 500 favores y no permite acceder a páginas anteriores.
- [ ] Evaluar actualizaciones mediante Realtime; actualmente el muro se consulta cada 30 segundos y mediante el botón Actualizar muro.
- [ ] Revisar accesibilidad, foco, teclado, tamaños de texto y zonas táctiles en las pantallas principales.

## Prioridad 4: fiabilidad y entrega

- [ ] Añadir reintentos con espera progresiva y distinguir errores temporales de errores que requieren corregir un borrador o volver a iniciar sesión.
- [ ] Definir resolución de conflictos cuando varios dispositivos modifican una publicación de la misma cuenta sin conexión.
- [ ] Revisar el aislamiento de todos los datos locales al cambiar de cuenta, cerrar sesión o cambiar de barrio, sin perder operaciones pendientes.
- [ ] Generar y usar tipos TypeScript del esquema de Supabase para tablas y RPC.
- [ ] Automatizar TypeScript, lint, pruebas de lógica y pruebas SQL en integración continua. Existen pruebas locales de ubicación, OAuth, favores y permisos SQL.
- [ ] Agregar pruebas de interfaz para login/registro, publicación, cambio de cuenta y reconexión en web y móvil.
- [ ] Configurar un entorno de pruebas separado de producción y un procedimiento de despliegue y recuperación de migraciones.
- [ ] Comprobar copias de seguridad y restauración; registrar errores sin incluir contraseñas, tokens ni información privada de reportes.
- [ ] Definir compilaciones y distribución para Android/iOS, alojamiento web y una forma visible de identificar la versión cargada.
- [ ] Revisar la política de privacidad, consentimiento y eliminación de cuenta antes de recopilar datos reales.

## Documentación por actualizar

- [x] Actualizar `README.md` y `SUPABASE_SETUP.md` para describir los flujos sincronizados y la migración `202611080004`; queda aplicarla al proyecto.
- [ ] Documentar por plataforma qué funciona offline, qué se comparte y qué necesita sesión o almacenamiento seguro nativo.
- [ ] Preparar una guía de prueba con dos cuentas, dos barrios y dos distritos, incluyendo los resultados esperados y la versión de la app utilizada.

## Orden recomendado

1. Confirmar favores entre cuentas y dispositivos con la versión actualizada.
2. Resolver el contacto real entre vecinos y eliminar confirmaciones simuladas.
3. Conectar servicios y avales.
4. Completar tablero de emergencias, recursos y moderación compartidos.
5. Consolidar pruebas, despliegue, privacidad y recuperación antes de ampliar el uso.
