import express from "express";
import { createServer as createViteServer } from "vite";
import path from "node:path";
import { app } from "./server/app.js";

async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";
  const port = Number(process.env.PORT ?? 3000);

  if (isProduction) {
    app.use(express.static(path.resolve("dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: "0.0.0.0" },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`SpecForge server running on http://0.0.0.0:${port}`);
  });

  // Maintain compatibility with scorer / verify-run scripts defaulting to 3001
  if (port === 3000) {
    try {
      const compatServer = app.listen(3001, "0.0.0.0", () => {
        console.log(`API compatibility listener on http://0.0.0.0:3001/api/v1`);
      });
      compatServer.on("error", () => {
        // Port 3001 might already be in use; ignore
      });
    } catch {
      // Ignore if cannot bind 3001
    }
  }
}

startServer();
