# Habeas Data para registros de Visitantes en Unidades residenciales colombianas

Investigación para el ticket [#4](https://github.com/Axus00/visit-pass/issues/4) del mapa [#1](https://github.com/Axus00/visit-pass/issues/1). Fecha de consulta de fuentes: 2026-09-26.

> **Esto es investigación, no asesoría jurídica.** Cada afirmación se marca como **[HECHO]** (texto literal o directo de una norma, sentencia o acto de la SIC, con cita) o **[INTERPRETACIÓN]** (lectura nuestra aplicada a Visit Pass). Antes de publicar avisos o políticas para clientes reales, un abogado colombiano debe revisar las interpretaciones.

Vocabulario del dominio: ver `CONTEXT.md` (Unidad residencial, Apartamento, Residente, Portero, Administrador, Visitante, Favorito, Autorización, Pase, Registro manual, Visita, Ingreso, Salida, Reporte de turno).

## 1. Resumen ejecutivo

1. **[HECHO]** La Unidad residencial (persona jurídica de propiedad horizontal) es **Responsable del Tratamiento** de los datos de quienes ingresan a sus instalaciones; los terceros que tratan datos por su cuenta (empresas de vigilancia, y por extensión una plataforma como Visit Pass) son **Encargados**. La SIC lo ha dicho en su Guía de 2020, en el concepto 22-290633 de 2022 y en sanciones (Res. 60460 de 2017; multa al Edificio Carrera Séptima, 2019).
2. **[HECHO]** El régimen exige autorización **previa, expresa e informada** del titular (Ley 1581, arts. 4 c y 9), salvo excepciones del art. 10. La autorización puede constar **por escrito, oralmente o mediante conductas inequívocas**; el silencio nunca vale (Decreto 1074, art. 2.2.2.25.2.4). **[INTERPRETACIÓN]** Para el Registro manual, un aviso de privacidad visible en portería más la entrega voluntaria de nombre y documento por el Visitante para entrar constituye una conducta inequívoca defendible; la SIC usa exactamente ese razonamiento para videovigilancia en su cartilla de formatos. Lo que hay que conservar es **prueba** de que el aviso se mostró (art. 17 b Ley 1581; art. 2.2.2.25.2.5 Decreto 1074).
3. **[HECHO]** El número de cédula **no es dato sensible**; la Corte Constitucional lo califica de **dato público** que no requiere autorización para divulgarse (T-254 de 2024, párr. 45). **[INTERPRETACIÓN]** Lo que sí es privado es el hecho "esta persona visitó este Apartamento a esta hora"; el registro de Visita completo se trata como dato privado. No se deben tomar fotos del documento ni retener el documento físico (Decreto 2150 de 1995, art. 18, mod. Ley 962 de 2005, art. 23).
4. **[HECHO]** No hay plazo legal fijo de retención: los datos se conservan "durante el tiempo que sea razonable y necesario" para la finalidad y luego deben suprimirse (Decreto 1074, art. 2.2.2.25.2.8). **[INTERPRETACIÓN]** Recomendamos 12 meses para Visitas, 30 días para Pases vencidos sin uso, y supresión inmediata a solicitud cuando no exista deber legal de conservar.
5. **[HECHO]** Consultas: 10 días hábiles (+5); reclamos: 15 días hábiles (+8), con leyenda "reclamo en trámite" en 2 días (Ley 1581, arts. 14 y 15). Todo Responsable o Encargado debe designar persona o área para atenderlos (Decreto 1074, art. 2.2.2.25.4.4).
6. **[HECHO]** El Registro Nacional de Bases de Datos (RNBD) solo obliga a sociedades y entidades sin ánimo de lucro con **activos totales superiores a 100.000 UVT** y a entidades públicas (Decreto 090 de 2018, art. 1, que modifica el art. 2.2.2.26.1.2 del Decreto 1074). La mayoría de copropiedades y una startup pequeña quedan fuera; se verifica caso por caso.

La lista de obligaciones mínimas para el MVP está en la sección 12, el texto sugerido del aviso en la 13 y la política de retención en la 14.

## 2. Fuentes primarias consultadas

| Fuente                                                                                                    | URL                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ley Estatutaria 1581 de 2012                                                                              | https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981                                                                                                                                                         |
| Decreto 1377 de 2013 (reglamentario)                                                                      | https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=53646                                                                                                                                                         |
| Decreto 1074 de 2015 (Único Reglamentario; compila el 1377 en el capítulo 25 y el RNBD en el capítulo 26) | https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=76608                                                                                                                                                         |
| Decreto 090 de 2018 (ámbito del RNBD)                                                                     | https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=85039                                                                                                                                                         |
| Ley 675 de 2001 (propiedad horizontal)                                                                    | http://www.secretariasenado.gov.co/senado/basedoc/ley_0675_2001.html                                                                                                                                                            |
| Decreto 2150 de 1995, art. 18 (prohibición de retener documentos de identidad)                            | https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=1208                                                                                                                                                          |
| SIC, _Guía sobre el tratamiento de datos personales en la propiedad horizontal_ (2020)                    | https://www.sic.gov.co/sites/default/files/files/Publicaciones/Guia_prop_horizontal_NOV12_OK%20(1).pdf                                                                                                                          |
| SIC, _Cartilla de formatos modelo para el cumplimiento de la Ley 1581 de 2012_ (2017)                     | https://www.sic.gov.co/sites/default/files/files/Nuestra_Entidad/Publicaciones/Cartilla_formatos_datos_Personales_nov22.pdf                                                                                                     |
| SIC, _Guía de protección de datos personales en sistemas de videovigilancia_ (2016)                       | https://www.sic.gov.co/sites/default/files/files/Nuestra_Entidad/Guia_Vigilancia_sept16_2016.pdf                                                                                                                                |
| SIC, concepto 22-290633 de 2022 (propiedad horizontal)                                                    | https://sedeelectronica.sic.gov.co/sites/default/files/boletin-juridico/conceptos/22%20-%20290633%20DANIEL%20G%C3%93MEZ%20%20PROPIEDAD%20HORIZONTA.pdf                                                                          |
| SIC, orden administrativa Res. 60460 de 2017 (Edificio Monserrat 74 PH, datos de visitantes)              | https://www.sic.gov.co/boletin-juridico-febrero-2018/la-superintendencia-de-industria-y-comercio-impartio-orden-administrativa-relacionada-con-el-tratamiento-de-datos-personales-en-edificios-sometidos-a-propiedad-horizontal |
| SIC, multa Edificio Carrera Séptima PH (2019)                                                             | https://www.sic.gov.co/Superindustria-exige-a-edificios-y-conjuntos-residenciales-cumplir-con-normas-de-proteccion-de-datos-personales                                                                                          |
| SIC, Res. 52185 de 2025 (biometría en conjunto residencial)                                               | https://sedeelectronica.sic.gov.co/comunicado/la-superintendencia-de-industria-y-comercio-ordena-un-conjunto-residencial-habilitar-mecanismos-de-ingreso-que-no-impliquen-el-tratamiento                                        |
| SIC, página del RNBD                                                                                      | https://www.sic.gov.co/registro-nacional-de-bases-de-datos                                                                                                                                                                      |
| Corte Constitucional, T-254 de 2024 (número de cédula como dato público)                                  | https://www.corteconstitucional.gov.co/relatoria/2024/t-254-24.htm                                                                                                                                                              |

Los sitios `suin-juriscol.gov.co`, `funcionpublica.gov.co` y `sic.gov.co` presentan certificados TLS que el cliente HTTP estándar rechaza; los textos se descargaron igualmente y se leyeron completos. Los artículos del Decreto 1377 se citan con la numeración del Decreto 1074 porque es la que usa la SIC en sus conceptos recientes; la tabla de equivalencias está en la sección 16.

## 3. Marco: por qué aplica el régimen a una portería

- **[HECHO]** La propiedad horizontal es una persona jurídica civil sin ánimo de lucro cuyo objeto es "administrar correcta y eficazmente los bienes y servicios comunes" (Ley 675, arts. 32 y 33). El administrador es su representante legal (art. 50) y debe "llevar directamente o bajo su dependencia y responsabilidad (...) el registro de propietarios y residentes" y "cuidar y vigilar los bienes comunes" (art. 51, nums. 2 y 7). La Ley 675 **no** menciona un registro de visitantes; el control de acceso nace del reglamento interno y de la finalidad de seguridad, no de un mandato legal expreso.
- **[HECHO]** "El Régimen de Protección de Datos Personales se aplica a la información que se recolecta de los visitantes para el ingreso a las instalaciones del edificio" (SIC, Res. 60460 de 2017). Los edificios y conjuntos "son personas jurídicas responsables del tratamiento de los datos que recolectan, almacena[n] o usa[n] sobre todas las personas que ingresan a sus instalaciones" (SIC, 2019).
- **[HECHO]** Sanciones ya impuestas a copropiedades por: recolectar imágenes sin autorización, no tener política de tratamiento, no informar a los visitantes lo del art. 12, y no tener medidas de seguridad. Multa de $78.124.200 en 2019; la SIC contaba entonces 7 sanciones a propiedades horizontales (SIC, 2019). El tope legal es 2.000 SMLMV (Ley 1581, art. 23).
- **[HECHO]** El tratamiento "en el ámbito personal o doméstico" está excluido (Ley 1581, art. 2 b; Decreto 1074, art. 2.2.2.25.1.2). **[INTERPRETACIÓN]** Un Residente que guarda un Favorito en su teléfono para su uso personal podría caer en esa excepción, pero en Visit Pass el dato va a la base de la Unidad residencial y lo ve el Portero, así que no nos apoyamos en la excepción doméstica para nada.

## 4. Responsable vs. Encargado: copropiedad vs. plataforma

**[HECHO]** Definiciones (Ley 1581, art. 3):

- Responsable: quien "decida sobre la base de datos y/o el Tratamiento de los datos" (lit. e).
- Encargado: quien "realice el Tratamiento de datos personales por cuenta del Responsable" (lit. d).

**[HECHO]** La SIC: los edificios "son Responsables de Tratamiento y deben cumplir todos los deberes legales. Es factible que para ciertas actividades acudan a terceros como las empresas de seguridad privada, las cuales actúan como Encargados del Tratamiento" (Guía 2020, p. 5). "La base de datos (...) pertenece al responsable del tratamiento (...) Tratamiento que puede ser realizado a través de un encargado" (concepto 22-290633, p. 11). El Responsable "responde frente a los Titulares de los datos y las autoridades por los errores o negligencia" de sus Encargados (Guía 2020, p. 12).

**[INTERPRETACIÓN]** Mapa de roles en Visit Pass:

| Actor                                            | Rol en la Ley 1581                                                                      | Por qué                                                                                                                                               |
| ------------------------------------------------ | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unidad residencial                               | **Responsable** de los datos de Visitantes, Favoritos, Visitas, Reportes de turno       | Decide que existe control de acceso, con qué finalidad, y quién ingresa. Los datos son suyos y se le devuelven o se suprimen al terminar el contrato. |
| Administrador, Portero, Residente                | Personas que actúan **por cuenta del Responsable** (órganos, empleados, copropietarios) | El Portero registra; el Residente autoriza; el Administrador es el representante legal que firma la política y atiende reclamos.                      |
| Empresa de vigilancia (si emplea a los Porteros) | **Encargado** de la Unidad residencial                                                  | Guía 2020, pp. 12-13. Su contrato es con la copropiedad, no con Visit Pass.                                                                           |
| Visit Pass (la plataforma)                       | **Encargado** de cada Unidad residencial para los datos de Visitantes y Visitas         | Trata datos "por cuenta del Responsable" bajo la finalidad que este fija.                                                                             |
| Visit Pass                                       | **Responsable** de los datos de cuenta de sus Usuarios (WorkOS, correo, membresías)     | Sobre esa base de datos decide Visit Pass, no la copropiedad. Fuera del alcance de este ticket, pero requiere su propia política.                     |

**[INTERPRETACIÓN]** Visit Pass **deja de ser mero Encargado** y pasa a ser Responsable (o corresponsable) si decide finalidades propias sobre los datos de Visitantes: analítica entre Unidades residenciales, perfiles de visitantes frecuentes compartidos entre copropiedades, mercadeo, venta de datos. El límite de datos "nada se comparte entre unidades residenciales" de `CONTEXT.md` es también la frontera jurídica que mantiene a Visit Pass como Encargado; conviene tratarla como restricción de diseño, no solo de producto.

**[HECHO]** Deberes propios del Encargado (Ley 1581, art. 18): garantizar el habeas data; conservar la información con seguridad; actualizar, rectificar o suprimir oportunamente; actualizar lo que reporte el Responsable en 5 días hábiles; tramitar consultas y reclamos; adoptar un manual interno de políticas y procedimientos; insertar la leyenda "reclamo en trámite"; permitir acceso solo a personas autorizadas; informar a la SIC violaciones de códigos de seguridad; cumplir instrucciones de la SIC. Si concurren las dos calidades, se exigen ambos listados (art. 18, parágrafo).

**[HECHO]** Contrato Responsable-Encargado (Decreto 1074, art. 2.2.2.25.5.2): debe señalar alcances, actividades y obligaciones del Encargado, y obligarlo a (1) tratar los datos conforme a los principios, (2) salvaguardar la seguridad de las bases de datos, (3) guardar confidencialidad. La SIC recomienda además pactar: cumplir la política de la copropiedad, no usar los datos para otros fines, no apropiarse de ellos ni quedarse copias al terminar, y devolverlos (Guía 2020, p. 13).

**[HECHO]** Transmisión internacional Responsable → Encargado: "no requerirán ser informadas al Titular ni contar con su consentimiento cuando exista un contrato en los términos del artículo [2.2.2.25.5.2]" (Decreto 1074, art. 2.2.2.25.5.1, num. 2). **[INTERPRETACIÓN]** Visit Pass aloja en Convex y autentica con WorkOS, ambos fuera de Colombia. El contrato con cada Unidad residencial debería declarar esos sub-encargados y su ubicación. Pendiente de verificar con abogado: si el país de alojamiento figura en la lista de "nivel adecuado" de la Circular Externa 005 de 2017 de la SIC, o si se requiere apoyarse en la autorización del titular (Ley 1581, art. 26, lit. a); esa circular no se verificó en esta investigación.

## 5. Naturaleza de los datos que maneja el MVP

**[HECHO]** Categorías: dato público es el que no sea semiprivado, privado o sensible; ejemplos: estado civil, profesión u oficio, y lo contenido en registros y documentos públicos (Decreto 1074, art. 2.2.2.25.1.3, num. 2). Datos sensibles: los que afectan la intimidad o cuyo uso indebido genera discriminación, incluidos salud, vida sexual y **datos biométricos** (Ley 1581, art. 5). Su tratamiento está prohibido salvo autorización explícita y demás excepciones del art. 6, y "ninguna actividad podrá condicionarse a que el Titular suministre datos personales sensibles" (Decreto 1074, art. 2.2.2.25.2.3).

| Dato del MVP                                                                                            | Categoría                                                      | Fuente / nota                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Número de cédula del Visitante                                                                          | **Público** **[HECHO]**                                        | T-254 de 2024, párr. 45: "es un dato público que consta en documento público (...) no se trata de un dato sensible (...) no requiere de autorización del titular para ser divulgado". Ver sección 8.                                                                                                                                                                                                                                                         |
| Nombre del Visitante                                                                                    | Público en cuanto identifica, pero ver fila siguiente          | **[INTERPRETACIÓN]**                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| El registro "Visitante X ingresó al Apartamento Y el día Z, con placa W, autorizado por el Residente R" | **Privado** (no público ni sensible)                           | **[INTERPRETACIÓN]** Revela hábitos, relaciones y ubicación; la SIC lista "visitantes" entre la información que el personal debe mantener en reserva (Guía 2020, p. 18). El deber de confidencialidad del art. 4 h aplica a todo dato que no sea público.                                                                                                                                                                                                    |
| Placa del vehículo                                                                                      | Semiprivado/privado en este contexto                           | **[INTERPRETACIÓN]** Solo se recoge si es opcional y pertinente (art. 2.2.2.25.2.1: solo datos "pertinentes y adecuados").                                                                                                                                                                                                                                                                                                                                   |
| Parentesco del Favorito                                                                                 | Privado                                                        | **[INTERPRETACIÓN]** Lo aporta el Residente, no el Visitante. Mantenerlo mínimo (familiar/amigo/otro) y visible solo al Residente que lo creó.                                                                                                                                                                                                                                                                                                               |
| Foto del Visitante, foto de la cédula, huella, reconocimiento facial                                    | Privado; **sensible** cuando permite identificación biométrica | **[HECHO]** Res. 60460 de 2017: las fotografías "corresponden a datos de carácter privado y sólo pueden llegar a ser clasificadas en la categoría de datos sensibles cuando de éstas se pueden extraer mediciones y rasgos". En 2019 la SIC trató fotos e imágenes de videovigilancia directamente como biométricos sensibles. Res. 52185 de 2025: el reconocimiento facial no puede ser el único medio de acceso. **Recomendación: no capturar en el MVP.** |
| Datos de niños, niñas y adolescentes                                                                    | Régimen especial                                               | **[HECHO]** Tratamiento proscrito salvo datos públicos y requisitos del art. 2.2.2.25.2.9 (autorización del representante legal). **[INTERPRETACIÓN]** No pedir fecha de nacimiento ni marcar menores; si un Visitante es menor, registrar el tipo de documento (TI) es inevitable pero no añadir más.                                                                                                                                                       |

## 6. ¿Autorización expresa del Visitante o basta el aviso?

### Lo que dice la norma

- **[HECHO]** Principio de libertad: "El Tratamiento sólo puede ejercerse con el consentimiento, previo, expreso e informado del Titular" (Ley 1581, art. 4 c). Art. 9: "en el Tratamiento se requiere la autorización previa e informada del Titular, la cual deberá ser obtenida por cualquier medio que pueda ser objeto de consulta posterior".
- **[HECHO]** Excepciones (art. 10): información requerida por entidad pública u orden judicial; **datos de naturaleza pública**; urgencia médica; fines históricos/estadísticos/científicos; registro civil. "Quien acceda a los datos personales sin que medie autorización previa deberá en todo caso cumplir con las disposiciones contenidas en la presente ley."
- **[HECHO]** Forma: la autorización cumple cuando "se manifieste (i) por escrito, (ii) de forma oral o (iii) mediante conductas inequívocas del titular que permitan concluir de forma razonable que otorgó la autorización. En ningún caso el silencio podrá asimilarse a una conducta inequívoca" (Decreto 1074, art. 2.2.2.25.2.4). Los mecanismos "podrán ser predeterminados a través de medios técnicos que faciliten al Titular su manifestación automatizada".
- **[HECHO]** La SIC ejemplifica la conducta inequívoca así: "imágenes captadas por sistemas de videovigilancia, en los que se comunica previamente a las personas que van a ingresar a un establecimiento que sus imágenes van a ser tomadas, conservadas o usadas de cierta manera y, conociendo tal situación, los titulares ingresan al establecimiento" (Cartilla de formatos 2017, sección 2.3).
- **[HECHO]** Al solicitar la autorización se debe informar: (a) tratamiento y finalidad; (b) carácter facultativo de respuestas sobre datos sensibles o de menores; (c) derechos del titular; (d) identificación, dirección física o electrónica y teléfono del Responsable. El Responsable "deberá conservar prueba del cumplimiento" y entregar copia si el titular la pide (Ley 1581, art. 12). Debe además "solicitar y conservar (...) copia de la respectiva autorización" (art. 17 b) y "conservar prueba de la autorización" (Decreto 1074, art. 2.2.2.25.2.5).
- **[HECHO]** El aviso de privacidad es un mecanismo de **información**, no sustituye por sí solo la autorización ni la política: "la divulgación del Aviso de Privacidad no eximirá al Responsable de la obligación de dar a conocer a los titulares la política de tratamiento" (Decreto 1074, art. 2.2.2.25.3.3, inciso final). La SIC recomienda avisos "en todas las porterías" (Guía 2020, p. 15).
- **[HECHO]** La Corte Constitucional, citada por la SIC, descarta el consentimiento tácito: la autorización "debe ser inequívoca, razón por la cual (...) no es posible aceptarse la existencia (...) de un consentimiento tácito" (C-748 de 2011, citada en concepto 22-290633, p. 8).

### Aplicación a Visit Pass **[INTERPRETACIÓN]**

Respuesta corta: **el aviso solo no basta; el aviso más la conducta del Visitante, registrada, sí.** La distinción entre "consentimiento tácito" (prohibido) y "conducta inequívoca" (permitida) está en que el titular fue informado antes y luego hizo algo activo que solo tiene sentido si acepta.

| Flujo                                                                      | Cómo se obtiene la autorización                                                                                                                                                                                                                                                                                                  | Qué se guarda como prueba                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Registro manual** (Portero, Visitante presente)                          | El Visitante ve el aviso (cartel en portería y/o pantalla del Portero girada o leída en voz alta) y dicta nombre y documento para poder ingresar. Conducta inequívoca en el sentido del art. 2.2.2.25.2.4 y del ejemplo de la SIC.                                                                                               | En la Visita: versión del aviso, medio (cartel / pantalla / verbal), fecha-hora, Portero que registró. Un botón "Aviso informado" que el Portero pulsa es preferible a nada; un tap del Visitante en la pantalla ("Acepto") es mejor aún si el hardware lo permite.                                                                                     |
| **Pase** (Residente crea la Autorización antes de que el Visitante llegue) | Dos momentos. (1) El Residente aporta nombre y documento de un tercero: es legítimo porque la finalidad es la seguridad de la copropiedad y el dato es mínimo, pero **todavía no hay autorización del Visitante**. (2) Cuando el Visitante presenta el Pase en portería, tras ver el aviso, se configura la conducta inequívoca. | El mensaje/enlace del Pase que el Residente comparte incluye el aviso corto y el enlace a la política, de modo que el Visitante fue informado antes del Ingreso. En el Ingreso se guarda lo mismo que en el Registro manual. Los Pases que nunca se usan se suprimen rápido (sección 14) precisamente porque no llegó a haber autorización del titular. |
| **Favorito**                                                               | Igual que el Pase, pero el dato persiste.                                                                                                                                                                                                                                                                                        | Mostrar al Residente al crear el Favorito que está aportando datos de otra persona y que esta puede pedir su supresión. Purga de Favoritos sin uso (sección 14).                                                                                                                                                                                        |
| **Evento** (varios Visitantes)                                             | Igual que el Pase por cada uno.                                                                                                                                                                                                                                                                                                  | Igual.                                                                                                                                                                                                                                                                                                                                                  |

Riesgo residual: entre que el Residente crea la Autorización y el Visitante llega, existe un dato de un tercero sin autorización propia. Hay tres mitigaciones y ninguna elimina el riesgo del todo: minimizar (solo nombre y documento), informar al Visitante en el enlace del Pase, y suprimir pronto lo no usado. Es el punto donde más vale una segunda opinión legal.

Alternativa más conservadora que no recomendamos para el MVP: autorización escrita/firmada del Visitante en cada Ingreso. Es lo que hacen las planillas de papel con casilla de firma, cuesta tiempo en portería y no aporta mucho más que el registro de "aviso informado", pero es la opción si un Administrador la exige.

## 7. Aviso de privacidad y política de tratamiento

**[HECHO]** Son tres documentos distintos:

1. **Política de Tratamiento de la información** (Decreto 1074, art. 2.2.2.25.3.1): obligatoria para el Responsable, en lenguaje claro, física o electrónica, y debe contener al menos: nombre, domicilio, dirección, correo y teléfono del Responsable; tratamiento y finalidad; derechos del titular; persona o área que atiende peticiones; procedimiento para ejercer derechos; fecha de vigencia y **periodo de vigencia de la base de datos**. La SIC la exige a las copropiedades "aprobada previamente por la alta dirección de la propiedad horizontal" (Res. 60460 de 2017).
2. **Aviso de privacidad** (arts. 2.2.2.25.3.2 y 2.2.2.25.3.3): se usa "en los casos en los que no sea posible poner a disposición del Titular las políticas", "a más tardar al momento de la recolección". Contenido mínimo: (1) nombre y datos de contacto del Responsable; (2) tratamiento y finalidad; (3) derechos del titular; (4) mecanismos para conocer la política y sus cambios, "en todos los casos, debe informar al Titular cómo acceder o consultar la política". Si se recogen datos sensibles, debe señalar que responder es facultativo.
3. **Manual interno de políticas y procedimientos** (Ley 1581, arts. 17 k y 18 f): tanto Responsable como Encargado, con énfasis en atención de consultas y reclamos.

**[HECHO]** Medios de difusión: "documentos, formatos electrónicos, medios verbales o cualquier otra tecnología, siempre y cuando garantice y cumpla con el deber de informar" (art. 2.2.2.25.3.5). El Responsable debe **conservar el modelo del aviso** que usó mientras trate datos con él (art. 2.2.2.25.3.4). Ubicación recomendada por la SIC: "en todas las porterías", "fácilmente visibles, legibles y comprensibles" (Guía 2020, p. 15).

**[INTERPRETACIÓN]** Dónde mostrarlo en Visit Pass:

- **Cartel físico en portería** (responsabilidad de la Unidad residencial; Visit Pass entrega el PDF listo para imprimir con los datos de la copropiedad).
- **Pantalla del Portero**: pie de página permanente con el aviso corto y un botón "Mostrar aviso" que lo despliega en tamaño legible para el Visitante.
- **Enlace del Pase**: la página pública que abre el QR (o el mensaje que el Residente comparte) incluye el aviso corto y el enlace a la política de esa Unidad residencial.
- **Página pública por Unidad residencial** con la política de tratamiento y el canal de contacto, sin sesión, para que un Visitante sin cuenta pueda leerla y ejercer derechos.
- El aviso debe llevar **versión y fecha**; cada Visita referencia la versión que se mostró. Eso cumple a la vez el deber de conservar el modelo (art. 2.2.2.25.3.4) y el de conservar prueba (art. 12, parágrafo).

## 8. El número de cédula

- **[HECHO]** Corte Constitucional, T-254 de 2024, párr. 45: el número de cédula "es un dato público que consta en documento público", "no se trata de un dato sensible (...) porque no hace parte de la intimidad del titular ni aparece un riesgo cierto de discriminación por su uso indebido", y "no requiere de autorización del titular para ser divulgado", con base en Ley 1581, art. 10 b, y art. 243 del Código General del Proceso.
- **[HECHO]** Los datos públicos pueden tratarse sin autorización, pero "quien acceda a los datos personales sin que medie autorización previa deberá en todo caso cumplir con las disposiciones contenidas en la presente ley" (art. 10, inciso final): seguridad, finalidad, circulación restringida y derechos del titular siguen aplicando.
- **[HECHO]** Prohibición de retener el documento físico: "Queda prohibido retenerlos, para ingresar a cualquier dependencia pública o privada" (Decreto 2150 de 1995, art. 18, modificado por Ley 962 de 2005, art. 23). Si se exige identificación, "ella cumplirá la obligación mediante la exhibición del citado documento".
- **[HECHO]** La fotografía del titular (y por tanto la foto de la cédula, que la contiene) es dato privado y potencialmente sensible (Res. 60460 de 2017; SIC 2019).

**[INTERPRETACIÓN]** Conclusiones de diseño:

1. El número de cédula **no exige tratamiento reforzado** de datos sensibles. Puede ser la clave natural del Visitante dentro de una Unidad residencial.
2. Aun así, el **registro de Visita que lo contiene es privado**, así que: acceso restringido por Membresía y Unidad residencial; enmascarar el número en listados (`***4567`) y mostrarlo completo solo al Portero en el acto de Ingreso y al Administrador; cifrado en reposo y en tránsito (lo da Convex); registro de quién consultó qué (auditoría) como medida de "responsabilidad demostrada" (art. 2.2.2.25.6.1).
3. **No capturar foto de la cédula ni del rostro** en el MVP. El Portero verifica la identidad viendo el documento exhibido y devolviéndolo (Decreto 2150, art. 18).
4. Guardar **tipo de documento** (CC, CE, TI, pasaporte, PEP/PPT) además del número: evita colisiones y no añade sensibilidad.
5. El Reporte de turno exportado a Excel y enviado por correo saca los datos del control del sistema. Enviar el reporte solo al correo del Administrador registrado, con números enmascarados por defecto y una opción explícita para incluirlos completos, y anotar en la política que esos archivos quedan bajo custodia de la copropiedad.

## 9. Derechos de acceso, rectificación, supresión y su trámite

**[HECHO]** Derechos (Ley 1581, art. 8): conocer, actualizar y rectificar; solicitar prueba de la autorización (salvo excepciones del art. 10); ser informado del uso dado a sus datos; quejarse ante la SIC; revocar la autorización y/o solicitar la supresión; acceder gratuitamente. La consulta es gratuita al menos una vez al mes (Decreto 1074, art. 2.2.2.25.4.2).

**[HECHO]** Plazos:

| Trámite                                              | Plazo                                                          | Prórroga                                 | Norma             |
| ---------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------- | ----------------- |
| Consulta                                             | 10 días hábiles                                                | +5 días hábiles, avisando motivo y fecha | Ley 1581, art. 14 |
| Reclamo incompleto                                   | requerir en 5 días; desistimiento a los 2 meses sin respuesta  |                                          | art. 15, num. 1   |
| Traslado si no es competente                         | 2 días hábiles                                                 |                                          | art. 15, num. 1   |
| Leyenda "reclamo en trámite"                         | 2 días hábiles desde el reclamo completo, hasta decidir        |                                          | art. 15, num. 2   |
| Decisión del reclamo                                 | 15 días hábiles                                                | +8 días hábiles, avisando                | art. 15, num. 3   |
| Queja ante la SIC                                    | solo tras agotar consulta o reclamo ante Responsable/Encargado |                                          | art. 16           |
| Actualizar lo que reporte el Responsable (Encargado) | 5 días hábiles                                                 |                                          | art. 18 d         |

**[HECHO]** La supresión y la revocatoria "no procederán cuando el Titular tenga un deber legal o contractual de permanecer en la base de datos"; Responsable y Encargado deben ofrecer "mecanismos gratuitos y de fácil acceso" para pedirlas (Decreto 1074, art. 2.2.2.25.2.6). Ambos deben "designar a una persona o área que asuma la función de protección de datos personales" (art. 2.2.2.25.4.4) y los procedimientos deben ser "fácilmente accesibles" e incluirse en la política (art. 2.2.2.25.3.6). Quien ejerce el derecho debe "acreditar su identidad en forma suficiente" (art. 2.2.2.25.4.1).

**[INTERPRETACIÓN]** El Visitante no tiene cuenta, así que el canal de ejercicio de derechos es de la Unidad residencial (correo del Administrador o portería), no un botón en la app. Lo que Visit Pass debe dar al Administrador para que pueda cumplir los plazos:

- Búsqueda por tipo y número de documento dentro de su Unidad residencial que devuelva **todo** lo vinculado al titular (Visitas, Pases, Favoritos que lo referencian) y exportación legible (Ley 1581, art. 11: "de fácil lectura, sin barreras técnicas").
- Rectificar nombre/documento de un Visitante y propagarlo a sus Visitas.
- Marcar "reclamo en trámite" sobre un Visitante (visible al Portero y al Administrador; bloquea la purga automática hasta resolver).
- Suprimir o anonimizar un Visitante y sus Visitas, con constancia de fecha y quién lo hizo. Anonimizar (borrar nombre y documento, conservar conteo y hora) es una forma de supresión aceptable cuando la copropiedad quiere conservar estadística del Turno.
- Como Encargado, Visit Pass necesita también su propio canal (correo de protección de datos) y su persona designada, porque el titular puede dirigirse a "Responsable o Encargado" indistintamente (arts. 14 y 15) y el Encargado debe tramitar (art. 18 e). El procedimiento interno es: recibir, trasladar al Administrador en 2 días hábiles, y ejecutar lo que este ordene.

## 10. Retención y supresión

- **[HECHO]** "Los Responsables y Encargados del Tratamiento solo podrán recolectar, almacenar, usar o circular los datos personales durante el tiempo que sea razonable y necesario, de acuerdo con las finalidades que justificaron el tratamiento (...). Una vez cumplida la o las finalidades del tratamiento y sin perjuicio de normas legales que dispongan lo contrario, el Responsable y el Encargado deberán proceder a la supresión de los datos personales en su posesión. No obstante lo anterior, los datos personales deberán ser conservados cuando así se requiera para el cumplimiento de una obligación legal o contractual." Deben "documentar los procedimientos para el Tratamiento, conservación y supresión" (Decreto 1074, art. 2.2.2.25.2.8).
- **[HECHO]** La SIC: "Los edificios y conjuntos pueden tratar los datos por el tiempo necesario siempre y cuando justifiquen dicho término o período razonablemente"; "La idea es no almacenar y usar datos indefinidamente" (Guía 2020, p. 17). La Corte: el periodo "no debe exceder del necesario para alcanzar la necesidad con que se han registrado" (C-748 de 2011, num. 2.6.5.2.2, citada allí).
- **[HECHO]** La política de tratamiento debe indicar el "período de vigencia de la base de datos" (art. 2.2.2.25.3.1, num. 6).
- **[HECHO]** Ni la Ley 675 ni la Ley 1581 fijan un plazo para registros de visitantes. No se encontró norma sectorial que lo fije para copropiedades residenciales (la Superintendencia de Vigilancia regula a las empresas de vigilancia, no a la copropiedad; su normativa no se revisó en detalle).

**[INTERPRETACIÓN]** Ver recomendación concreta en la sección 14.

## 11. Registro Nacional de Bases de Datos (RNBD) y otros deberes

- **[HECHO]** Obligados a inscribir sus bases de datos: "a) Sociedades y entidades sin ánimo de lucro que tengan activos totales superiores a 100.000 Unidades de Valor Tributario (UVT). b) Personas jurídicas de naturaleza pública" (Decreto 1074, art. 2.2.2.26.1.2, texto del Decreto 090 de 2018, art. 1). Las bases creadas después de los plazos iniciales "deberán inscribirse dentro de los dos (2) meses siguientes, contados a partir de su creación" (art. 2.2.2.26.3.1). El registro incluye la identificación del Encargado (art. 2.2.2.26.2.3).
- **[INTERPRETACIÓN]** Una Unidad residencial es entidad sin ánimo de lucro (Ley 675, art. 33); solo inscribe si sus activos superan 100.000 UVT (verificar el valor de la UVT del año en curso; el umbral está en el orden de los miles de millones de pesos, lo que excluye a la mayoría de copropiedades pequeñas y medianas pero no a grandes conjuntos). Visit Pass como sociedad inscribe si supera ese mismo umbral. En la política de tratamiento y en el onboarding conviene preguntarle al Administrador si su copropiedad está obligada y, si lo está, entregarle la ficha con los datos del Encargado para su registro.
- **[HECHO]** Deber de reportar a la SIC "cuando se presenten violaciones a los códigos de seguridad y existan riesgos en la administración de la información" (Ley 1581, arts. 17 n y 18 k). **[INTERPRETACIÓN]** El contrato debe fijar que Visit Pass notifica al Administrador un incidente en un plazo corto (p. ej. 72 horas) para que la copropiedad cumpla su deber.
- **[HECHO]** Responsabilidad demostrada (Decreto 1074, art. 2.2.2.25.6.1): a petición de la SIC hay que demostrar medidas "apropiadas y efectivas", proporcionales al tamaño, naturaleza de datos, tipo de tratamiento y riesgos. La SIC recuerda que no bastan "meras declaraciones simbólicas" (Guía 2020, p. 20).

## 12. Lista de obligaciones mínimas para el MVP

Marcadas por quién las cumple. "VP" = Visit Pass (Encargado); "UR" = Unidad residencial (Responsable), normalmente vía su Administrador; "VP → UR" = Visit Pass la facilita y la UR la adopta.

**Documentos**

- [ ] VP → UR: **Política de tratamiento** por Unidad residencial, generada desde plantilla con nombre, NIT, dirección, correo y teléfono de la copropiedad, finalidades, derechos, canal y procedimiento, vigencia y periodo de retención (art. 2.2.2.25.3.1). Publicada en página pública sin sesión.
- [ ] VP → UR: **Aviso de privacidad** corto (sección 13), versionado, en cartel imprimible, pantalla del Portero y enlace del Pase (arts. 2.2.2.25.3.2 a 2.2.2.25.3.5). Conservar cada versión (art. 2.2.2.25.3.4).
- [ ] VP: **Manual interno de políticas y procedimientos** propio como Encargado, con el flujo de consultas y reclamos (art. 18 f).
- [ ] VP: **Contrato / términos de servicio con la Unidad residencial** que contenga las cláusulas del art. 2.2.2.25.5.2 (alcance, actividades, principios, seguridad, confidencialidad), no uso para fines propios, devolución o supresión al terminar, sub-encargados (Convex, WorkOS) y su ubicación, plazo de notificación de incidentes.
- [ ] VP: designar **persona responsable de protección de datos** y un correo (art. 2.2.2.25.4.4). UR: el Administrador cumple ese papel para la copropiedad; el sistema lo registra.

**Producto**

- [ ] Recoger **solo** nombre, tipo y número de documento, Apartamento destino, tipo de visita y placa opcional (art. 2.2.2.25.2.1). Nada de fotos, huellas, fecha de nacimiento ni teléfono del Visitante.
- [ ] En cada Ingreso guardar **prueba de información/autorización**: versión del aviso, medio, fecha-hora, Portero (Ley 1581, arts. 12 parágrafo y 17 b; art. 2.2.2.25.2.5).
- [ ] El enlace o mensaje del **Pase** muestra el aviso corto y el enlace a la política antes del Ingreso.
- [ ] **Aislamiento por Unidad residencial** en toda consulta y sin agregados entre unidades (mantiene a VP como Encargado).
- [ ] **Enmascarar** el número de documento en listados y reportes por defecto; acceso completo solo al Portero en el Ingreso y al Administrador.
- [ ] **Auditoría** de accesos y exportaciones a datos de Visitantes (accountability, art. 2.2.2.25.6.1).
- [ ] Herramientas del Administrador: buscar todo lo de un documento, exportar legible, rectificar, marcar "reclamo en trámite", suprimir/anonimizar con constancia (Ley 1581, arts. 14, 15, 17 g, 18 c y g).
- [ ] **Purga automática** según la política de retención (sección 14), con excepción para registros bajo "reclamo en trámite" o retención legal marcada por el Administrador (art. 2.2.2.25.2.8).
- [ ] Reporte de turno: enviarlo solo al correo del Administrador registrado; documentos enmascarados salvo opción explícita.
- [ ] Al terminar el contrato con una Unidad residencial: exportar y **suprimir** sus datos en un plazo fijado (Guía 2020, p. 13).

**Operación**

- [ ] UR: cartel del aviso impreso en cada portería; política aprobada por el órgano de administración (Res. 60460 de 2017).
- [ ] UR: verificar si supera 100.000 UVT en activos y, de ser así, inscribir la base en el RNBD identificando a VP como Encargado (art. 2.2.2.26.1.2). VP: lo mismo para sí.
- [ ] VP y UR: procedimiento escrito de incidentes de seguridad con aviso a la SIC (arts. 17 n y 18 k).
- [ ] UR: capacitar a Porteros en confidencialidad (no revelar quién visita a quién) (art. 4 h; Guía 2020, p. 18). VP: incluir un recordatorio de confidencialidad en el onboarding del Portero.

Fuera del MVP pero a tener presente: cualquier biometría o foto (autorización explícita, alternativa no biométrica obligatoria, Res. 52185 de 2025); videovigilancia integrada (Guía SIC 2016 y C-094 de 2020); mensajes al Visitante por WhatsApp/SMS (requeriría autorización para esa finalidad y tratar su teléfono).

## 13. Texto sugerido del aviso de privacidad

**[INTERPRETACIÓN]** Cumple los cuatro numerales del art. 2.2.2.25.3.3 y los literales del art. 12 de la Ley 1581; adaptado del modelo de la SIC (Cartilla 2017, Anexo 4). Los corchetes se rellenan por Unidad residencial. No incluye la advertencia de datos sensibles porque el MVP no los recoge; si algún día se recogen, hay que añadirla.

### Versión corta (cartel en portería, pantalla del Portero, enlace del Pase)

> **Aviso de privacidad – Control de acceso de visitantes**
>
> **[Nombre de la Unidad residencial]**, NIT [_**], con domicilio en [dirección, ciudad], teléfono [**_] y correo [___], es responsable del tratamiento de los datos personales que usted suministra para ingresar: nombre, tipo y número de documento de identidad, apartamento que visita, tipo de visita y, si aplica, placa del vehículo.
>
> **Finalidad:** controlar el ingreso y la salida de visitantes, verificar la autorización del residente, garantizar la seguridad de la copropiedad y elaborar los reportes de portería. Los datos se conservan durante [12] meses contados desde su visita y luego se eliminan, salvo obligación legal o requerimiento de autoridad.
>
> Los datos se registran en la plataforma Visit Pass, que actúa como encargada del tratamiento por cuenta de la copropiedad, y no se comparten con terceros distintos de las autoridades que los requieran conforme a la ley.
>
> **Sus derechos:** conocer, actualizar, rectificar y solicitar la supresión de sus datos; pedir prueba de la autorización; conocer el uso que se les ha dado; revocar la autorización; y presentar quejas ante la Superintendencia de Industria y Comercio. Puede ejercerlos gratuitamente escribiendo a [correo de la administración] o en la administración de la copropiedad.
>
> Al suministrar sus datos para ingresar, usted autoriza este tratamiento. Consulte la política completa de tratamiento de datos en [URL pública por Unidad residencial] o solicítela en la administración.
>
> Versión [n] – [fecha]. Ley 1581 de 2012 y Decreto 1074 de 2015.

### Frase para que el Portero la lea en un Registro manual (medio verbal, art. 2.2.2.25.3.5)

> "Sus datos se registran para el control de ingreso de la copropiedad y se guardan [12] meses. Puede consultarlos o pedir que se borren en la administración. El aviso completo está en el cartel."

### Elementos adicionales para la página pública de la política

Además del texto anterior: persona o área que atiende solicitudes y su horario; procedimiento (qué debe contener la solicitud y cómo se acredita identidad); plazos de respuesta (10 y 15 días hábiles); mención expresa de Visit Pass como Encargado y de que la infraestructura está alojada fuera de Colombia bajo contrato de transmisión; fecha de entrada en vigencia y periodo de vigencia de la base de datos (art. 2.2.2.25.3.1, num. 6).

## 14. Recomendación de política de retención

**[INTERPRETACIÓN]** No hay plazo legal; el criterio es "razonable y necesario para la finalidad" y documentado. Propuesta, configurable por Unidad residencial dentro de un rango, con un valor por defecto:

| Dato                                                                           | Por defecto                                                                                                                      | Rango permitido | Justificación                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visita (Ingreso/Salida con nombre y documento)                                 | **12 meses** desde el Ingreso                                                                                                    | 3 a 24 meses    | La finalidad de seguridad se agota en meses, no años: reclamos por hurto, daños o convivencia se plantean en semanas; un año cubre el ciclo de asamblea anual y el cambio de administración (Ley 675, art. 51). Más de 24 meses es difícil de justificar ante la SIC para un dato privado sin deber legal de conservación. |
| Pase o Autorización vencida sin Ingreso                                        | **30 días** después de la fecha de validez                                                                                       | 7 a 90 días     | No hubo conducta inequívoca del Visitante; el dato existe solo por lo que aportó el Residente. Conservar poco reduce el riesgo señalado en la sección 6.                                                                                                                                                                   |
| Favorito                                                                       | Mientras la Membresía del Residente esté activa y **12 meses** sin uso                                                           |                 | Lo creó el Residente para su comodidad; sin uso deja de ser pertinente. Se suprime al eliminar la Membresía.                                                                                                                                                                                                               |
| Prueba de autorización (versión de aviso, medio, hora)                         | Igual que la Visita a la que pertenece                                                                                           |                 | Es la prueba del art. 17 b; sin la Visita pierde sentido.                                                                                                                                                                                                                                                                  |
| Reporte de turno generado (archivo)                                            | No conservar copia en la plataforma más allá de las Visitas que lo alimentan; los correos enviados quedan bajo custodia de la UR |                 | El archivo duplica datos ya sujetos a purga.                                                                                                                                                                                                                                                                               |
| Registro de supresiones (fecha, quién, cuántos)                                | 5 años, **sin** datos personales del Visitante                                                                                   |                 | Permite demostrar cumplimiento (accountability) sin retener el dato.                                                                                                                                                                                                                                                       |
| Registros bajo "reclamo en trámite" o retención por requerimiento de autoridad | Suspende la purga hasta que el Administrador la levante                                                                          |                 | Ley 1581, arts. 15 y 10 a; art. 2.2.2.25.2.8 (obligación legal).                                                                                                                                                                                                                                                           |

Mecánica: un cron en el backend anonimiza (borra nombre, documento y placa; conserva Apartamento, tipo de visita y hora) o borra según elija la Unidad residencial; la política publicada dice cuál de las dos. El periodo elegido aparece en la política y en el aviso. Al terminar el contrato con la Unidad residencial, exportación y supresión total en 30 días.

## 15. Preguntas abiertas para un abogado

1. Si el flujo "aviso + Pase presentado en portería" es una conducta inequívoca suficiente para el Visitante, o si la SIC exigiría un acto adicional (tap "Acepto").
2. El estatus del país de alojamiento (Convex/WorkOS) frente a la Circular Externa 005 de 2017 de la SIC y el art. 26 de la Ley 1581.
3. Si el enmascaramiento y la anonimización propuestos son suficientes como "supresión" a efectos del art. 2.2.2.25.2.6 cuando la copropiedad quiere conservar estadísticas.
4. Si Visit Pass debe firmar un contrato de transmisión formal con cada copropiedad o si bastan unos términos de servicio aceptados por el Administrador (representante legal, Ley 675, art. 50).

## 16. Equivalencias Decreto 1377 de 2013 → Decreto 1074 de 2015

| Tema                                              | Decreto 1377 | Decreto 1074 |
| ------------------------------------------------- | ------------ | ------------ |
| Definiciones (aviso de privacidad, dato público…) | art. 3       | 2.2.2.25.1.3 |
| Recolección limitada a datos pertinentes          | art. 4       | 2.2.2.25.2.1 |
| Autorización                                      | art. 5       | 2.2.2.25.2.2 |
| Autorización para datos sensibles                 | art. 6       | 2.2.2.25.2.3 |
| Modo de obtener la autorización                   | art. 7       | 2.2.2.25.2.4 |
| Prueba de la autorización                         | art. 8       | 2.2.2.25.2.5 |
| Revocatoria y supresión                           | art. 9       | 2.2.2.25.2.6 |
| Limitaciones temporales (retención)               | art. 11      | 2.2.2.25.2.8 |
| Menores de edad                                   | art. 12      | 2.2.2.25.2.9 |
| Políticas de tratamiento                          | art. 13      | 2.2.2.25.3.1 |
| Aviso de privacidad                               | art. 14      | 2.2.2.25.3.2 |
| Contenido mínimo del aviso                        | art. 15      | 2.2.2.25.3.3 |
| Conservar el modelo del aviso                     | art. 16      | 2.2.2.25.3.4 |
| Medios de difusión                                | art. 17      | 2.2.2.25.3.5 |
| Procedimientos accesibles                         | art. 18      | 2.2.2.25.3.6 |
| Legitimación para ejercer derechos                | art. 20      | 2.2.2.25.4.1 |
| Derecho de acceso                                 | art. 21      | 2.2.2.25.4.2 |
| Actualización, rectificación y supresión          | art. 22      | 2.2.2.25.4.3 |
| Persona o área de protección de datos             | art. 23      | 2.2.2.25.4.4 |
| Transmisión internacional                         | art. 24      | 2.2.2.25.5.1 |
| Contrato de transmisión Responsable-Encargado     | art. 25      | 2.2.2.25.5.2 |
| Responsabilidad demostrada                        | art. 26      | 2.2.2.25.6.1 |
| Ámbito del RNBD (mod. Decreto 090 de 2018)        | —            | 2.2.2.26.1.2 |
