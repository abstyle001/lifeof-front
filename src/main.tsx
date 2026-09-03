import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import { DesktopRuntime } from "./components/DesktopRuntime";
import { AuthProvider } from "./lib/auth";
import { isDesktop } from "./lib/runtime";
import "./index.css";

const Router = isDesktop ? HashRouter : BrowserRouter;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router>
      <AuthProvider>
        <DesktopRuntime />
        <App />
      </AuthProvider>
    </Router>
  </StrictMode>,
);
