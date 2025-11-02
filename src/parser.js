// src/parser.js
import { TOKEN_TYPES as T } from "./tokens.js";

export function parse(tokens) {
  let current = 0;
  const synErrors = [];

  const report = {
    funciones: 0,
    parametrosValidos: 0,
    parametrosInvalidos: 0,
    asignacionesValidas: 0,
    asignacionesInvalidas: 0,
    ifValidos: 0,
    ifInvalidos: 0,
    doValidos: 0,
    doInvalidos: 0,
    condicionesValidas: 0,
    condicionesInvalidas: 0,
  };

  function peek() {
    return tokens[current] || tokens[tokens.length - 1];
  }

  function match(type) {
    const tk = peek();
    if (tk.type === type) {
      current++;
      return tk;
    }
    return null;
  }

  function expect(type, msg) {
    const tk = match(type);
    if (!tk) {
      const p = peek();
      synErrors.push({
        line: p.line,
        col: p.col,
        msg: `${msg} (se leyó ${p.type})`,
      });
    }
    return tk;
  }

  // ====== PROGRAMA ======
  while (peek().type !== T.EOF) {
    parseFuncion();
  }

  function parseFuncion() {
    const start = match(T.TAG_FUNC_OPEN);
    if (!start) {
      const p = peek();
      synErrors.push({ line: p.line, col: p.col, msg: "Se esperaba <funcion>" });
      current++;
      return;
    }
    report.funciones++;

    expect(T.TAG_PARAMS_OPEN, "Se esperaba <parametros>");
    parseParamListLoose();
    expect(T.TAG_PARAMS_CLOSE, "Se esperaba </parametros>");
    expect(T.TAG_CODE_OPEN, "Se esperaba <codigo>");

    while (peek().type !== T.TAG_CODE_CLOSE && peek().type !== T.EOF) {
      parseSentencia();
    }

    expect(T.TAG_CODE_CLOSE, "Se esperaba </codigo>");
    expect(T.TAG_FUNC_CLOSE, "Se esperaba </funcion>");
  }

  // ====== PARÁMETROS TOLERANTES ======
  function parseParamListLoose() {
    let first = true;
    while (peek().type !== T.TAG_PARAMS_CLOSE && peek().type !== T.EOF) {
      if (!first) {
        // si hay coma, la consumimos; si no, seguimos
        match(T.COMMA);
      }
      parseParamLoose();
      first = false;
    }
  }

  function parseParamLoose() {
    const tk = peek();
    if (tk.type === T.ID || tk.type === T.NUM) {
      report.parametrosValidos++;
      current++;
    } else {
      report.parametrosInvalidos++;
      synErrors.push({ line: tk.line, col: tk.col, msg: "Parámetro inválido" });
      current++;
    }
  }

  // ====== SENTENCIAS ======
  function parseSentencia() {
    const tk = peek();
    if (tk.type === T.ID) {
      parseAsignacion();
    } else if (tk.type === T.TAG_IF_OPEN) {
      parseIf();
    } else if (tk.type === T.TAG_DO_OPEN) {
      parseDo();
    } else {
      synErrors.push({
        line: tk.line,
        col: tk.col,
        msg: "Sentencia no reconocida en <codigo>",
      });
      current++;
    }
  }

  function parseAsignacion() {
    const idTk = match(T.ID);
    expect(T.ASSIGN, "Se esperaba '=' en asignación");
    const okExpr = parseExpr();
    const semi = match(T.SEMI);
    const ok = !!idTk && okExpr && !!semi;
    if (ok) report.asignacionesValidas++;
    else report.asignacionesInvalidas++;
  }

  function parseIf() {
    expect(T.TAG_IF_OPEN, "Se esperaba <if>");
    expect(T.TAG_COND_OPEN, "Se esperaba <condicion> dentro de <if>");
    const condOK = parseCondicion();
    expect(T.TAG_COND_CLOSE, "Se esperaba </condicion> en <if>");
    expect(T.TAG_CODE_OPEN, "Se esperaba <codigo> dentro de <if>");
    while (peek().type !== T.TAG_CODE_CLOSE && peek().type !== T.EOF) {
      parseSentencia();
    }
    expect(T.TAG_CODE_CLOSE, "Se esperaba </codigo> en <if>");
    expect(T.TAG_IF_CLOSE, "Se esperaba </if>");
    if (condOK) report.ifValidos++;
    else report.ifInvalidos++;
  }

  function parseDo() {
    expect(T.TAG_DO_OPEN, "Se esperaba <do>");
    expect(T.TAG_CODE_OPEN, "Se esperaba <codigo> dentro de <do>");
    while (peek().type !== T.TAG_CODE_CLOSE && peek().type !== T.EOF) {
      parseSentencia();
    }
    expect(T.TAG_CODE_CLOSE, "Se esperaba </codigo> en <do>");
    expect(T.TAG_COND_OPEN, "Se esperaba <condicion> en <do>");
    const condOK = parseCondicion();
    expect(T.TAG_COND_CLOSE, "Se esperaba </condicion> en <do>");
    expect(T.TAG_DO_CLOSE, "Se esperaba </do>");
    if (condOK) report.doValidos++;
    else report.doInvalidos++;
  }

  function parseCondicion() {
    let ok = true;
    const first = parseCondFactor();
    if (!first) ok = false;
    while (peek().type === T.AND || peek().type === T.OR) {
      current++; // consumimos AND/OR
      const next = parseCondFactor();
      if (!next) ok = false;
    }
    if (ok) report.condicionesValidas++;
    else report.condicionesInvalidas++;
    return ok;
  }

  // ====== AQUÍ blindamos TODAS las variantes de <= ======
  function parseCondFactor() {
    const leftOk = parseExpr();
    let op = peek();

    // 1) caso normal: el lexer ya lo dio bien
    if (
      op.type === T.EQ ||
      op.type === T.NEQ ||
      op.type === T.GT ||
      op.type === T.LT ||
      op.type === T.GE ||
      op.type === T.LE
    ) {
      current++; // consumimos operador
    }
    // 2) caso raro A: "= <"  -> lexer lo partió como ASSIGN, LT
    else if (op.type === T.ASSIGN && tokens[current + 1] && tokens[current + 1].type === T.LT) {
      current += 2; // consumimos "=" y "<"
      op = { type: T.LE };
    }
    // 3) caso raro B: "< ="  -> lexer lo partió como LT, ASSIGN (el que viste en consola)
    else if (op.type === T.LT && tokens[current + 1] && tokens[current + 1].type === T.ASSIGN) {
      current += 2; // consumimos "<" y "="
      op = { type: T.LE };
    }
    // cualquier otra cosa no es operador relacional válido
    else {
      return false;
    }

    const rightOk = parseExpr();
    return leftOk && rightOk;
  }

  function parseExpr() {
    let ok = false;
    const tk = peek();
    if (tk.type === T.ID || tk.type === T.NUM || tk.type === T.STRING) {
      ok = true;
      current++;
    } else if (tk.type === T.UNKNOWN) {
      // consumimos basura pero marcamos que no quedó perfecto
      current++;
    }

    // operaciones aritméticas opcionales
    while (
      peek().type === T.PLUS ||
      peek().type === T.MINUS ||
      peek().type === T.TIMES ||
      peek().type === T.DIV
    ) {
      current++; // operador
      const right = peek();
      if (right.type === T.ID || right.type === T.NUM) {
        current++; // operando derecho
      } else {
        ok = false;
        break;
      }
    }

    return ok;
  }

  return { report, synErrors };
}
