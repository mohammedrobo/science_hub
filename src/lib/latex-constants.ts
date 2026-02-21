// ════════════════════════════════════════════════════════════════════════════
// SHARED LATEX CONSTANTS — Single source of truth for parser & renderer
// ════════════════════════════════════════════════════════════════════════════
// Both quiz-parser.ts (protectLatex) and MathText.tsx (detectLatex) import
// from here so their command/symbol/environment lists can never drift apart.

// ── LaTeX commands that consume brace groups {…} ───────────────────────────
// Each command may take optional brackets [..] and one or more {..} args.
// The parser uses balanced-brace matching (unlimited depth) for these.

export const LATEX_COMMANDS = [
    // ── Fractions & roots ──
    'frac', 'dfrac', 'tfrac', 'cfrac', 'sqrt', 'cbrt',

    // ── Accents & decorators ──
    'vec', 'hat', 'bar', 'dot', 'ddot', 'dddot', 'ddddot',
    'tilde', 'widetilde', 'widehat', 'widecheck',
    'overline', 'underline', 'overbrace', 'underbrace',
    'overleftarrow', 'overrightarrow', 'overleftrightarrow',
    'underleftarrow', 'underrightarrow', 'underleftrightarrow',
    'overset', 'underset', 'stackrel', 'atop',
    'cancel', 'bcancel', 'xcancel', 'cancelto', 'sout', 'boxed',

    // ── Binomials ──
    'binom', 'dbinom', 'tbinom', 'choose',

    // ── Text in math ──
    'text', 'textbf', 'textit', 'textrm', 'textsc', 'texttt', 'textsf', 'textnormal',
    'mathrm', 'mathbf', 'mathit', 'mathsf', 'mathtt',
    'mathcal', 'mathbb', 'mathfrak', 'mathscr',
    'boldsymbol', 'pmb', 'bm',

    // ── Chemistry (mhchem) ──
    'ce', 'pu',

    // ── Physics (siunitx) ──
    'SI', 'si', 'num', 'qty', 'unit', 'ang',

    // ── Sizing & boxing ──
    'colorbox', 'fcolorbox', 'color', 'textcolor',

    // ── Operators ──
    'operatorname', 'DeclareMathOperator',

    // ── Phantoms ──
    'phantom', 'vphantom', 'hphantom',

    // ── Extensible arrows ──
    'xleftarrow', 'xrightarrow', 'xLeftarrow', 'xRightarrow',
    'xmapsto', 'xhookrightarrow', 'xhookleftarrow',
    'xleftrightarrow', 'xLeftrightarrow',
    'xtwoheadleftarrow', 'xtwoheadrightarrow',

    // ── Delimiters (left/right) ──
    'left', 'right', 'bigl', 'bigr', 'Bigl', 'Bigr',
    'biggl', 'biggr', 'Biggl', 'Biggr', 'middle',

    // ── Display/sizing modifiers ──
    'displaystyle', 'textstyle', 'scriptstyle', 'scriptscriptstyle',
    'big', 'Big', 'bigg', 'Bigg',

    // ── Spacing ──
    'hspace', 'vspace', 'kern', 'mkern', 'mskip', 'hskip',
    'rule', 'raisebox', 'smash',

    // ── Environments by command ──
    'substack', 'sideset',

    // ── Misc ──
    'tag', 'label', 'ref', 'eqref',
    'href', 'url',
    'not',
    'limits', 'nolimits',
    'pmod', 'bmod', 'pod',
    'mod',

    // ── Nuclear / isotopes ──
    'isotope',

    // ── Lewis structures ──
    'lewis', 'Lewis',

    // ── Enclosures ──
    'underbracket', 'overbracket',
    'underlinesegment', 'overlinesegment',
    'utilde',
] as const;

// ── Standalone symbols (no brace arguments) ────────────────────────────────
// Greek letters, operators, relations, arrows, misc symbols.
// The parser wraps these in placeholders; the renderer detects them for KaTeX.

export const LATEX_SYMBOLS = [
    // ── Greek lowercase ──
    'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon',
    'zeta', 'eta', 'theta', 'vartheta', 'iota', 'kappa',
    'lambda', 'mu', 'nu', 'xi', 'pi', 'varpi',
    'rho', 'varrho', 'sigma', 'varsigma', 'tau', 'upsilon',
    'phi', 'varphi', 'chi', 'psi', 'omega',
    // ── Greek uppercase ──
    'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi',
    'Sigma', 'Upsilon', 'Phi', 'Psi', 'Omega',
    // ── Variable-size operators ──
    'sum', 'prod', 'coprod',
    'int', 'iint', 'iiint', 'oint', 'oiint', 'oiiint',
    'intop', 'smallint',
    'bigcup', 'bigcap', 'bigoplus', 'bigotimes', 'bigvee', 'bigwedge',
    'bigsqcup', 'bigodot', 'biguplus',
    // ── Log-like operators ──
    'lim', 'limsup', 'liminf', 'sup', 'inf',
    'max', 'min', 'arg', 'det', 'dim',
    'exp', 'gcd', 'lcm', 'hom', 'ker', 'deg',
    'log', 'ln', 'lg',
    'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
    'arcsin', 'arccos', 'arctan', 'arcctg', 'arccot', 'arcsec', 'arccsc',
    'sinh', 'cosh', 'tanh', 'coth', 'sech', 'csch',
    'Pr',
    // ── Binary operators ──
    'times', 'div', 'pm', 'mp', 'cdot', 'cdots', 'ldots', 'ddots', 'vdots',
    'circ', 'bullet', 'star', 'ast',
    'oplus', 'otimes', 'odot', 'oslash', 'ominus',
    'dagger', 'ddagger', 'amalg',
    'cap', 'cup', 'sqcap', 'sqcup', 'uplus',
    'wedge', 'vee', 'land', 'lor', 'lnot', 'neg',
    'setminus', 'smallsetminus',
    'wr', 'diamond', 'bigtriangleup', 'bigtriangledown',
    'triangleleft', 'triangleright',
    // ── Relations ──
    'leq', 'le', 'geq', 'ge', 'neq', 'ne',
    'approx', 'cong', 'ncong', 'equiv', 'sim', 'simeq',
    'propto', 'asymp', 'doteq', 'models',
    'prec', 'succ', 'preceq', 'succeq', 'll', 'gg',
    'subset', 'supset', 'subseteq', 'supseteq',
    'subsetneq', 'supsetneq', 'nsubseteq', 'nsupseteq',
    'sqsubset', 'sqsupset', 'sqsubseteq', 'sqsupseteq',
    'in', 'notin', 'ni', 'owns',
    'vdash', 'dashv', 'vDash', 'Vdash', 'Vvdash',
    'nvdash', 'nvDash', 'nVdash', 'nVDash',
    // ── Negated relations ──
    'nleq', 'ngeq', 'nless', 'ngtr', 'nprec', 'nsucc',
    'nsim', 'ncong', 'nequiv',
    // ── Arrows ──
    'rightarrow', 'leftarrow', 'Rightarrow', 'Leftarrow',
    'leftrightarrow', 'Leftrightarrow',
    'longrightarrow', 'longleftarrow',
    'Longrightarrow', 'Longleftarrow',
    'longleftrightarrow', 'Longleftrightarrow',
    'uparrow', 'downarrow', 'Uparrow', 'Downarrow',
    'updownarrow', 'Updownarrow',
    'nearrow', 'searrow', 'swarrow', 'nwarrow',
    'mapsto', 'longmapsto',
    'hookrightarrow', 'hookleftarrow',
    'rightharpoonup', 'rightharpoondown',
    'leftharpoonup', 'leftharpoondown',
    'rightleftharpoons', 'leftrightharpoons',
    'rightrightarrows', 'leftleftarrows',
    'rightleftarrows', 'leftrightarrows',
    'twoheadrightarrow', 'twoheadleftarrow',
    'to', 'gets', 'implies', 'impliedby', 'iff',
    // ── Logic & sets ──
    'emptyset', 'varnothing', 'forall', 'exists', 'nexists',
    'complement', 'therefore', 'because',
    // ── Calculus / analysis ──
    'partial', 'nabla', 'infty',
    // ── Hebrew ──
    'aleph', 'beth', 'gimel', 'daleth',
    // ── Misc symbols ──
    'wp', 'ell', 'hbar', 'imath', 'jmath', 'Re', 'Im',
    'angle', 'measuredangle', 'sphericalangle',
    'triangle', 'square', 'Diamond', 'Box', 'lozenge',
    'perp', 'parallel', 'nparallel',
    'mid', 'nmid', 'shortmid', 'nshortmid',
    'flat', 'natural', 'sharp',
    'clubsuit', 'diamondsuit', 'heartsuit', 'spadesuit',
    'checkmark', 'maltese',
    // ── Spacing ──
    'quad', 'qquad', 'enspace', 'thinspace', 'space',
    'negmedspace', 'negthickspace', 'negthinspace',
    // ── Delimiters (standalone) ──
    'langle', 'rangle', 'lfloor', 'rfloor', 'lceil', 'rceil',
    'lbrace', 'rbrace', 'lvert', 'rvert', 'lVert', 'rVert',
    'backslash',
    // ── Dots ──
    'dots', 'dotsb', 'dotsc', 'dotsi', 'dotsm', 'dotso',
    // ── Accents (standalone, no args) ──
    'prime', 'backprime',
] as const;

// ── LaTeX environments ─────────────────────────────────────────────────────
// Used to detect \begin{ENV}...\end{ENV} blocks for protection.

export const LATEX_ENVIRONMENTS = [
    'matrix', 'pmatrix', 'bmatrix', 'Bmatrix', 'vmatrix', 'Vmatrix',
    'smallmatrix',
    'array', 'cases', 'rcases',
    'align', 'align*', 'aligned',
    'gather', 'gather*', 'gathered',
    'split', 'multline', 'multline*',
    'equation', 'equation*',
    'eqnarray', 'eqnarray*',
    'subarray',
    'CD', // commutative diagram
] as const;

// ── Unicode → LaTeX symbol map ─────────────────────────────────────────────
// Applied to non-math text segments to convert Unicode math symbols to LaTeX.

export const UNICODE_MATH_MAP: [RegExp, string][] = [
    // Relations
    [/\u2264/g, '\\leq'], [/\u2265/g, '\\geq'], [/\u2260/g, '\\neq'],
    [/\u2248/g, '\\approx'], [/\u2245/g, '\\cong'], [/\u2261/g, '\\equiv'],
    [/\u223C/g, '\\sim'], [/\u2243/g, '\\simeq'],
    [/\u226A/g, '\\ll'], [/\u226B/g, '\\gg'],
    [/\u227A/g, '\\prec'], [/\u227B/g, '\\succ'],
    // Operators
    [/\u00B1/g, '\\pm'], [/\u2213/g, '\\mp'],
    [/\u00B7/g, '\\cdot'], [/\u00D7/g, '\\times'], [/\u00F7/g, '\\div'],
    [/\u2217/g, '\\ast'], [/\u2218/g, '\\circ'],
    // Sets
    [/\u2208/g, '\\in'], [/\u2209/g, '\\notin'], [/\u220B/g, '\\ni'],
    [/\u2282/g, '\\subset'], [/\u2283/g, '\\supset'],
    [/\u2286/g, '\\subseteq'], [/\u2287/g, '\\supseteq'],
    [/\u222A/g, '\\cup'], [/\u2229/g, '\\cap'],
    [/\u2205/g, '\\emptyset'], [/\u2200/g, '\\forall'], [/\u2203/g, '\\exists'],
    // Arrows
    [/\u2192/g, '\\rightarrow'], [/\u2190/g, '\\leftarrow'],
    [/\u21D2/g, '\\Rightarrow'], [/\u21D0/g, '\\Leftarrow'],
    [/\u21D4/g, '\\Leftrightarrow'], [/\u2194/g, '\\leftrightarrow'],
    [/\u21A6/g, '\\mapsto'], [/\u21AA/g, '\\hookrightarrow'],
    [/\u21A9/g, '\\hookleftarrow'],
    [/\u27F6/g, '\\longrightarrow'], [/\u27F5/g, '\\longleftarrow'],
    [/\u27F9/g, '\\Longrightarrow'], [/\u27F8/g, '\\Longleftarrow'],
    // Calculus
    [/\u2202/g, '\\partial'], [/\u2207/g, '\\nabla'],
    [/\u221E/g, '\\infty'],
    [/\u2211/g, '\\sum'], [/\u220F/g, '\\prod'], [/\u222B/g, '\\int'],
    [/\u222C/g, '\\iint'], [/\u222D/g, '\\iiint'], [/\u222E/g, '\\oint'],
    // Geometry
    [/\u221A/g, '\\sqrt'], [/\u221D/g, '\\propto'], [/\u2220/g, '\\angle'],
    [/\u25B3/g, '\\triangle'], [/\u22A5/g, '\\perp'], [/\u2225/g, '\\parallel'],
    // Chemistry
    [/\u21CC/g, '\\rightleftharpoons'], // ⇌ equilibrium
    [/\u21CB/g, '\\leftrightharpoons'],
    [/\u2192/g, '\\rightarrow'],        // → reaction arrow
    // Logic
    [/\u2227/g, '\\wedge'], [/\u2228/g, '\\vee'], [/\u00AC/g, '\\neg'],
    [/\u2234/g, '\\therefore'], [/\u2235/g, '\\because'],
    // Misc
    [/\u2026/g, '\\ldots'], [/\u22C5/g, '\\cdot'],
    [/\u2032/g, "'"], [/\u2033/g, "''"], // prime
    [/\u2102/g, '\\mathbb{C}'], [/\u211D/g, '\\mathbb{R}'],
    [/\u2124/g, '\\mathbb{Z}'], [/\u2115/g, '\\mathbb{N}'],
    [/\u211A/g, '\\mathbb{Q}'],
];

// ── Unicode superscript/subscript digit maps ───────────────────────────────

export const UNICODE_SUPERSCRIPTS: Record<string, string> = {
    '\u2070': '0', '\u00B9': '1', '\u00B2': '2', '\u00B3': '3',
    '\u2074': '4', '\u2075': '5', '\u2076': '6', '\u2077': '7',
    '\u2078': '8', '\u2079': '9', '\u207A': '+', '\u207B': '-',
    '\u207C': '=', '\u207D': '(', '\u207E': ')',
    '\u207F': 'n', '\u2071': 'i',
};

export const UNICODE_SUBSCRIPTS: Record<string, string> = {
    '\u2080': '0', '\u2081': '1', '\u2082': '2', '\u2083': '3',
    '\u2084': '4', '\u2085': '5', '\u2086': '6', '\u2087': '7',
    '\u2088': '8', '\u2089': '9', '\u208A': '+', '\u208B': '-',
    '\u208C': '=', '\u208D': '(', '\u208E': ')',
    '\u2099': 'n', '\u2093': 'x', '\u2090': 'a', '\u2091': 'e',
    '\u2092': 'o', '\u2095': 'h', '\u2096': 'k', '\u2097': 'l',
    '\u2098': 'm', '\u209A': 'p', '\u209B': 's', '\u209C': 't',
    '\u1D62': 'i', '\u1D63': 'r', '\u1D64': 'u', '\u1D65': 'v',
    '\u2C7C': 'j',
};

// ── KaTeX rendering macros ─────────────────────────────────────────────────
// Shared between all KaTeX rendering instances (MathText, quiz page, etc.)

export const KATEX_MACROS: Record<string, string> = {
    // Number sets
    '\\R': '\\mathbb{R}',
    '\\N': '\\mathbb{N}',
    '\\Z': '\\mathbb{Z}',
    '\\Q': '\\mathbb{Q}',
    '\\C': '\\mathbb{C}',
    // Physics / chemistry shortcuts
    '\\degree': '^{\\circ}',
    '\\degC': '^{\\circ}\\text{C}',
    '\\degF': '^{\\circ}\\text{F}',
    '\\ohm': '\\Omega',
    '\\micro': '\\mu',
    '\\angstrom': '\\text{\\AA}',
    '\\kJ': '\\text{kJ}',
    '\\mol': '\\text{mol}',
    '\\atm': '\\text{atm}',
    '\\Hz': '\\text{Hz}',
    '\\pH': '\\text{pH}',
    '\\pOH': '\\text{pOH}',
    '\\pKa': '\\text{p}K_a',
    '\\pKb': '\\text{p}K_b',
    // Convenience fractions
    '\\half': '\\frac{1}{2}',
    '\\third': '\\frac{1}{3}',
    '\\quarter': '\\frac{1}{4}',
    // SI units (simplified macros for \SI{}{} and \si{} compatibility)
    '\\meter': '\\text{m}',
    '\\metre': '\\text{m}',
    '\\kilogram': '\\text{kg}',
    '\\second': '\\text{s}',
    '\\ampere': '\\text{A}',
    '\\kelvin': '\\text{K}',
    '\\candela': '\\text{cd}',
    '\\hertz': '\\text{Hz}',
    '\\newton': '\\text{N}',
    '\\pascal': '\\text{Pa}',
    '\\joule': '\\text{J}',
    '\\watt': '\\text{W}',
    '\\coulomb': '\\text{C}',
    '\\volt': '\\text{V}',
    '\\farad': '\\text{F}',
    '\\henry': '\\text{H}',
    '\\weber': '\\text{Wb}',
    '\\tesla': '\\text{T}',
    '\\lumen': '\\text{lm}',
    '\\lux': '\\text{lx}',
    '\\becquerel': '\\text{Bq}',
    '\\gray': '\\text{Gy}',
    '\\sievert': '\\text{Sv}',
    '\\katal': '\\text{kat}',
    '\\litre': '\\text{L}',
    '\\liter': '\\text{L}',
    '\\per': '/',
    '\\squared': '^{2}',
    '\\cubed': '^{3}',
    '\\tothe': '^',
};

// ── Build regex patterns from the lists ────────────────────────────────────
// These are used by both parser and renderer.

/** Regex fragment matching any known LaTeX command (without leading backslash) */
export function buildCommandRegexSource(): string {
    // Sort by length descending so longer commands match first
    const sorted = [...LATEX_COMMANDS].sort((a, b) => b.length - a.length);
    return sorted.join('|');
}

/** Regex fragment matching any known LaTeX symbol (without leading backslash) */
export function buildSymbolRegexSource(): string {
    const sorted = [...LATEX_SYMBOLS].sort((a, b) => b.length - a.length);
    return sorted.join('|');
}
