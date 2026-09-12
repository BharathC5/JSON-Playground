import { useWorkbench } from '../composables/useWorkbench';

export function getType(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

export function formatPrimitive(value, type) {
  if (type === 'string') return JSON.stringify(value);
  if (type === 'null') return 'null';
  if (type === 'undefined') return 'undefined';
  return String(value);
}

export function shortPreview(value) {
  const type = getType(value);
  if (type === 'array') return `Array(${value.length})`;
  if (type === 'object') return 'Object';
  return formatPrimitive(value, type);
}

const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function buildSubPath(pathArr, optChain) {
  let s = '';
  for (const seg of pathArr) {
    if (typeof seg === 'number') {
      s += optChain ? `?.[${seg}]` : `[${seg}]`;
    } else if (IDENTIFIER_RE.test(seg)) {
      s += optChain ? (s ? `?.${seg}` : seg) : (s ? `.${seg}` : seg);
    } else {
      s += optChain ? `?.[${JSON.stringify(seg)}]` : `[${JSON.stringify(seg)}]`;
    }
  }
  return s;
}

export function pathToJs(pathArr, forceRaw) {
  const { state } = useWorkbench();
  const optChain = state.settings.optionalChaining;
  const mode = forceRaw ? 'raw' : state.settings.arrayCopyMode;
  const rootVarName = state.rootVarName;

  if (mode === 'raw') {
    let s = rootVarName;
    const sub = buildSubPath(pathArr, optChain);
    return sub
      ? sub.startsWith('[') || sub.startsWith('?') ? `${s}${sub}` : `${s}.${sub}`
      : s;
  }

  const firstArrayIdx = pathArr.findIndex(k => typeof k === 'number');

  if (firstArrayIdx === -1) {
    let s = rootVarName;
    const sub = buildSubPath(pathArr, optChain);
    return sub
      ? sub.startsWith('[') || sub.startsWith('?') ? `${s}${sub}` : `${s}.${sub}`
      : s;
  }

  const arrayPrefixSegments = pathArr.slice(0, firstArrayIdx);
  const remainderSegments = pathArr.slice(firstArrayIdx + 1);

  let baseArrayExpression = rootVarName;
  const arraySub = buildSubPath(arrayPrefixSegments, optChain);
  if (arraySub) {
    baseArrayExpression =
      arraySub.startsWith('[') || arraySub.startsWith('?')
        ? `${baseArrayExpression}${arraySub}`
        : `${baseArrayExpression}.${arraySub}`;
  }

  const iterItemVar = 'item';
  const iterSub = buildSubPath(remainderSegments, optChain);
  const innerAccess = iterSub
    ? iterSub.startsWith('[') || iterSub.startsWith('?')
      ? `${iterItemVar}${iterSub}`
      : `${iterItemVar}.${iterSub}`
    : iterItemVar;

  if (mode === 'forEach') {
    return `${baseArrayExpression}.forEach(${iterItemVar} => {\n  console.log(${innerAccess});\n});`;
  } else if (mode === 'map') {
    return `${baseArrayExpression}.map(${iterItemVar} => ${innerAccess})`;
  } else if (mode === 'forOf') {
    return `for (const ${iterItemVar} of ${baseArrayExpression}) {\n  console.log(${innerAccess});\n}`;
  }

  return baseArrayExpression;
}

export function pathToBreadcrumb(pathArr) {
  const { state } = useWorkbench();
  const lines = [state.rootVarName];
  pathArr.forEach((seg, i) => {
    const indent = '  '.repeat(i + 1);
    const label = typeof seg === 'number' ? `[${seg}]` : seg;
    lines.push(`${indent}\u203a ${label}`);
  });
  return lines.join('\n');
}
