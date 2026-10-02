---
tags:
  - doc
  - analitico
  - neural-labs
  - tempo-de-viagem
aliases:
  - "Cálculo de Tiempo de Recorrido"
  - "Neural Labs - Documento dos gestores sobre tempo de recorrido"
atualizado: 2026-10-01
---

# Analítico - Neural Labs - Documento dos gestores sobre tempo de recorrido

Fuente de las placas: plataforma NEURAL SERVER (Neural Labs), ya instalada en campo

Este documento describe, paso a paso, cómo se calcularía el tiempo de recorrido de un trayecto a partir de las lecturas de placa que produce la plataforma existente. No describe cómo se va a implementar: describe el proceso y las reglas de decisión.

#### **Contenido**

1. Qué se quiere obtener   
2. Cómo se define un trayecto   
3. De dónde salen las placas   
4. Qué lecturas entran al cálculo   
5. El cálculo, paso a paso   
6. Ejemplo completo   
7. Qué se guarda y qué se descarta   
8. Señales de que el dato no es confiable   
9. Decisiones pendientes 

## **1\. Qué se quiere obtener**

Para un trayecto elegido por el operador y para un intervalo de tiempo, el sistema debe responder tres cosas:

* Cuánto se está tardando en recorrerlo, en segundos.   
* A qué velocidad media equivale, en km/h.   
* Cuánto más de lo normal es eso, en porcentaje. 

El indicador se recalcula cada pocos minutos, y queda guardado para poder comparar días, semanas y meses, y para comparar el mismo corredor antes y después de un cambio de semaforización.

## **2\. Cómo se define un trayecto**

### **2.1 Punto de lectura**

Un punto de lectura es una cámara que lee placas, en un sentido concreto de circulación.

La misma cámara física puede ser dos puntos distintos si lee los dos sentidos; para el cálculo son dos cosas separadas y no se mezclan nunca.

### **2.2 Tramo**

Un tramo es un par ordenado de puntos de lectura: uno de entrada y uno de salida.

Cada tramo necesita dos datos que se registran al darlo de alta:

| Dato | Qué es | Ejemplo |
| ----- | ----- | ----- |
| Distancia | Metros que recorre el vehículo por la calle entre las dos cámaras. No la distancia en línea recta. | 900 m |
| Velocidad de la vía | Velocidad normal de circulación de esa vía, en km/h. | 50 km/h |

	

Con esos dos datos se calcula el tiempo de referencia del tramo, que es lo que tardaría un vehículo con la vía libre:

tiempo de referencia \= distancia ÷ velocidad de la vía

De ese tiempo de referencia salen los dos límites que después deciden qué medición es creíble:

| Límite | Cómo se obtiene | Para qué sirve |
| ----- | ----- | ----- |
| Mínimo | Distancia dividida por la velocidad máxima realista de la vía (la velocidad de la vía más un 30%) | Nadie puede tardar menos. Por debajo, la medición está mal. |
| Máximo | 5 veces el tiempo de referencia | Por encima, el vehículo se detuvo, estacionó o se desvió. No representa el tráfico. |

### 

### **2.3 Trayecto**

Un trayecto es una lista ordenada de puntos de lectura. Con 2 puntos hay 1 tramo, con 3 puntos hay 2 tramos, con N puntos hay N−1 tramos.

El trayecto completo se calcula a partir de sus tramos (paso 5 del cálculo).

### **2.4 Qué captura el operador al crear un trayecto**

| Campo | Obrigatório | Nota |
| :---- | :---- | :---- |
| Nombre del trayecto | Sí | Es lo que el operador ve en las pantallas y en los reportes |
| Puntos de lectura, en orden | Sí, mínimo 2 | Se eligen sobre el mapa |
| Sentido de cada punto | Sí | Determina qué vehículos cuentan |
| Distancia de cada tramo | Sí | Se propone calculada sobre la red de calles; el operador puede corregirla |
| Velocidad de la vía de cada tramo | Sí | Se propone la velocidad reglamentada de la vía; el operador puede corregirla |
| Tipo de vehículo a medir | No | Si no se indica, se miden todos. Permite separar buses de autos particulares |

### 

### **2.5 Condiciones para que un trayecto sea medible**

Un trayecto solo produce datos confiables si se cumplen estas cuatro condiciones. Conviene verificarlas antes de prometer el indicador sobre un corredor:

1. Todos sus puntos son cámaras que leen placa. Una cámara de videovigilancia común no sirve: no produce el dato.   
2. Las cámaras leen el sentido del trayecto. Una cámara orientada al sentido contrario no aporta nada.   
3. Los relojes están sincronizados. El cálculo es una resta de horas entre dos cámaras. Si un reloj está corriendo 10 segundos, todos los tiempos de ese tramo salen corridos 10 segundos. En un tramo corto, eso puede ser un 30% de error.   
4. Hay flujo suficiente. Un tramo por donde pasan 6 vehículos en 5 minutos no va a producir un indicador estable (paso 4 del cálculo). 

## **3\. De dónde salen las placas**

### **3.1 Dos formas de obtener las lecturas**

La plataforma NEURAL SERVER entrega los datos de dos maneras, y las dos sirven:

* Nos las envía en el momento. Cada vez que una cámara lee una placa, la plataforma manda ese dato solo, en el instante en que el vehículo pasa.   
* Se las consultamos después. La plataforma guarda todas las lecturas en su base de datos, y se le pueden pedir por rango de fechas y por cámara. Sirve para el histórico, para recalcular y para rellenar huecos si el envío en vivo se interrumpió. 

### **3.2 Qué trae cada lectura**

De todo lo que trae una lectura, el cálculo necesita cinco datos:

| Dato | Para qué se usa |
| :---- | :---- |
| Fecha y hora | Es la base del cálculo: el tiempo de recorrido es la resta de dos horas |
| Placa | Es lo que permite reconocer que es el mismo vehículo en las dos cámaras |
| Cámara | Identifica el punto de lectura |
| Sentido (se acerca / se aleja / desconocido) | Descarta los vehículos que van en contra del trayecto |
| Confianza de la lectura | Descarta las placas mal leídas |

La plataforma trae además dos datos opcionales que agregan valor sin costo:

| Dato | Para qué sirve |
| :---- | :---- |
| Tipo y clase de vehículo (auto, bus, taxi, camión) | Permite reportar el tiempo de recorrido separado por tipo de vehículo |
| Velocidad instantánea del vehículo | Control de sanidad: velocidad normal en las dos cámaras pero tiempo de recorrido enorme significa que el vehículo se detuvo en el camino |

No se necesitan imágenes. El cálculo no las usa, y traerlas sería mover archivos grandes sin ninguna ganancia.

### 

### **3.3 No se piden placas: llega todo**

Hay un punto importante que conviene dejar claro: no se le puede pedir a la plataforma "dame estas placas". No hay una lista de vehículos de interés.

Lo que llega es el flujo completo de todo lo que pasó frente a esas cámaras. La selección de qué sirve y qué no la hace el sistema después, y no la hace por placa (sección 4).

## **4\. Qué lecturas entran al cálculo**

### **4.1 Filtros de entrada**

De todo lo que llega, primero se descarta lo que no sirve:

| Se descarta | Por qué |
| :---- | :---- |
| Cámaras que no son puntos del trayecto | No aportan a este cálculo |
| Lecturas de confianza baja | La placa probablemente está mal leída, y una placa mal leída nunca va a encontrar su pareja |
| Sentido contrario o desconocido | Ese vehículo no va por el trayecto |
| Lecturas repetidas del mismo paso | La misma placa, en la misma cámara, dentro de unos segundos, es un solo vehículo pasando una vez. Se conserva la de mayor confianza y se descartan las demás |

El último filtro no es opcional. La plataforma puede reportar varias lecturas del mismo paso si reconoció la placa en varios fotogramas. Sin juntarlas, después aparecen tiempos de recorrido de casi cero.

### **4.2 El emparejamiento es lo que selecciona**

Con las lecturas que sobreviven, lo que decide qué placa entra al cálculo es si aparece en las dos cámaras del tramo:

* Aparece en la cámara de entrada y también en la de salida:  produce una medición.   
* Aparece en una sola: se descarta. 

No se eligen vehículos. Los vehículos se eligen solos por dónde pasaron. Las placas son anónimas para el cálculo: no interesa quién es, interesa que el mismo haya pasado por dos puntos.

### **4.3 El embudo, con números**

Así se ve un tramo real en un intervalo de 5 minutos:

Cámara de entrada

| Paso | Quedan |
| ----- | ----- |
| Lecturas que llegan | 420 |
| Se juntan las repetidas del mismo paso | 350 |
| Se quitan las de confianza baja | 320 |
| Se quitan las de sentido contrario o desconocido | 300 |

Cámara de salida: el mismo embudo, quedan 290\.

Cruce de las dos cámaras

| Paso | Quedan |
| :---- | :---- |
| Placas que están en la entrada y en la salida, en ese orden | 78 |
| Se quitan las que tardaron menos del mínimo o más del máximo | 72 |
| Se quitan las que se alejan mucho del resto | 70 |

De 420 lecturas que entraron, 70 terminan siendo mediciones de tiempo de recorrido.

Las 230 de la cámara de entrada que no encontraron pareja no son un error: son vehículos que giraron antes, se metieron a una calle lateral, estacionaron, o que la segunda cámara no leyó bien. Es el comportamiento normal del tráfico urbano.

## **5\. El cálculo, paso a paso**

El cálculo se hace tramo por tramo, y al final se juntan los tramos.

### **Paso 1: Emparejar la misma placa en las dos cámaras del tramo**

Se buscan placas que aparezcan en la cámara de entrada y también en la de salida, con la salida después de la entrada.

tiempo del vehículo \= hora en la cámara de salida − hora en la cámara de entrada

Si una placa aparece varias veces en el intervalo, cada entrada se empareja con la primera salida posterior, y esas dos lecturas quedan usadas. Así una placa que pasa tres veces produce tres mediciones, no nueve.

### **Paso 2:  Descartar lo que no es creíble**

Se aplican los dos límites del tramo definidos en la sección 2.2:

* Por debajo del mínimo: error de lectura o relojes desfasados.   
* Por encima del máximo: el vehículo se detuvo o se desvió. 

### **Paso 3: Resumir el intervalo con la mediana, no con el promedio**

Se juntan todas las mediciones válidas de un intervalo de 5 minutos. Ejemplo de un intervalo, en segundos:

78   82   85   88   91   95   250

* Promedio \= 110 s   
* Mediana (el valor del medio) \= 88 s 

El promedio quedó en 110 s por culpa de un solo vehículo de 250 s, cuando la gran mayoría tardó entre 78 y 95 s. Un vehículo que se detuvo a cargar un pasajero no debe mover el indicador de todo el corredor.

Se usa siempre la mediana. Después de tenerla, los valores que quedan muy lejos de ella se descartan y se recalcula: aquí sale el 250, y el tramo queda en 87 s.

### **Paso 4: Exigir un mínimo de vehículos**

Si en el intervalo se emparejaron menos de 5 vehículos, el dato no se publica: el intervalo queda como "sin dato".

Sin datos no es cero. Un intervalo con 2 vehículos no es información de tráfico, es ruido, y publicarlo como si fuera medición hace que el gráfico mienta justo en las horas de poco flujo.

### **Paso 5: Armar el trayecto completo**

Hay dos maneras de obtener el tiempo del trayecto completo, y conviene calcular las dos:

| Modo | Cómo | Ventaja | Desventaja |
| :---- | :---- | :---- | :---- |
| Sumando tramos | Se suman las medianas de cada tramo del mismo intervalo | Hay muchas más mediciones disponibles, porque ningún vehículo necesita hacer el recorrido completo. Casi siempre tiene dato | Mezcla vehículos distintos: nadie recorrió exactamente ese tiempo |
| Punta a punta | Se emparejan directamente la primera y la última cámara, ignorando las del medio | Es el tiempo que realmente vivió un conductor | Muy pocos vehículos hacen todo el trayecto, así que muchas veces no llega al mínimo de 5 y no hay dato |

Lo práctico es mostrar la suma de tramos como valor principal y el punta a punta como comprobación. Lo que no se puede es mostrar uno en una pantalla y el otro en otra sin decir cuál es cuál: son dos números distintos del mismo corredor.

### **Paso 6: Derivar velocidad media y comparación con lo normal**

**velocidad media** \= distancia total del trayecto ÷ tiempo del trayecto

**exceso sobre lo normal** \= tiempo del trayecto ÷ tiempo de referencia del trayecto

La velocidad media se deriva del tiempo, nunca se informa ni se mide aparte.

## **6\. Ejemplo completo**

Trayecto de 3 cámaras sobre una avenida, intervalo de 08:00 a 08:05.

Definición del trayecto

| Tramo | Distancia | Velocidad vía | Tiempo de referencia | Mínimo | Máximo |
| :---- | :---- | :---- | :---- | :---- | :---- |
| C1, C2 | 900 m | 50 km/h | 65 s | 50 s | 325 s |
| C2, C3 | 600 m | 50 km/h | 43 s | 33 s | 215 s |
| Total | 1.500 m |  | 108 s |  |  |

Resultado del intervalo

| Tramo | Vehículos emparejados | Mediana |
| :---- | :---- | :---- |
| C1, C2 | 70 | 87 s |
| C2, C3 | 64 | 55 s |
| Trayecto |  | 142 s |

Indicadores publicados para las 08:00 \- 08:05

| Indicador | Valor |
| :---- | :---- |
| Tiempo de recorrido | 142 s (2 min 22 s) |
| Velocidad media | 38 km/h |
| Exceso sobre lo normal | 31% más que los 108 s de referencia |
| Vehículos que respaldan el dato | 70 y 64 por tramo |
| Porcentaje de emparejamiento | 26% |

Ese 31% es lo que sirve para decir si el corredor está bien o mal, y es la cifra que se compara antes y después de un cambio de semaforización.

## **7\. Qué se guarda y qué se descarta**

Esta parte importa porque las placas son datos personales.

| Dato | Cuánto vive |
| :---- | :---- |
| Lectura individual con la placa | Solo mientras el vehículo todavía podría llegar a la cámara siguiente. Pasado el tiempo máximo del tramo, la lectura ya no sirve para nada y se descarta |
| Medición individual de un vehículo | No se guarda a largo plazo |
| Resultado del intervalo | Se guarda permanentemente. Es un número por tramo y por intervalo, y ahí ya no hay ninguna placa |
| Imágenes de los vehículos | No se traen ni se guardan |

Lo que queda en el histórico es de la forma: ***"08:00 a 08:05, el tramo C1, C2 tardó 87 segundos, medido con 70 vehículos"***. Ese dato ya no identifica a nadie, y es todo lo que necesitan los reportes y las comparaciones.

Además, la placa no se guarda en texto legible ni siquiera durante esos minutos: se reemplaza por un código irreversible que sirve para reconocer que dos lecturas son del mismo vehículo, pero del que no se puede volver a la placa original.

## **8\. Señales de que el dato no es confiable**

Junto al indicador conviene mostrar siempre con cuántos vehículos se calculó y qué porcentaje de emparejamiento tuvo. Un tiempo calculado con 4 vehículos y otro calculado con 70 se ven idénticos en la pantalla, pero solo uno de los dos significa algo.

El porcentaje de emparejamiento en zona urbana suele estar entre el 10% y el 30%. No importa tanto su valor exacto como su estabilidad: si un tramo venía en 26% y cae a 3%, el indicador que sigue publicando ya no es confiable. Las causas habituales son:

* Una cámara se ensució, se movió o se desenfocó y está leyendo mal;   
* El sentido de circulación quedó mal configurado en uno de los puntos;   
* Los relojes de las dos cámaras se desfasaron y los tiempos caen fuera de los límites;   
* Una de las cámaras dejó de enviar lecturas. 

Hay un caso que ningún filtro resuelve: un vehículo puede pasar por la primera y la última cámara sin haber ido por el trayecto, porque tomó una ruta paralela. Con solo dos cámaras es imposible distinguirlo. Con tres o más puntos sí: se exige que la placa aparezca también en los puntos intermedios y en orden. Ese es el argumento práctico para poner un punto de lectura intermedio aunque el indicador no lo necesite.

## **9\. Decisiones pendientes**

Estas decisiones cambian el resultado y hay que cerrarlas antes de construir:

| Decisión | Opciones | Impacto |
| :---- | :---- | :---- |
| Cuál de los dos modos del paso 5 es el oficial del reporte | Suma de tramos / punta a punta | Son dos números distintos del mismo corredor; el reporte contractual necesita uno solo |
| Duración del intervalo | 5 min / 15 min | Intervalos más largos dan datos más estables y menos "sin dato", pero reaccionan más despacio |
| Mínimo de vehículos por intervalo | 5 propuesto | Más alto es más confiable pero deja más intervalos vacíos |
| Umbral de confianza de la lectura | A calibrar en campo | Más exigente pierde mediciones; más laxo mete placas mal leídas |
| Si se reporta separado por tipo de vehículo | Sí / no / solo buses | Cambia las pantallas y los reportes, no el cálculo |
| Zona horaria y sincronización de relojes de las cámaras | A confirmar con la plataforma | Es el único punto que puede invalidar el cálculo entero de forma silenciosa |
| Qué corredores tienen hoy cámaras de placa en los dos extremos | Levantamiento pendiente | Define qué trayectos se pueden ofrecer en la primera entrega |

