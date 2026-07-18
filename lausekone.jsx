import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { Loader2, ChevronDown, ChevronUp, X, BookOpen, CornerDownLeft } from "lucide-react";

// ---------------- palette: hanki (snow crust) + ink + steel blue; case colors do the marimekko pop ----------------
const INK = "#151A1E";
const MIST = "#5F6B73";
const PAPER = "#F2F4F3";
const PANEL = "#FFFFFF";
const LINE = "#D9E0DE";
const BLUE = "#26557F";

const SERIF = "'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

const CASE_META = {
  nominative: { abbr: "nom", color: "#5B6770" },
  genitive: { abbr: "gen", color: "#6D28D9" },
  partitive: { abbr: "par", color: "#B42318" },
  accusative: { abbr: "acc", color: "#C2185B" },
  inessive: { abbr: "ine", color: "#0F7B5F" },
  elative: { abbr: "ela", color: "#0E7490" },
  illative: { abbr: "ill", color: "#1D6FB8" },
  adessive: { abbr: "ade", color: "#B45309" },
  ablative: { abbr: "abl", color: "#C2410C" },
  allative: { abbr: "all", color: "#946800" },
  essive: { abbr: "ess", color: "#A21CAF" },
  translative: { abbr: "tra", color: "#5B21B6" },
  abessive: { abbr: "abe", color: "#57534E" },
  comitative: { abbr: "com", color: "#0369A1" },
  instructive: { abbr: "ins", color: "#4338CA" },
};
const NO_CASE = "#8B9AA3";

const caseOf = (t) => (t && t.feats && t.feats.case ? String(t.feats.case).toLowerCase() : null);
const caseColor = (name) => (name && CASE_META[name] ? CASE_META[name].color : NO_CASE);
const caseAbbr = (name) => (name && CASE_META[name] ? CASE_META[name].abbr : name || "");

const DEPREL_HUMAN = {
  nsubj: "subject", "nsubj:cop": "subject", obj: "object", iobj: "recipient",
  obl: "adverbial", "obl:tmod": "time", nmod: "of-modifier", "nmod:poss": "possessor",
  amod: "adjective", advmod: "adverb", nummod: "numeral", det: "determiner",
  cop: "copula", aux: "auxiliary", "aux:neg": "negation", root: "root",
  case: "adposition", mark: "subordinator", cc: "conjunction", conj: "conjoined",
  xcomp: "open complement", ccomp: "complement", advcl: "adverbial clause",
  acl: "relative clause", "acl:relcl": "relative clause", compound: "compound",
  "compound:nn": "compound", flat: "flat", "flat:name": "name", appos: "apposition",
  discourse: "discourse", vocative: "vocative", parataxis: "parataxis", punct: "·",
};

const EXAMPLES = [
  "Luen kirjaa junassa.",
  "Minulla on kaksi koiraa.",
  "Kissa hyppäsi pöydältä lattialle.",
  "Menen huomenna kauppaan ilman rahaa.",
  "Hän työskentelee opettajana Helsingissä.",
];

const CHEATSHEET = [
  {
    group: "grammatical cases",
    items: [
      { name: "nominative", ending: "–", use: "subject; the bare dictionary form", ex: "talo", es: "el sujeto, sin marca" },
      { name: "genitive", ending: "-n", use: "possession; total objects; object of postpositions", ex: "talon ovi", es: "'de': la puerta de la casa" },
      { name: "partitive", ending: "-a/-ä, -ta/-tä", use: "partial or ongoing objects, indefinite amounts, negation, after numerals", ex: "juon kahvia", es: "'algo de': comí pan (no todo el pan)" },
      { name: "accusative", ending: "-t (pronouns only)", use: "total object of personal pronouns", ex: "hän näki minut", es: "objeto completo: me vio (entero)" },
    ],
  },
  {
    group: "inner locatives — inside something",
    items: [
      { name: "inessive", ending: "-ssa/-ssä", use: "in, inside", ex: "talossa", es: "en (adentro)" },
      { name: "elative", ending: "-sta/-stä", use: "out of, from inside; also 'about' a topic", ex: "talosta", es: "de/desde adentro; 'sobre' un tema" },
      { name: "illative", ending: "-Vn, -hVn, -seen", use: "into", ex: "taloon", es: "a/hacia adentro" },
    ],
  },
  {
    group: "outer locatives — surface & vicinity",
    items: [
      { name: "adessive", ending: "-lla/-llä", use: "on, at; possession (minulla on = i have)", ex: "pöydällä", es: "en/sobre; tener: minulla on ≈ 'en mí hay'" },
      { name: "ablative", ending: "-lta/-ltä", use: "off, away from a surface", ex: "pöydältä", es: "desde (la superficie)" },
      { name: "allative", ending: "-lle", use: "onto, to; dative-ish recipient", ex: "annoin hänelle", es: "a/hacia; el 'le' de 'le di'" },
    ],
  },
  {
    group: "marginal cases",
    items: [
      { name: "essive", ending: "-na/-nä", use: "as, in the role or state of", ex: "opettajana", es: "de/como: trabaja de maestro" },
      { name: "translative", ending: "-ksi", use: "becoming, turning into; purpose", ex: "tuli opettajaksi", es: "volverse: se hizo maestro" },
      { name: "abessive", ending: "-tta/-ttä", use: "without", ex: "rahatta", es: "sin" },
      { name: "comitative", ending: "-ine(en)", use: "together with (formal, takes possessive suffix)", ex: "vaimoineen", es: "con (registro formal)" },
      { name: "instructive", ending: "-in", use: "by means of; fossilized phrases", ex: "omin käsin", es: "a: a mano, a pie" },
    ],
  },
];

// ---------------- api plumbing ----------------

function buildParsePrompt(sentence) {
  return [
    "you are a finnish morphological analyzer and dependency parser (universal dependencies style).",
    "analyze the finnish sentence at the end. respond with ONLY valid json — no markdown fences, no prose. be extremely terse in every string.",
    "schema:",
    '{"translation_en":"natural english","translation_es":"natural argentine spanish (voseo ok)",',
    '"tokens":[{"id":1,"text":"surface","lemma":"dictionary form","pos":"UD upos (NOUN VERB ADJ PRON ADV ADP NUM AUX PUNCT ...)",',
    '"feats":{"case":"full lowercase english case name (e.g. inessive) or null","number":"singular|plural|null","person":"1|2|3|null","tense":"present|past|null","mood":"indicative|conditional|imperative|potential|null","verbform":"finite|infinitive|participle|null","other":"anything else notable (possessive suffix, clitic, comparison) or null"},',
    '"head":0,"deprel":"UD relation (nsubj obj obl nmod amod advmod cop aux root punct ...)",',
    '"morph":"segmentation with + (e.g. talo+ssa, men+isi+n)",',
    '"gloss_en":"literal gloss","gloss_es":"glosa literal",',
    '"why":"<=14 words: why this exact form/case here"}],',
    '"cases":[{"name":"inessive","fi_name":"inessiivi","ending":"-ssa/-ssä","token_ids":[2],"why_here":"<=18 words","es_hint":"analogy for a rioplatense spanish speaker, <=12 words","en_hint":"analogy for an english speaker, <=12 words"}],',
    '"notes":["up to 3 short notes on consonant gradation / vowel harmony / word order / clitics, only if actually at play in this sentence"]}',
    'rules: ids are 1-based in order. head=0 only for the root. include punctuation tokens. the cases array covers only cases actually present among the tokens. if the input is not finnish, return {"error":"short reason"}.',
    'sentence: "' + sentence.replace(/"/g, "'") + '"',
  ].join("\n");
}

async function callClaude(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// unofficial endpoint; the artifact sandbox's csp usually blocks it — we fall back silently
async function tryGoogle(text, tl) {
  try {
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=fi&tl=" +
      tl +
      "&dt=t&q=" +
      encodeURIComponent(text);
    const r = await fetch(url);
    if (!r.ok) return null;
    const d = await r.json();
    return d[0].map((s) => s[0]).join("");
  } catch (e) {
    return null;
  }
}

// ---------------- dependency arc view (the signature) ----------------

function DepArcs({ tokens, selId, onSelect }) {
  const rowRef = useRef(null);
  const chipRefs = useRef({});
  const [geom, setGeom] = useState(null);

  const measure = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const centers = {};
    for (const t of tokens) {
      const el = chipRefs.current[t.id];
      if (!el) return;
      centers[t.id] = el.offsetLeft + el.offsetWidth / 2;
    }
    setGeom({ centers, width: Math.max(row.scrollWidth, row.offsetWidth) });
  }, [tokens]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    const id = setTimeout(measure, 300); // re-measure after fonts settle
    return () => {
      window.removeEventListener("resize", measure);
      clearTimeout(id);
    };
  }, [measure]);

  const idx = {};
  tokens.forEach((t, i) => (idx[t.id] = i));
  const arcs = tokens.filter((t) => t.head && t.head !== 0 && idx[t.head] !== undefined);
  const hgt = (t) => 26 + Math.min(Math.abs(idx[t.head] - idx[t.id]), 6) * 20;
  const maxH = arcs.length ? Math.max.apply(null, arcs.map(hgt)) : 40;
  const svgH = maxH + 26;
  const root = tokens.find((t) => t.head === 0);

  const related = new Set();
  if (selId != null) {
    related.add(selId);
    const sel = tokens.find((t) => t.id === selId);
    if (sel && sel.head) related.add(sel.head);
    tokens.forEach((t) => {
      if (t.head === selId) related.add(t.id);
    });
  }

  return (
    <div className="overflow-x-auto pb-1">
      <div style={{ width: "max-content", minWidth: "100%" }}>
        <svg width={geom ? geom.width : 0} height={svgH} style={{ display: "block" }}>
          {geom && root && geom.centers[root.id] !== undefined && (
            <g opacity={selId == null || related.has(root.id) ? 1 : 0.25}>
              <line
                x1={geom.centers[root.id]}
                y1={svgH - 22}
                x2={geom.centers[root.id]}
                y2={svgH}
                stroke={MIST}
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={geom.centers[root.id]}
                y={svgH - 27}
                textAnchor="middle"
                fontSize="10"
                fill={MIST}
                fontStyle="italic"
                style={{ fontFamily: SERIF }}
              >
                root
              </text>
            </g>
          )}
          {geom &&
            arcs.map((t) => {
              const x1 = geom.centers[t.head];
              const x2 = geom.centers[t.id];
              if (x1 === undefined || x2 === undefined) return null;
              const h = hgt(t);
              const y0 = svgH;
              const col = caseColor(caseOf(t));
              const active = selId == null || t.id === selId || t.head === selId;
              const label = DEPREL_HUMAN[t.deprel] || t.deprel || "";
              const mid = (x1 + x2) / 2;
              return (
                <g key={t.id} opacity={selId == null ? 0.9 : active ? 1 : 0.15} style={{ transition: "opacity .2s" }}>
                  <path
                    d={"M " + x1 + " " + y0 + " C " + x1 + " " + (y0 - h) + ", " + x2 + " " + (y0 - h) + ", " + x2 + " " + y0}
                    fill="none"
                    stroke={col}
                    strokeWidth={selId != null && active ? 1.8 : 1.2}
                  />
                  <path
                    d={"M " + (x2 - 3.5) + " " + (y0 - 7) + " L " + (x2 + 3.5) + " " + (y0 - 7) + " L " + x2 + " " + y0 + " Z"}
                    fill={col}
                  />
                  {label && label !== "·" && (
                    <text
                      x={mid}
                      y={y0 - h * 0.75 - 5}
                      textAnchor="middle"
                      fontSize="10.5"
                      fontStyle="italic"
                      fill={col}
                      stroke={PAPER}
                      strokeWidth="3"
                      paintOrder="stroke"
                      style={{ fontFamily: SERIF }}
                    >
                      {label}
                    </text>
                  )}
                </g>
              );
            })}
        </svg>
        <div ref={rowRef} className="relative flex items-start gap-2">
          {tokens.map((t) => {
            const cn = caseOf(t);
            const col = caseColor(cn);
            const sel = selId === t.id;
            const rel = selId != null && related.has(t.id) && !sel;
            const punct = t.pos === "PUNCT";
            return (
              <button
                key={t.id}
                ref={(el) => (chipRefs.current[t.id] = el)}
                onClick={() => onSelect(sel ? null : t.id)}
                className="text-left rounded-sm px-2 pb-1.5 pt-1"
                style={{
                  borderTop: "3px solid " + (punct ? "transparent" : col),
                  background: sel ? PANEL : rel ? "rgba(255,255,255,0.7)" : "transparent",
                  boxShadow: sel ? "0 0 0 1.5px " + INK : rel ? "0 0 0 1px " + LINE : "none",
                  opacity: selId != null && !related.has(t.id) ? 0.45 : 1,
                  transition: "opacity .2s, box-shadow .15s",
                  cursor: "pointer",
                }}
              >
                <span className="block" style={{ fontFamily: SERIF, fontSize: 18, color: INK, whiteSpace: "nowrap" }}>
                  {t.text}
                </span>
                {!punct && (
                  <span
                    className="block"
                    style={{ fontFamily: MONO, fontSize: 10, color: MIST, marginTop: 2, whiteSpace: "nowrap" }}
                  >
                    {cn ? caseAbbr(cn) + " · " : ""}
                    {t.gloss_en || ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------- small ui atoms ----------------

const Tag = ({ children }) => (
  <div style={{ fontSize: 10, letterSpacing: "0.18em", color: MIST }}>{children}</div>
);

const Card = ({ rail, children, style }) => (
  <section
    style={Object.assign(
      {
        background: PANEL,
        border: "1px solid " + LINE,
        borderLeft: rail ? "3px solid " + rail : "1px solid " + LINE,
        borderRadius: 2,
        padding: "14px 16px",
      },
      style || {}
    )}
  >
    {children}
  </section>
);

// ---------------- main ----------------

export default function Lausekone() {
  const [sentence, setSentence] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [result, setResult] = useState(null);
  const [selId, setSelId] = useState(null);
  const [gEn, setGEn] = useState(undefined);
  const [gEs, setGEs] = useState(undefined);
  const [wikt, setWikt] = useState({});
  const [cdefs, setCdefs] = useState({});
  const [showSheet, setShowSheet] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const analyze = useCallback(
    async (raw) => {
      const s = (raw != null ? raw : sentence).trim();
      if (!s || busy) return;
      setBusy(true);
      setErr(null);
      setResult(null);
      setSelId(null);
      setGEn(undefined);
      setGEs(undefined);
      try {
        const parsed = await callClaude(buildParsePrompt(s));
        if (parsed && parsed.error) {
          setErr(parsed.error);
        } else if (!parsed || !Array.isArray(parsed.tokens) || parsed.tokens.length === 0) {
          setErr("parser returned malformed json — probably truncated. try a shorter sentence.");
        } else {
          setResult(parsed);
          tryGoogle(s, "en").then(setGEn);
          tryGoogle(s, "es").then(setGEs);
        }
      } catch (e) {
        setErr(
          "parse failed: " +
            (e && e.message ? e.message : String(e)) +
            " — usually truncated json. shorten the sentence or hit jäsennä again."
        );
      } finally {
        setBusy(false);
      }
    },
    [sentence, busy]
  );

  const lookupWikt = async (lemma) => {
    const key = String(lemma || "").toLowerCase();
    if (!key) return;
    setWikt((w) => Object.assign({}, w, { [key]: { loading: true } }));
    try {
      const res = await fetch(
        "https://en.wiktionary.org/api/rest_v1/page/definition/" + encodeURIComponent(key) + "?origin=*"
      );
      if (!res.ok) throw new Error("no entry");
      const d = await res.json();
      const fi = d.fi;
      if (!fi || !fi.length) throw new Error("no finnish section");
      const entries = fi.map((e) => ({
        pos: e.partOfSpeech,
        defs: (e.definitions || [])
          .slice(0, 3)
          .map((x) => String(x.definition || "").replace(/<[^>]+>/g, "").trim())
          .filter(Boolean),
      }));
      setWikt((w) => Object.assign({}, w, { [key]: { entries } }));
    } catch (e) {
      setWikt((w) =>
        Object.assign({}, w, {
          [key]: {
            err: "unreachable — the artifact sandbox blocks third-party fetches (or no entry exists). ask claude below, or run this file outside claude.ai and this button works.",
          },
        })
      );
    }
  };

  const askClaudeDef = async (lemma) => {
    const key = String(lemma || "").toLowerCase();
    if (!key) return;
    setCdefs((c) => Object.assign({}, c, { [key]: { loading: true } }));
    try {
      const p =
        'terse english dictionary entry for the finnish lemma "' +
        key +
        '". respond ONLY with json, no fences: {"pos":"noun","defs":["...","..."]}. max 3 defs, each <=10 words.';
      const d = await callClaude(p);
      setCdefs((c) => Object.assign({}, c, { [key]: { pos: d.pos, defs: d.defs || [] } }));
    } catch (e) {
      setCdefs((c) => Object.assign({}, c, { [key]: { err: "that failed too — api hiccup or a genuinely cursed word." } }));
    }
  };

  const selTok = result && selId != null ? result.tokens.find((t) => t.id === selId) : null;
  const headTok =
    selTok && selTok.head ? result.tokens.find((t) => t.id === selTok.head) : null;
  const selCase = selTok ? caseOf(selTok) : null;
  const selKey = selTok ? String(selTok.lemma || "").toLowerCase() : null;
  const wEntry = selKey ? wikt[selKey] : null;
  const cEntry = selKey ? cdefs[selKey] : null;

  const feats = selTok && selTok.feats ? Object.entries(selTok.feats).filter(([, v]) => v) : [];

  return (
    <div style={{ minHeight: "100vh", background: PAPER, color: INK, fontFamily: "system-ui, sans-serif" }}>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* header */}
        <Tag>suomi · sijamuodot · dependencies</Tag>
        <h1 style={{ fontFamily: SERIF, fontSize: 42, lineHeight: 1.05, marginTop: 6 }}>lausekone</h1>
        <p style={{ color: MIST, fontSize: 14, marginTop: 8, maxWidth: 520 }}>
          paste a finnish sentence. get its anatomy: every case and why it's there, morpheme
          boundaries, and arcs showing which word governs which.
        </p>

        {/* input */}
        <Card style={{ marginTop: 24, padding: 12 }}>
          <div className="flex items-center gap-2">
            <input
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") analyze();
              }}
              placeholder="Kirjoita lause tähän…"
              className="flex-1 bg-transparent outline-none"
              style={{ fontFamily: SERIF, fontSize: 18, color: INK }}
            />
            <button
              onClick={() => analyze()}
              disabled={busy || !sentence.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-sm"
              style={{
                background: busy || !sentence.trim() ? MIST : INK,
                color: PAPER,
                fontSize: 13,
                letterSpacing: "0.06em",
                cursor: busy || !sentence.trim() ? "default" : "pointer",
              }}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <CornerDownLeft size={13} />}
              jäsennä
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  setSentence(ex);
                  analyze(ex);
                }}
                className="px-2 py-1 rounded-sm"
                style={{ border: "1px solid " + LINE, fontSize: 11.5, color: MIST, fontFamily: SERIF, cursor: "pointer", background: "transparent" }}
              >
                {ex}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: MIST, marginTop: 10 }}>
            best under ~12 words per pass · an llm does the parsing, so double-check rare compounds
          </div>
        </Card>

        {/* states */}
        {err && (
          <Card rail={CASE_META.partitive.color} style={{ marginTop: 16 }}>
            <Tag>virhe</Tag>
            <div style={{ fontSize: 13.5, marginTop: 4 }}>{err}</div>
          </Card>
        )}

        {busy && (
          <div className="flex items-center gap-2 mt-8" style={{ color: MIST, fontSize: 13 }}>
            <Loader2 size={14} className="animate-spin" />
            <span style={{ fontFamily: SERIF, fontStyle: "italic" }}>hetkinen… splitting morphemes</span>
          </div>
        )}

        {/* results */}
        {result && !busy && (
          <div className="mt-6 flex flex-col gap-4">
            {/* translations */}
            <Card>
              <Tag>käännös · translation</Tag>
              <div className="mt-2 flex flex-col gap-2">
                <div>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: MIST }}>claude · en&nbsp;&nbsp;</span>
                  <span style={{ fontSize: 14.5 }}>{result.translation_en}</span>
                </div>
                <div>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: MIST }}>claude · es&nbsp;&nbsp;</span>
                  <span style={{ fontSize: 14.5 }}>{result.translation_es}</span>
                </div>
                {typeof gEn === "string" && (
                  <div>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: MIST }}>google · en&nbsp;&nbsp;</span>
                    <span style={{ fontSize: 14.5 }}>{gEn}</span>
                  </div>
                )}
                {typeof gEs === "string" && (
                  <div>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: MIST }}>google · es&nbsp;&nbsp;</span>
                    <span style={{ fontSize: 14.5 }}>{gEs}</span>
                  </div>
                )}
                {gEn === null && gEs === null && (
                  <div style={{ fontSize: 10.5, color: MIST }}>
                    google translate unreachable here (sandbox csp) — works if you run this file locally
                  </div>
                )}
              </div>
            </Card>

            {/* dependency arcs */}
            <Card style={{ paddingBottom: 10 }}>
              <div className="flex items-baseline justify-between">
                <Tag>riippuvuudet · tap a word</Tag>
                {selId != null && (
                  <button
                    onClick={() => setSelId(null)}
                    style={{ fontSize: 10.5, color: MIST, cursor: "pointer", background: "transparent", border: "none" }}
                  >
                    clear
                  </button>
                )}
              </div>
              <div className="mt-2">
                <DepArcs tokens={result.tokens} selId={selId} onSelect={setSelId} />
              </div>
            </Card>

            {/* selected token detail */}
            {selTok && (
              <Card rail={caseColor(selCase)}>
                <div className="flex items-start justify-between">
                  <div>
                    <span style={{ fontFamily: SERIF, fontSize: 26 }}>{selTok.text}</span>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: MIST, marginLeft: 10 }}>
                      lemma: {selTok.lemma}
                    </span>
                  </div>
                  <button onClick={() => setSelId(null)} style={{ color: MIST, background: "transparent", border: "none", cursor: "pointer" }}>
                    <X size={15} />
                  </button>
                </div>

                {selTok.morph && (
                  <div style={{ fontFamily: MONO, fontSize: 14, marginTop: 8, color: caseColor(selCase) }}>
                    {selTok.morph}
                  </div>
                )}

                <div className="mt-3 flex flex-col gap-1" style={{ fontSize: 13 }}>
                  <div>
                    <span style={{ color: MIST }}>role </span>
                    {(DEPREL_HUMAN[selTok.deprel] || selTok.deprel)}
                    {headTok ? " of “" + headTok.text + "”" : " (root of the sentence)"}
                    <span style={{ fontFamily: MONO, fontSize: 10.5, color: MIST }}>
                      {" "}· {selTok.pos}{selTok.deprel ? " · " + selTok.deprel : ""}
                    </span>
                  </div>
                  {feats.map(([k, v]) => (
                    <div key={k}>
                      <span style={{ color: MIST }}>{k} </span>
                      {k === "case" ? (
                        <span style={{ color: caseColor(String(v).toLowerCase()) }}>{String(v).toLowerCase()}</span>
                      ) : (
                        String(v).toLowerCase()
                      )}
                    </div>
                  ))}
                  {selTok.why && (
                    <div style={{ fontFamily: SERIF, fontStyle: "italic", marginTop: 6 }}>{selTok.why}</div>
                  )}
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: MIST }}>en&nbsp;&nbsp;</span>
                    {selTok.gloss_en}
                    <span style={{ fontFamily: MONO, fontSize: 10, color: MIST }}>&nbsp;&nbsp;es&nbsp;&nbsp;</span>
                    {selTok.gloss_es}
                  </div>
                </div>

                {/* wiktionary */}
                <div className="mt-4 pt-3" style={{ borderTop: "1px solid " + LINE }}>
                  {!wEntry && (
                    <button
                      onClick={() => lookupWikt(selTok.lemma)}
                      className="flex items-center gap-1.5"
                      style={{ fontSize: 12, color: BLUE, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      <BookOpen size={13} /> look up “{selTok.lemma}” on wiktionary
                    </button>
                  )}
                  {wEntry && wEntry.loading && (
                    <div style={{ fontSize: 12, color: MIST }}>fetching wiktionary…</div>
                  )}
                  {wEntry && wEntry.entries && (
                    <div style={{ fontSize: 12.5 }}>
                      <Tag>wiktionary (fi)</Tag>
                      {wEntry.entries.map((e, i) => (
                        <div key={i} style={{ marginTop: 4 }}>
                          <span style={{ fontStyle: "italic", color: MIST }}>{e.pos}: </span>
                          {e.defs.join(" · ")}
                        </div>
                      ))}
                    </div>
                  )}
                  {wEntry && wEntry.err && (
                    <div style={{ fontSize: 11.5, color: MIST }}>
                      {wEntry.err}
                      {!cEntry && (
                        <button
                          onClick={() => askClaudeDef(selTok.lemma)}
                          style={{ color: BLUE, marginLeft: 6, background: "transparent", border: "none", cursor: "pointer", fontSize: 11.5, padding: 0 }}
                        >
                          ask claude instead
                        </button>
                      )}
                    </div>
                  )}
                  {cEntry && cEntry.loading && (
                    <div style={{ fontSize: 12, color: MIST, marginTop: 4 }}>asking claude…</div>
                  )}
                  {cEntry && cEntry.defs && (
                    <div style={{ fontSize: 12.5, marginTop: 4 }}>
                      <Tag>claude dictionary</Tag>
                      <div style={{ marginTop: 4 }}>
                        <span style={{ fontStyle: "italic", color: MIST }}>{cEntry.pos}: </span>
                        {cEntry.defs.join(" · ")}
                      </div>
                    </div>
                  )}
                  {cEntry && cEntry.err && (
                    <div style={{ fontSize: 11.5, color: MIST, marginTop: 4 }}>{cEntry.err}</div>
                  )}
                </div>
              </Card>
            )}

            {/* cases present */}
            {Array.isArray(result.cases) && result.cases.length > 0 && (
              <div>
                <Tag>sijamuodot tässä lauseessa · cases in this sentence</Tag>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.cases.map((c, i) => {
                    const nm = String(c.name || "").toLowerCase();
                    const col = caseColor(nm);
                    const toks = (c.token_ids || [])
                      .map((id) => (result.tokens.find((t) => t.id === id) || {}).text)
                      .filter(Boolean);
                    return (
                      <Card key={i} rail={col}>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span style={{ fontFamily: SERIF, fontSize: 17, color: col }}>{nm}</span>
                          <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 12, color: MIST }}>
                            {c.fi_name}
                          </span>
                          <span style={{ fontFamily: MONO, fontSize: 11, color: MIST }}>{c.ending}</span>
                        </div>
                        {toks.length > 0 && (
                          <div style={{ fontFamily: SERIF, fontSize: 13.5, marginTop: 4 }}>{toks.join(", ")}</div>
                        )}
                        <div style={{ fontSize: 12.5, marginTop: 6 }}>{c.why_here}</div>
                        <div style={{ fontSize: 11.5, color: MIST, marginTop: 6 }}>
                          <span style={{ fontFamily: MONO, fontSize: 9.5 }}>es&nbsp;</span> {c.es_hint}
                        </div>
                        <div style={{ fontSize: 11.5, color: MIST, marginTop: 2 }}>
                          <span style={{ fontFamily: MONO, fontSize: 9.5 }}>en&nbsp;</span> {c.en_hint}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* notes */}
            {Array.isArray(result.notes) && result.notes.length > 0 && (
              <Card rail={BLUE}>
                <Tag>huomioita · phonology & word order</Tag>
                <div className="mt-2 flex flex-col gap-1.5">
                  {result.notes.map((n, i) => (
                    <div key={i} style={{ fontSize: 12.5 }}>
                      — {n}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* cheatsheet */}
        <div className="mt-8">
          <button
            onClick={() => setShowSheet((v) => !v)}
            className="flex items-center gap-1.5"
            style={{ fontSize: 12, letterSpacing: "0.14em", color: MIST, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
          >
            {showSheet ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            all 15 cases · cheatsheet
          </button>
          {showSheet && (
            <div className="mt-3 flex flex-col gap-4">
              {CHEATSHEET.map((g) => (
                <div key={g.group}>
                  <Tag>{g.group}</Tag>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {g.items.map((it) => (
                      <div
                        key={it.name}
                        style={{
                          background: PANEL,
                          border: "1px solid " + LINE,
                          borderLeft: "3px solid " + caseColor(it.name),
                          borderRadius: 2,
                          padding: "8px 10px",
                        }}
                      >
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span style={{ fontFamily: SERIF, fontSize: 14.5, color: caseColor(it.name) }}>{it.name}</span>
                          <span style={{ fontFamily: MONO, fontSize: 10.5, color: MIST }}>{it.ending}</span>
                        </div>
                        <div style={{ fontSize: 11.5, marginTop: 3 }}>{it.use}</div>
                        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 11.5, color: MIST, marginTop: 3 }}>
                          {it.ex}
                        </div>
                        <div style={{ fontSize: 10.5, color: MIST, marginTop: 3 }}>
                          <span style={{ fontFamily: MONO, fontSize: 9 }}>es&nbsp;</span>
                          {it.es}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* about the parser */}
        <div className="mt-5">
          <button
            onClick={() => setShowAbout((v) => !v)}
            className="flex items-center gap-1.5"
            style={{ fontSize: 12, letterSpacing: "0.14em", color: MIST, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
          >
            {showAbout ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            about the parser · caveats
          </button>
          {showAbout && (
            <Card style={{ marginTop: 10 }}>
              <div className="flex flex-col gap-3" style={{ fontSize: 12.5, color: INK }}>
                <div>
                  <b>the parser.</b> claude (sonnet) via the anthropic api, prompted to emit
                  universal-dependencies-style analyses. the real open-source finnish stack — voikko/omorfi
                  for morphology, the turku neural parser for dependencies — is c/python + hfst transducers
                  and can't run in this browser sandbox. the schema here deliberately matches turku's output,
                  so if you self-host you can point this ui at a local
                  <span style={{ fontFamily: MONO }}> turkunlp </span> docker container and delete the llm entirely.
                </div>
                <div>
                  <b>google translate.</b> hit via the unofficial gtx endpoint. the artifact sandbox's csp
                  usually blocks third-party fetches, so it falls back silently to claude's translation.
                  same story for wiktionary lookups. both work if you run this file outside claude.ai.
                </div>
                <div>
                  <b>trust.</b> morphology of common vocab is solid; rare compounds, consonant-gradation
                  edge cases, and deprel choices get confabulated occasionally. when it matters, cross-check
                  wiktionary or <span style={{ fontFamily: MONO }}>kielitoimiston sanakirja</span>.
                </div>
              </div>
            </Card>
          )}
        </div>

        <div style={{ fontSize: 10.5, color: MIST, marginTop: 32, fontFamily: SERIF, fontStyle: "italic" }}>
          lausekone · hyvää matkaa kielioppiin
        </div>
      </div>
    </div>
  );
}
