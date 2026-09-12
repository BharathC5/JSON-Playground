/**
 * godJsonParse.js
 * Robust from-scratch JSON tokenizer + recursive-descent parser.
 * Gives exact structural errors (line/col/path/snippet/pointer).
 * Also sanitizes: NBSP, zero-width chars, BOM, trailing commas, JS-style
 * comments, single-quoted strings, and optional/smart-quote normalization.
 */

// ─── Sanitizer ────────────────────────────────────────────────────────────────

function sanitize(raw) {
  let text = raw
  const stages = []

  // BOM
  if (text.charCodeAt(0) === 0xFEFF) { text = text.slice(1); stages.push('BOM') }

  // Non-breaking spaces & zero-width chars → standard space
  const nbspRx = /[\u00A0\u202F\u2007\u2060\uFEFF\u200B\u200C\u200D\u2028\u2029]/g
  if (nbspRx.test(text)) { text = text.replace(nbspRx, ' '); stages.push('NBSP/ZWS') }

  // Smart quotes → standard quotes
  if (/[\u2018\u2019\u201C\u201D]/.test(text)) {
    text = text
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
    stages.push('SmartQuotes')
  }

  // Strip // and /* */ comments (outside strings)
  if (/\/\/|\/\*/.test(text)) {
    text = stripComments(text)
    stages.push('Comments')
  }

  // Trailing commas before } or ]
  if (/,\s*[}\]]/.test(text)) {
    text = text.replace(/,(\s*[}\]])/g, '$1')
    stages.push('TrailingCommas')
  }

  // Single-quoted keys/values → double-quoted (naive, best-effort)
  if (/'/.test(text) && !/"/.test(text.replace(/'[^']*'/g, '""'))) {
    text = text.replace(/'([^']*)'/g, '"$1"')
    stages.push('SingleQuotes')
  }

  return { text, stages }
}

function stripComments(src) {
  let out = ''
  let i = 0
  const n = src.length
  while (i < n) {
    if (src[i] === '"') {
      const start = i++
      while (i < n && src[i] !== '"') {
        if (src[i] === '\\') i++
        i++
      }
      out += src.slice(start, ++i)
    } else if (src[i] === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++
    } else if (src[i] === '/' && src[i + 1] === '*') {
      i += 2
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++
      i += 2
    } else {
      out += src[i++]
    }
  }
  return out
}

// ─── Location helper ──────────────────────────────────────────────────────────

function locate(text, pos) {
  let line = 1, lastNL = -1
  for (let i = 0; i < pos && i < text.length; i++) {
    if (text[i] === '\n') { line++; lastNL = i }
  }
  const col = pos - lastNL
  const s = Math.max(0, pos - 45)
  const e = Math.min(text.length, pos + 45)
  const snippet = text.slice(s, e).replace(/\n/g, '↵')
  const pointer = ' '.repeat(pos - s) + '^'
  return { line, col, snippet: `…${snippet}…`, pointer: `  ${pointer}` }
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class JsonSyntaxError extends Error {
  constructor(msg, meta) {
    super(msg)
    this.name = 'JsonSyntaxError'
    Object.assign(this, meta)
  }
}

// ─── Lexer ────────────────────────────────────────────────────────────────────

const T = {
  LBRACE: '{', RBRACE: '}', LBRACKET: '[', RBRACKET: ']',
  COLON: ':', COMMA: ',',
  STRING: 'STRING', NUMBER: 'NUMBER',
  TRUE: 'TRUE', FALSE: 'FALSE', NULL: 'NULL', EOF: 'EOF',
}

function createLexer(text, getPath) {
  let i = 0
  const n = text.length
  let cached = null

  const err = (msg, pos) => {
    const loc = locate(text, pos)
    throw new JsonSyntaxError(msg, { pos, ...loc, path: getPath() })
  }

  const scan = () => {
    while (i < n && '\x20\t\n\r'.includes(text[i])) i++
    if (i >= n) return { type: T.EOF, pos: n }

    const ch = text[i]
    if (ch === '{') return { type: T.LBRACE, pos: i++ }
    if (ch === '}') return { type: T.RBRACE, pos: i++ }
    if (ch === '[') return { type: T.LBRACKET, pos: i++ }
    if (ch === ']') return { type: T.RBRACKET, pos: i++ }
    if (ch === ':') return { type: T.COLON, pos: i++ }
    if (ch === ',') return { type: T.COMMA, pos: i++ }

    if (ch === '"') {
      const sp = i++
      let val = ''
      const ESC = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' }
      while (i < n && text[i] !== '"') {
        if (text[i] === '\\') {
          const esc = text[++i]
          if (esc === undefined) err('Unterminated escape sequence', i - 1)
          if (esc in ESC) { val += ESC[esc]; i++; continue }
          if (esc === 'u') {
            const h = text.slice(i + 1, i + 5)
            if (!/^[0-9a-fA-F]{4}$/.test(h)) err(`Invalid \\u escape: "\\u${h}"`, i)
            val += String.fromCharCode(parseInt(h, 16)); i += 5; continue
          }
          err(`Invalid escape character '\\${esc}'`, i)
        }
        if (text.charCodeAt(i) < 0x20) err('Unescaped control character in string', i)
        val += text[i++]
      }
      if (i >= n) err('Unterminated string literal', sp)
      i++ // closing "
      return { type: T.STRING, value: val, pos: sp }
    }

    if (ch === '-' || (ch >= '0' && ch <= '9')) {
      const sp = i
      let s = ''
      if (ch === '-') { s += ch; i++ }
      if (text[i] === '0') {
        s += text[i++]
        if (text[i] >= '0' && text[i] <= '9')
          err(`Leading zeros not allowed — did you mean ${s.replace(/^-?0+/, s[0] === '-' ? '-' : '') || '0'}?`, sp)
      } else if (text[i] >= '1' && text[i] <= '9') {
        while (i < n && text[i] >= '0' && text[i] <= '9') s += text[i++]
      } else {
        err('Expected digit after minus sign', sp)
      }
      if (text[i] === '.') {
        s += text[i++]
        if (!(text[i] >= '0' && text[i] <= '9')) err('Expected digit after decimal point', i)
        while (i < n && text[i] >= '0' && text[i] <= '9') s += text[i++]
      }
      if (text[i] === 'e' || text[i] === 'E') {
        s += text[i++]
        if (text[i] === '+' || text[i] === '-') s += text[i++]
        if (!(text[i] >= '0' && text[i] <= '9')) err('Expected digit in exponent', i)
        while (i < n && text[i] >= '0' && text[i] <= '9') s += text[i++]
      }
      return { type: T.NUMBER, value: Number(s), pos: sp }
    }

    if (text.startsWith('true', i)) { const p = i; i += 4; return { type: T.TRUE, pos: p } }
    if (text.startsWith('false', i)) { const p = i; i += 5; return { type: T.FALSE, pos: p } }
    if (text.startsWith('null', i)) { const p = i; i += 4; return { type: T.NULL, pos: p } }

    err(`Unexpected character '${ch}' (U+${ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})`, i)
  }

  return {
    peek() { return cached ?? (cached = scan()) },
    advance() { const t = cached ?? scan(); cached = null; return t },
  }
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseWithLexer(text) {
  const pathStack = ['$']
  const lexer = createLexer(text, () => pathStack.join(''))

  const fail = (msg, tok) => {
    const loc = locate(text, tok.pos)
    throw new JsonSyntaxError(msg, { pos: tok.pos, ...loc, path: pathStack.join('') })
  }

  const expect = (type, msg) => {
    const tok = lexer.peek()
    if (tok.type !== type) fail(msg ?? `Expected '${type}' but got '${tok.type}'`, tok)
    return lexer.advance()
  }

  const parseValue = () => {
    const tok = lexer.peek()
    switch (tok.type) {
      case T.LBRACE:   return parseObject()
      case T.LBRACKET: return parseArray()
      case T.STRING:   lexer.advance(); return tok.value
      case T.NUMBER:   lexer.advance(); return tok.value
      case T.TRUE:     lexer.advance(); return true
      case T.FALSE:    lexer.advance(); return false
      case T.NULL:     lexer.advance(); return null
      default: fail(`Unexpected token '${tok.type}' — expected a JSON value`, tok)
    }
  }

  const parseObject = () => {
    expect(T.LBRACE)
    const obj = {}
    if (lexer.peek().type === T.RBRACE) { lexer.advance(); return obj }
    while (true) {
      const kt = lexer.peek()
      if (kt.type !== T.STRING)
        fail(`Object key must be a double-quoted string, got '${kt.type}'. ${kt.type === T.RBRACE ? 'Possible trailing comma.' : ''}`, kt)
      lexer.advance()
      const key = kt.value
      pathStack.push(`.${key}`)
      expect(T.COLON, `Expected ':' after key "${key}"`)
      obj[key] = parseValue()
      pathStack.pop()
      const next = lexer.peek()
      if (next.type === T.COMMA) {
        lexer.advance()
        if (lexer.peek().type === T.RBRACE)
          fail(`Trailing comma before '}' — remove the last comma after "${key}"`, lexer.peek())
        continue
      }
      if (next.type === T.RBRACE) { lexer.advance(); break }
      fail(`Expected ',' or '}' after value for key "${key}", got '${next.type}'`, next)
    }
    return obj
  }

  const parseArray = () => {
    expect(T.LBRACKET)
    const arr = []
    if (lexer.peek().type === T.RBRACKET) { lexer.advance(); return arr }
    let idx = 0
    while (true) {
      pathStack.push(`[${idx}]`)
      arr.push(parseValue())
      pathStack.pop()
      idx++
      const next = lexer.peek()
      if (next.type === T.COMMA) {
        lexer.advance()
        if (lexer.peek().type === T.RBRACKET)
          fail(`Trailing comma before ']' at index ${idx - 1} — remove it`, lexer.peek())
        continue
      }
      if (next.type === T.RBRACKET) { lexer.advance(); break }
      fail(`Expected ',' or ']' after array element [${idx - 1}], got '${next.type}'`, next)
    }
    return arr
  }

  const result = parseValue()
  const trailing = lexer.peek()
  if (trailing.type !== T.EOF)
    fail(`Unexpected content after end of JSON: '${trailing.type}'`, trailing)
  return result
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * godJsonParse(rawText)
 * Returns { ok, data, cleanedText, stagesRun } on success
 * or { ok: false, error, line, col, path, snippet, pointer, stagesRun, cleanedText } on failure.
 */
export function godJsonParse(rawText) {
  const { text, stages } = sanitize(rawText)

  try {
    const data = parseWithLexer(text)
    return { ok: true, data, cleanedText: text, stagesRun: stages }
  } catch (e) {
    if (e instanceof JsonSyntaxError) {
      return {
        ok: false,
        error: e.message,
        line: e.line,
        col: e.col,
        path: e.path,
        snippet: e.snippet,
        pointer: e.pointer,
        stagesRun: stages,
        cleanedText: text,
      }
    }
    throw e
  }
}
