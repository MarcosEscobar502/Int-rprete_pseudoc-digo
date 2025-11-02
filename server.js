import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { validateText } from "./src/validator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();  
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const upload = multer({ dest: path.join(__dirname, "uploads") });

app.get("/api/ping", (req, res) => {
  res.json({ ok: true, msg: "API Node.js viva" });
});

app.post("/api/validate", upload.single("file"), (req, res) => {
  const tempPath = req.file.path;
  const text = fs.readFileSync(tempPath, "utf8");
  fs.unlink(tempPath, () => {});
  const report = validateText(text);
  res.json(report);
});

app.get("/api/validate/all", (req, res) => {
  const inputsDir = path.join(__dirname, "inputs");
  const files = fs.readdirSync(inputsDir).filter(f => f.endsWith(".txt"));
  const results = files.map(f => {
    const text = fs.readFileSync(path.join(inputsDir, f), "utf8");
    const report = validateText(text);
    return { file: f, report };
  });
  res.json(results);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor web escuchando en http://localhost:" + PORT);
});
