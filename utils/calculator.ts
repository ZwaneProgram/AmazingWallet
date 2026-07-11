// Safe arithmetic evaluator (no eval) — supports + - * / , parentheses, unary
// minus and a contextual percent (phone-calculator style):
//   200 + 10%  = 220     200 - 10% = 180
//   200 * 10%  = 20      200 / 10% = 2000     50% = 0.5

type Tok = { t: "num" | "op" | "lp" | "rp" | "pct"; v: string };

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
    if (ch === "%") {
      tokens.push({ t: "pct", v: ch });
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

  // Each level returns the computed value plus `pct`, true only when the node is
  // a bare percentage (e.g. "10%"). The additive level uses that flag to apply
  // the percentage relative to its left operand.
  type Node = { value: number; pct: boolean };

  const parseExpr = (): Node => {
    let left = parseTerm();
    while (peek() && peek().t === "op" && (peek().v === "+" || peek().v === "-")) {
      const op = next().v;
      const rhs = parseTerm();
      // "a + b%" means a + (a * b/100); "a + b" is plain addition.
      const delta = rhs.pct ? left.value * rhs.value : rhs.value;
      left = { value: op === "+" ? left.value + delta : left.value - delta, pct: false };
    }
    return left;
  };

  const parseTerm = (): Node => {
    let left = parseFactor();
    while (peek() && peek().t === "op" && (peek().v === "*" || peek().v === "/")) {
      const op = next().v;
      const rhs = parseFactor();
      // "a * b%" → a * (b/100); "a / b%" → a / (b/100). rhs.value already holds
      // the b/100 fraction when it was a percentage.
      left = { value: op === "*" ? left.value * rhs.value : left.value / rhs.value, pct: false };
    }
    return left;
  };

  const parseFactor = (): Node => {
    const tok = peek();
    if (!tok) {
      throw new Error("unexpected end");
    }
    if (tok.t === "op" && tok.v === "-") {
      next();
      const f = parseFactor();
      return { value: -f.value, pct: f.pct };
    }
    if (tok.t === "op" && tok.v === "+") {
      next();
      return parseFactor();
    }

    let node: Node;
    if (tok.t === "num") {
      next();
      node = { value: parseFloat(tok.v), pct: false };
    } else if (tok.t === "lp") {
      next();
      const inner = parseExpr();
      if (!peek() || peek().t !== "rp") {
        throw new Error("missing closing paren");
      }
      next();
      node = { value: inner.value, pct: false };
    } else {
      throw new Error("unexpected token");
    }

    // A trailing % turns the factor into a fraction and flags it for the caller.
    if (peek() && peek().t === "pct") {
      next();
      node = { value: node.value / 100, pct: true };
    }
    return node;
  };

  try {
    const result = parseExpr();
    if (pos !== tokens.length || result === null || !isFinite(result.value)) {
      return null;
    }
    return result.value;
  } catch {
    return null;
  }
};

// Trim floating point noise (e.g. 0.1 + 0.2) and drop trailing zeros.
export const formatResult = (value: number): string => {
  const rounded = Math.round(value * 1e6) / 1e6;
  return String(rounded);
};
