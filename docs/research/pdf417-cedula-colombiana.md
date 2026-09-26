# Viabilidad de leer el PDF417 de la cédula colombiana desde el navegador

- **Ticket**: [#2](https://github.com/Axus00/visit-pass/issues/2) (mapa [#1](https://github.com/Axus00/visit-pass/issues/1))
- **Fecha**: 2026-09-26
- **Pregunta**: ¿puede el Portero escanear con la cámara del teléfono, desde la web app, el PDF417 del reverso de la cédula del Visitante y obtener nombre y número de documento para autollenar el Registro manual?

## Veredicto: viable con condiciones

1. **Cédula amarilla con hologramas (2000-2020, aún vigente)**: viable. El PDF417 trae nombre, apellidos, número de documento, sexo, fecha de nacimiento y RH en texto plano (Latin-1, sin cifrado ni firma) y se decodifica en el navegador con `barcode-detector` (ZXing-C++ compilado a WebAssembly).
2. **Cédula digital / policarbonato (desde 2020-12-01)**: **no viable por PDF417, porque no lo tiene**. Su reverso trae un QR cifrado (solo legible por herramientas de la Registraduría) y una MRZ ICAO 9303 TD1 de tres líneas. Para esta cédula la única lectura óptica abierta es OCR de la MRZ, que queda fuera del alcance de este ticket y merece su propia investigación.
3. Por lo tanto el escaneo es un **acelerador opcional** del Registro manual, nunca el único camino: el formulario debe seguir aceptando digitación, y la UI debe explicar al Portero que la cédula digital no se escanea (todavía).
4. Condiciones técnicas: HTTPS, cámara trasera a 1280×720 o más, linterna cuando el navegador la exponga, WASM autohospedado, parseo por tokens (no offsets fijos) y descarte inmediato del resto del payload (RH, huella, DIVIPOL).
5. Condiciones legales: tratamiento local, sin guardar imagen ni payload crudo, conservando solo nombre y documento bajo el aviso de privacidad de la Unidad residencial (Ley 1581 de 2012, Decreto 1377 de 2013, guía y decisiones recientes de la SIC).

## 1. Qué hay en el reverso de cada versión de la cédula

### 1.1 Cédula amarilla con hologramas (2000-2020)

Producción detenida en septiembre de 2022 pero sigue siendo válida ([Wikipedia: Colombian identity card](https://en.wikipedia.org/wiki/Colombian_identity_card)). En la práctica es la que porta la mayoría de Visitantes adultos hoy.

Características del PDF417, coincidentes en al menos seis decodificadores de código abierto que rebanan los bytes directamente:

- ~531 bytes en modo byte (25 filas × 21 columnas de datos, corrección de errores nivel 5), codificación Latin-1 (ISO-8859-1), campos de ancho fijo rellenados a la derecha con `0x00`.
- Marcador literal `PubDSK_1` alrededor del byte 24; luego los datos personales y una cola binaria opaca de ~350 bytes (presuntamente minucias dactilares). **No está cifrado ni firmado.**
- Existe una sub-variante más antigua sin el token `PubDSK_1` ni el campo de tarjeta dactilar, con offsets corridos. Por eso los decodificadores maduros parten el payload por corridas de `NUL` y leen tokens en lugar de usar offsets absolutos.

Layout de referencia (offsets 0-based, fin exclusivo, tomados de [Eitol/colombian-cedula-reader](https://github.com/Eitol/colombian-cedula-reader) `src/barcode/colombian_pdf417_decoder.py` y [AndyRuix1/colombia-id-parser](https://github.com/AndyRuix1/colombia-id-parser) `src/pdf417/parser.ts`):

| Bytes     | Campo                                                                      | Uso en Visit Pass                          |
| --------- | -------------------------------------------------------------------------- | ------------------------------------------ |
| [2,10)    | Código AFIS                                                                | Descartar                                  |
| [40,48)   | Tarjeta dactilar                                                           | Descartar                                  |
| [48,58)   | Número de documento (10 dígitos con ceros a la izquierda)                  | **Documento del Visitante** (quitar ceros) |
| [58,80)   | Primer apellido                                                            | **Nombre del Visitante**                   |
| [81,104)  | Segundo apellido                                                           | **Nombre del Visitante**                   |
| [104,127) | Primer nombre                                                              | **Nombre del Visitante**                   |
| [127,150) | Segundo nombre (puede estar vacío; si termina en `+`/`-` es el RH corrido) | **Nombre del Visitante**                   |
| [151,152) | Sexo `M`/`F`                                                               | Descartar                                  |
| [152,160) | Fecha de nacimiento `YYYYMMDD`                                             | Descartar                                  |
| [160,162) | Departamento (código DIVIPOL de la Registraduría, no DANE)                 | Descartar                                  |
| [162,165) | Municipio (DIVIPOL)                                                        | Descartar                                  |
| [166,168) | Tipo de sangre (RH)                                                        | **Descartar: dato sensible de salud**      |

Payload de muestra (de `php/tests/testdata/best_quality_1.txt` del repo de Eitol): `0326497872 … PubDSK_1 … 366525  1150940755VALENCIA  BENITEZ  DAYFENIX  0F19910729310190A+`.

Otras implementaciones que confirman el layout: [Yeison07/cedula-colombiana-pdf417-decoder](https://github.com/Yeison07/cedula-colombiana-pdf417-decoder), [fgardila/LectorCedulaColombia_Zxing_Android](https://github.com/fgardila/LectorCedulaColombia_Zxing_Android), gists [pmogollons](https://gist.github.com/pmogollons/302c9e029122068ebd4d2acfd9bc1fd6) y [CarlosBean](https://gist.github.com/CarlosBean/d94fb69d3b47aa6c7885c9be8d529c22), y la FAQ comercial de [Viafirma](https://www.viafirma.com/en/faqs/scan-pdf417-to-fill-in-your-forms/).

Nota práctica: los lectores USB tipo teclado (HID) descartan los `NUL`, lo que rompe los offsets; al decodificar con cámara en modo byte se recibe el `Uint8Array` completo (`ReadResult.bytes` en zxing-wasm), así que ese problema no aplica aquí.

**Confianza**: alta para el layout de la variante con `PubDSK_1`; media para la sub-variante antigua. Las páginas de la Registraduría devolvieron 403 durante la investigación, así que no hay una especificación oficial pública que citar; la fuente de verdad es la convergencia de decodificadores independientes y muestras reales.

### 1.2 Cédula digital / policarbonato (desde 2020-12-01)

- **No trae PDF417.** El reverso tiene un QR cifrado con datos biométricos que solo lee el software de la Registraduría, y una MRZ ICAO 9303 TD1 (tres líneas OCR-B con número de documento y dígito de control, fecha de nacimiento, sexo, vencimiento y nombres). Fuentes: [La República: la cédula digital contará con un código QR cifrado](https://www.larepublica.co/economia/la-cedula-digital-contara-con-un-codigo-qr-cifrado-para-garantizar-la-seguridad-de-los-datos-3096280), [Asuntos Legales: 46 preguntas sobre la cédula digital](https://www.asuntoslegales.com.co/actualidad/conozca-46-preguntas-que-responden-a-todas-sus-dudas-sobre-la-cedula-digital-3096006), [ASOSEC: seguridad de la cédula policarbonato](https://asosec.co/conozca-la-seguridad-de-la-cedula-policarbonato-y-de-ciudadania-digital/), [informe MOE sobre la implementación de la cédula digital](https://www.moe.org.co/wp-content/uploads/2023/05/09052023_La-implementacio%CC%81n-de-la-ce%CC%81dula-digital-en-Colombia.pdf).
- La comunidad no ha logrado descifrar el QR. En [Eitol/colombian-cedula-reader issue #1](https://github.com/Eitol/colombian-cedula-reader/issues/1) el autor concluye: "no se pudo descifrar esos QRs… arrojaban información encriptada. Para las cédulas nuevas lo que pude hacer fue leer el mrz". Su lector de MRZ: [Eitol/colombian_cedula_mrz_reader](https://github.com/Eitol/colombian_cedula_mrz_reader). Los integradores comerciales reportan lo mismo ([LobbyPMS soporte](https://soporte.lobbypms.com/hc/es/articles/38418438912147), [hilo en Laneros](https://www.laneros.com/temas/lectura-de-nueva-cedula-digital-en-colombia.253335/)).
- Implicación: la cobertura del escaneo PDF417 irá **bajando con los años** a medida que se renueven documentos. El diseño no debe depender de él.

### 1.3 Otros documentos

- Tarjeta de identidad azul (2014+): misma familia de PDF417 (confianza media; sin muestras verificadas en esta investigación).
- Cédula de extranjería: código de barras distinto, sin decodificador público (Resolución 2570 de 2019 de Migración Colombia). Fuera de alcance.

## 2. Librerías de decodificación en navegador

### 2.1 Matriz de soporte del `BarcodeDetector` nativo

Fuentes: [MDN BarcodeDetector](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector), [browser-compat-data](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/BarcodeDetector.json), [caniuse](https://caniuse.com/mdn-api_barcodedetector), [Chrome: Shape Detection](https://developer.chrome.com/docs/capabilities/shape-detection), [WebKit bug 281848](https://bugs.webkit.org/show_bug.cgi?id=281848).

| Navegador               | Soporte nativo                                                    | PDF417       |
| ----------------------- | ----------------------------------------------------------------- | ------------ |
| Chrome / Edge Android   | Sí desde 83 (requiere Google Play Services)                       | Sí (ML Kit)  |
| Chrome macOS / ChromeOS | Sí desde 88                                                       | Sí           |
| Chrome Windows / Linux  | El constructor existe pero `getSupportedFormats()` → `[]`         | No           |
| Safari iOS / macOS      | 17+ detrás de bandera; roto en iOS 18-26 (bug 281848, estado NEW) | No confiable |
| Firefox                 | No                                                                | No           |
| Samsung Internet        | Sigue a Chromium Android                                          | Sí           |

MDN lo marca como "Limited availability"; caniuse reporta 77,88 % global contando soporte parcial. Solo funciona en contexto seguro (HTTPS). Regla: **detectar por funcionalidad con `await BarcodeDetector.getSupportedFormats()` y exigir que incluya `"pdf417"`**; no basta con `"BarcodeDetector" in window`.

### 2.2 Opciones evaluadas

| Opción                                                                                                                                             | Estado (2026-09)                                                                 | PDF417                                                                                                                                                                                                          | Costo               | Veredicto                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------- |
| [`barcode-detector`](https://github.com/Sec-ant/barcode-detector) (Sec-ant)                                                                        | 3.2.2, 2026-08-16; ponyfill/polyfill sobre `zxing-wasm` 3.1.3; MIT               | `pdf417`, `compact_pdf417`, `micro_pdf417`                                                                                                                                                                      | Gratis              | **Recomendada**                                                                                   |
| [`zxing-wasm`](https://github.com/Sec-ant/zxing-wasm)                                                                                              | 3.1.4, 2026-09-10; ZXing-C++ 3.1.1 (2026-07-29, con correcciones de PDF417); MIT | Lectura y escritura                                                                                                                                                                                             | Gratis              | Base de la anterior; usar directo si se quiere control fino de `readBarcodes`                     |
| [`@zxing/library`](https://github.com/zxing-js/library) 0.23.0 (2026-04) / [`@zxing/browser`](https://github.com/zxing-js/browser) 0.2.1 (2026-07) | Modo mantenimiento declarado; JS puro                                            | Sí pero con issues abiertos de precisión (#315, #527 `ChecksumException`) y requiere BigInt                                                                                                                     | Gratis              | Evitar para PDF417                                                                                |
| [`html5-qrcode`](https://github.com/mebjas/html5-qrcode) 2.3.8 (2023-04)                                                                           | Sin releases desde 2023; usa zxing-js por debajo                                 | Hereda los problemas anteriores                                                                                                                                                                                 | Gratis              | Evitar                                                                                            |
| `quagga2`                                                                                                                                          | Solo 1D                                                                          | No                                                                                                                                                                                                              | Gratis              | No aplica                                                                                         |
| [Dynamsoft Barcode Reader JS](https://www.dynamsoft.com/barcode-reader/sdk-javascript/) 11.6                                                       | Bundle npm ~49 MB desempaquetado; licencia de prueba de 24 h renovable           | Sí; benchmark propio sobre 78 imágenes difíciles: Dynamsoft 95,45 %, ML Kit 61,36 %, ZXing-C++ 52,27 % ([fuente del vendedor](https://www.dynamsoft.com/codepool/pdf417-reading-benchmark-and-comparison.html)) | Desde USD 1.499/año | Plan B si el piloto falla por calidad de impresión o luz                                          |
| [Scandit Web SDK / ID Capture](https://www.scandit.com/)                                                                                           | Cotización comercial                                                             | Sí; ID Capture tiene soporte explícito de la cédula colombiana (`ColombiaIdBarcodeResult`) con licencia aparte                                                                                                  | Contactar ventas    | Sobredimensionado para el volumen de una portería                                                 |
| [STRICH](https://strich.io/)                                                                                                                       | SaaS                                                                             | Sí                                                                                                                                                                                                              | Desde EUR 99/mes    | Sin ventaja clara sobre el plan B                                                                 |
| [Microblink BlinkID in-browser](https://microblink.com/)                                                                                           | Requiere licencia con conexión a internet                                        | Cubre Colombia (incluye MRZ de la digital)                                                                                                                                                                      | Comercial           | Única opción que resolvería también la cédula digital; evaluar solo si la MRZ se vuelve requisito |

Datos de versiones y fechas verificados contra el registro npm el 2026-09-26 (`npm view <paquete> version time`).

### 2.3 Recomendación: `barcode-detector` como ponyfill

- Importar el **ponyfill** (`barcode-detector/ponyfill`) y decidir en tiempo de ejecución: si el nativo reporta `pdf417` en `getSupportedFormats()` (Chrome Android), usarlo; si no, usar el ponyfill WASM. No usar el polyfill global, porque cede al nativo aunque este no soporte PDF417.
- Construir con `formats: ["pdf417"]` únicamente: reduce falsos positivos y tiempo por cuadro.
- Autohospedar el `.wasm` (~1,04 MiB en el build `reader`) con `prepareZXingModule({ overrides: { locateFile } })` en lugar del CDN jsDelivr por defecto: la portería puede tener red pobre y no queremos una dependencia externa en el arranque del escáner. Precargar el módulo al abrir la pantalla de Registro manual, no al pulsar "Escanear".
- Leer `ReadResult.bytes` (no `text`) y decodificar como Latin-1 por tokens separados por `NUL`; nunca por offsets absolutos, por la sub-variante antigua.
- Extraer solo número de documento y nombre completo; descartar el resto del `Uint8Array` en el mismo tick.

## 3. Cámara y rendimiento esperado

### 3.1 Restricciones de cámara

- `getUserMedia` requiere contexto seguro y, en iOS Safari, un gesto del usuario para arrancar y un `<video muted playsinline>`.
- Pedir `facingMode: { ideal: "environment" }` y `width: { ideal: 1920 }, height: { ideal: 1080 }` con degradación a 1280×720 (justificación en 3.2). Cada codeword PDF417 ocupa 17 módulos y la altura de fila es al menos 3× el ancho de módulo, así que la resolución horizontal es la que manda ([Wikipedia PDF417](https://en.wikipedia.org/wiki/PDF417)).
- Linterna, zoom y enfoque: comprobar `track.getCapabilities()` antes de `applyConstraints({ advanced: [{ torch: true }] })`. Chrome Android los expone; Safari 17+ expone zoom y linterna solo en versiones recientes; Firefox ninguno ([MDN applyConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/applyConstraints)). Mostrar el botón de linterna solo cuando exista.
- Tomar cuadros con `requestVideoFrameCallback` cuando exista (Chrome, Safari) y `requestAnimationFrame` como respaldo; decodificar como máximo un cuadro a la vez y saltar los que lleguen mientras el WASM trabaja.

### 3.2 Resolución: por qué 1080p es el valor por defecto

- Google ML Kit (el motor detrás del `BarcodeDetector` de Chrome Android) exige que "the smallest meaningful unit of the barcode should be at least 2 pixels wide, and for 2-dimensional codes, 2 pixels tall", advierte que "a PDF417 code can have up to 34 17-unit wide 'words' in a single row, which would ideally be at least 1156 pixels wide" y recomienda "1280x720 or 1920x1080" ([ML Kit barcode scanning](https://developers.google.com/ml-kit/vision/barcode-scanning/android)).
- Aritmética derivada para la cédula (21 columnas de datos): (21 + 4) codewords × 17 módulos + 1 ≈ 426 módulos de ancho. Si el símbolo mide ~75 mm, el módulo mide ~0,18 mm. Con el mínimo de 2-2,5 px/módulo se necesitan 850-1.065 px a lo ancho del símbolo. Si la tarjeta ocupa el 80 % de un cuadro apaisado, 720p entrega ~1.024 px (≈2,4 px/módulo, al límite) y 1080p entrega ~1.536 px (≈3,6 px/módulo, cómodo). Confianza media: el ancho físico del símbolo no está publicado oficialmente.
- El mantenedor de zxing-cpp confirma la misma regla: "At least 800x600 should be considered minimal if your code only covers 1/3 of the image" y "If you have enough resolution, I would aim at 1000pixel width images" ([issue #97](https://github.com/zxing-cpp/zxing-cpp/issues/97)); en [issue #145](https://github.com/zxing-cpp/zxing-cpp/issues/145): "the main issue in your example is lack of resolution", y el detector de PDF417 "performs individual horizontal line-scanning operations", por lo que la inclinación lo castiga.
- Dynamsoft, para licencias de conducir (PDF417 de densidad comparable): "Some densely encoded driver's licenses ... require 1080P. If CapturedResultReceiver returns zero items at 720P, switch to RESOLUTION_1080P" ([fuente](https://www.dynamsoft.com/codepool/how-to-recognize-driver-license-on-android.html)). Scandit usa Full HD por defecto en sus SDK ([camera settings](https://docs.scandit.com/data-capture-sdk/cordova/core/api/camera-settings.html)).
- Encuadre apaisado: el símbolo es ancho y bajo, así que la tarjeta debe ir a lo largo del eje largo del cuadro.

### 3.3 Velocidad y tasa de lectura

Números primarios (todos de escritorio; en un Android de gama baja hay que esperar 3-6× más lento, extrapolación propia no medida):

- zxing-cpp WASM bien compilado decodifica cuadros de cámara en ~24-28 ms de media; "Changing video size to 1600x800 increases average processing time to 56ms"; "Fast means disabling the tryHarder, tryInvert, tryDownscale and tryRotate flags" ([discussion #511](https://github.com/zxing-cpp/zxing-cpp/discussions/511)).
- Benchmark de Dynamsoft sobre 7.894 imágenes (BarBeR), Chrome en i5-13400F: zxing-wasm mediana 74 ms, media 122 ms, p95 409 ms; en el subconjunto PDF417 zxing-wasm leyó 32/87 frente a 46/87 de DBR ([fuente](https://www.dynamsoft.com/codepool/benchmark-barcode-reading-javascript-zxing-wasm-dynamsoft-barcode-reader.html)).
- Benchmark de Dynamsoft de 78 imágenes difíciles de PDF417: ZXing-C++ 127 ms y 52,27 % de lectura; ML Kit 304 ms y 61,36 %; Dynamsoft 587 ms y 95,45 % ([fuente](https://www.dynamsoft.com/codepool/pdf417-reading-benchmark-and-comparison.html)). Es un benchmark del vendedor con imágenes estáticas dañadas; en vídeo continuo, con varios intentos por segundo, la tasa efectiva es mayor. Marca el umbral en el que entraría el plan B comercial.
- `tryDownscale` solo aporta cuando el módulo supera 4-8 px y "does nothing for images that are less than 500px wide" ([discussion #394](https://github.com/zxing-cpp/zxing-cpp/discussions/394), [#974](https://github.com/zxing-cpp/zxing-cpp/discussions/974)).

Presupuesto de diseño: a 1080p en un teléfono de gama baja, planear 3-8 intentos de decodificación por segundo, no 30. Con la tarjeta quieta, la lectura debería llegar en 1-3 s; esto es lo que el plan de prueba debe medir.

### 3.4 Luz, enfoque y reflejos

- ML Kit señala el enfoque como la causa principal de fallo: "Poor image focus can impact scanning accuracy". Los teléfonos baratos suelen tener autoenfoque lento: pedir `focusMode: "continuous"` cuando `getCapabilities()` lo exponga y sugerir apoyar la cédula en el mostrador.
- Más luz implica exposición más corta y menos desenfoque por movimiento; por eso la linterna importa. Pero las cédulas amarillas plastificadas u hologramadas reflejan la linterna y el brillo especular tapa filas del PDF417. La instrucción en pantalla debe pedir inclinar la tarjeta y la linterna debe ser opcional, no automática.
- Bucle de captura: `requestVideoFrameCallback` "allows web authors to register a callback that runs in the rendering steps when a new video frame is sent to the compositor" y está en Chrome 83+, Safari 15.4+ y Firefox 132+ ([web.dev](https://web.dev/articles/requestvideoframecallback-rvfc)). Decodificar en un Worker, con un solo cuadro en vuelo, recortando la región de interés antes de transferirla (un cuadro RGBA 1080p pesa ~8 MB).

## 4. Nota legal: lectura local, sin almacenar imagen

Marco normativo, con citas verificadas contra el texto oficial:

**Ley Estatutaria 1581 de 2012** ([texto oficial](http://www.secretariasenado.gov.co/senado/basedoc/ley_1581_2012.html))

- Art. 4 b) Finalidad: "El Tratamiento debe obedecer a una finalidad legítima de acuerdo con la Constitución y la Ley, la cual debe ser informada al Titular".
- Art. 4 c) Libertad: "El Tratamiento sólo puede ejercerse con el consentimiento, previo, expreso e informado del Titular".
- Art. 4 g) Seguridad: la información "deberá manejarse con las medidas técnicas, humanas y administrativas necesarias para otorgar seguridad".
- Art. 5 Datos sensibles: incluye "los datos relativos a la salud, a la vida sexual y los datos biométricos". **El RH del PDF417 es dato de salud; el código AFIS y la cola dactilar son biométricos.**
- Art. 6: "Se prohíbe el Tratamiento de datos sensibles, excepto cuando: a) El Titular haya dado su autorización explícita".
- Art. 9: "en el Tratamiento se requiere la autorización previa e informada del Titular, la cual deberá ser obtenida por cualquier medio que pueda ser objeto de consulta posterior".
- Art. 12 (deber de informar) y art. 17 (deberes del responsable: conservar la autorización, seguridad, informar incidentes a la SIC, manual interno de políticas).

**Decreto 1377 de 2013** ([texto oficial](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=53646))

- Art. 4 Recolección: "deberá limitarse a aquellos datos personales que son pertinentes y adecuados para la finalidad para la cual son recolectados". Es la base de la minimización.
- Art. 6: al recoger datos sensibles hay que informar "que por tratarse de datos sensibles no está obligado a autorizar su Tratamiento".
- Art. 7: la autorización puede darse "(i) por escrito, (ii) de forma oral o (iii) mediante conductas inequívocas del titular que permitan concluir de forma razonable que otorgó la autorización. En ningún caso el silencio podrá asimilarse a una conducta inequívoca".
- Art. 11: los datos se conservan "durante el tiempo que sea razonable y necesario, de acuerdo con las finalidades que justificaron el tratamiento"; cumplida la finalidad, "deberán proceder a la supresión".
- Arts. 14-15: aviso de privacidad "a más tardar al momento de la recolección" con nombre y contacto del responsable, "el Tratamiento al cual serán sometidos los datos y la finalidad del mismo", derechos del titular y cómo consultar la política; si se recogen datos sensibles, "deberá señalar expresamente el carácter facultativo de la respuesta".

**Prohibición de retener la cédula**: Decreto 2150 de 1995 art. 18, modificado por Ley 962 de 2005 art. 23 ([texto](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=17004)): "Ninguna autoridad podrá retener la cédula de ciudadanía ... Si se exige la identificación de una persona, ella cumplirá la obligación mediante la exhibición del correspondiente documento. Queda prohibido retenerlos para ingresar a cualquier dependencia pública o privada." El escaneo con cámara es una exhibición, no una retención. (El Decreto Ley 019 de 2012 no trae regla de porterías; no citarlo para esto.)

**Decisiones y guías de la SIC sobre propiedad horizontal**

- [Guía para el tratamiento de datos personales en la propiedad horizontal](<https://www.sic.gov.co/sites/default/files/files/Publicaciones/Guia_prop_horizontal_NOV12_OK%20(1).pdf>) (2020): la copropiedad es Responsable; fotos, videograbaciones, huellas y datos de salud requieren trato de dato sensible; avisos en porterías, ascensores y garajes; "Elimine los Datos Personales tan pronto cumplan la finalidad para la cual fueron recolectados"; las empresas de vigilancia son Encargados. Confianza media: el PDF no pudo extraerse; se cita vía [Holland & Knight](https://www.hklaw.com/en/insights/publications/2020/12/colombia-delegation-for-protection-of-personal-data-publishes-guide) y [copropiedades.com.co](https://copropiedades.com.co/guia-para-el-tratamiento-de-datos-personales-en-la-propiedad-horizontal/).
- [Resolución 60460 de 2017](https://www.sic.gov.co/boletin-juridico-febrero-2018/la-superintendencia-de-industria-y-comercio-impartio-orden-administrativa-relacionada-con-el-tratamiento-de-datos-personales-en-edificios-sometidos-a-propiedad-horizontal): el régimen aplica a los datos recogidos de visitantes para el ingreso y "las fotografías o capturas de imágenes que de ellos se obtienen corresponden a datos de carácter privado".
- [Sanción de 2019 a un edificio](https://www.sic.gov.co/Superindustria-exige-a-edificios-y-conjuntos-residenciales-cumplir-con-normas-de-proteccion-de-datos-personales) (COP 78.124.200) por "recolectar sin autorización de las personas sus datos como lo son las imágenes de fotos y las grabaciones de videovigilancia", sin medidas de seguridad ni política, y sin informar a los visitantes sus derechos.
- Concepto SIC 17-297406 de 2017 (vía [Ámbito Jurídico](https://www.ambitojuridico.com/noticias/mercantil/mercantil-propiedad-intelectual-y-arbitraje/fotografia-de-la-cedula-de)): la cédula "incorpora datos personales de naturaleza pública, privada (foto), semiprivada y sensible"; fotografiarla es tratar dato privado y exige autorización previa y expresa.
- [Resolución 52185 de 2025](https://sedeelectronica.sic.gov.co/comunicado/la-superintendencia-de-industria-y-comercio-ordena-un-conjunto-residencial-habilitar-mecanismos-de-ingreso-que-no-impliquen-el-tratamiento) (28 de agosto de 2025): es "obligatorio obtener la autorización previa, expresa, informada y cualificada" para datos sensibles, "no se puede condicionar una actividad al suministro de datos sensibles" y el conjunto debió "habilitar mecanismos alternativos de autenticación o ingreso, de carácter no invasivo".

**Consecuencias de diseño para Visit Pass**

1. **Extraer solo nombre y número de documento y desechar el resto en memoria.** El PDF417 contiene un dato de salud (RH) y datos biométricos (AFIS, cola dactilar); persistirlos activaría el art. 6 de la Ley 1581 y el art. 6 del Decreto 1377. Nunca guardar ni enviar el payload crudo ni el cuadro de vídeo; el esquema del backend no debe tener un campo para el código.
2. **La lectura es local.** El WASM corre en el teléfono del Portero y ningún cuadro sale del dispositivo, con lo que no se crea la "fotografía de la cédula" que la SIC ha tratado como dato privado (Res. 60460/2017, sanción 2019, Concepto 17-297406). Esto debe constar en el aviso y en la política de tratamiento de la Unidad residencial.
3. **El escaneo no es condición de ingreso.** El Registro manual digitado sigue siendo la vía principal y el Visitante puede negarse al escaneo (coherente con la Res. 52185/2025 sobre mecanismos alternativos).
4. **Minimización.** El Registro manual ya define el conjunto de datos (nombre, documento, Apartamento destino, tipo de visita, placa opcional). El escaneo no debe ampliarlo con sexo, fecha de nacimiento ni lugar de expedición (Decreto 1377 art. 4).
5. **Aviso de privacidad visible en portería** que identifique a la Unidad residencial como responsable, la finalidad (control de acceso y Reporte de turno), los derechos del titular y dónde está la política completa (Decreto 1377 arts. 14-15). La autorización puede darse por conducta inequívoca al presentar el documento tras ver el aviso (art. 7), pero la Administración debería preferir un texto explícito.
6. **Retención.** Definir en el producto un plazo de conservación de las Visitas a cargo del Administrador, con purga posterior y procedimiento documentado de conservación y supresión (Decreto 1377 art. 11).
7. **No retener la cédula ni fotografiarla** (Decreto 2150 art. 18 / Ley 962 art. 23; Concepto 17-297406). El escaneo local sustituye precisamente esa práctica.
8. **Seguridad y roles** (Ley 1581 arts. 4 g y 17): acceso por Rol, cifrado en tránsito, ruta de notificación de incidentes a la SIC; la Unidad residencial es Responsable y el proveedor de la app, Encargado, lo que exige un contrato de tratamiento.

## 5. Plan de prueba mínimo

Objetivo: confirmar que el escaneo autollena nombre y documento en menos de 3 s en el peor dispositivo razonable, y que el sistema nunca conserva más de lo permitido.

**Preparación**

- Prototipo (skill `prototype`) de una página bajo `/_authenticated/` que abra la cámara, use `barcode-detector/ponyfill` con `formats: ["pdf417"]` y muestre los campos extraídos. Sin backend.
- Muestras: al menos 10 cédulas amarillas reales (con y sin `PubDSK_1`, plastificadas y desgastadas), 2 tarjetas de identidad azules, 2 cédulas digitales (para confirmar el "no soportado" y su mensaje), y las muestras de texto del repo de Eitol como fixtures de test unitario del parser.
- Dispositivos: un Android de gama baja (≤ USD 150, 2-3 GB RAM, Chrome), un Android de gama media, un iPhone con Safari (iOS 17+) y un portátil Windows con Chrome (para verificar la ruta WASM cuando el nativo reporta `[]`).

**Casos**

| #   | Caso                                                                  | Criterio de aceptación                                                                                                    |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | Parser unitario con fixtures de Eitol (ambas variantes)               | Documento sin ceros a la izquierda y nombre completo correctos; RH, sexo, fecha y DIVIPOL no aparecen en la salida        |
| 2   | Cédula amarilla, luz de portería nocturna (~50-100 lux), sin linterna | Lectura en ≤ 3 s en el Android de gama baja en ≥ 8 de 10 intentos                                                         |
| 3   | Mismo caso con linterna                                               | Lectura en ≤ 2 s; sin bloqueo por reflejo tras inclinar la tarjeta                                                        |
| 4   | Cédula plastificada / desgastada                                      | Lectura en ≤ 5 s con `tryHarder` activado tras 2 s                                                                        |
| 5   | Cédula digital                                                        | El escáner no lee nada y a los 5 s muestra "Cédula digital: digite los datos"; el formulario sigue editable               |
| 6   | Chrome Windows y Firefox Android                                      | Se usa la ruta WASM (verificar en consola) y el caso 2 se cumple                                                          |
| 7   | Safari iOS                                                            | Cámara arranca con gesto, ruta WASM, caso 2 se cumple; botón de linterna oculto si `getCapabilities()` no la expone       |
| 8   | Red sin conexión tras cargar la página                                | El `.wasm` autohospedado ya está en caché y el escaneo funciona                                                           |
| 9   | Privacidad                                                            | Inspección de red: ningún cuadro ni payload sale del dispositivo; el estado de la app solo guarda `{ nombre, documento }` |
| 10  | Rendimiento                                                           | Tiempo medio por cuadro medido con `performance.now()` en el Android de gama baja ≤ 150 ms; sin caída de la UI            |

**Decisión al final del piloto**

- Si los casos 2-4 pasan: implementar con `barcode-detector`.
- Si fallan por calidad de imagen y no por resolución/luz corregibles, evaluar Dynamsoft con su licencia de prueba sobre las mismas muestras antes de comprometer el gasto anual.
- Abrir un ticket de investigación aparte para OCR de la MRZ de la cédula digital, con `tesseract.js` (entrenado en OCR-B) frente a BlinkID como candidatos.

## Fuentes

Layout del PDF417 y cédula digital

- https://github.com/Eitol/colombian-cedula-reader (README, `src/barcode/colombian_pdf417_decoder.py`, `php/tests/testdata/best_quality_1.txt`, issue #1)
- https://github.com/Eitol/colombian_cedula_mrz_reader
- https://github.com/AndyRuix1/colombia-id-parser (`src/pdf417/parser.ts`)
- https://github.com/Yeison07/cedula-colombiana-pdf417-decoder
- https://github.com/fgardila/LectorCedulaColombia_Zxing_Android
- https://gist.github.com/pmogollons/302c9e029122068ebd4d2acfd9bc1fd6
- https://gist.github.com/CarlosBean/d94fb69d3b47aa6c7885c9be8d529c22
- https://www.viafirma.com/en/faqs/scan-pdf417-to-fill-in-your-forms/
- https://en.wikipedia.org/wiki/Colombian_identity_card
- https://asosec.co/conozca-la-seguridad-de-la-cedula-policarbonato-y-de-ciudadania-digital/
- https://www.larepublica.co/economia/la-cedula-digital-contara-con-un-codigo-qr-cifrado-para-garantizar-la-seguridad-de-los-datos-3096280
- https://www.asuntoslegales.com.co/actualidad/conozca-46-preguntas-que-responden-a-todas-sus-dudas-sobre-la-cedula-digital-3096006
- https://www.moe.org.co/wp-content/uploads/2023/05/09052023_La-implementacio%CC%81n-de-la-ce%CC%81dula-digital-en-Colombia.pdf
- https://soporte.lobbypms.com/hc/es/articles/38418438912147
- https://www.laneros.com/temas/lectura-de-nueva-cedula-digital-en-colombia.253335/
- https://en.wikipedia.org/wiki/PDF417

Navegador y librerías

- https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/BarcodeDetector.json
- https://caniuse.com/mdn-api_barcodedetector
- https://developer.chrome.com/docs/capabilities/shape-detection
- https://bugs.webkit.org/show_bug.cgi?id=281848
- https://github.com/Sec-ant/barcode-detector
- https://github.com/Sec-ant/zxing-wasm
- https://github.com/zxing-cpp/zxing-cpp
- https://github.com/zxing-js/library , https://github.com/zxing-js/browser
- https://github.com/mebjas/html5-qrcode
- https://www.dynamsoft.com/codepool/pdf417-reading-benchmark-and-comparison.html
- https://www.dynamsoft.com/barcode-reader/sdk-javascript/
- https://www.scandit.com/
- https://strich.io/
- https://microblink.com/
- https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/applyConstraints
- https://developers.google.com/ml-kit/vision/barcode-scanning/android
- https://github.com/zxing-cpp/zxing-cpp/issues/97 , /issues/145 , /discussions/394 , /discussions/511 , /discussions/974
- https://www.dynamsoft.com/codepool/benchmark-barcode-reading-javascript-zxing-wasm-dynamsoft-barcode-reader.html
- https://www.dynamsoft.com/codepool/how-to-recognize-driver-license-on-android.html
- https://docs.scandit.com/data-capture-sdk/cordova/core/api/camera-settings.html
- https://web.dev/articles/requestvideoframecallback-rvfc
- Registro npm (`npm view`), consultado el 2026-09-26

Legal

- http://www.secretariasenado.gov.co/senado/basedoc/ley_1581_2012.html (Ley 1581 de 2012)
- https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=17004 (Decreto 2150 de 1995 / Ley 962 de 2005)
- https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=53646 (Decreto 1377 de 2013)
- https://www.sic.gov.co/sites/default/files/files/Publicaciones/Guia_prop_horizontal_NOV12_OK%20(1).pdf
- https://www.sic.gov.co/Superindustria-exige-a-edificios-y-conjuntos-residenciales-cumplir-con-normas-de-proteccion-de-datos-personales
- https://sedeelectronica.sic.gov.co/comunicado/la-superintendencia-de-industria-y-comercio-ordena-un-conjunto-residencial-habilitar-mecanismos-de-ingreso-que-no-impliquen-el-tratamiento
- https://copropiedades.com.co/guia-para-el-tratamiento-de-datos-personales-en-la-propiedad-horizontal/
- https://www.hklaw.com/en/insights/publications/2020/12/colombia-delegation-for-protection-of-personal-data-publishes-guide
- https://www.sic.gov.co/boletin-juridico-febrero-2018/la-superintendencia-de-industria-y-comercio-impartio-orden-administrativa-relacionada-con-el-tratamiento-de-datos-personales-en-edificios-sometidos-a-propiedad-horizontal
- https://www.ambitojuridico.com/noticias/mercantil/mercantil-propiedad-intelectual-y-arbitraje/fotografia-de-la-cedula-de
