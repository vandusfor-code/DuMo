/**
 * Fondo light con gradientes orgánicos, blur y ruido sutil.
 * Nunca compite visualmente con el formulario.
 */
export function LoginBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#FAFAFC]" aria-hidden>
      {/* Ruido sutil */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Formas orgánicas difuminadas */}
      <div className="absolute -left-32 top-[8%] size-[520px] rounded-full bg-[#6D28FF]/[0.07] blur-[120px]" />
      <div className="absolute left-[18%] top-[55%] size-[380px] rounded-full bg-[#A78BFA]/[0.12] blur-[100px]" />
      <div className="absolute -right-24 top-[12%] size-[460px] rounded-full bg-[#6D28FF]/[0.06] blur-[110px]" />
      <div className="absolute right-[10%] bottom-[8%] size-[320px] rounded-full bg-[#C4B5FD]/[0.14] blur-[90px]" />

      {/* Gradiente suave vertical */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#6D28FF]/[0.03] via-transparent to-[#7C3AED]/[0.04]" />
    </div>
  );
}
