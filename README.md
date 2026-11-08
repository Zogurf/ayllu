# Ayllu - Resiliencia Comunitaria Local en React Native 🏔️🤝

Prototipo móvil desarrollado en **React Native con Expo y TypeScript**, basado en las plantillas **Stitch ("Civic Horizon")**. Presenta flujos de apoyo vecinal, servicios locales y emergencias. Los datos operativos se guardan localmente en SQLite en Android/iOS y en AsyncStorage en Web. El código incluye una primera integración con Supabase para Auth, perfiles vecinales y sincronización de reportes de emergencia; requiere configurar un proyecto y sus credenciales antes de activarse.

> **Estado:** prototipo funcional para demostración. No usar para coordinar emergencias reales ni ingresar datos personales reales. Los roles se pueden cambiar localmente y no autorizan ni protegen información.

---

## 📱 Demostración y Ejecución Rápida

La aplicación está lista para ejecutarse en **Android**, **iOS** y **Web** (navegador de escritorio o móvil).

### 1. Iniciar en desarrollo:
```bash
# Desde la carpeta raíz del proyecto:
npm start

# O navegar a la carpeta de la app:
cd ayllu-app
npm start
```

### 2. Opciones de ejecución:
- **Android:** Presiona `a` en la terminal (o ejecuta `npm run android`).
- **iOS:** Presiona `i` en la terminal (o ejecuta `npm run ios`).
- **Web:** Presiona `w` en la terminal (o ejecuta `npm run web`).
- **Expo Go en tu celular físico:** Escanea el código QR que muestra la terminal con la app **Expo Go** (Android o iOS).

## Estado real frente a los requisitos

Las pantallas y los flujos visuales de los módulos están implementados en distintos grados; la tabla resume el comportamiento real del código, no el objetivo de producto.

| Área | Estado actual | Pendiente para cumplir el README |
|---|---|---|
| Registro y perfil | Perfil local persistido; Auth por correo/contraseña y perfil remoto opcionales al configurar Supabase | Verificación de identidad y teléfono, permisos de ubicación del dispositivo |
| Directorio y contactos | Datos semilla locales | Fuente administrable y sincronizada; verificación real de proveedores y vigencia de contactos |
| Servicios y avales | Flujos locales; avales guardados en el dispositivo | API compartida y reglas transaccionales contra duplicados |
| Favores | Muro Supabase por distrito, publicación y cambios con cola offline, permisos por autor | Aplicar migración `202611080003`; mensajería interna y moderación compartida pendientes |
| Emergencias y recursos | Reportes pueden sincronizarse por RPC autenticado con RLS; el tablero y recursos siguen locales | Completar sincronización de estados/recursos y auditoría antes de uso real |
| Mensajería | Confirmación simulada en la interfaz | Canal de mensajería real o apertura de WhatsApp con consentimiento |
| Moderación | Denuncias y ocultamiento local | Cola compartida, persistencia y permisos administrativos en servidor |
| Offline y sincronización | Expo detecta conectividad; la cola persiste errores; los reportes sensibles se guardan en SecureStore móvil y usan RPC idempotente al iniciar sesión | Configurar proyecto/credenciales; completar sincronización para servicios, favores, avales, recursos y moderación |

Los formularios limitan longitudes, validan celulares peruanos, comprueban edades entre 0 y 125 y requieren cantidades positivas para recursos. Los mensajes de confirmación indican cuándo el registro solo quedó guardado en el dispositivo.

### Persistencia local

En Android e iOS la app usa `expo-sqlite` (`ayllu-local.db`) con tablas separadas para perfiles, servicios, favores, reportes, recursos, moderación y cola de sincronización. En la primera apertura, migra los registros previos de AsyncStorage a SQLite y elimina las claves antiguas después de completar la migración. En Web conserva AsyncStorage como alternativa, porque el build web actual no configura SQLite WASM. Los datos identificables de reportes se guardan por separado en SecureStore móvil.

### Identidad y permisos

Sin credenciales de Supabase, Ayllu opera en modo de demostración. Con el proyecto configurado, aparece el inicio de sesión por correo/contraseña, el alta guarda un perfil y rol inicial de vecino, y la aplicación obtiene el rol desde `community_memberships`. Los roles privilegiados nunca se asignan desde el cliente. Las migraciones en `supabase/migrations/` preparan RLS y un RPC idempotente para reportes de emergencia.

### Base de datos y backend (siguiente etapa)

La solución prevista es **Supabase (PostgreSQL + Auth + Row Level Security)**. La integración actual cubre Auth, perfiles, barrios y reportes de emergencia. Los campos privados de reportes se separan de la información comunitaria. El muro de favores tiene transporte Supabase y requiere aplicar la migración `202611080003`. El directorio, avales, recursos y moderación aún son locales; se incorporarán con sus propias migraciones, políticas y adaptadores de sincronización.

Sigue [SUPABASE_SETUP.md](SUPABASE_SETUP.md) para crear el proyecto, aplicar migraciones, configurar Auth, guardar las variables y probar el flujo. La llave `service_role` nunca debe incluirse en la app. Web no permite guardar reportes identificables offline porque no dispone del almacenamiento seguro nativo.

---

## 🏛️ Requisitos objetivo del producto

Esta sección conserva los requisitos acordados para el producto. Su presencia aquí no implica que estén terminados; consulta la tabla de estado real arriba.

### Módulo 1: Registro, Onboarding y Perfil Geográfico
- **RF-01 (Registro y localidad obligatoria):** Captura nombre/apodo barrial, teléfono y jerarquía territorial (Región: Cusco, Distrito: Cusco, Localidad/Barrio: San Blas, San Cristóbal, etc.).
- **RF-02 (Ubicación GPS opcional):** Permiso explícito previo. Explica con claridad que solo se usa para calcular proximidad estimada. Si el usuario deniega el permiso, la app opera con total normalidad usando su barrio asignado.
- **RF-03 (Filtro geográfico dinámico):** Conmutador de alcance:
  1. *Mi Barrio Únicamente* (~450 m a la redonda).
  2. *Barrios Colindantes* (+ Lucrepata, Tandapata, San Cristóbal).
  3. *Todo el Distrito de Cusco*.
- **RF-04 (Tutorial inicial):** Modal intuitivo *"Conoce Ayllu: 3 claves cívicas"*, accesible desde el onboarding y re-consultable en cualquier momento desde el perfil o header.
- **RF-05 (Edición del perfil geográfico):** Permite cambiar localidad activa, apodo y radio de cobertura en tiempo real desde la pestaña *"Mi Barrio"*.

---

### Módulo 2: Servicios de Proximidad y Economía Local
- **RF-06 (Directorio local):** Catálogo de oficios barriales (carpintería, enfermería/cuidados, gasfitería, electricidad, cerrajería, educación). Búsqueda instantánea y filtros por categoría.
- **RF-07 (Publicación de servicios):** Formulario para que proveedores vecinales publiquen su oficio con título, descripción, zona aproximada y teléfono de contacto.
- **RF-08 (Visto Bueno Vecinal / Avales):** Sistema de aval comunitario (+1) con contador visible. **Regla de integridad:** solo 1 aval activo por usuario por proveedor; permite retirar el aval en cualquier momento.
- **RF-09 (Elegibilidad de avales y aviso ético):** Regla visible de que los avales provienen de vecinos del mismo barrio o colindantes. Indicación explícita de que los avales reflejan confianza comunitaria y no constituyen garantía legal ni técnica de calidad o seguridad.
- **RF-10 (Directorio de apoyo para emergencias):** Pestaña dedicada con brigadas vecinales 24/7, Bomberos Cusco N° 39 (116), Centro de Salud y Serenazgo, indicando entidad validadora, timestamp de actualización, llamada directa telefónica y botón de protocolo.

---

### Módulo 3: Cadena de Favores y Economía Solidaria
- **RF-11 (Muro colaborativo - Principio Ayni):** Muro solidario para préstamo de herramientas, acompañamiento médico/temporal, donación de materiales, intercambio de habilidades y movilidad solidaria. **Cero dinero, sin transacciones monetarias ni comisiones.**
- **RF-12 (Categoría y estado de publicación):** Estados *Disponible*, *Resuelta* y *Cerrada*. El autor puede actualizar el estado con un toque o retirar su publicación.
- **RF-13 (Publicación en tres pasos):**
  - **Paso 1:** Selección de modalidad (*Ofrezco ayuda* vs *Pedir auxilio*) y categoría.
  - **Paso 2:** Detalles breves (título, descripción, tiempo de préstamo con chips ágiles).
  - **Paso 3:** Privacidad y canal de contacto con aviso ético Ayni.
- **RF-14 (Contacto entre vecinos):** Opciones de contacto elegidas por el autor:
  - *Mensajería interna Ayllu* (protege el teléfono personal de números desconocidos).
  - *WhatsApp vecinal verificado*.

---

### Módulo 4: Gestión de Emergencias y Ayuda Humanitaria
- **RF-15 (Activación del Modo Emergencia):** Coordinadores comunitarios y Administradores pueden activar o cerrar el Modo Emergencia indicando localidad afectada, tipo de evento (lluvias, sismo, corte) y fecha/hora.
- **RF-16 (Prioridad de información en emergencias):** Al activarse la emergencia, la interfaz destaca un banner prominente en rojo/terracota con acceso prioritario al Tablero de Emergencias y recursos críticos.
- **RF-17 (Reportes de vulnerabilidad):** Formulario para reportar personas o familias en riesgo (Adulto mayor aislado, salud/medicación, agua potable, colapso de infraestructura, rescate). Incluye paso de consentimiento sobre qué datos se recopilan y con quién se comparten.
- **RF-18 (Acceso a datos sensibles por roles):**
  - **Coordinador Comunitario / Admin:** Acceso completo a dirección exacta (*"Calle Tandapata 342, int. B"*), nombre completo de la persona afectada y botón para llamar directamente.
  - **Vecino / Proveedor Local:** Datos sensibles anonimizados y protegidos; solo visualizan la zona general (*"San Blas alto - sector aprox. 350m"*).
- **RF-19 (Tablero de emergencias):** Métricas de estado (Totales, Pendientes, En atención, Resueltos), filtros rápidos por estado y botones de acción para que el coordinador cambie el estado de atención (*Pendiente ➔ En atención ➔ Resuelto*).
- **RF-20 (Coordinación de recursos críticos):** Pestaña para consultar, solicitar u ofrecer recursos vitales: agua purificada (litros), generadores eléctricos (kW), alimentos no perecibles y refugio temporal seguro.
- **RF-21 (Moderación y reporte de contenido):** Los vecinos pueden denunciar cualquier publicación, favor o servicio. Los Administradores y Coordinadores disponen de una bandeja de moderación para revisar reportes y ocultar contenido inapropiado con un solo toque.

---

### Módulo 5: Funcionamiento Sin Conexión (Offline First)
- **RF-22 (Consulta offline):** Los datos operativos guardados se leen localmente desde SQLite en Android/iOS y AsyncStorage en Web; contactos de apoyo siguen siendo datos semilla y no hay sincronización real.
- **RF-23 (Guardado local de reportes):** El reporte de emergencia se guarda localmente y se encola con estado `PENDIENTE`. Los favores y sus cambios se guardan en una cola persistente y se envían mediante un RPC autenticado. Los servicios siguen siendo locales, sin transporte compartido.
- **RF-24 (Sincronización y prevención de duplicados):** La cola no elimina elementos hasta recibir confirmación. Reportes de emergencia usan un RPC idempotente; requiere proyecto Supabase, barrio sembrado y sesión válida. Otros tipos aún no tienen transporte backend.
- **RF-25 (Límite de la coordinación offline):** Objetivo de producto. La advertencia se muestra en algunos flujos de demo, pero la cola aún no se entrega a coordinadores.

---

## 🎨 Requerimientos No Funcionales y Diseño (Civic Horizon)
- **RNF-01 (Compatibilidad móvil):** Plataformas objetivo: Android, iOS y Web. La matriz de versiones mínimas todavía no está validada.
- **RNF-02 (Almacenamiento local):** SQLite en Android/iOS organiza los datos operativos; Web usa AsyncStorage como alternativa. SecureStore móvil mantiene separado el contenido sensible de reportes.
- **RNF-03 (Sincronización segura):** La cola local conserva los fallos; el RPC de reportes de emergencia es idempotente. La conexión remota y los otros tipos requieren configuración/implementación.
- **RNF-04 (Claridad de conexión):** Expo Network informa el estado de conectividad real del dispositivo y la cola muestra fallos pendientes.
- **RNF-05 (Publicación en 3 pasos):** Modal con barra de progreso tipo stepper ágil.
- **RNF-06 (Accesibilidad vecinal):** Alto contraste (Cobalto `#2563EB`, Pizarra `#0F172A`, Terracota `#EA580C`, Rojo `#DC2626`), tipografía legible y lenguaje directo.
- **RNF-07 (Tolerancia a errores):** Confirmaciones antes de enviar reportes críticos y validación de campos obligatorios.
- **RNF-08 (Rendimiento):** Renderizado en memoria local sin esperas de red (< 200 ms).
- **RNF-09 (Disponibilidad offline):** Objetivo de producto; no se garantiza disponibilidad ni vigencia de datos en cualquier circunstancia.
- **RNF-10 / RNF-11 / RNF-12 (Privacidad y consentimientos):** Los identificadores del reporte se separan en el esquema servidor y los datos locales se guardan en SecureStore móvil. Falta autenticar usuarios y verificar RLS en un proyecto real; la demo no debe contener datos personales reales.
- **RNF-13 (Seguridad de roles):** El conmutador en *"Mi Barrio"* solo cambia el rol local para la demo. La autorización de producción está pendiente y debe ser aplicada en el backend.
- **RNF-14 (Integridad de avales):** La demo evita repetir un aval en el estado local; falta una restricción transaccional compartida en servidor.

---

## 📂 Mapeo con las Plantillas Stitch del Proyecto

| Carpeta Stitch Original | Pantalla / Componente React Native |
|---|---|
| `ayllu_registro_y_tutorial_minimalista/` | `src/screens/OnboardingScreen.tsx` + `src/components/TutorialModal.tsx` |
| `ayllu_directorio_y_avales_rf_06_al_rf_10/` | `src/screens/DirectoryScreen.tsx` + `src/components/PublishServiceModal.tsx` |
| `ayllu_cadena_de_favores_rf_11_al_rf_14/` | `src/screens/FavoresScreen.tsx` + `src/components/ContactActionModal.tsx` |
| `ayllu_modal_publicar_favor_en_3_pasos_rf_13/` | `src/components/PublishFavorModal.tsx` |
| `ayllu_perfil_geogr_fico_y_publicaci_n_rf_03_rf_05_rf_07/` | `src/screens/ProfileScreen.tsx` + `src/components/NeighborhoodModal.tsx` |
| `ayllu_tablero_de_emergencias_rf_19/` | `src/screens/EmergencyDashboardScreen.tsx` + `src/components/ManageEmergencyModal.tsx` |
| `civic_horizon/DESIGN.md` | `src/theme/colors.ts` (Paleta Civic Horizon Cobalt, Slate, Terracotta) |

---

## 🛠️ Estructura del Código Fuente

```text
ayllu-app/
├── App.tsx                     # Punto de entrada con SafeAreaProvider y AppProvider
├── package.json                # Dependencias Expo SDK 58, React Native, SQLite y AsyncStorage (fallback Web)
├── src/
│   ├── AppNavigator.tsx        # Navegador principal con tabs inferiores y header Stitch
│   ├── theme/
│   │   └── colors.ts           # Tokens del sistema de diseño Civic Horizon
│   ├── types/
│   │   └── index.ts            # Interfaces TypeScript (Roles, Servicios, Favores, Reportes)
│   ├── storage/
│   │   ├── mockData.ts         # Datos semilla realistas de la comunidad andina (Cusco)
│   │   ├── offlineStorage.ts   # SQLite nativo, fallback Web y migración desde AsyncStorage
│   │   └── privateReportStorage.ts # Datos privados de reportes en SecureStore móvil
│   ├── context/
│   │   └── AppContext.tsx      # Estado global, sincronización offline, avales y roles
│   ├── components/
│   │   ├── Header.tsx                  # Barra superior con logo, barrio y pill online/offline
│   │   ├── OfflineSyncBanner.tsx       # Alerta de conectividad y botón de sincronización
│   │   ├── EmergencyAlertBanner.tsx    # Banner rojo parpadeante de emergencia activa
│   │   ├── TutorialModal.tsx           # Modal de 3 claves cívicas (RF-04)
│   │   ├── NeighborhoodModal.tsx       # Selector de barrios de Cusco (RF-01)
│   │   ├── PublishFavorModal.tsx       # Modal de publicación en 3 pasos (RF-13)
│   │   ├── PublishServiceModal.tsx     # Publicar oficio en el directorio (RF-07)
│   │   ├── ReportVulnerabilityModal.tsx# Reporte de auxilio con consentimiento (RF-17)
│   │   ├── ManageEmergencyModal.tsx    # Control del modo emergencia para coordinadores (RF-15)
│   │   ├── ContactActionModal.tsx      # Contacto protegido entre vecinos (RF-14)
│   │   └── ContentReportModal.tsx      # Denuncia y moderación de contenido (RF-21)
│   └── screens/
│       ├── OnboardingScreen.tsx        # Registro inicial vecinal
│       ├── DirectoryScreen.tsx         # Directorio de oficios y red de emergencia
│       ├── FavoresScreen.tsx           # Muro colaborativo de favores (Ayni)
│       ├── EmergencyDashboardScreen.tsx# Tablero de emergencias y recursos críticos
│       └── ProfileScreen.tsx           # Perfil geográfico, roles, cola offline y moderación
```

### Inicio de sesión social

La app incluye acceso con Google mediante Supabase OAuth (PKCE). Requiere habilitar el proveedor Google y registrar los retornos móvil/web. Consulta [la guía de configuración](docs/social-auth.md). En móvil usa una development build con el esquema `ayllu`.

### Ubicación nacional

El registro y el perfil incluyen departamento, provincia y distrito de todo el catálogo Ubigeos Perú, con barrio/sector editable. El catálogo funciona offline; para guardar en Supabase aplica las dos migraciones nuevas descritas en [la guía de ubigeos](docs/ubigeos-peru.md).
