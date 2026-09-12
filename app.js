(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // Application State & Default Config
  // ---------------------------------------------------------------------
  const CONFIG_KEY = "json_workbench_settings_v2";
  const LAYOUT_KEY = "json_workbench_layout_v2";

  const defaultSettings = {
    arrayCopyMode: "forEach", // 'raw' | 'forEach' | 'map' | 'forOf'
    optionalChaining: false,
    showMethodsInAutocomplete: true,
  };

  let settings = Object.assign({}, defaultSettings);

  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) settings = Object.assign({}, defaultSettings, JSON.parse(saved));
  } catch (e) {
    console.warn("Could not read saved settings", e);
  }

  function persistSettings() {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(settings));
    } catch (e) {}
  }

  let parsedData = null;
  let rootVarName = "data";
  let consoleHistory = [];
  let historyIndex = -1;
  let draftBeforeHistory = "";
  let currentView = "tree";
  const flowExpanded = new Set();
  const flowShownCounts = new Map();

  // ---------------------------------------------------------------------
  // DOM References
  // ---------------------------------------------------------------------
  const workspaceLayout = document.getElementById("workspaceLayout");
  const panelJson = document.getElementById("panelJson");
  const panelExplorer = document.getElementById("panelExplorer");
  const panelConsole = document.getElementById("panelConsole");
  const gutterVertical = document.getElementById("gutterVertical");
  const gutterHorizontal = document.getElementById("gutterHorizontal");

  const jsonInput = document.getElementById("jsonInput");
  const jsonError = document.getElementById("jsonError");
  const treeContainer = document.getElementById("treeContainer");
  const flowContainer = document.getElementById("flowContainer");
  const viewTreeBtn = document.getElementById("viewTreeBtn");
  const viewFlowBtn = document.getElementById("viewFlowBtn");
  const rootVarSelect = document.getElementById("rootVarSelect");
  const customRootInput = document.getElementById("customRootInput");
  const formatBtn = document.getElementById("formatBtn");
  const minifyBtn = document.getElementById("minifyBtn");
  const resetBtn = document.getElementById("resetBtn");
  const propSearch = document.getElementById("propSearch");
  const searchResults = document.getElementById("searchResults");
  const breadcrumb = document.getElementById("breadcrumb");
  const breadcrumbPath = document.getElementById("breadcrumbPath");
  const breadcrumbJs = document.getElementById("breadcrumbJs");
  const breadcrumbCopy = document.getElementById("breadcrumbCopy");
  const consoleOutput = document.getElementById("consoleOutput");
  const consoleInput = document.getElementById("consoleInput");
  const consoleSuggestions = document.getElementById("consoleSuggestions");
  const clearConsoleBtn = document.getElementById("clearConsoleBtn");
  const toast = document.getElementById("toast");

  // Settings DOM
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsModal = document.getElementById("settingsModal");
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  const settingArrayCopyMode = document.getElementById("settingArrayCopyMode");
  const settingOptionalChaining = document.getElementById(
    "settingOptionalChaining",
  );
  const settingShowMethodsInAutocomplete = document.getElementById(
    "settingShowMethodsInAutocomplete",
  );
  const resetLayoutBtn = document.getElementById("resetLayoutBtn");

  // ---------------------------------------------------------------------
  // Resizable Splitters Architecture (Drag & Persistence)
  // ---------------------------------------------------------------------
  function initResizableSplitters() {
    let isDraggingV = false;
    let isDraggingH = false;

    // Load persistent layout
    try {
      const savedLayout = JSON.parse(localStorage.getItem(LAYOUT_KEY));
      if (savedLayout) {
        if (savedLayout.jsonWidth)
          panelJson.style.width = savedLayout.jsonWidth + "px";
        if (savedLayout.consoleHeight)
          panelConsole.style.height = savedLayout.consoleHeight + "px";
      }
    } catch (e) {}

    function saveLayout() {
      try {
        localStorage.setItem(
          LAYOUT_KEY,
          JSON.stringify({
            jsonWidth: panelJson.getBoundingClientRect().width,
            consoleHeight: panelConsole.getBoundingClientRect().height,
          }),
        );
      } catch (e) {}
    }

    gutterVertical.addEventListener("mousedown", (e) => {
      e.preventDefault();
      isDraggingV = true;
      gutterVertical.classList.add("is-dragging");
      document.body.style.cursor = "col-resize";
    });

    gutterHorizontal.addEventListener("mousedown", (e) => {
      e.preventDefault();
      isDraggingH = true;
      gutterHorizontal.classList.add("is-dragging");
      document.body.style.cursor = "row-resize";
    });

    window.addEventListener("mousemove", (e) => {
      if (isDraggingV) {
        const layoutRect = workspaceLayout.getBoundingClientRect();
        const newWidth = Math.max(
          150,
          Math.min(e.clientX - layoutRect.left, layoutRect.width - 150),
        );
        panelJson.style.width = `${newWidth}px`;
      } else if (isDraggingH) {
        const newHeight = Math.max(
          70,
          Math.min(window.innerHeight - e.clientY, window.innerHeight - 150),
        );
        panelConsole.style.height = `${newHeight}px`;
      }
    });

    window.addEventListener("mouseup", () => {
      if (isDraggingV || isDraggingH) {
        if (isDraggingV) gutterVertical.classList.remove("is-dragging");
        if (isDraggingH) gutterHorizontal.classList.remove("is-dragging");
        isDraggingV = false;
        isDraggingH = false;
        document.body.style.cursor = "";
        saveLayout();
      }
    });

    resetLayoutBtn.addEventListener("click", () => {
      panelJson.style.width = "45%";
      panelConsole.style.height = "240px";
      localStorage.removeItem(LAYOUT_KEY);
      showToast("Layout reset to default");
    });
  }

  // ---------------------------------------------------------------------
  // Settings Panel Management
  // ---------------------------------------------------------------------
  function initSettings() {
    settingArrayCopyMode.value = settings.arrayCopyMode;
    settingOptionalChaining.checked = settings.optionalChaining;
    settingShowMethodsInAutocomplete.checked =
      settings.showMethodsInAutocomplete;

    settingsBtn.addEventListener("click", () => {
      settingsModal.hidden = false;
    });

    closeSettingsBtn.addEventListener("click", () => {
      settingsModal.hidden = true;
    });

    settingsModal.addEventListener("click", (e) => {
      if (e.target === settingsModal) settingsModal.hidden = true;
    });

    settingArrayCopyMode.addEventListener("change", () => {
      settings.arrayCopyMode = settingArrayCopyMode.value;
      persistSettings();
    });

    settingOptionalChaining.addEventListener("change", () => {
      settings.optionalChaining = settingOptionalChaining.checked;
      persistSettings();
    });

    settingShowMethodsInAutocomplete.addEventListener("change", () => {
      settings.showMethodsInAutocomplete =
        settingShowMethodsInAutocomplete.checked;
      persistSettings();
    });
  }

  // ---------------------------------------------------------------------
  // Helpers: Core Types & Dynamic Expression Builders
  // ---------------------------------------------------------------------
  function getType(v) {
    if (v === null) return "null";
    if (Array.isArray(v)) return "array";
    return typeof v;
  }

  function formatPrimitive(value, type) {
    if (type === "string") return JSON.stringify(value);
    if (type === "null") return "null";
    if (type === "undefined") return "undefined";
    return String(value);
  }

  function shortPreview(value) {
    const type = getType(value);
    if (type === "array") return `Array(${value.length})`;
    if (type === "object") return "Object";
    return formatPrimitive(value, type);
  }

  const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

  function buildSubPath(pathArr, optChain) {
    let s = "";
    for (const seg of pathArr) {
      if (typeof seg === "number") {
        s += optChain ? `?.[${seg}]` : `[${seg}]`;
      } else if (IDENTIFIER_RE.test(seg)) {
        s += optChain ? (s ? `?.${seg}` : seg) : s ? `.${seg}` : seg;
      } else {
        s += optChain
          ? `?.[${JSON.stringify(seg)}]`
          : `[${JSON.stringify(seg)}]`;
      }
    }
    return s;
  }

  /**
   * Code Architecture:
   * Translates an array traversal into iteration expressions (forEach, map, for...of).
   * Example: ['member', 0, 'attributes', 'name'] ->
   *   data.member.forEach(item => { item.attributes.name })
   */
  function pathToJs(pathArr, forceRaw) {
    const optChain = settings.optionalChaining;
    const mode = forceRaw ? "raw" : settings.arrayCopyMode;

    if (mode === "raw") {
      let s = rootVarName;
      const sub = buildSubPath(pathArr, optChain);
      return sub
        ? sub.startsWith("[") || sub.startsWith("?")
          ? `${s}${sub}`
          : `${s}.${sub}`
        : s;
    }

    // Find if an array index exists along the path
    const firstArrayIdx = pathArr.findIndex((k) => typeof k === "number");

    if (firstArrayIdx === -1) {
      // Standard object property chain
      let s = rootVarName;
      const sub = buildSubPath(pathArr, optChain);
      return sub
        ? sub.startsWith("[") || sub.startsWith("?")
          ? `${s}${sub}`
          : `${s}.${sub}`
        : s;
    }

    const arrayPrefixSegments = pathArr.slice(0, firstArrayIdx);
    const remainderSegments = pathArr.slice(firstArrayIdx + 1);

    let baseArrayExpression = rootVarName;
    const arraySub = buildSubPath(arrayPrefixSegments, optChain);
    if (arraySub) {
      baseArrayExpression =
        arraySub.startsWith("[") || arraySub.startsWith("?")
          ? `${baseArrayExpression}${arraySub}`
          : `${baseArrayExpression}.${arraySub}`;
    }

    const iterItemVar = "item";
    const iterSub = buildSubPath(remainderSegments, optChain);
    const innerAccess = iterSub
      ? iterSub.startsWith("[") || iterSub.startsWith("?")
        ? `${iterItemVar}${iterSub}`
        : `${iterItemVar}.${iterSub}`
      : iterItemVar;

    if (mode === "forEach") {
      return `${baseArrayExpression}.forEach(${iterItemVar} => {\n  console.log(${innerAccess});\n});`;
    } else if (mode === "map") {
      return `${baseArrayExpression}.map(${iterItemVar} => ${innerAccess})`;
    } else if (mode === "forOf") {
      return `for (const ${iterItemVar} of ${baseArrayExpression}) {\n  console.log(${innerAccess});\n}`;
    }

    return baseArrayExpression;
  }

  function pathToBreadcrumb(pathArr) {
    const lines = [rootVarName];
    pathArr.forEach((seg, i) => {
      const indent = "  ".repeat(i + 1);
      const label = typeof seg === "number" ? `[${seg}]` : seg;
      lines.push(`${indent}\u203a ${label}`);
    });
    return lines.join("\n");
  }

  // ---------------------------------------------------------------------
  // Feedback & Copy Clipboard
  // ---------------------------------------------------------------------
  let toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 1600);
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () =>
          showToast(
            "Copied: " + (text.length > 30 ? text.slice(0, 30) + "..." : text),
          ),
        () => fallbackCopy(text),
      );
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast("Copied to clipboard");
    } catch (e) {
      showToast("Copy failed");
    }
    document.body.removeChild(ta);
  }

  // ---------------------------------------------------------------------
  // JSON Engine & Parser
  // ---------------------------------------------------------------------
  function tryParseJson(text) {
    if (text.trim() === "") return { ok: false, empty: true };
    try {
      return { ok: true, value: JSON.parse(text) };
    } catch (e) {
      return { ok: false, message: e.message };
    }
  }

  function handleJsonInputChange() {
    const text = jsonInput.value;
    const result = tryParseJson(text);
    if (result.empty) {
      parsedData = null;
      jsonError.hidden = true;
      renderEmptyTree();
      hideBreadcrumb();
      return;
    }
    if (!result.ok) {
      parsedData = null;
      jsonError.hidden = false;
      jsonError.textContent = "JSON Syntax Error: " + result.message;
      renderEmptyTree("Fix the JSON error on the left to activate visualizer.");
      hideBreadcrumb();
      return;
    }
    jsonError.hidden = true;
    parsedData = result.value;
    renderExplorer();
  }

  let debounceTimer = null;
  jsonInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(handleJsonInputChange, 200);
  });

  // ---------------------------------------------------------------------
  // Tree & Flowchart Visualizer Views
  // ---------------------------------------------------------------------
  function renderEmptyTree(msg) {
    treeContainer.innerHTML = "";
    const div = document.createElement("div");
    div.className = "tree-empty";
    div.textContent =
      msg || "Paste valid JSON on the left to explore properties.";
    treeContainer.appendChild(div);
    flowContainer.innerHTML = "";
  }

  function renderTree() {
    treeContainer.innerHTML = "";
    const rootNode = createTreeNode(rootVarName, parsedData, [], true);
    treeContainer.appendChild(rootNode);
  }

  function renderExplorer() {
    if (parsedData === null) return;
    if (currentView === "tree") {
      renderTree();
    } else {
      renderFlowchart();
    }
  }

  function setView(view) {
    currentView = view;
    viewTreeBtn.classList.toggle("active", view === "tree");
    viewFlowBtn.classList.toggle("active", view === "flow");
    treeContainer.hidden = view !== "tree";
    flowContainer.hidden = view !== "flow";
    renderExplorer();
  }

  viewTreeBtn.addEventListener("click", () => setView("tree"));
  viewFlowBtn.addEventListener("click", () => setView("flow"));

  function createTreeNode(key, value, pathArr, isRoot) {
    const wrap = document.createElement("div");
    wrap.className = "tree-node";

    const row = document.createElement("div");
    row.className = "tree-row";

    const type = getType(value);
    const isExpandable =
      (type === "object" || type === "array") &&
      value !== null &&
      (type === "array" ? value.length > 0 : Object.keys(value).length > 0);

    const toggle = document.createElement("span");
    toggle.className = "tree-toggle";
    toggle.textContent = isExpandable ? "\u25b6" : "";
    row.appendChild(toggle);

    const keySpan = document.createElement("span");
    keySpan.className = "tree-key";
    keySpan.textContent = typeof key === "number" ? `[${key}]` : key;
    row.appendChild(keySpan);

    if (type !== "object" && type !== "array") {
      const colon = document.createElement("span");
      colon.className = "tree-colon";
      colon.textContent = ":";
      row.appendChild(colon);

      const valSpan = document.createElement("span");
      valSpan.className = `tree-value-${type}`;
      valSpan.textContent = formatPrimitive(value, type);
      row.appendChild(valSpan);
    } else {
      const badge = document.createElement("span");
      badge.className = "tree-type-badge";
      badge.textContent =
        type === "array"
          ? `Array(${value.length})`
          : `Object {${Object.keys(value).length}}`;
      row.appendChild(badge);
    }

    if (!isRoot) {
      const copyBtn = document.createElement("button");
      copyBtn.className = "copy-path-btn";
      copyBtn.textContent = "Copy";
      copyBtn.title = "Copy Path based on current array access setting";
      copyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        copyToClipboard(pathToJs(pathArr, false));
      });
      row.appendChild(copyBtn);
    }

    let expanded = false;
    let childrenContainer = null;
    let childrenBuilt = false;
    let shownCount = 30;

    function buildChildren() {
      childrenContainer = document.createElement("div");
      childrenContainer.className = "tree-children";
      populateChildren();
      wrap.appendChild(childrenContainer);
      childrenBuilt = true;
    }

    function populateChildren() {
      childrenContainer.innerHTML = "";
      if (type === "array") {
        const limit = Math.min(shownCount, value.length);
        for (let i = 0; i < limit; i++) {
          childrenContainer.appendChild(
            createTreeNode(i, value[i], pathArr.concat(i), false),
          );
        }
        if (value.length > limit) {
          const more = document.createElement("div");
          more.className = "show-more-row";
          more.textContent = `+ ${value.length - limit} more items...`;
          more.addEventListener("click", (e) => {
            e.stopPropagation();
            shownCount += 50;
            populateChildren();
          });
          childrenContainer.appendChild(more);
        }
      } else {
        Object.keys(value).forEach((k) => {
          childrenContainer.appendChild(
            createTreeNode(k, value[k], pathArr.concat(k), false),
          );
        });
      }
    }

    function toggleExpand() {
      if (!isExpandable) return;
      expanded = !expanded;
      toggle.textContent = expanded ? "\u25bc" : "\u25b6";
      if (expanded) {
        if (!childrenBuilt) buildChildren();
        childrenContainer.style.display = "";
      } else if (childrenContainer) {
        childrenContainer.style.display = "none";
      }
    }

    row.addEventListener("click", () => {
      toggleExpand();
      const code = pathToJs(pathArr, false);
      insertPathIntoConsole(code);
      showBreadcrumb(pathArr);
    });

    wrap.appendChild(row);
    if (isRoot && isExpandable) toggleExpand();

    return wrap;
  }

  // ---------------------------------------------------------------------
  // Flowchart Rendering Engine
  // ---------------------------------------------------------------------
  const FLOW_NODE_W = 160;
  const FLOW_ROW_H = 75;
  const FLOW_PAD = 30;

  function renderFlowchart() {
    flowContainer.innerHTML = "";
    const rootKey = "";
    flowExpanded.add(rootKey);

    const positions = [];
    let leafCounter = 0;
    let maxDepth = 0;

    function layout(value, pathArr, depth, keyLabel, parentKeyStr, isRoot) {
      const keyStr = pathArr.join("\u0001");
      const t = getType(value);
      const expandable =
        (t === "object" || t === "array") &&
        value !== null &&
        Object.keys(value).length > 0;
      const expanded = isRoot || flowExpanded.has(keyStr);
      maxDepth = Math.max(maxDepth, depth);

      let x;
      if (!expandable || !expanded) {
        x = leafCounter++;
      } else {
        const allKeys =
          t === "array" ? value.map((_, i) => i) : Object.keys(value);
        const shown =
          flowShownCounts.get(keyStr) || Math.min(10, allKeys.length);
        const visibleKeys = allKeys.slice(0, shown);
        const childXs = visibleKeys.map((k) =>
          layout(value[k], pathArr.concat(k), depth + 1, k, keyStr, false),
        );
        x = childXs.length
          ? (Math.min(...childXs) + Math.max(...childXs)) / 2
          : leafCounter++;
      }

      positions.push({
        keyStr,
        parentKeyStr,
        keyLabel,
        value,
        pathArr,
        depth,
        x,
        isRoot,
        expandable,
        expanded,
      });
      return x;
    }

    layout(parsedData, [], 0, rootVarName, null, true);

    const width = Math.max(leafCounter, 1) * FLOW_NODE_W + FLOW_PAD * 2;
    const height = (maxDepth + 1) * FLOW_ROW_H + FLOW_PAD * 2;

    const inner = document.createElement("div");
    inner.className = "flow-inner";
    inner.style.width = width + "px";
    inner.style.height = height + "px";

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "flow-edges");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);

    const nodeCenter = (p) => ({
      cx: FLOW_PAD + p.x * FLOW_NODE_W + FLOW_NODE_W / 2,
      topY: FLOW_PAD + p.depth * FLOW_ROW_H,
      botY: FLOW_PAD + p.depth * FLOW_ROW_H + 28,
    });

    const byKey = {};
    positions.forEach((p) => {
      byKey[p.keyStr] = p;
    });

    positions.forEach((p) => {
      if (p.parentKeyStr !== null && byKey[p.parentKeyStr]) {
        const parentC = nodeCenter(byKey[p.parentKeyStr]);
        const childC = nodeCenter(p);
        const path = document.createElementNS(svgNS, "path");
        const midY = (parentC.botY + childC.topY) / 2;
        path.setAttribute(
          "d",
          `M ${parentC.cx} ${parentC.botY} C ${parentC.cx} ${midY}, ${childC.cx} ${midY}, ${childC.cx} ${childC.topY}`,
        );
        path.setAttribute("class", "flow-edge-path");
        svg.appendChild(path);
      }
    });

    inner.appendChild(svg);

    positions.forEach((p) => {
      const el = document.createElement("div");
      el.className = "flow-node" + (p.isRoot ? " is-root" : "");
      const c = nodeCenter(p);
      el.style.left = c.cx - FLOW_NODE_W / 2 + 10 + "px";
      el.style.top = c.topY + "px";

      const keySpan = document.createElement("span");
      keySpan.className = "flow-node-key";
      keySpan.textContent =
        typeof p.keyLabel === "number" ? `[${p.keyLabel}]` : p.keyLabel;
      el.appendChild(keySpan);

      const t = getType(p.value);
      if (t === "object" || t === "array") {
        const badge = document.createElement("span");
        badge.className = "flow-node-badge";
        badge.textContent =
          t === "array"
            ? `[${p.value.length}]`
            : `{${Object.keys(p.value).length}}`;
        el.appendChild(badge);
      } else {
        const valSpan = document.createElement("span");
        valSpan.className = `flow-node-value tree-value-${t}`;
        valSpan.textContent = formatPrimitive(p.value, t);
        el.appendChild(valSpan);
      }

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (p.expandable) {
          if (flowExpanded.has(p.keyStr)) flowExpanded.delete(p.keyStr);
          else flowExpanded.add(p.keyStr);
        }
        insertPathIntoConsole(pathToJs(p.pathArr, false));
        showBreadcrumb(p.pathArr);
        renderFlowchart();
      });

      inner.appendChild(el);
    });

    flowContainer.appendChild(inner);
  }

  // ---------------------------------------------------------------------
  // Breadcrumbs & Target Details
  // ---------------------------------------------------------------------
  function showBreadcrumb(pathArr) {
    breadcrumb.hidden = false;
    breadcrumbPath.textContent = pathToBreadcrumb(pathArr);
    const js = pathToJs(pathArr, false);
    breadcrumbJs.textContent = js;
    breadcrumbCopy.onclick = () => copyToClipboard(js);
  }

  function hideBreadcrumb() {
    breadcrumb.hidden = true;
  }

  // ---------------------------------------------------------------------
  // Root Variable Handler
  // ---------------------------------------------------------------------
  rootVarSelect.addEventListener("change", () => {
    if (rootVarSelect.value === "__custom__") {
      customRootInput.hidden = false;
      customRootInput.focus();
      rootVarName = customRootInput.value.trim() || "data";
    } else {
      customRootInput.hidden = true;
      rootVarName = rootVarSelect.value;
    }
    if (parsedData !== null) renderExplorer();
    hideBreadcrumb();
  });

  customRootInput.addEventListener("input", () => {
    const cleaned = customRootInput.value.replace(/[^A-Za-z0-9_$]/g, "");
    rootVarName = cleaned.trim() || "data";
    if (parsedData !== null) renderExplorer();
    hideBreadcrumb();
  });

  // ---------------------------------------------------------------------
  // Formatting Actions
  // ---------------------------------------------------------------------
  formatBtn.addEventListener("click", () => {
    if (!parsedData) return showToast("No valid JSON to format");
    jsonInput.value = JSON.stringify(parsedData, null, 2);
  });

  minifyBtn.addEventListener("click", () => {
    if (!parsedData) return showToast("No valid JSON to minify");
    jsonInput.value = JSON.stringify(parsedData);
  });

  resetBtn.addEventListener("click", () => {
    jsonInput.value = "";
    parsedData = null;
    jsonError.hidden = true;
    flowExpanded.clear();
    flowShownCounts.clear();
    renderEmptyTree();
    hideBreadcrumb();
  });

  // ---------------------------------------------------------------------
  // Deep Search Functionality
  // ---------------------------------------------------------------------
  function searchData(query) {
    const results = [];
    const lowerQ = query.toLowerCase();

    function walk(value, pathArr, key) {
      if (results.length >= 100) return;
      if (key !== null) {
        const keyMatches =
          typeof key === "string" && key.toLowerCase().includes(lowerQ);
        const t = getType(value);
        let valMatches = false;
        if (t === "string" || t === "number" || t === "boolean") {
          valMatches = String(value).toLowerCase().includes(lowerQ);
        }
        if (keyMatches || valMatches)
          results.push({ path: pathArr.slice(), value });
      }
      const t = getType(value);
      if (t === "array") {
        value.forEach((v, i) => walk(v, pathArr.concat(i), i));
      } else if (t === "object" && value !== null) {
        Object.keys(value).forEach((k) => walk(value[k], pathArr.concat(k), k));
      }
    }

    walk(parsedData, [], null);
    return results;
  }

  propSearch.addEventListener("input", () => {
    const q = propSearch.value.trim();
    if (!parsedData || !q) {
      searchResults.hidden = true;
      return;
    }
    const matches = searchData(q);
    searchResults.innerHTML = "";

    const header = document.createElement("div");
    header.className = "search-results-header";
    header.textContent =
      matches.length === 0 ? "No matches" : `${matches.length} result(s)`;
    searchResults.appendChild(header);

    matches.forEach((m) => {
      const row = document.createElement("div");
      row.className = "search-result-row";
      const js = pathToJs(m.path, false);

      const pathSpan = document.createElement("span");
      pathSpan.className = "search-result-path";
      pathSpan.textContent = js;

      const valSpan = document.createElement("span");
      valSpan.className = "search-result-value";
      valSpan.textContent = shortPreview(m.value);

      row.appendChild(pathSpan);
      row.appendChild(valSpan);

      row.addEventListener("click", () => {
        insertPathIntoConsole(js);
        showBreadcrumb(m.path);
        searchResults.hidden = true;
      });

      searchResults.appendChild(row);
    });

    searchResults.hidden = false;
  });

  document.addEventListener("click", (e) => {
    if (!searchResults.contains(e.target) && e.target !== propSearch) {
      searchResults.hidden = true;
    }
  });

  // ---------------------------------------------------------------------
  // State-of-the-Art Autocomplete Engine
  // ---------------------------------------------------------------------
  let suggestionCandidates = [];
  let suggestionContext = null;
  let suggestionSelectedIndex = -1;

  const ARRAY_METHODS = [
    "map",
    "filter",
    "forEach",
    "reduce",
    "find",
    "some",
    "every",
    "length",
    "includes",
  ];
  const OBJECT_METHODS = ["hasOwnProperty", "toString"];

  function parseExpressionContext(codeBeforeCursor) {
    // Regex matching property chains with optional chaining support: e.g. data.member[0].attributes.
    const match = codeBeforeCursor.match(
      /(?:([A-Za-z0-9_$]+(?:\??\.[A-Za-z0-9_$]+|\[\d+\]|\["[^"]*"\]|\['[^']*'\])*))(\??\.)([A-Za-z0-9_$]*)$/,
    );
    if (!match) return null;

    const fullExpression = match[1];
    const operator = match[2];
    const partialText = match[3];

    return {
      fullExpression,
      operator,
      partialText,
      replaceLen: operator.length + partialText.length,
    };
  }

  function getExpressionValue(expr) {
    try {
      const fn = new Function(rootVarName, `"use strict"; return (${expr});`);
      return { ok: true, val: fn(parsedData) };
    } catch (e) {
      return { ok: false };
    }
  }

  function refreshAutocomplete() {
    suggestionSelectedIndex = -1;
    if (!parsedData) {
      suggestionCandidates = [];
      return;
    }

    const cursorPos = consoleInput.selectionStart;
    const textBeforeCursor = consoleInput.value.slice(0, cursorPos);
    const ctx = parseExpressionContext(textBeforeCursor);

    if (!ctx) {
      suggestionContext = null;
      suggestionCandidates = [];
      return;
    }

    const resolved = getExpressionValue(ctx.fullExpression);
    if (!resolved.ok || resolved.val === null || resolved.val === undefined) {
      suggestionContext = null;
      suggestionCandidates = [];
      return;
    }

    const targetVal = resolved.val;
    const candidates = [];
    const t = getType(targetVal);

    if (t === "object") {
      Object.keys(targetVal).forEach((k) => {
        if (k.toLowerCase().startsWith(ctx.partialText.toLowerCase())) {
          candidates.push({ name: k, type: "property" });
        }
      });
      if (settings.showMethodsInAutocomplete) {
        OBJECT_METHODS.forEach((m) => {
          if (m.toLowerCase().startsWith(ctx.partialText.toLowerCase())) {
            candidates.push({ name: m, type: "method" });
          }
        });
      }
    } else if (t === "array") {
      if (settings.showMethodsInAutocomplete) {
        ARRAY_METHODS.forEach((m) => {
          if (m.toLowerCase().startsWith(ctx.partialText.toLowerCase())) {
            candidates.push({
              name: m,
              type: m === "length" ? "property" : "method",
            });
          }
        });
      }
      // Offer first item keys as convenience preview
      if (
        targetVal.length > 0 &&
        typeof targetVal[0] === "object" &&
        targetVal[0] !== null
      ) {
        Object.keys(targetVal[0]).forEach((k) => {
          if (k.toLowerCase().startsWith(ctx.partialText.toLowerCase())) {
            candidates.push({ name: `[0].${k}`, type: "array-item-preview" });
          }
        });
      }
    }

    suggestionContext = ctx;
    suggestionCandidates = candidates;
  }

  function renderSuggestions() {
    if (!suggestionCandidates.length) {
      consoleSuggestions.hidden = true;
      return;
    }

    consoleSuggestions.innerHTML = "";
    suggestionCandidates.slice(0, 20).forEach((item, i) => {
      const div = document.createElement("div");
      div.className =
        "console-suggestion-item" +
        (i === suggestionSelectedIndex ? " is-selected" : "");

      const label = document.createElement("span");
      label.textContent = item.name;

      const typeLabel = document.createElement("span");
      typeLabel.className = "item-type";
      typeLabel.textContent = item.type;

      div.appendChild(label);
      div.appendChild(typeLabel);

      div.addEventListener("mousedown", (e) => {
        e.preventDefault();
        applyCompletion(item.name);
        hideSuggestions();
      });

      consoleSuggestions.appendChild(div);
    });

    consoleSuggestions.hidden = false;
  }

  function hideSuggestions() {
    consoleSuggestions.hidden = true;
    suggestionCandidates = [];
    suggestionContext = null;
    suggestionSelectedIndex = -1;
  }

  function applyCompletion(completedText) {
    if (!suggestionContext) return;
    const cursorPos = consoleInput.selectionStart;
    const text = consoleInput.value;
    const before = text.slice(
      0,
      cursorPos - suggestionContext.partialText.length,
    );
    const after = text.slice(cursorPos);

    // If method, add parentheses template
    const isMethod = suggestionCandidates.find(
      (c) => c.name === completedText && c.type === "method",
    );
    let insert = completedText;
    if (isMethod && completedText !== "length") {
      insert += "()";
    }

    consoleInput.value = before + insert + after;
    const newPos =
      (before + insert).length -
      (isMethod && completedText !== "length" ? 1 : 0);
    consoleInput.setSelectionRange(newPos, newPos);
  }

  // ---------------------------------------------------------------------
  // Console Execution Engine
  // ---------------------------------------------------------------------
  function executeConsoleCode(code) {
    const logs = [];
    const fakeConsole = {
      log: (...args) =>
        logs.push(
          args
            .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
            .join(" "),
        ),
      error: (...args) => logs.push("[ERROR] " + args.map(String).join(" ")),
      warn: (...args) => logs.push("[WARN] " + args.map(String).join(" ")),
    };

    let resultVal;
    let hasResult = false;
    let error = null;

    try {
      const fn = new Function(
        rootVarName,
        "console",
        `"use strict"; return (${code});`,
      );
      resultVal = fn(parsedData, fakeConsole);
      hasResult = true;
    } catch (e1) {
      try {
        const fn2 = new Function(
          rootVarName,
          "console",
          `"use strict"; ${code}`,
        );
        resultVal = fn2(parsedData, fakeConsole);
        hasResult = false;
      } catch (e2) {
        error = e2;
      }
    }

    return { logs, resultVal, hasResult, error };
  }

  function appendConsoleEntry(code) {
    const entry = document.createElement("div");
    entry.className = "console-entry";

    const inLine = document.createElement("div");
    inLine.className = "console-entry-input";
    inLine.textContent = code;
    entry.appendChild(inLine);

    const { logs, resultVal, hasResult, error } = executeConsoleCode(code);

    logs.forEach((log) => {
      const out = document.createElement("div");
      out.className = "console-entry-output";
      out.textContent = log;
      entry.appendChild(out);
    });

    if (error) {
      const out = document.createElement("div");
      out.className = "console-entry-output is-error";
      out.textContent = error.name + ": " + error.message;
      entry.appendChild(out);
    } else if (hasResult && resultVal !== undefined) {
      const out = document.createElement("div");
      out.className = "console-entry-output";
      out.textContent =
        typeof resultVal === "object"
          ? JSON.stringify(resultVal, null, 2)
          : String(resultVal);
      entry.appendChild(out);
    }

    consoleOutput.appendChild(entry);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }

  function insertPathIntoConsole(js) {
    consoleInput.value = js;
    consoleInput.focus();
  }

  consoleInput.addEventListener("input", () => {
    refreshAutocomplete();
    renderSuggestions();
  });

  consoleInput.addEventListener("keydown", (e) => {
    const isOpen = !consoleSuggestions.hidden;

    if (e.key === "Tab") {
      e.preventDefault();
      if (isOpen && suggestionCandidates.length > 0) {
        const picked =
          suggestionSelectedIndex >= 0
            ? suggestionCandidates[suggestionSelectedIndex]
            : suggestionCandidates[0];
        applyCompletion(picked.name);
        hideSuggestions();
      } else {
        refreshAutocomplete();
        if (suggestionCandidates.length > 0) {
          applyCompletion(suggestionCandidates[0].name);
        }
      }
      return;
    }

    if (isOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        suggestionSelectedIndex =
          (suggestionSelectedIndex + 1) % suggestionCandidates.length;
        renderSuggestions();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        suggestionSelectedIndex =
          (suggestionSelectedIndex - 1 + suggestionCandidates.length) %
          suggestionCandidates.length;
        renderSuggestions();
        return;
      }
      if (e.key === "Enter" && suggestionSelectedIndex >= 0) {
        e.preventDefault();
        applyCompletion(suggestionCandidates[suggestionSelectedIndex].name);
        hideSuggestions();
        return;
      }
      if (e.key === "Escape") {
        hideSuggestions();
        return;
      }
    }

    if (e.key === "Enter") {
      hideSuggestions();
      const code = consoleInput.value;
      if (!code.trim()) return;
      appendConsoleEntry(code);
      if (consoleHistory[consoleHistory.length - 1] !== code)
        consoleHistory.push(code);
      historyIndex = consoleHistory.length;
      consoleInput.value = "";
    } else if (e.key === "ArrowUp") {
      if (!consoleHistory.length) return;
      e.preventDefault();
      if (historyIndex === consoleHistory.length)
        draftBeforeHistory = consoleInput.value;
      historyIndex = Math.max(0, historyIndex - 1);
      consoleInput.value = consoleHistory[historyIndex];
    } else if (e.key === "ArrowDown") {
      if (!consoleHistory.length) return;
      e.preventDefault();
      historyIndex = Math.min(consoleHistory.length, historyIndex + 1);
      consoleInput.value =
        historyIndex === consoleHistory.length
          ? draftBeforeHistory
          : consoleHistory[historyIndex];
    }
  });

  clearConsoleBtn.addEventListener("click", () => {
    consoleOutput.innerHTML = "";
  });

  document.addEventListener("click", (e) => {
    if (e.target !== consoleInput && !consoleSuggestions.contains(e.target)) {
      hideSuggestions();
    }
  });

  // ---------------------------------------------------------------------
  // Bootstrap
  // ---------------------------------------------------------------------
  initResizableSplitters();
  initSettings();

  const SAMPLE = {
    totalItems: 2,
    member: [
      {
        id: "101",
        type: "VPMInstance",
        attributes: { name: "High-Pressure Turbine", unitOfMeasure: "EA" },
      },
      {
        id: "102",
        type: "VPMInstance",
        attributes: { name: "Centrifugal Pump", unitOfMeasure: "EA" },
      },
    ],
  };

  jsonInput.value = JSON.stringify(SAMPLE, null, 2);
  handleJsonInputChange();
})();
