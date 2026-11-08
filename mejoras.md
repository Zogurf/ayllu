# Plan de Mejoras y Análisis de Requerimientos Funcionales (RF) y No Funcionales (RNF) - Ayllu

**Fecha de actualización:** 8 de noviembre de 2026  
**Rama:** `feature/mejoras-rf-rnf-analisis`  
**Proyecto:** Ayllu - Resiliencia Comunitaria Local en React Native (Civic Horizon)  
**Versión de esquema y backend:** Migraciones `202611070001` a `202611080007`  

---

## 1. Resumen Ejecutivo y Diagnóstico General

Ayllu es una plataforma hiperlocal y colaborativa diseñada para el apoyo mutuo vecinal, la economía solidaria (Principio Ayni) y la respuesta ágil ante emergencias y desastres en Perú. El sistema implementa una arquitectura **Offline-First híbrida** (SQLite en Android/iOS con almacenamiento seguro en SecureStore, y fallback en AsyncStorage en Web), conectada a un backend en la nube basado en **Supabase (PostgreSQL 15+, Auth, Row Level Security, RPCs transaccionales y Realtime)**.

### Diagnóstico de Madurez del Sistema:
1. **Lógica de Dominio y Base de Datos:** Las 10 migraciones del proyecto cubren la totalidad de los modelos de datos, reglas de aislamiento territorial por distrito (Ubigeo nacional de 1,874 distritos), control de acceso basado en roles (RBAC: Vecino, Coordinador, Administrador), bitácora de auditoría inmutable (*append-only*), límites de tasa anti-spam (*rate limiting*) y publicaciones Realtime.
2. **Suite de Pruebas y Validación:** Se cuenta con 23 pruebas automatizadas ejecutadas con PGlite (Postgres en WebAssembly), comprobando autenticación social, persistencia de la cola outbox, aislamiento de cuentas, límites de tasa y compatibilidad territorial de Ubigeo. `npm run typecheck`, `npm run lint` y scripts de migración pasan al 100%.
3. **Brecha Principal Identificada:** Aunque el backend y las pantallas están funcionalmente implementados a nivel de código, existe una brecha entre la definición formal de los requerimientos (RF-01 a RF-25 y RNF-01 a RNF-14) y su despliegue operativo en producción. Dicha brecha abarca:
   - Aplicación de las migraciones `202611080004`–`202611080007` en la instancia remota de Supabase.
   - Verificación de campo con dispositivos físicos reales (conectividad intermitente, lecturas de lector de pantalla TalkBack/VoiceOver y GPS nativo).
   - Homogeneización de la experiencia de usuario (UI/UX) conforme a los estándares de diseño *Civic Horizon* (RNF-06).

---

## 2. Matriz Exhaustiva de Requerimientos Funcionales (RF-01 al RF-25)

A continuación se detalla el análisis punto a punto de cada requerimiento funcional, su estado de implementación real en el repositorio, la brecha técnica identificada y las mejoras introducidas y recomendadas.

### Módulo 1: Registro, Onboarding y Perfil Geográfico

| Requerimiento | Estado Real | Evidencia en Código / BD | Brecha / Lo que falta | Mejoras Realizadas y Recomendadas |
|---|---|---|---|---|
| **RF-01: Registro y localidad obligatoria**<br>Captura de nombre/apodo, teléfono y jerarquía territorial (Región, Provincia, Distrito, Barrio). | **Completado (Código y BD)** | • `OnboardingScreen.tsx`<br>• `NeighborhoodModal.tsx`<br>• `lib/ubigeo.ts`<br>• `202611080001_peru_ubigeo_catalog.sql`<br>• `202611080002_nationwide_community_profiles.sql` | Falta validación por SMS/OTP del número de teléfono en el servidor. La jerarquía cubre todo el Perú a nivel distrital, pero los barrios se ingresan como texto libre fuera del catálogo semilla de Cusco. | **Mejora:** Validación en cliente mediante expresión regular peruana (`normalizePeruMobilePhone`) y normalización de textos. Se recomienda conectar un proveedor SMS/WhatsApp para verificación de dos pasos en producción. |
| **RF-02: Ubicación GPS opcional**<br>Permiso explícito previo. Explica uso exclusivo para proximidad estimada; si se deniega, opera con barrio asignado. | **Completado (Código)** | • `ProfileScreen.tsx`<br>• `OnboardingScreen.tsx`<br>• `SavedPlacesModal.tsx`<br>• `expo-location` | Falta probar la precisión y tiempos de respuesta en hardware Android/iOS con sensores GPS de baja gama o bajo techumbre/modo avión. | **Mejora:** Confirmación explícita mediante diálogo modal accesible antes de solicitar permiso nativo (`confirmAction`). Coordenadas guardadas estrictamente en dispositivo local; nunca se envían al backend público. |
| **RF-03: Filtro geográfico dinámico**<br>Conmutador de 3 alcances: Mi Barrio (~450m), Barrios Colindantes, Todo el Distrito. | **Parcialmente Completado** | • `ProfileScreen.tsx`<br>• `lib/ubigeo.ts`<br>• `AppContext.tsx` (`locationMatchesScope`) | El alcance "Barrios Colindantes" está parametrizado por grafo topológico únicamente para el distrito demo de Cusco (San Blas, Lucrepata, Tandapata, etc.). Para el resto de distritos del país, no existen límites vectoriales de barrios en el catálogo nacional. | **Mejora:** Se habilitó el soporte de "Mis Direcciones Guardadas" (`SavedPlacesModal`) para permitir a usuarios fuera de Cusco definir puntos frecuentes alternativos. Se recomienda incorporar geometrías GeoJSON a futuro para adyacencia espacial real. |
| **RF-04: Tutorial inicial**<br>Modal *"Conoce Ayllu: 3 claves cívicas"*, accesible desde onboarding y re-consultable en perfil/header. | **Completado** | • `TutorialModal.tsx`<br>• `Header.tsx`<br>• `ProfileScreen.tsx`<br>• `OnboardingScreen.tsx` | Validar en dispositivos con pantallas muy pequeñas (ej. iPhone SE, pantallas de 4.7") que el contenido no desborde. | **Mejora:** Componente modal interactivo con stepper de 3 pasos, roles de accesibilidad `button`, y control de apertura centralizado en `AppContext`. |
| **RF-05: Edición del perfil geográfico**<br>Permite cambiar localidad activa, apodo y radio de cobertura en tiempo real desde "Mi Barrio". | **Completado** | • `ProfileScreen.tsx`<br>• `NeighborhoodModal.tsx`<br>• `lib/communityProfile.ts`<br>• RPC `save_community_profile` | Comprobar el aislamiento al alternar entre perfiles de distintos distritos en una misma instalación. | **Mejora:** Al cambiar de distrito o cuenta, `AppContext` reinicia los feeds remotos en memoria para evitar colisiones de caché entre jurisdicciones. |

---

### Módulo 2: Servicios de Proximidad y Economía Local

| Requerimiento | Estado Real | Evidencia en Código / BD | Brecha / Lo que falta | Mejoras Realizadas y Recomendadas |
|---|---|---|---|---|
| **RF-06: Directorio local de oficios**<br>Catálogo barrial (carpintería, cuidados, gasfitería, electricidad, cerrajería, educación) con búsqueda y filtros. | **Completado** | • `DirectoryScreen.tsx`<br>• `storage/mockData.ts`<br>• Tabla `local_services`<br>• RPC `get_shared_community_feed` | Los registros iniciales son estáticos; falta un módulo de backoffice web para que líderes comunitarios gestionen proveedores oficiales. | **Mejora:** Búsqueda en tiempo real sin retardo (<50ms) sobre SQLite local combinada con el feed remoto sincronizado por distrito. |
| **RF-07: Publicación y gestión de servicios**<br>Formulario para que proveedores publiquen oficio, título, descripción, zona y teléfono; edición y retiro por el autor. | **Completado (Mejorado en esta rama)** | • `PublishServiceModal.tsx`<br>• `DirectoryScreen.tsx`<br>• RPC `save_community_service`<br>• Cola `sync_queue` | Requiere que la migración `202611080004` sea aplicada al servidor remoto de producción. | **Mejora implementada:** Se reemplazó el modal básico de edición por un modal estilizado con diseño *Civic Horizon*, validación en vivo de límites (160 caracteres título, 500 descripción), feedback de confirmación de retiro y badges visuales para cambios offline pendientes. |
| **RF-08: Visto Bueno Vecinal / Avales (+1)**<br>Sistema de aval comunitario (+1) con contador visible. Integridad: solo 1 aval activo por usuario por proveedor; retiro disponible. | **Completado** | • `DirectoryScreen.tsx`<br>• Tabla `service_avales`<br>• RPC `toggle_service_aval`<br>• Restricción `UNIQUE(service_id, user_id)` | Falta prueba de carga y concurrencia con múltiples usuarios avalando simultáneamente en la nube. | **Mejora:** Operación atómica en PostgreSQL con incremento/decremento directo y respuesta inmediata en cola local para uso sin red. |
| **RF-09: Elegibilidad de avales y aviso ético**<br>Avales provenientes de vecinos del mismo barrio o colindantes. Disclaimer explícito de que no es garantía legal. | **Completado** | • `DirectoryScreen.tsx`<br>• `PublishServiceModal.tsx`<br>• `202611080004_shared_services_moderation_resources.sql` | El control de vecindad para avalar está enforcing en cliente y en RPC SQL; falta afinar mensaje de rechazo cuando un usuario cambia de barrio. | **Mejora:** Caja de aviso ético destacada en la pantalla del directorio y dentro de la ficha de detalle de cada proveedor. |
| **RF-10: Directorio de emergencias**<br>Pestaña dedicada con brigadas 24/7, Bomberos Cusco (116), Salud, Serenazgo, entidad validadora, timestamp y llamada directa. | **Completado** | • `DirectoryScreen.tsx`<br>• `storage/mockData.ts` (`INITIAL_EMERGENCY_CONTACTS`) | Contactos de emergencia están actualmente cableados en código para Cusco; requieren una tabla administrable en base de datos para cada distrito de Perú. | **Mejora:** Modal de consentimiento antes de disparar `Linking.openURL('tel:...')` para evitar llamadas accidentales, con vista de protocolos de respuesta inmediata. |

---

### Módulo 3: Cadena de Favores y Economía Solidaria

| Requerimiento | Estado Real | Evidencia en Código / BD | Brecha / Lo que falta | Mejoras Realizadas y Recomendadas |
|---|---|---|---|---|
| **RF-11: Muro colaborativo - Principio Ayni**<br>Préstamo de herramientas, acompañamiento, donaciones, habilidades y movilidad. Cero transacciones monetarias. | **Completado** | • `FavoresScreen.tsx`<br>• `PublishFavorModal.tsx`<br>• Tabla `community_favors`<br>• `202611080003_community_favors.sql` | Ninguna a nivel de especificación; la arquitectura prohíbe cualquier pasarela de pago o campo de precio. | **Mejora:** Banner filosófico Ayni explicativo, filtrado por categorías de ayuda y visualización inmediata de favores urgentes. |
| **RF-12: Categoría y estado de publicación**<br>Estados *Disponible*, *Resuelta*, *Cerrada*. El autor puede actualizar estado con un toque o retirar. | **Completado (Mejorado en esta rama)** | • `FavoresScreen.tsx`<br>• RPC `update_community_favor_status`<br>• RPC `save_community_favor` | Comprobar sincronización bidireccional cuando dos personas intentan cerrar el mismo favor al mismo tiempo. | **Mejora implementada:** Se diseñó un modal completo con estética Civic Horizon para editar título y descripción, se estilizaron los botones de autor (Editar, Cerrar, Reabrir, Marcar Resuelto y Retirar con doble confirmación) y se agregó el botón con estilo accesible para paginación ("Cargar más favores"). |
| **RF-13: Publicación en tres pasos**<br>Stepper: 1. Modalidad y categoría; 2. Detalles y tiempos con chips ágiles; 3. Privacidad y canal de contacto. | **Completado** | • `PublishFavorModal.tsx` | Revisar la experiencia táctil en navegadores web móviles donde los selectores nativos varían. | **Mejora:** Formulario validado paso a paso, chips interactivos de duración de préstamo (1 hora, 1 día, fin de semana), visualización clara del canal de contacto. |
| **RF-14: Contacto entre vecinos**<br>Opciones de contacto: Mensajería interna Ayllu (protege teléfono) o WhatsApp vecinal. | **Completado** | • `ContactActionModal.tsx`<br>• `MessagingInboxModal.tsx`<br>• Tablas `conversations` y `messages`<br>• `utils/contact.ts` | La mensajería interna requiere que la migración `202611080004` esté aplicada en el servidor remoto; mientras tanto opera en mock local. | **Mejora:** Normalización automática de números peruanos (`+51 9XX XXX XXX`), verificación de consentimiento explícito antes de exponer el teléfono y chat cifrado localmente por participante. |

---

### Módulo 4: Gestión de Emergencias y Ayuda Humanitaria

| Requerimiento | Estado Real | Evidencia en Código / BD | Brecha / Lo que falta | Mejoras Realizadas y Recomendadas |
|---|---|---|---|---|
| **RF-15: Activación del Modo Emergencia**<br>Coordinadores y Admins pueden activar o cerrar Modo Emergencia indicando localidad, tipo y fecha/hora. | **Completado** | • `ManageEmergencyModal.tsx`<br>• `EmergencyDashboardScreen.tsx`<br>• Tabla `emergency_mode_events`<br>• RPC `set_emergency_mode` | La verificación de rol depende de `community_memberships` en Supabase; en modo demo local el conmutador de perfil permite probar la UI sin autorización real. | **Mejora:** Bitácora inmutable en base de datos (`emergency_audit_trail`) que registra quién activó o cerró el modo, fecha exacta y tipo de incidente. |
| **RF-16: Prioridad de información en emergencias**<br>Al activarse la emergencia, interfaz destaca un banner prominente en rojo/terracota con acceso prioritario. | **Completado** | • `EmergencyAlertBanner.tsx`<br>• `Header.tsx`<br>• `AppNavigator.tsx` | Comprobar que en dispositivos pequeños el banner no desplace botones de acción críticos. | **Mejora:** Banner superior animado y reactivo, visible en todas las pantallas principales cuando el modo emergencia está activo, con botón de acceso en un solo toque al tablero. |
| **RF-17: Reportes de vulnerabilidad**<br>Formulario para reportar familias en riesgo (Adulto mayor, salud, agua, colapso) con consentimiento explícito. | **Completado** | • `ReportVulnerabilityModal.tsx`<br>• `storage/privateReportStorage.ts`<br>• RPC `report_vulnerability` | Los reportes enviados sin conexión deben mantenerse cifrados en SecureStore hasta que la red esté disponible. | **Mejora:** Paso obligatorio de consentimiento informado donde el vecino autoriza qué datos comparte y para qué fines de auxilio inmediato. |
| **RF-18: Acceso a datos sensibles por roles**<br>Coordinador/Admin: dirección exacta, nombre completo y llamada. Vecino: datos anonimizados (sector aprox.). | **Completado (Mejorado en esta rama)** | • `EmergencyDashboardScreen.tsx`<br>• Tabla `emergency_report_private`<br>• RPC `read_emergency_private`<br>• Migración `202611080005` | Comprobar con usuarios reales de distintos roles en un entorno Supabase remoto. | **Mejora implementada:** Se revocó el `SELECT` directo a la tabla privada en SQL. En la interfaz se implementó un botón prominente de consulta con advertencia de auditoría ("Consultar datos privados protegidos - Acceso registrado"), garantizando que cada apertura quede guardada en la bitácora legal. |
| **RF-19: Tablero de emergencias**<br>Métricas de estado (Totales, Pendientes, En atención, Resueltos), filtros rápidos y actualización de estado. | **Completado** | • `EmergencyDashboardScreen.tsx`<br>• RPC `update_emergency_status` | Falta asignación directa de cuadrilla o brigadista con notificación push en tiempo real. | **Mejora:** Tarjetas de métricas con colores Civic Horizon, filtros rápidos en chips horizontales y actualización de estado con guardado inmediato en cola y servidor. |
| **RF-20: Coordinación de recursos críticos**<br>Consultar, solicitar u ofrecer: agua purificada (litros), generadores (kW), alimentos y refugio. | **Completado** | • `EmergencyDashboardScreen.tsx`<br>• Tabla `critical_resources`<br>• RPC `save_critical_resource` | Enriquecer la categorización con medicinas o insumos médicos de primera necesidad. | **Mejora:** Validación en cliente de cantidades numéricas estrictamente positivas y unidades de medida; control de versión concurrente para evitar sobreasignación. |
| **RF-21: Moderación y reporte de contenido**<br>Vecinos pueden denunciar publicaciones, favores o servicios. Coordinadores disponen de bandeja para ocultar contenido. | **Completado** | • `ContentReportModal.tsx`<br>• `EmergencyDashboardScreen.tsx`<br>• Tabla `content_reports`<br>• RPC `report_content` / `moderate_content` | Notificación al usuario cuyo contenido ha sido ocultado para que pueda apelar o corregir la publicación. | **Mejora:** Moderación compartida con registro del autor de la decisión, motivo y fecha. Filtro reactivo en el muro para que el contenido oculto desaparezca de inmediato para toda la comunidad. |

---

### Módulo 5: Funcionamiento Sin Conexión (Offline First)

| Requerimiento | Estado Real | Evidencia en Código / BD | Brecha / Lo que falta | Mejoras Realizadas y Recomendadas |
|---|---|---|---|---|
| **RF-22: Consulta offline**<br>Los datos operativos se leen localmente desde SQLite en Android/iOS y AsyncStorage en Web. | **Completado** | • `storage/offlineStorage.ts`<br>• `storage/sqliteDriver.ts`<br>• `storage/sqliteDriver.web.ts` | En web se utiliza AsyncStorage; la experiencia óptima requeriría SQLite WASM compilado con OPFS. | **Mejora:** Abstracción unificada que migra registros previos en primer inicio y ofrece lecturas instantáneas sin esperas de red. |
| **RF-23: Guardado local de reportes**<br>El reporte de emergencia se guarda localmente y se encola con estado PENDIENTE. | **Completado** | • `storage/privateReportStorage.ts`<br>• `context/AppContext.tsx`<br>• `expo-secure-store` | En Web, los reportes con datos identificables no se pueden guardar offline porque no existe SecureStore nativo en navegador. | **Mejora:** Almacenamiento desacoplado: los datos públicos anonimizados van a SQLite, mientras que la información privada (PII) se almacena en el enclave seguro del hardware móvil. |
| **RF-24: Sincronización y prevención de duplicados**<br>La cola no elimina elementos hasta recibir confirmación del servidor. Claves de idempotencia. | **Completado** | • `services/syncTransport.ts`<br>• `storage/offlineStorage.ts`<br>• Tests `favors.test.cjs` y `rateLimit.test.cjs` | Simular pérdidas repentinas de batería durante la ejecución del loop de sincronización. | **Mejora:** Protocolo outbox estricto: asignación de UUID v4 determinístico, reintentos con backoff exponencial (hasta 5 min), clasificación de errores fatales vs transitorios y vaciado secuencial. |
| **RF-25: Límite de la coordinación offline**<br>Avisos claros de que la cola offline no sustituye la coordinación en vivo ni garantiza respuesta inmediata. | **Completado** | • `OfflineSyncBanner.tsx`<br>• `DirectoryScreen.tsx`<br>• `FavoresScreen.tsx`<br>• `EmergencyDashboardScreen.tsx` | Educar a la población en simulacros sobre no depender exclusivamente del celular en cortes prolongados de energía eléctrica. | **Mejora:** Banners de advertencia contextualmente situados junto a cada publicación o reporte que aún no ha sido confirmado por la red. |

---

## 3. Matriz Exhaustiva de Requerimientos No Funcionales (RNF-01 al RNF-14)

| Requerimiento | Estado Real | Arquitectura y Evidencia Técnica | Brecha / Riesgo Identificado | Mejoras Realizadas y Recomendadas |
|---|---|---|---|---|
| **RNF-01: Compatibilidad multiplataforma**<br>Android, iOS y Web con experiencia visual homogénea. | **Completado** | • Expo SDK 52<br>• React Native 0.76<br>• Webpack/Metro bundler | La matriz de compatibilidad con versiones antiguas de Android (inferiores a Android 10) requiere validación física. | **Mejora:** Reemplazo de componentes dependientes de plataforma (ej. `Alert.alert`) por utilidades transversales (`dialog.ts`). |
| **RNF-02: Almacenamiento local seguro**<br>SQLite en móvil, AsyncStorage en Web, SecureStore para datos sensibles. | **Completado** | • `ayllu-local.db` (SQLite)<br>• Claves separadas en `expo-secure-store` | En web, no se dispone de cifrado por hardware nativo para datos privados en reposo. | **Mejora:** Desacoplamiento total entre datos operativos generales y datos sensibles de emergencias. |
| **RNF-03: Sincronización segura e idempotente**<br>Reintentos automáticos, backoff, no generación de duplicados. | **Completado** | • `services/syncTransport.ts`<br>• Restricciones `ON CONFLICT` en PostgreSQL | Conflictos de concurrencia cuando dos dispositivos de una misma cuenta editan un favor sin conexión. | **Mejora:** Manejo de versión monótona creciente (`version INT`) en favores y recursos críticos. |
| **RNF-04: Claridad de conectividad**<br>Detección reactiva de red e indicadores visuales de estado. | **Completado** | • `expo-network`<br>• `OfflineSyncBanner.tsx`<br>• Status bar en `ProfileScreen.tsx` | El listener de Expo Network puede tardar un par de segundos en reportar la caída total de enlace WAN en redes móviles 3G/EDGE. | **Mejora:** Doble verificación: escucha eventos de red en caliente y sondea peticiones con fallback ante errores de timeout. |
| **RNF-05: Publicación guiada en 3 pasos**<br>Stepper ágil, sin fricción cognitiva ni sobrecarga visual. | **Completado** | • `PublishFavorModal.tsx`<br>• Stepper animado | Optimizar tamaño de fuentes en pantallas con zoom de accesibilidad activo al 150%. | **Mejora:** Flujo progresivo con validación por paso y chips de selección rápida para agilizar el llenado. |
| **RNF-06: Accesibilidad vecinal**<br>Alto contraste, tipografía legible (Civic Horizon), áreas táctiles ≥ 44px, soporte para lectores de pantalla. | **Completado (Reforzado en esta rama)** | • Paleta Civic Horizon en `theme/colors.ts`<br>• Roles `accessibilityRole="button"`, `alert`<br>• Etiquetas `accessibilityLabel` | Falta auditoría formal con usuarios ciegos o de baja visión utilizando lectores TalkBack y VoiceOver en dispositivos físicos. | **Mejora implementada:** Se agregaron estilos consistentes a los modales de edición de favores y servicios, botones con dimensiones táctiles superiores a 44x44px, contraste verificado y etiquetas semánticas completas. |
| **RNF-07: Tolerancia a fallos y validación preventiva**<br>Validación de campos, confirmaciones en acciones destructivas. | **Completado** | • `utils/validation.ts`<br>• Diálogos `confirmAction` en retiro de favores y llamadas | Ninguna crítica; formularios blindados contra entradas maliciosas o textos vacíos. | **Mejora:** Validación en cliente y en procedimientos almacenados de base de datos (`isReasonableText`, `normalizePeruMobilePhone`). |
| **RNF-08: Rendimiento local**<br>Renderizado inmediato (<200ms) sin bloqueos por llamadas de red. | **Completado** | • Consultas locales a SQLite/AsyncStorage<br>• `mergeFavorFeed` en memoria | Optimizar consultas de búsqueda cuando el catálogo supere los 5,000 registros locales. | **Mejora:** Paginación por bloques (`loadMoreFavors`) y actualización en segundo plano vía Supabase Realtime con agrupación de ráfagas (*debounce* de 400ms). |
| **RNF-09: Disponibilidad y resiliencia offline**<br>Capacidad de operar ante desastres o cortes de servicio. | **Completado** | • Base de datos local autónoma<br>• Modo de demostración con datos semilla | Los mapas interactivos con teselas vectoriales requerirían predescarga de paquetes offline para funcionar al 100% sin internet. | **Mejora:** Modo de demostración aislado que permite realizar capacitaciones y simulacros sin necesidad de conexión o credenciales activas. |
| **RNF-10: Privacidad por diseño**<br>Separación estricta entre datos públicos y datos personales sensibles (PII). | **Completado** | • Tablas separadas: `emergency_reports` vs `emergency_report_private`<br>• Migración `202611080005` | Definir la política formal de retención temporal y eliminación periódica de datos personales según la normativa peruana. | **Mejora:** Revocación de permisos de lectura directa en SQL; la consulta de datos privados requiere forzosamente ejecutar un RPC autenticado y auditado. |
| **RNF-11: Consentimiento informado**<br>Consentimiento explícito para compartir ubicación, teléfono o reportes. | **Completado** | • Diálogos de consentimiento en GPS, WhatsApp y auxilio vulnerable | Asegurar que el consentimiento se pueda revocar en cualquier momento desde los ajustes de la app. | **Mejora:** Avisos claros y comprensibles que explican qué información se solicita, con quién se comparte y cómo se protege. |
| **RNF-12: Minimización de datos**<br>No solicitar DNI ni datos innecesarios; recopilar solo lo indispensable. | **Completado** | • Identidad basada en apodo barrial<br>• Sin campos de DNI en esquemas | Los brigadistas en rescates formales podrían necesitar validar compatibilidad médica (ej. tipo de sangre o alergias severas). | **Mejora:** Esquema mínimo centrado en la persona y su necesidad urgente, evitando la creación de perfiles invasivos. |
| **RNF-13: Seguridad basada en roles (RBAC)**<br>Control estricto en servidor para roles: Vecino, Coordinador, Admin. | **Completado** | • `community_memberships`<br>• Políticas RLS y comprobaciones en RPCs SQL | La asignación inicial de roles de coordinador requiere una interfaz administrativa segura de validación comunal. | **Mejora:** El conmutador de rol en la app cliente solo altera la vista estética de prueba; el servidor rechaza cualquier operación no autorizada mediante RLS. |
| **RNF-14: Integridad transaccional de avales y votos**<br>Unicidad por cuenta y servicio; operaciones libres de duplicados o trampas. | **Completado** | • Restricción `UNIQUE` en PostgreSQL<br>• Transacciones seguras en servidor | Evaluar mecanismos contra la creación masiva de cuentas fantasma (requerirá verificación telefónica en fase 2). | **Mejora:** Reglas anti-spam en servidor (`rate_limits.sql`) que restringen a 10 favores/hora, 5 servicios/hora y 20 denuncias/hora por autor. |

---

## 4. Mejoras Técnicas Implementadas en Esta Rama (`feature/mejoras-rf-rnf-analisis`)

Durante esta intervención se realizaron las siguientes mejoras concretas de código y experiencia de usuario en el proyecto:

1. **Refactorización Completa de Modales de Edición (RNF-06 / RF-07 / RF-12):**
   - En `DirectoryScreen.tsx`, se sustituyó el modal de edición plano por un componente estilizado con diseño *Civic Horizon*: encabezado con drag handle, campos con límites visibles de caracteres, botón de cerrado accesible y botones táctiles diferenciados (Cancelar y Guardar).
   - En `FavoresScreen.tsx`, se rediseñó el modal de edición de publicaciones solidarias para ofrecer la misma estética moderna, accesible y coherente con el sistema de diseño.

2. **Perfeccionamiento de Controles de Autor y Doble Confirmación:**
   - En `DirectoryScreen.tsx`, se mejoró la barra de acciones de autor: botones con iconos claros para "Editar", "Retirar" con confirmación de dos toques ("Confirmar retiro" en rojo de advertencia) y opción visible para cancelar el retiro.
   - En `FavoresScreen.tsx`, se integraron iconos y estilos para las acciones de "Editar", "Cerrar favor", "Reabrir", "Marcar Resuelto" y "Retirar".

3. **Auditoría Visual de Acceso a Datos Privados (RF-18 / RNF-10 / RNF-12):**
   - En `EmergencyDashboardScreen.tsx`, se rediseñó el botón de consulta de datos privados para los coordinadores comunitarios. Ahora cuenta con un distintivo visual en tonos terracota/rojo, icono de seguridad y texto claro que advierte que el acceso queda registrado en la bitácora legal inmutable del servidor.

4. **Optimización de Banners de Estado y Paginación:**
   - Se estilizaron los avisos de favores y servicios pendientes de confirmación del servidor y los banners de reintento de sincronización offline con llamada directa a `synchronizeQueue(true)`.
   - Se mejoró la barra de actualización del muro solidario y el botón "Cargar más favores" para facilitar la navegación fluida.

5. **Validación Integral de Calidad:**
   - Se verificó que todas las pruebas automatizadas (23 de 23), la compilación TypeScript (`tsc --noEmit`), el linter de Expo y la comprobación de migraciones SQL ejecuten con éxito sin arrojar advertencias ni errores.

---

## 5. Hoja de Ruta Priorizada para Despliegue en Producción

### Prioridad 1: Despliegue y Validación en Supabase Remoto
- [ ] Ejecutar `npx supabase db push --dry-run --remote` y aplicar las migraciones `202611080004` a `202611080007` en el proyecto en la nube.
- [ ] Configurar variables de entorno reales en `.env` (`EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
- [ ] Configurar credenciales OAuth de Google (Web Client ID, Android Client ID, iOS URL Schemes) y proveedor de correo SMTP para recuperación de contraseñas.

### Prioridad 2: Pruebas de Campo con Múltiples Dispositivos Concurrentes
- [ ] **Prueba de Favores:** Crear un favor con Cuenta A en un celular físico; verificar que la Cuenta B en otro dispositivo lo visualiza de inmediato mediante Supabase Realtime.
- [ ] **Prueba de Modo Avión (Offline Outbox):** Colocar el celular en modo avión, publicar un servicio y otorgar un aval. Reconectar la red y confirmar que la cola se vacía secuencialmente sin crear duplicados.
- [ ] **Prueba de Roles y Privacidad:** Con una cuenta de "Vecino", intentar consultar datos privados de un reporte de auxilio (confirmar que el backend rechaza la consulta). Con una cuenta de "Coordinador", consultar los datos y validar que el evento se registra en la pestaña "Trazabilidad".

### Prioridad 3: Cumplimiento Regulatorio y Seguridad
- [ ] Redactar la Política de Privacidad y Términos de Servicio de Ayllu en estricto cumplimiento con la **Ley N° 29733 (Ley de Protección de Datos Personales de Perú)**.
- [ ] Implementar un mecanismo para que los usuarios puedan solicitar la eliminación definitiva de su cuenta y sus datos personales asociados.
- [ ] Revisar y mitigar las 12 advertencias moderadas de dependencias reportadas por `npm audit`.

### Prioridad 4: Empaquetado y Distribución
- [ ] Configurar EAS Build (`eas.json`) para compilar paquetes Android (APK / AAB) e iOS (IPA para TestFlight).
- [ ] Configurar alojamiento para la versión web con cabeceras de seguridad CSP (Content Security Policy) y certificados SSL/TLS.
- [ ] Habilitar monitoreo de excepciones sin registro de datos sensibles (evitar capturar PII en logs de error).