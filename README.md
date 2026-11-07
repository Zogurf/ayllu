# Ayllu - Resiliencia Comunitaria Local en React Native 🏔️🤝

Aplicación móvil desarrollada en **React Native con Expo y TypeScript**, basada en las plantillas y especificaciones de diseño **Stitch ("Civic Horizon")**. La plataforma fortalece la resiliencia, la confianza y la autogestión de las comunidades locales a través de dos modos operativos: **Modo Cotidiano** y **Modo Emergencia**, con funcionamiento resiliente **100% offline** y almacenamiento local seguro.

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

---

## 🏛️ Módulos y Cobertura de Requerimientos

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
- **RF-22 (Consulta offline):** Almacenamiento local en `AsyncStorage` de todo el directorio, contactos de apoyo, favores y recursos. Funciona completamente sin internet y muestra la última fecha de sincronización.
- **RF-23 (Guardado local de reportes):** Si el usuario crea un reporte o publicación sin conexión, se guarda localmente en el dispositivo y se encola en `syncQueue` con estado `PENDIENTE`.
- **RF-24 (Sincronización y prevención de duplicados):** Al restablecerse la conexión (o presionar *"Sincronizar ahora"*), la cola se procesa evitando duplicados mediante identificadores únicos.
- **RF-25 (Límite de la coordinación offline):** Mensaje claro y visible en cada reporte encolado: *"Guardado únicamente en tu dispositivo. Este reporte NO ha llegado a los coordinadores hasta que se sincronice con internet."*

---

## 🎨 Requerimientos No Funcionales y Diseño (Civic Horizon)
- **RNF-01 (Compatibilidad móvil):** Compatible con Android 8.0+ e iOS 14.0+ y Web.
- **RNF-02 (Almacenamiento local):** Implementado con `@react-native-async-storage/async-storage`.
- **RNF-03 (Sincronización segura):** Cola de sincronización idempotente sin pérdida de información.
- **RNF-04 (Claridad de conexión):** Pill interactivo en el header y barra de sincronización que indica en tiempo real si el dispositivo está en línea, fuera de línea o con elementos en cola.
- **RNF-05 (Publicación en 3 pasos):** Modal con barra de progreso tipo stepper ágil.
- **RNF-06 (Accesibilidad vecinal):** Alto contraste (Cobalto `#2563EB`, Pizarra `#0F172A`, Terracota `#EA580C`, Rojo `#DC2626`), tipografía legible y lenguaje directo.
- **RNF-07 (Tolerancia a errores):** Confirmaciones antes de enviar reportes críticos y validación de campos obligatorios.
- **RNF-08 (Rendimiento):** Renderizado en memoria local sin esperas de red (< 200 ms).
- **RNF-09 (Disponibilidad offline):** Directorio y contactos accesibles en cualquier circunstancia.
- **RNF-10 / RNF-11 / RNF-12 (Privacidad y consentimientos):** Direcciones exactas no expuestas públicamente, GPS estrictamente opcional.
- **RNF-13 (Seguridad de roles):** Conmutador interactivo de roles en la pestaña *"Mi Barrio"* para alternar entre **Vecino**, **Proveedor**, **Coordinador Comunitario** y **Administrador**.
- **RNF-14 (Integridad de avales):** Validación estricta en el Context para evitar avales duplicados de un mismo usuario.

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
├── package.json                # Dependencias Expo SDK 58, React Native, AsyncStorage
├── src/
│   ├── AppNavigator.tsx        # Navegador principal con tabs inferiores y header Stitch
│   ├── theme/
│   │   └── colors.ts           # Tokens del sistema de diseño Civic Horizon
│   ├── types/
│   │   └── index.ts            # Interfaces TypeScript (Roles, Servicios, Favores, Reportes)
│   ├── storage/
│   │   ├── mockData.ts         # Datos semilla realistas de la comunidad andina (Cusco)
│   │   └── offlineStorage.ts   # Manejador de persistencia en AsyncStorage
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
