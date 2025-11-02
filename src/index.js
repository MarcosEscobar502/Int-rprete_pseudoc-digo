import fs from "fs";
import { validateText } from "./validator.js";

const file = process.argv[2];
if (!file) {
  console.error("Uso: node src/index.js <archivo.txt>");
  process.exit(1);
}
const text = fs.readFileSync(file, "utf8");
const report = validateText(text);
console.log(JSON.stringify(report, null, 2));
