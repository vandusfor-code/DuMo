"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { LoginLogo } from "./login-logo";
import { ApiError, apiPost } from "@/lib/api-client";
import { saveClientToken, clearClientToken } from "@/lib/auth/client-token";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

function LoginField({
  id,
  label,
  type,
  placeholder,
  icon,
  value,
  onChange,
  trailing,
}: {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <Label htmlFor={id} className="text-[14px] font-semibold text-[#111827]">
        {label}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#6B7280]">
          {icon}
        </span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "h-[60px] w-full rounded-[18px] border border-[#E8E8F0] bg-white pl-[52px] pr-5 text-[15px] text-[#111827]",
            "placeholder:text-[#6B7280]/70",
            "transition-all duration-[250ms] outline-none",
            "hover:border-[#6D28FF]/40",
            "focus:border-[#6D28FF] focus:shadow-[0_0_0_4px_rgba(109,40,255,0.12)]",
            trailing && "pr-[52px]",
          )}
        />
        {trailing}
      </div>
    </div>
  );
}

export function LoginFormPanel({ nextPath }: { nextPath?: string | null }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiPost<{ redirectTo: string; token?: string }>(
        "/api/auth/login",
        { login, password },
      );
      // Respaldo por si el navegador no guarda la cookie de sesión.
      clearClientToken();
      saveClientToken(res.token);
      // `next` solo se respeta si pertenece al área del rol del usuario; si no,
      // manda el destino por rol (evita que un admin caiga en /dashboard).
      const dest =
        nextPath && nextPath.startsWith(res.redirectTo) ? nextPath : res.redirectTo;
      // Navegación completa: garantiza que la cookie Set-Cookie del login
      // viaje en la primera petición al área protegida (evita cierre de sesión).
      window.location.assign(dest);
      return;
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo iniciar sesión. Intenta nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full justify-center lg:justify-end">
      <motion.div
        variants={container}
        initial={false}
        animate="show"
        className="w-full max-w-[620px] rounded-[32px] bg-white p-10 shadow-[0_20px_60px_rgba(109,40,255,0.10)] sm:p-12"
      >
        <motion.div variants={item} className="mb-10 flex justify-center">
          <LoginLogo variant="card" />
        </motion.div>

        <motion.div variants={item} className="mb-8 text-center">
          <h2 className="text-[36px] font-bold tracking-tight text-[#111827]">
            Iniciar sesión
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[#6B7280]">
            Accede con tus credenciales corporativas para ingresar a la plataforma.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <motion.div
              variants={item}
              className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700"
            >
              {error}
            </motion.div>
          )}

          <motion.div variants={item}>
            <LoginField
              id="login"
              label="Correo o usuario"
              type="text"
              placeholder="correo@empresa.com o usuario"
              icon={<Mail className="size-5" strokeWidth={2} />}
              value={login}
              onChange={setLogin}
            />
          </motion.div>

          <motion.div variants={item}>
            <LoginField
              id="password"
              label="Contraseña"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              icon={<Lock className="size-5" strokeWidth={2} />}
              value={password}
              onChange={setPassword}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[#6B7280] transition-colors hover:text-[#6D28FF]"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <EyeOff className="size-5" strokeWidth={2} />
                  ) : (
                    <Eye className="size-5" strokeWidth={2} />
                  )}
                </button>
              }
            />
          </motion.div>

          <motion.div variants={item} className="flex justify-end">
            <button
              type="button"
              className="text-[14px] font-medium text-[#6D28FF] transition-colors hover:text-[#5B21E6]"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </motion.div>

          <motion.div variants={item}>
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              transition={{ duration: 0.25 }}
              className="flex h-[60px] w-full items-center justify-center gap-2 rounded-[18px] bg-gradient-to-b from-[#7C3AED] to-[#6D28FF] text-[16px] font-semibold text-white shadow-[0_18px_40px_rgba(109,40,255,0.25)] transition-colors duration-[250ms] hover:from-[#6D28FF] hover:to-[#5B21E6] disabled:opacity-60"
            >
              {loading ? "Ingresando..." : "Iniciar sesión"}
              <ArrowRight className="size-5" strokeWidth={2} />
            </motion.button>
          </motion.div>
        </form>

        <motion.p
          variants={item}
          className="mt-8 text-center text-[14px] text-[#6B7280]"
        >
          ¿No tienes acceso a la plataforma?{" "}
          <button
            type="button"
            className="font-medium text-[#6D28FF] transition-colors hover:text-[#5B21E6]"
          >
            Contacta al administrador.
          </button>
        </motion.p>
      </motion.div>
    </div>
  );
}
