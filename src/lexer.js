// src/lexer.js
import { TOKEN_TYPES as T } from "./tokens.js";

const ID_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

// tags válidos
const VALID_TAGS = [
  "funcion",
  "/funcion",
  "parametros",
  "/parametros",
  "codigo",
  "/codigo",
  "if",
  "/if",
  "do",
  "/do",
  "condicion",
  "/condicion",
];

export function lex(input) {
  const tokens = [];
  const lexErrors = [];

  let line = 1;
  let col = 1;
  let i = 0;
  const len = input.length;

  function addToken(type, value = null) {
    tokens.push({ type, value, line, col });
  }

  function addError(msg, value) {
    lexErrors.push({ line, col, msg, value });
  }

  while (i < len) {
    const ch = input[i];

    // saltos de línea
    if (ch === "\n") {
      line++;
      col = 1;
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }

    // espacios
    if (ch === " " || ch === "\t" || ch === "\f") {
      col++;
      i++;
      continue;
    }

    // =========================
    // TAGS o posible "< ="
    // =========================
    if (ch === "<") {
      // ¿es un tag real?
      const rest = input.slice(i + 1, i + 1 + 30).toLowerCase();
      const maybe = VALID_TAGS.find(tag => rest.startsWith(tag + ">"));
      if (maybe) {
        const closeIdx = input.indexOf(">", i);
        const tagText = input.slice(i, closeIdx + 1).toLowerCase();
        switch (tagText) {
          case "<funcion>": addToken(T.TAG_FUNC_OPEN); break;
          case "</funcion>": addToken(T.TAG_FUNC_CLOSE); break;
          case "<parametros>": addToken(T.TAG_PARAMS_OPEN); break;
          case "</parametros>": addToken(T.TAG_PARAMS_CLOSE); break;
          case "<codigo>": addToken(T.TAG_CODE_OPEN); break;
          case "</codigo>": addToken(T.TAG_CODE_CLOSE); break;
          case "<if>": addToken(T.TAG_IF_OPEN); break;
          case "</if>": addToken(T.TAG_IF_CLOSE); break;
          case "<do>": addToken(T.TAG_DO_OPEN); break;
          case "</do>": addToken(T.TAG_DO_CLOSE); break;
          case "<condicion>": addToken(T.TAG_COND_OPEN); break;
          case "</condicion>": addToken(T.TAG_COND_CLOSE); break;
          default:
            addError("Etiqueta desconocida: " + tagText, tagText);
            addToken(T.UNKNOWN, tagText);
        }
        const consumed = closeIdx - i + 1;
        col += consumed;
        i = closeIdx + 1;
        continue;
      }

      // 👇 aquí viene tu caso real: "< = 10"
      let j = i + 1;
      while (j < len && /\s/.test(input[j])) j++;
      if (j < len && input[j] === "=") {
        // "< ="  -> "<="
        addToken(T.LE);
        col += (j - i + 1);
        i = j + 1;
        continue;
      }

      // si no era tag ni "< =", es un "<" normal
      addToken(T.LT);
      i++;
      col++;
      continue;
    }

    // =========================
    // cadenas
    // =========================
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      let strVal = "";
      let ok = false;
      while (j < len) {
        if (input[j] === quote) { ok = true; break; }
        if (input[j] === "\n") { line++; col = 1; }
        strVal += input[j];
        j++;
      }
      if (!ok) {
        addError("Cadena sin cerrar", strVal);
        i = j;
        continue;
      }
      addToken(T.STRING, strVal);
      const consumed = j - i + 1;
      col += consumed;
      i = j + 1;
      continue;
    }

    // =========================
    // operadores de 2 chars pegados
    // =========================
    const two = input.slice(i, i + 2);
    if (two === "==") { addToken(T.EQ); i += 2; col += 2; continue; }
    if (two === "!=") { addToken(T.NEQ); i += 2; col += 2; continue; }
    if (two === ">=") { addToken(T.GE); i += 2; col += 2; continue; }
    if (two === "<=") { addToken(T.LE); i += 2; col += 2; continue; }
    if (two === "&&") { addToken(T.AND); i += 2; col += 2; continue; }
    if (two === "||") { addToken(T.OR); i += 2; col += 2; continue; }

    // =========================
    // caso especial: "=" con espacios → "<" o ">"
    // =========================
    if (ch === "=") {
      let j = i + 1;
      while (j < len && /\s/.test(input[j])) j++;
      // "= <" o "=<"
      if (j < len && input[j] === "<") {
        addToken(T.LE);
        col += (j - i + 1);
        i = j + 1;
        continue;
      }
      // "= >" o "=>"
      if (j < len && input[j] === ">") {
        addToken(T.GE);
        col += (j - i + 1);
        i = j + 1;
        continue;
      }
      // si no, es "="
      addToken(T.ASSIGN);
      i++;
      col++;
      continue;
    }

    // =========================
    // operadores simples
    // =========================
    if (ch === ">") { addToken(T.GT); i++; col++; continue; }
    if (ch === "+") { addToken(T.PLUS); i++; col++; continue; }
    if (ch === "-") { addToken(T.MINUS); i++; col++; continue; }
    if (ch === "*") { addToken(T.TIMES); i++; col++; continue; }
    if (ch === "/") { addToken(T.DIV); i++; col++; continue; }
    if (ch === ",") { addToken(T.COMMA); i++; col++; continue; }
    if (ch === ";") { addToken(T.SEMI); i++; col++; continue; }

    // =========================
    // números (con 4.5.3)
    // =========================
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < len && /[0-9]/.test(input[j])) j++;

      // si viene algo como 4.5.3 lo capturamos completo y lo marcamos
      if (j < len && input[j] === ".") {
        let k = j + 1;
        while (k < len && /[0-9.]/.test(input[k])) k++;
        const bad = input.slice(i, k);
        addError("Número mal formado: " + bad, bad);
        addToken(T.UNKNOWN, bad);
        col += (k - i);
        i = k;
        continue;
      }

      // número normal
      addToken(T.NUM, Number(input.slice(i, j)));
      col += (j - i);
      i = j;
      continue;
    }

    // =========================
    // identificadores / and / or
    // =========================
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < len && /[A-Za-z0-9_]/.test(input[j])) j++;
      const word = input.slice(i, j);
      const lower = word.toLowerCase();
      if (lower === "and") {
        addToken(T.AND);
      } else if (lower === "or") {
        addToken(T.OR);
      } else if (ID_REGEX.test(word)) {
        addToken(T.ID, word);
      } else {
        addError("Identificador inválido: " + word, word);
        addToken(T.UNKNOWN, word);
      }
      col += (j - i);
      i = j;
      continue;
    }

    // =========================
    // cualquier otro char raro
    // =========================
    addError("Carácter no reconocido: " + ch, ch);
    addToken(T.UNKNOWN, ch);
    i++;
    col++;
  }

  // EOF
  addToken(T.EOF);
  return { tokens, lexErrors };
}
