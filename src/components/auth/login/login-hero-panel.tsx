"use client";

import { motion } from "framer-motion";
import { HERO_DESCRIPTION, LOGIN_FEATURES } from "./constants";
import { LoginFeatureCard } from "./login-feature-card";
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

export function LoginHeroPanel() {
  return (
    <motion.section
      variants={container}
      initial={false}
      animate="show"
      className="flex flex-col text-left"
    >
      <motion.div variants={item} className="mb-16">
        <LoginLogo variant="hero" />
      </motion.div>

      <motion.h1
        variants={item}
        className="text-[48px] font-bold leading-[1.1] tracking-tight text-[#111827]"
      >
        Plataforma Centralizada
      </motion.h1>

      <motion.p
        variants={item}
        className="mt-6 max-w-[540px] text-[16px] leading-relaxed text-[#6B7280]"
      >
        {HERO_DESCRIPTION}
      </motion.p>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } },
        }}
        className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2"
      >
        {LOGIN_FEATURES.map((feature) => (
          <LoginFeatureCard key={feature.title} feature={feature} />
        ))}
      </motion.div>
    </motion.section>
  );
}
