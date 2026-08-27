/** Prompt para ChatGPT: extraer equipos de imagen → filas tabuladas para la plantilla Excel. */
export const EQUIPMENT_AI_IMPORT_PROMPT = `ACTÚA COMO UN EXTRACTOR DE DATOS PARA EL CRM DUMO.

Voy a adjuntar una imagen que contiene una lista de equipos celulares con información comercial, precios, cuotas, memoria, colores y otros datos.

TU ÚNICO OBJETIVO ES EXTRAER LA INFORMACIÓN VISIBLE EN LA IMAGEN Y CONVERTIRLA EN FILAS LISTAS PARA PEGAR DIRECTAMENTE EN EXCEL O GOOGLE SHEETS.

IMPORTANTE:
NO debes crear una tabla Markdown.
NO debes usar comas como separadores.
NO debes usar punto y coma como separador.
NO debes agregar explicaciones antes o después.
NO debes agregar encabezados.
NO debes agregar numeración.
NO debes agregar viñetas.

Debes devolver ÚNICAMENTE los datos separados mediante TABULACIONES reales.

La plantilla de Excel de DuMo tiene exactamente estas columnas, en este orden:

1. Nombre comercial
2. Marca
3. Modelo
4. Valor total ($)
5. Valor del pie ($)
6. ¿Equipo con beneficio Pie Cero? (SI/NO)
7. Cantidad de cuotas
8. Valor de cada cuota ($)
9. Texto comercial (para Asistente de Venta)
10. Color
11. Memoria
12. Promociones
13. Observaciones
14. Estado

Cada fila que generes debe corresponder exactamente a esas 14 columnas.

REGLA FUNDAMENTAL:
Cada combinación de equipo + color debe convertirse en UNA FILA INDEPENDIENTE.

Ejemplo:
Si la imagen dice:

Motorola Moto G56 5G
256 GB
Azul y verde

NO debes crear una sola fila con "Azul y verde".

Debes crear:

Motorola Moto G56 5G | ... | Azul | ...
Motorola Moto G56 5G | ... | Verde | ...

La separación entre cada campo debe ser una TABULACIÓN REAL.

==================================================
REGLAS DE EXTRACCIÓN
==================================================

1. NOMBRE COMERCIAL

Extrae el nombre comercial exactamente como aparece en la imagen.

Ejemplo:
Xiaomi Redmi A7 Pro 4G

2. MARCA

Identifica la marca correspondiente:

Xiaomi
Samsung
Motorola
Honor
etc.

No inventes marcas.

3. MODELO

Extrae el modelo del equipo.

Ejemplo:

Nombre comercial:
Samsung Galaxy A17 5G

Modelo:
Galaxy A17 5G

4. VALOR TOTAL ($)

En las listas de precios, normalmente aparecerán valores como:

Cuota Inicial
18 cuotas
Total a pagar

El campo "Valor total ($)" corresponde a "Total a pagar".

Ejemplo:

$178.380 → 178380

IMPORTANTE:
No coloques el símbolo $.
No coloques puntos de miles.
No coloques comas.
Solo números.

5. VALOR DEL PIE ($)

Corresponde a "Cuota Inicial".

Ejemplo:

$0 → 0

6. PIE CERO

Si la cuota inicial es $0 y la imagen indica o permite identificar que el equipo tiene beneficio de Pie Cero, escribe:

SI

Si no corresponde:

NO

No inventes promociones de Pie Cero cuando la imagen no lo indique.

7. CANTIDAD DE CUOTAS

Extrae el número de cuotas.

Ejemplo:

18 cuotas → 18

8. VALOR DE CADA CUOTA

Extrae el valor mostrado para las cuotas.

Ejemplo:

$9.910 → 9910

IMPORTANTE:
No coloques símbolo $.
No coloques puntos.
No coloques comas.

9. TEXTO COMERCIAL

Genera un texto comercial corto utilizando ÚNICAMENTE información disponible en la imagen.

Debe ser útil para el Asistente de Venta de DuMo.

Ejemplo:

"Xiaomi Redmi A7 Pro 4G de 128 GB, disponible con Pie Cero y 18 cuotas de $9.910."

NO inventes:
- RAM
- procesador
- cámara
- batería
- pantalla
- características técnicas
- promociones
- beneficios

si no aparecen en la imagen.

10. COLOR

Cada color debe ser una fila independiente.

Ejemplo:

"Oro y plata"

se convierte en:

Oro
Plata

Ejemplo:

"Azul y verde"

se convierte en:

Azul
Verde

Ejemplo:

"Negro y gris"

se convierte en:

Negro
Gris

11. MEMORIA

Extrae exactamente la memoria indicada.

Ejemplo:

128 GB
256 GB

Conserva el formato:

128 GB
256 GB

12. PROMOCIONES

Extrae únicamente las promociones o etiquetas que estén asociadas al equipo.

Por ejemplo:

Nuevo
Cambio de precio
Mantiene precio

Si aparece "Nuevo", coloca:

Nuevo

Si aparece "Cambio de precio", coloca:

Cambio de precio

Si aparece "Mantiene precio", coloca:

Mantiene precio

Si existen varias etiquetas asociadas al mismo equipo, sepáralas con " / ".

NO inventes promociones.

13. OBSERVACIONES

Coloca información adicional visible en la imagen que no tenga un campo específico en la plantilla.

Si no existe información adicional:

deja la celda VACÍA.

NO inventes información.

14. ESTADO

Si la imagen corresponde claramente a una lista vigente de equipos para venta y no existe ninguna indicación de producto inactivo, utiliza:

Activo

Si la imagen indica explícitamente que un equipo está inactivo, utiliza:

Inactivo

==================================================
REGLA SOBRE STOCK
==================================================

La plantilla de DuMo NO tiene una columna de stock.

Aunque la imagen muestre "Stock", NO debes incluirlo como columna adicional.

NO debes agregar ninguna columna.

Si el stock aparece en la imagen, ignóralo.

==================================================
REGLA SOBRE COLORES Y STOCK
==================================================

MUY IMPORTANTE:

Si un equipo tiene varios colores y la imagen solamente muestra un stock total para el modelo, NO repartas ese stock entre los colores.

NO inventes cuánto stock corresponde a cada color.

Simplemente repite la información comercial del equipo y crea una fila independiente para cada color.

==================================================
REGLA SOBRE INFORMACIÓN NO VISIBLE
==================================================

NO INVENTES DATOS.

Si un campo no puede determinarse con seguridad a partir de la imagen:

déjalo vacío.

No hagas suposiciones.

No completes especificaciones técnicas buscando información en Internet.

Trabaja ÚNICAMENTE con la información visible en la imagen.

==================================================
REGLA SOBRE VALORES
==================================================

Convierte los precios al formato numérico que Excel pueda interpretar.

Ejemplo:

$178.380 → 178380
$9.910 → 9910
$0 → 0

NO uses:

$178.380
178.380
178,380

Usa:

178380

==================================================
FORMATO FINAL OBLIGATORIO
==================================================

Tu respuesta final debe contener ÚNICAMENTE un bloque de código con las filas.

Dentro del bloque, cada campo debe estar separado por una TABULACIÓN REAL.

NO incluyas los nombres de las columnas.

NO incluyas explicaciones.

NO incluyas texto adicional.

NO incluyas una tabla Markdown.

El resultado debe poder copiarse directamente y pegarse desde la primera celda de la plantilla de Excel de DuMo.

Antes de responder, verifica internamente que:

- Cada fila tenga exactamente 14 columnas.
- Cada columna esté en el orden correcto.
- Cada equipo con varios colores tenga una fila por color.
- No haya columnas adicionales.
- No hayas inventado información.
- Los valores monetarios sean números sin puntos ni símbolos.
- Las tabulaciones sean reales.
- No hayas incluido stock.
- El resultado esté listo para copiar y pegar directamente en Excel.

Después de realizar todas las verificaciones, responde ÚNICAMENTE con los datos.`;
