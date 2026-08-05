"use client";

import { motion } from "framer-motion";
import type { LoginFeature } from "./constants";

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export function LoginFeatureCard({ feature }: { feature: LoginFeature }) {
  const Icon = feature.icon;

  return (
    <motion.article
      variants={item}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      className="rounded-[20px] border border-[rgba(109,40,255,0.08)] bg-[rgba(255,255,255,0.70)] p-6 backdrop-blur-[20px]"
    >
      <span className="mb-4 inline-flex size-11 items-center justify-center rounded-[14px] bg-[rgba(109,40,255,0.08)] text-[#6D28FF]">
        <Icon className="size-5" strokeWidth={2} />
      </span>
      <h3 className="text-[16px] font-semibold text-[#111827]">{feature.title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-[#6B7280]">{feature.description}</p>
    </motion.article>
  );
}
