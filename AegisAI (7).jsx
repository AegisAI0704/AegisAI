import { useState, useRef, useEffect } from "react";

const SYSTEM_COMPLY = `You are AegisAI Comply, an expert FCA compliance assistant for UK financial services firms.

When a user pastes a document or asks a compliance question, you must:
1. Identify any potential FCA rule breaches or areas of concern
2. Reference the specific FCA rules that apply (COBS, MCOB, CONC, Consumer Duty, SM&CR)
3. Suggest specific improvements in plain English
4. Rate the severity of each issue: HIGH / MEDIUM / LOW
5. Provide a structured response with clear sections:
   - **Compliance Summary** (2-3 sentence overview)
   - **Issues Found** (each with severity rating and specific FCA rule)
   - **Recommended Actions** (numbered, specific, actionable)
   - **Positive Observations** (what they're doing right, if any)
6. End with: "This is an AI-assisted review. Always consult a qualified compliance professional for final sign-off."

Be specific, practical, and reference exact FCA handbook sections where relevant. Format using markdown.`;

const SYSTEM_CFO = `You are AegisAI CFO, an expert AI financial intelligence assistant for UK SME business owners.

When a user shares financial information or asks financial questions, you must:
1. Give clear, plain-English financial analysis
2. Identify cash flow risks or opportunities
3. Provide specific, actionable recommendations
4. Use UK business context (VAT, Corporation Tax, PAYE, Companies House etc.)
5. Structure your response with:
   - **Financial Health Summary** (clear, honest assessment)
   - **Key Risks** (what could go wrong and when)
   - **Opportunities** (what they could be doing better)
   - **Recommended Actions** (numbered, specific, with timeframes)
   - **Key Metrics to Track** (3-5 numbers they should watch weekly)

Be direct and honest — business owners need truth, not comfort. Use £ for currency. Format using markdown.`;

const TOOLS = {
  comply: {
    id: "comply",
    name: "AegisAI Comply",
    tagline: "FCA Compliance Intelligence",
    icon: "⚖️",
    color: "#C9A84C",
    system: SYSTEM_COMPLY,
    placeholder: "Paste your financial promotion, client letter, suitability report, or ask any FCA compliance question...",
    examples: [
      "How long does a Client Money Record (CMR) need to be retained under FCA rules?",
      "What are the key Consumer Duty obligations for a small IFA firm?",
      "Review this: 'Dear Mr Smith, we recommend you invest your £50,000 pension in our Growth Fund which has returned 15% per year historically.'",
      "What SM&CR roles does a 3-person mortgage broker need to have?",
    ]
  },
  cfo: {
    id: "cfo",
    name: "AegisAI CFO",
    tagline: "AI Financial Intelligence",
    icon: "📊",
    color: "#10B981",
    system: SYSTEM_CFO,
    placeholder: "Share your financial situation or ask any business finance question...",
    examples: [
      "My monthly revenue is £38,000 but I'm always struggling to pay bills on time. What's going on?",
      "I run a 12-person agency. Can I afford to hire a senior account manager at £45,000?",
      "I have £60,000 sitting in my business account. Should I leave it there or do something with it?",
      "A client owes me £30,000 and is now 90 days overdue. What are my options?",
    ]
  }
};

function formatMessage(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#E8D5A3">$1</strong>')
    .replace(/^### (.+)$/gm, '<h4 style="color:#C9A84C;margin:14px 0 6px;font-size:13px;letter-spacing:0.05em;text-transform:uppercase">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="color:#C9A84C;margin:16px 0 8px;font-size:15px">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="color:#C9A84C;margin:16px 0 8px;font-size:17px">$1</h2>')
    .replace(/^(\d+)\. (.+)$/gm, '<div style="margin:5px 0;padding-left:8px"><span style="color:#C9A84C;font-weight:600">$1.</span> $2</div>')
    .replace(/^[-•] (.+)$/gm, '<div style="margin:5px 0;padding-left:8px"><span style="color:#C9A84C">•</span> $1</div>')
    .replace(/`(.+?)`/g, '<code style="background:#0F1F3D;padding:2px 6px;border-radius:4px;font-family:monospace;color:#C9A84C;font-size:12px">$1</code>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

function TypingIndicator({ color }) {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "14px 18px" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%", background: color,
          animation: `bounce 1.2s infinite ${i * 0.2}s`
        }} />
      ))}
    </div>
  );
}

function Message({ msg, toolColor }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display:"flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 14 }}>
      {!isUser && (
        <div style={{
          width:34, height:34, borderRadius:"50%", background:"#0F1F3D",
          border:`2px solid ${toolColor}`, display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:15, marginRight:9, flexShrink:0, marginTop:3
        }}>⚡</div>
      )}
      <div style={{
        maxWidth:"78%",
        background: isUser ? "#0F1F3D" : "#1A2942",
        border: isUser ? `1px solid ${toolColor}50` : "1px solid #2A3F5F",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        padding:"13px 17px", color:"#E8EDF5", fontSize:14, lineHeight:1.7,
        boxShadow:"0 2px 10px rgba(0,0,0,0.3)"
      }}>
        <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
      </div>
      {isUser && (
        <div style={{
          width:34, height:34, borderRadius:"50%", background: toolColor,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:13, fontWeight:700, color:"#0F1F3D", marginLeft:9, flexShrink:0, marginTop:3
        }}>U</div>
      )}
    </div>
  );
}

export default function AegisAI() {
  const [activeTool, setActiveTool] = useState("comply");
  const [sessions, setSessions] = useState({ comply: [], cfo: [] });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const tool = TOOLS[activeTool];
  const messages = sessions[activeTool];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, loading]);

  useEffect(() => {
    setInput(""); setError("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [activeTool]);

  async function sendMessage(text) {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput(""); setError("");
    const newMessages = [...messages, { role:"user", content: userText }];
    setSessions(s => ({ ...s, [activeTool]: newMessages }));
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          system: tool.system,
          messages: newMessages.map(m => ({ role:m.role, content:m.content }))
        })
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Sorry, I couldn't generate a response. Please try again.";
      setSessions(s => ({ ...s, [activeTool]: [...newMessages, { role:"assistant", content:reply }] }));
    } catch {
      setError("Connection error. Please try again.");
      setSessions(s => ({ ...s, [activeTool]: messages }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ height:"100vh", background:"#080F1E", fontFamily:"Georgia, serif", color:"#E8EDF5", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-7px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#2A3F5F; border-radius:2px; }
        textarea { outline:none !important; font-family:Georgia,serif; }
        .ex-btn:hover { background:rgba(201,168,76,0.12) !important; border-color:#C9A84C !important; color:#E8EDF5 !important; }
        .tool-tab { transition:all 0.2s; }
        .tool-tab:hover { opacity:0.85; }
        .send-btn:hover:not(:disabled) { filter:brightness(1.15); transform:scale(1.05); }
        .clear-btn:hover { color:#C9A84C !important; border-color:#C9A84C !important; }
      `}</style>

      {/* ── Header ── */}
      <header style={{ background:"#0A1628", borderBottom:"1px solid #1E3050", padding:"0 20px", height:58, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:3, height:30, background:"linear-gradient(180deg,#C9A84C,#7A5C10)", borderRadius:2 }} />
          <div>
            <div style={{ fontSize:19, fontWeight:700, letterSpacing:"-0.5px" }}>
              <span style={{ color:"#E8EDF5" }}>AEGIS</span><span style={{ color:"#C9A84C" }}>AI</span>
            </div>
            <div style={{ fontSize:9, color:"#4A6A8F", letterSpacing:"0.14em", textTransform:"uppercase", marginTop:-2 }}>Financial Intelligence</div>
          </div>
        </div>

        {/* Tool switcher */}
        <div style={{ display:"flex", background:"#0F1F3D", borderRadius:10, padding:3, border:"1px solid #1E3050", gap:3 }}>
          {Object.values(TOOLS).map(t => (
            <button key={t.id} className="tool-tab" onClick={() => setActiveTool(t.id)} style={{
              padding:"7px 18px", borderRadius:8, border:"none", cursor:"pointer",
              background: activeTool === t.id ? t.color : "transparent",
              color: activeTool === t.id ? "#0A1628" : "#6A8CAF",
              fontWeight: activeTool === t.id ? 700 : 500,
              fontSize:13, fontFamily:"Georgia,serif",
              display:"flex", alignItems:"center", gap:6
            }}>
              {t.icon} {t.name}
            </button>
          ))}
        </div>

        {/* Live indicator */}
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:"#10B981", animation:"pulse 2s infinite" }} />
          <span style={{ fontSize:11, color:"#4A6A8F" }}>Live</span>
        </div>
      </header>

      {/* ── Sub-header ── */}
      <div style={{ background:"#0A1628", borderBottom:`1px solid ${tool.color}22`, padding:"9px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:11 }}>
          <div style={{ width:36, height:36, borderRadius:9, background:`${tool.color}15`, border:`1.5px solid ${tool.color}45`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:19 }}>
            {tool.icon}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:"#E8EDF5" }}>{tool.name}</div>
            <div style={{ fontSize:11, color:tool.color, letterSpacing:"0.07em" }}>{tool.tagline}</div>
          </div>
        </div>
        {messages.length > 0 && (
          <button className="clear-btn" onClick={() => { setSessions(s => ({ ...s, [activeTool]:[] })); setError(""); }} style={{
            background:"none", border:"1px solid #2A3F5F", color:"#6A8CAF",
            padding:"5px 12px", borderRadius:7, cursor:"pointer", fontSize:11,
            transition:"all 0.2s", fontFamily:"Georgia,serif"
          }}>Clear chat</button>
        )}
      </div>

      {/* ── Messages ── */}
      <div style={{ flex:1, overflowY:"auto", padding:"20px 20px 8px" }}>
        {messages.length === 0 ? (
          <div style={{ maxWidth:640, margin:"0 auto", animation:"fadeUp 0.4s ease" }}>
            {/* Welcome card */}
            <div style={{ background:"linear-gradient(135deg,#0F1F3D,#162847)", border:`1px solid ${tool.color}35`, borderRadius:16, padding:"26px 28px", marginBottom:20, position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:-20, right:-20, width:120, height:120, borderRadius:"50%", background:`${tool.color}07` }} />
              <div style={{ fontSize:34, marginBottom:8 }}>{tool.icon}</div>
              <h2 style={{ margin:"0 0 8px", fontSize:20, color:"#E8EDF5", fontWeight:700 }}>
                Welcome to <span style={{ color:tool.color }}>{tool.name}</span>
              </h2>
              <p style={{ margin:0, color:"#7A9CC0", fontSize:13, lineHeight:1.7 }}>
                {activeTool === "comply"
                  ? "Paste any financial promotion, client communication, suitability report, or ask any FCA compliance question. I'll check it against current FCA rules and tell you exactly what to fix."
                  : "Tell me about your business finances — revenue, costs, cash flow, hiring decisions, or anything else. I'll give you honest, plain-English analysis and specific UK-context recommendations."}
              </p>
            </div>

            {/* Examples */}
            <div style={{ fontSize:10, color:"#4A6A8F", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:9 }}>Try an example</div>
            <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:18 }}>
              {tool.examples.map((ex, i) => (
                <button key={i} className="ex-btn" onClick={() => sendMessage(ex)} style={{
                  background:"rgba(201,168,76,0.04)", border:"1px solid #1E3050",
                  borderRadius:9, padding:"11px 14px", cursor:"pointer",
                  color:"#9AB0CC", textAlign:"left", fontSize:13,
                  transition:"all 0.2s", lineHeight:1.5, fontFamily:"Georgia,serif"
                }}>
                  <span style={{ color:tool.color, marginRight:8 }}>→</span>{ex}
                </button>
              ))}
            </div>

            {/* Disclaimer */}
            <div style={{ background:"#0A1628", border:"1px solid #1E3050", borderRadius:9, padding:"10px 14px", display:"flex", gap:8, alignItems:"flex-start" }}>
              <span style={{ color:"#F59E0B", flexShrink:0 }}>⚠️</span>
              <span style={{ fontSize:11, color:"#4A6A8F", lineHeight:1.6 }}>
                AegisAI is an AI-powered guidance tool.
                {activeTool === "comply" ? " Always consult a qualified FCA compliance professional for final sign-off on regulated activities." : " Always consult a qualified accountant or adviser before significant financial decisions."}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth:700, margin:"0 auto" }}>
            {messages.map((msg, i) => <Message key={i} msg={msg} toolColor={tool.color} />)}
            {loading && (
              <div style={{ display:"flex", marginBottom:14 }}>
                <div style={{ width:34, height:34, borderRadius:"50%", background:"#0F1F3D", border:`2px solid ${tool.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, marginRight:9, flexShrink:0 }}>⚡</div>
                <div style={{ background:"#1A2942", border:"1px solid #2A3F5F", borderRadius:"18px 18px 18px 4px", minWidth:70 }}>
                  <TypingIndicator color={tool.color} />
                </div>
              </div>
            )}
            {error && (
              <div style={{ background:"#1A0A0A", border:"1px solid #EF444440", borderRadius:9, padding:"11px 14px", color:"#EF4444", fontSize:13, marginBottom:14 }}>⚠️ {error}</div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div style={{ borderTop:"1px solid #1E3050", background:"#0A1628", padding:"13px 20px 16px", flexShrink:0 }}>
        <div style={{ maxWidth:700, margin:"0 auto" }}>
          <div style={{ background:"#0F1F3D", border:`1.5px solid ${input ? tool.color+"55" : "#2A3F5F"}`, borderRadius:13, display:"flex", alignItems:"flex-end", gap:9, padding:"10px 13px", transition:"border-color 0.2s" }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
              placeholder={tool.placeholder}
              disabled={loading}
              rows={2}
              style={{ flex:1, background:"none", border:"none", color:"#E8EDF5", fontSize:13, lineHeight:1.6, resize:"none", maxHeight:130, overflowY:"auto" }}
            />
            <button
              className="send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                width:37, height:37, borderRadius:9, border:"none", cursor: input.trim()&&!loading ? "pointer" : "default",
                background: input.trim()&&!loading ? tool.color : "#1E3050",
                display:"flex", alignItems:"center", justifyContent:"center",
                transition:"all 0.2s", flexShrink:0, fontSize:18
              }}
            >
              <span style={{ color: input.trim()&&!loading ? "#0A1628" : "#3A5070" }}>↑</span>
            </button>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
            <span style={{ fontSize:10, color:"#2A3F5F" }}>Enter to send · Shift+Enter for new line</span>
            <span style={{ fontSize:10, color:"#2A3F5F" }}>Powered by Claude AI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
