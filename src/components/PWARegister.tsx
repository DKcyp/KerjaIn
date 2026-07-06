"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");

        // Reload the page when the controller changes (new SW takes control)
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });

        // If there's an updated SW waiting, tell it to skip waiting
        const tryActivate = (sw: ServiceWorker | null | undefined) => {
          if (sw && sw.state === "installed") {
            sw.postMessage({ type: "SKIP_WAITING" });
          }
        };

        // Handle update found
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed") {
              // If there's an existing controller, a new version is available
              if (navigator.serviceWorker.controller) {
                tryActivate(newWorker);
              }
            }
          });
        });

        // Also check if there's already a waiting SW (e.g., after returning to the tab)
        if (reg.waiting) tryActivate(reg.waiting);
      } catch (e) {
        // console.error('[PWA] SW register failed', e);
      }
    };
    register();
  }, []);
  return null;
}
