"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLoading } from "@/context/LoadingContext";

/**
 * Full-screen AI loading overlay. Fade in/out 300ms, blurred background,
 * center SVG stick figure + text with animated dots. Does not block render tree.
 */
function GlobalLoaderInner({ visible, message }) {
  const displayMessage = message ?? "AI is analyzing your data...";
  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          key="global-loader"
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
          aria-live="polite"
          aria-busy="true"
        >
          <motion.div
            className="flex flex-col items-center gap-6 px-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.25 }}
          >
            {/* Animated stick figure doing squats */}
            <StickFigureSquat />
            <div className="text-center">
              <p className="text-white font-medium text-lg">{displayMessage}</p>
              <span className="inline-block mt-1 text-cyan-300 text-sm loader-dots">...</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StickFigureSquat() {
  return (
    <motion.div
      className="flex items-center justify-center"
      animate={{ y: [0, 6, 0] }}
      transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-cyan-400"
        aria-hidden
      >
        <circle cx="40" cy="18" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
        <line x1="40" y1="26" x2="40" y2="44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="40" y1="32" x2="28" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="40" y1="32" x2="52" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="40" cy="44" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
        <line x1="40" y1="47" x2="32" y2="64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="40" y1="47" x2="48" y2="64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="32" y1="64" x2="30" y2="78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="48" y1="64" x2="50" y2="78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </motion.div>
  );
}

export default function GlobalLoader() {
  const { loading, message } = useLoading();
  return <GlobalLoaderInner visible={loading} message={message} />;
}
