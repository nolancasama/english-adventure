import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { emojiManifest } from "./art/emojiManifest";
import "./fonts.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App /></React.StrictMode>,
);

// Warm the image cache (~400 KB) so picture cards never appear empty while art decodes.
for (const path of Object.values(emojiManifest)) {
  new Image().src = `${import.meta.env.BASE_URL}${path.replace(/^\//u, "")}`;
}
