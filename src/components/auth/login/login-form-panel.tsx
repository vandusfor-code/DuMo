"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { LoginLogo } from "./login-logo";

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

export function LoginFormPanel() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    router.push("/dashboard");
  };

  return (
    <div className="flex w-full justify-center lg:justify-end">
      <motion.div
        variants={container}
        initial="hidden"
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
          <motion.div variants={item}>
            <LoginField
              id="email"
              label="Correo electrónico"
              type="email"
              placeholder="nombre@empresa.com"
              icon={<Mail className="size-5" strokeWidth={2} />}
              value={email}
              onChange={setEmail}
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
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.25 }}
              className="flex h-[60px] w-full items-center justify-center gap-2 rounded-[18px] bg-gradient-to-b from-[#7C3AED] to-[#6D28FF] text-[16px] font-semibold text-white shadow-[0_18px_40px_rgba(109,40,255,0.25)] transition-colors duration-[250ms] hover:from-[#6D28FF] hover:to-[#5B21E6]"
            >
              Iniciar sesión
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
