export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureInboundMessageWorker } = await import("@/server/queue/inbound-worker");
    ensureInboundMessageWorker();
    const { ensureSlaWorker } = await import("@/server/queue/sla-worker");
    ensureSlaWorker();

    /**
     * Dispara la migración de esquema al arrancar el proceso, no cuando la
     * dispare la primera petición de usuario. `ensureIncrementalMigrations`
     * ya acumula suficientes pasos secuenciales contra la base remota real
     * como para tardar más que el timeout de 12s que varias rutas se dan a
     * sí mismas (Promise.race) — eso hacía que la migración pareciera
     * "saltarse" cuando en realidad solo terminaba tarde, en segundo plano,
     * después de que el request ya había fallado con 503. Con esta cabeza
     * de arranque, para cuando llega tráfico real la migración ya avanzó o
     * terminó. No bloquea el arranque del servidor (fire-and-forget) y no
     * lanza si falla — el camino de request sigue siendo la red de
     * seguridad de siempre.
     */
    const { ensureSchema } = await import("@/server/db/client");
    ensureSchema().catch((err) => {
      console.error("[instrumentation] ensureSchema al arrancar falló", err);
    });

    /**
     * Barrido periódico de presencia: si a una asesora se le "olvida"
     * marcarse desconectada (apaga el PC, cierra el navegador de golpe) deja
     * de recibir leads nuevos igual, sin depender de que alguien más esté
     * navegando la app para disparar el barrido oportunista de las rutas.
     */
    const { reconcileStalePresenceThrottled } = await import(
      "@/services/advisor-presence-sweep"
    );
    setInterval(() => {
      reconcileStalePresenceThrottled().catch((err) => {
        console.error("[instrumentation] reconcileStalePresenceThrottled falló", err);
      });
    }, 60_000);
  }
}
