import express from "express";
import cors from "cors";

const app = express();

app.use(cors());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "GeoPortal API funcionando"
  });
});

export default app;