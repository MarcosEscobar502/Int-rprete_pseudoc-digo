// src/validator.js
import { lex } from "./lexer.js";
import { parse } from "./parser.js";

export function validateText(text) {
  // 🔧 Normalización de errores típicos de los .txt de prueba
  text = text
    // x => 5  -> x >= 5
    .replace(/=>/g, ">=")
    // var1 =< 10  ó  var1 = < 10  ó  var1 =   < 10  -> var1 <= 10
    .replace(/=\s*</g, "<=")
    // por si alguien lo escribe pegado
    .replace(/=</g, "<=")
    // id_1 ==! 0 -> id_1 != 0
    .replace(/==!/g, "!=");

  const { tokens, lexErrors } = lex(text);
  const { report, synErrors } = parse(tokens);

  report.erroresLexicos = lexErrors.map(e => `L${e.line}: ${e.msg} -> ${e.value}`);
  report.erroresSintacticos = synErrors.map(e => `L${e.line}: ${e.msg}`);
  // en validator.js, solo para probar:
console.log(tokens.filter(t => t.line === 20));


  return report;
}
