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

  // PROGRAMA
  while (peek().type !== T.EOF) {
    parseFuncion();
  }

  // ======================================
  // <funcion> ... </funcion>
  // ======================================
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

  // ======================================
  // parámetros tolerantes
  // ======================================
  function parseParamListLoose() {
    let first = true;
    while (peek().type !== T.TAG_PARAMS_CLOSE && peek().type !== T.EOF) {
      if (!first) match(T.COMMA);
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

  // ======================================
  // sentencias de <codigo>
  // ======================================
  function parseSentencia() {
    const tk = peek();

    // asignación
    if (tk.type === T.ID) {
      parseAsignacion();
      return;
    }

    // if
    if (tk.type === T.TAG_IF_OPEN) {
      parseIf();
      return;
    }

    // do
    if (tk.type === T.TAG_DO_OPEN) {
      parseDo();
      return;
    }

    // basura del lexer (@, #, ¡, %)
    if (tk.type === T.UNKNOWN) {
      synErrors.push({
        line: tk.line,
        col: tk.col,
        msg: "Sentencia no reconocida en <codigo>",
      });
      current++;
      // nos comemos todo hasta ';' o fin de <codigo>
      while (
        peek().type !== T.SEMI &&
        peek().type !== T.TAG_CODE_CLOSE &&
        peek().type !== T.EOF
      ) {
        current++;
      }
      if (peek().type === T.SEMI) current++;
      return;
    }

    // cualquier otra cosa
    synErrors.push({
      line: tk.line,
      col: tk.col,
      msg: "Sentencia no reconocida en <codigo>",
    });
    current++;
  }

  // ======================================
  // asignación: id = expr ;
  // (ahora con sincronización)
  // ======================================
  function parseAsignacion() {
    const idTk = match(T.ID);
    expect(T.ASSIGN, "Se esperaba '=' en asignación");
    const okExpr = parseExpr();
    let semi = match(T.SEMI);

    // si no había ';', nos tragamos todo hasta ';' o cierre de <codigo>
    if (!semi) {
      while (
        peek().type !== T.SEMI &&
        peek().type !== T.TAG_CODE_CLOSE &&
        peek().type !== T.EOF
      ) {
        current++;
      }
      if (peek().type === T.SEMI) {
        semi = match(T.SEMI);
      }
    }

    const ok = !!idTk && okExpr && !!semi;
    if (ok) report.asignacionesValidas++;
    else report.asignacionesInvalidas++;
  }

  // ======================================
  // if
  // ======================================
  function parseIf() {
    expect(T.TAG_IF_OPEN, "Se esperaba <if>");
    expect(T.TAG_COND_OPEN, "Se esperaba <condicion> dentro de <if>");

    const condOK = parseCondicion();

    // recuperación: saltar hasta </condicion> si quedó mal
    if (peek().type !== T.TAG_COND_CLOSE) {
      while (peek().type !== T.TAG_COND_CLOSE && peek().type !== T.EOF) {
        current++;
      }
    }

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

  // ======================================
  // do ... while
  // ======================================
  function parseDo() {
    expect(T.TAG_DO_OPEN, "Se esperaba <do>");
    expect(T.TAG_CODE_OPEN, "Se esperaba <codigo> dentro de <do>");

    while (peek().type !== T.TAG_CODE_CLOSE && peek().type !== T.EOF) {
      parseSentencia();
    }

    expect(T.TAG_CODE_CLOSE, "Se esperaba </codigo> en <do>");
    expect(T.TAG_COND_OPEN, "Se esperaba <condicion> en <do>");

    const condOK = parseCondicion();

    if (peek().type !== T.TAG_COND_CLOSE) {
      while (peek().type !== T.TAG_COND_CLOSE && peek().type !== T.EOF) {
        current++;
      }
    }

    expect(T.TAG_COND_CLOSE, "Se esperaba </condicion> en <do>");
    expect(T.TAG_DO_CLOSE, "Se esperaba </do>");

    if (condOK) report.doValidos++;
    else report.doInvalidos++;
  }

  // ======================================
  // condicion
  // ======================================
  function parseCondicion() {
    let ok = true;
    const first = parseCondFactor();
    if (!first) ok = false;

    while (peek().type === T.AND || peek().type === T.OR) {
      current++;
      const next = parseCondFactor();
      if (!next) ok = false;
    }

    if (ok) report.condicionesValidas++;
    else report.condicionesInvalidas++;
    return ok;
  }

  function parseCondFactor() {
    const leftOk = parseExpr();
    const op = peek();

    if (
      op.type === T.EQ ||
      op.type === T.NEQ ||
      op.type === T.GT ||
      op.type === T.LT ||
      op.type === T.GE ||
      op.type === T.LE
    ) {
      current++;
    } else {
      synErrors.push({
        line: op.line,
        col: op.col,
        msg: "Operador relacional inválido en <condicion>",
      });
      current++;
      return false;
    }

    const rightOk = parseExpr();
    return leftOk && rightOk;
  }

  // ======================================
  // expr
  // ======================================
  function parseExpr() {
    let ok = false;
    const tk = peek();

    if (tk.type === T.ID || tk.type === T.NUM || tk.type === T.STRING) {
      ok = true;
      current++;
    } else if (tk.type === T.UNKNOWN) {
      current++;
    } else {
      return false;
    }

    while (
      peek().type === T.PLUS ||
      peek().type === T.MINUS ||
      peek().type === T.TIMES ||
      peek().type === T.DIV
    ) {
      current++;
      const right = peek();
      if (right.type === T.ID || right.type === T.NUM) {
        current++;
      } else {
        ok = false;
        break;
      }
    }

    return ok;
  }

  return { report, synErrors };
}
