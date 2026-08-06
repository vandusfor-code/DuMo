# Scripts de venta WOM

## Documento oficial (referencia interna)

- Word: `source/portabilidad-sin-equipo.docx`
- Texto extraído: `source/portabilidad-sin-equipo.raw.txt`
- Copia legacy: `portabilidad-sin-equipo.official.ts` (solo referencia — **no se muestra en pantalla**)

## Motor conversacional (teleprompter)

El discurso que lee la asesora se genera en:

`src/lib/sales-script/flows/portabilidad-sin-equipo.flow.ts`

Reglas:

- El documento oficial es fuente de contenido, nunca se muestra literalmente.
- Beneficios y precios salen del catálogo comercial (`commercialText`, `promotions`, `specs`).
- Variables se resuelven en `src/lib/sales-script/context.ts`.
- Pasos con bifurcación Sí/No se resuelven en la UI (`sales-script-tab.tsx`).
