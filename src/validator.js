// src/validateText.js
import { lex } from "./lexer.js";
import { parse } from "./parser.js";

export function validateText(text) {
  // ❗ YA NO tocamos el texto
  // nada de .replace(...)

  // 1. análisis léxico
  const { tokens, lexErrors } = lex(text);

  // 2. análisis sintáctico
  const { report, synErrors } = parse(tokens);

  // 3. formatear errores como los muestra tu UI
  report.erroresLexicos = lexErrors.map(e => `L${e.line}: ${e.msg} -> ${e.value}`);
  report.erroresSintacticos = synErrors.map(e => `L${e.line}: ${e.msg}`);

  // opcional: dejar el log si estás depurando
  // console.log(tokens.filter(t => t.line === 20));

  return report;
}
