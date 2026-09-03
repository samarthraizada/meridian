import { useState, useRef, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const SAMPLE_QUESTIONS = [
  "Give me a full executive briefing on Meridian Retail Co. performance for June 2026.",
  "What's driving revenue trends this month and which channel is most efficient?",
  "Analyze our promo attach rate and discount exposure across channels.",
  "Break down acquisition economics by channel and flag any margin risks.",
];

function QueryBadge({ query }) {
  return (
    <div className="flex flex-wrap gap-2 items-center py-2 px-3 bg-[#0D1017] rounded border border-[#1C2128] text-xs font-mono">
      <span className="text-[#00C2A8]">mf query</span>
      <span className="text-[#8B949E]">--metrics</span>
      <span className="text-[#A8D8B9]">{query.metrics.join(", ")}</span>
      <span className="text-[#8B949E]">--group-by</span>
      <span className="text-[#A8D8B9]">{query.group_by.join(", ")}</span>
    </div>
  );
}

function BriefingSection({ label, content, color }) {
  const colorMap = {
    teal: {
      label: "text-[#00C2A8]",
      border: "border-l-[#00C2A8]",
      bg: "bg-[rgba(0,194,168,0.04)]",
      rule: "from-[rgba(0,194,168,0.3)]",
    },
    amber: {
      label: "text-[#F0A000]",
      border: "border-l-[#F0A000]",
      bg: "bg-[rgba(240,160,0,0.04)]",
      rule: "from-[rgba(240,160,0,0.3)]",
    },
    purple: {
      label: "text-[#9B8FD4]",
      border: "border-l-[#9B8FD4]",
      bg: "bg-[rgba(155,143,212,0.04)]",
      rule: "from-[rgba(155,143,212,0.3)]",
    },
  };
  const c = colorMap[color];

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center gap-3 mb-4">
        <span className={`text-[10px] font-bold tracking-[0.12em] font-sans ${c.label}`}>
          {label}
        </span>
        <div className={`flex-1 h-px bg-gradient-to-r ${c.rule} to-transparent`} />
      </div>
      <div className={`pl-4 border-l-2 ${c.border} ${c.bg} rounded-r-md p-4`}>
        {content
  .split("\n\n")
  .filter(p => p.trim() && !p.trim().match(/^[\*\-#]{1,3}$/) && p.trim() !== "---")
  .map((para, i) => (
    <p key={i} className="font-serif text-[15px] leading-relaxed text-[#C9D1D9] mb-3 last:mb-0">
      {para.replace(/\*\*/g, "").replace(/^---$/, "").replace(/^#{1,3}$/, "").trim()}
    </p>
  ))
}
      </div>
    </div>
  );
}

export default function App() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [queries, setQueries] = useState([]);
  const [briefing, setBriefing] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef(null);

  useEffect(() => {
    if (queries.length > 0 && outputRef.current) {
      outputRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [queries]);

  const generateBriefing = async (q) => {
    const questionText = q || question;
    if (!questionText.trim()) return;

    setLoading(true);
    setQueries([]);
    setBriefing(null);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/briefing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questionText }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));

          if (data.type === "query") {
            setQueries((prev) => [...prev, { metrics: data.metrics, group_by: data.group_by }]);
          } else if (data.type === "briefing") {
            setBriefing(data.sections);
            setLoading(false);
          } else if (data.type === "error") {
            setError(data.message);
            setLoading(false);
          }
        }
      }
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const copyBriefing = () => {
    if (!briefing) return;
    const text = `EXECUTIVE SUMMARY\n\n${briefing.summary}\n\nANOMALY FLAG\n\n${briefing.anomaly}\n\nWATCH ITEM\n\n${briefing.watch}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-[#060810] text-[#F0F2F5] font-sans">
      {/* Header */}
      <header className="border-b border-[#1C2128] bg-[#0A0C10] px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Meridian" className="w-7 h-7 rounded-md" />
          <span className="text-sm font-semibold tracking-widest text-[#F0F2F5]">
            MERIDIAN
          </span>
          <span className="text-[10px] font-bold tracking-widest text-[#00C2A8] bg-[rgba(0,194,168,0.1)] border border-[rgba(0,194,168,0.25)] rounded px-1.5 py-0.5">
            2.0
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#8B949E] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3FB950] inline-block" />
          Semantic layer connected
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold text-[#F0F2F5] mb-3 tracking-tight">
            Executive Briefing Engine
          </h1>
          <p className="text-[#8B949E] text-sm max-w-xl mx-auto leading-relaxed">
            Ask a business question. The agent queries certified metrics from the
            semantic layer and returns a grounded executive briefing — no templates,
            no hardcoded data.
          </p>
        </div>

        {/* Input */}
        <div className="bg-[#0A0C10] border border-[#1C2128] rounded-lg p-4 mb-4">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a business question about Meridian Retail Co..."
            rows={3}
            className="w-full bg-transparent text-[#F0F2F5] placeholder-[#3D454F] text-sm leading-relaxed resize-none outline-none font-sans"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generateBriefing();
            }}
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1C2128]">
            <span className="text-[11px] text-[#3D454F] font-mono">
              Ctrl+Enter to generate
            </span>
            <button
              onClick={() => generateBriefing()}
              disabled={loading || !question.trim()}
              className="px-5 py-2 text-xs font-bold tracking-widest rounded-md transition-all duration-150"
              style={{
                background: loading || !question.trim()
                  ? "#1C2128"
                  : "linear-gradient(135deg, #00C2A8 0%, #0090B0 100%)",
                color: loading || !question.trim() ? "#8B949E" : "#060810",
                cursor: loading || !question.trim() ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "GENERATING..." : "GENERATE BRIEFING"}
            </button>
          </div>
        </div>

        {/* Sample questions */}
        <div className="mb-10">
          <p className="text-[11px] text-[#8B949E] font-mono mb-2 tracking-wider">SAMPLE QUESTIONS</p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => { setQuestion(q); generateBriefing(q); }}
                className="text-[11px] text-[#8B949E] border border-[#1C2128] rounded px-3 py-1.5 hover:text-[#00C2A8] hover:border-[#00C2A8] transition-colors duration-150"
              >
                {q.length > 55 ? q.slice(0, 55) + "…" : q}
              </button>
            ))}
          </div>
        </div>

        {/* Output area */}
        {(loading || queries.length > 0 || briefing || error) && (
          <div ref={outputRef}>
            {/* Agent trace */}
            {queries.length > 0 && (
              <div className="mb-8">
                <p className="text-[10px] font-bold tracking-widest text-[#8B949E] mb-3 font-mono">
                  AGENT QUERY TRACE
                </p>
                <div className="flex flex-col gap-2">
                  {queries.map((q, i) => (
                    <QueryBadge key={i} query={q} />
                  ))}
                  {loading && (
                    <div className="text-[11px] text-[#8B949E] font-mono animate-pulse pl-1">
                      Agent reasoning over results...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-4 bg-[rgba(248,81,73,0.08)] border border-[rgba(248,81,73,0.3)] rounded-lg">
                <p className="text-[11px] font-bold text-[#F85149] tracking-widest mb-1">ERROR</p>
                <p className="text-sm text-[#8B949E] font-mono">{error}</p>
              </div>
            )}

            {/* Briefing */}
            {briefing && (
              <div>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-[#8B949E] mb-1 font-mono">
                      EXECUTIVE BRIEFING OUTPUT
                    </p>
                    <p className="text-sm text-[#F0F2F5] font-serif italic">
                      Meridian Retail Co. — {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <button
                    onClick={copyBriefing}
                    className="text-[11px] px-3 py-1.5 border border-[#1C2128] rounded text-[#8B949E] hover:text-[#3FB950] hover:border-[#3FB950] transition-colors duration-150 font-mono"
                  >
                    {copied ? "✓ COPIED" : "⊕ COPY"}
                  </button>
                </div>

                <div className="flex flex-col gap-10">
                  <BriefingSection
                    label="EXECUTIVE SUMMARY"
                    content={briefing.summary}
                    color="teal"
                  />
                  <BriefingSection
                    label="ANOMALY FLAG"
                    content={briefing.anomaly}
                    color="amber"
                  />
                  <BriefingSection
                    label="WATCH ITEM"
                    content={briefing.watch}
                    color="purple"
                  />

                  <div className="pt-6 border-t border-[#1C2128] flex justify-between text-[11px] text-[#3D454F] font-mono">
                    <span>Meridian 2.0 · dbt + MetricFlow + claude-sonnet-4-6</span>
                    <span>{new Date().toISOString().slice(0, 10)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');
        .font-serif { font-family: Georgia, 'Times New Roman', serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .font-sans { font-family: Inter, system-ui, sans-serif; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease forwards; }
      `}</style>
    </div>
  );
}
