"use client";

import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

/**
 * Primary CTA: press scale 0.97, hover glow, disabled + spinner when loading.
 */
export default function PrimaryButton({
  children,
  loading = false,
  disabled,
  className = "",
  type = "button",
  onClick,
  ...rest
}) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-xl
        transition-[box-shadow,opacity] duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${!isDisabled ? "hover:shadow-[0_0_20px_2px_rgba(6,182,212,0.35)]" : ""}
        ${className}
      `}
      whileTap={!isDisabled ? { scale: 0.97 } : undefined}
      whileHover={!isDisabled ? { scale: 1.01 } : undefined}
      {...rest}
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" aria-hidden />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}
