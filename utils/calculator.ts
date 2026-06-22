// Safe arithmetic evaluator (no eval) — supports + - * / , parentheses and unary minus.

type Tok = { t: "num" | "op" | "lp" | "rp"; v: string };

const tokenize = (input: string): Tok[] | null => {
  const src = input
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/,/g, ".");

  const tokens: Tok[] = [];
  let i = 0;

  while (i < src.length) {
    const ch = src[i];

    if (ch === " ") {
      i++;
      continue;
    }
    if ("+-*/".includes(ch)) {
      tokens.push({ t: "op", v: ch });
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ t: "lp", v: ch });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ t: "rp", v: ch });
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = "";
      while (i < src.length && /[0-9.]/.test(src[i])) {
        num += src[i];
        i++;
      }
      if ((num.match(/\./g) || []).length > 1) {
        return null;
      }
      tokens.push({ t: "num", v: num });
      continue;
    }
    return null; // invalid character
  }

  return tokens;
};

export const evaluateExpression = (expression: string): number | null => {
  const tokens = tokenize(expression);
  if (!tokens || tokens.length === 0) {
    return null;
  }

  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  const parseExpr = (): number => {
    let value = parseTerm();
    while (peek() && peek().t === "op" && (peek().v === "+" || peek().v === "-")) {
      const op = next().v;
      const rhs = parseTerm();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  };

  const parseTerm = (): number => {
    let value = parseFactor();
    while (peek() && peek().t === "op" && (peek().v === "*" || peek().v === "/")) {
      const op = next().v;
      const rhs = parseFactor();
      value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  };

  const parseFactor = (): number => {
    const tok = peek();
    if (!tok) {
      throw new Error("unexpected end");
    }
    if (tok.t === "op" && tok.v === "-") {
      next();
      return -parseFactor();
    }
    if (tok.t === "op" && tok.v === "+") {
      next();
      return parseFactor();
    }
    if (tok.t === "num") {
      next();
      return parseFloat(tok.v);
    }
    if (tok.t === "lp") {
      next();
      const value = parseExpr();
      if (!peek() || peek().t !== "rp") {
        throw new Error("missing closing paren");
      }
      next();
      return value;
    }
    throw new Error("unexpected token");
  };

  try {
    const result = parseExpr();
    if (pos !== tokens.length || result === null || !isFinite(result)) {
      return null;
    }
    return result;
  } catch {
    return null;
  }
};

// Trim floating point noise (e.g. 0.1 + 0.2) and drop trailing zeros.
export const formatResult = (value: number): string => {
  const rounded = Math.round(value * 1e6) / 1e6;
  return String(rounded);
};
