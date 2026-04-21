"use client";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#161616",
            color: "#f0f0f0",
            border: "1px solid #1e1e1e",
            fontFamily: "'Geist', sans-serif",
            fontSize: "13px",
          },
          success: {
            iconTheme: { primary: "#C8FF4D", secondary: "#000" },
          },
          error: {
            iconTheme: { primary: "#ff4d4d", secondary: "#000" },
          },
        }}
      />
    </SessionProvider>
  );
}
