"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";

const LoadingContext = createContext(null);

const OVERLAY_DELAY_MS = 500;

export function LoadingProvider({ children }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("AI is analyzing your data...");
  const countRef = useRef(0);
  const timeoutRef = useRef(null);

  const showLoader = useCallback((msg = "AI is analyzing your data...") => {
    countRef.current += 1;
    setMessage(msg);
    if (countRef.current === 1) {
      timeoutRef.current = setTimeout(() => {
        setLoading(true);
      }, OVERLAY_DELAY_MS);
    }
  }, []);

  const hideLoader = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (countRef.current === 0) {
      setLoading(false);
    }
  }, []);

  return (
    <LoadingContext.Provider value={{ loading, setLoading: showLoader, hideLoader, showLoader, message }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    return {
      loading: false,
      setLoading: () => {},
      hideLoader: () => {},
      showLoader: () => {},
      message: "AI is analyzing your data...",
    };
  }
  return ctx;
}
