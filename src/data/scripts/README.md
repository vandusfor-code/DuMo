# Scripts oficiales de venta

## Fuente

Documento Word en `source/portabilidad-sin-equipo.docx`  
Texto extraído en `source/portabilidad-sin-equipo.raw.txt`

## Plantilla estructurada

La redacción oficial vive en `portabilidad-sin-equipo.official.ts`.  
Cada sección del documento es un paso con variables `{{nombre_cliente}}`, `{{plan}}`, etc.

## Regenerar texto desde Word

```bash
python scripts/extract-official-script.py
```

Luego revisar/actualizar `portabilidad-sin-equipo.official.ts` si el documento cambió.

## Motor

- `src/lib/sales-script/engine.ts` — construye pasos y payload `{ tipo, pasos[] }`
- `src/lib/sales-script/context.ts` — variables desde Gestión, Cliente, catálogos
- Beneficios/promociones/precios **nunca** en código: solo catálogo comercial

## Futuros flujos

Mismo motor, distinto archivo oficial:

- `PORTABILIDAD_CON_EQUIPO`
- `LINEA_NUEVA`
- `RENOVACION`
