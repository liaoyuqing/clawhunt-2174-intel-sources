import React from "react";
import { createRoot } from "react-dom/client";
import "tdesign-react/es/style/index.css";
import "./styles/intel-sources.css";
import { App } from "./App";

const host = document.getElementById("root");
if (!host) {
  throw new Error("root container missing");
}

createRoot(host).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
