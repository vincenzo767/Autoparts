import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import "./styles/base.css";
import "./styles/auth.css";
import "./styles/customer.css";
import "./styles/chat.css";
import "./styles/admin.css";
import { ToastProvider } from "./context/ToastContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import { CurtainProvider } from "./components/Curtain.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import App from "./App.jsx";

// Apply a saved theme before the first paint so a dark choice never flashes light.
try {
  const saved = localStorage.getItem("ra-theme");
  if (saved === "light" || saved === "dark") document.documentElement.dataset.theme = saved;
} catch {
  // Storage unavailable: the device setting applies.
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename="/app">
      <MotionConfig reducedMotion="user">
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <SocketProvider>
                <CurtainProvider>
                  <App />
                </CurtainProvider>
              </SocketProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </MotionConfig>
    </BrowserRouter>
  </React.StrictMode>,
);
