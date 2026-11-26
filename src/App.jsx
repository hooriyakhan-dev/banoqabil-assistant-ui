import { useEffect, useRef, useState } from "react";

const SUGGESTIONS = [
  { icon: "spark", title: "About the program", desc: "What Bano Qabil is and who runs it", q: "What is Bano Qabil?" },
  { icon: "user", title: "Eligibility", desc: "Who can apply to the program", q: "Who can apply for the Bano Qabil program?" },
  { icon: "book", title: "Courses", desc: "Explore the available training tracks", q: "Which courses are offered?" },
  { icon: "check", title: "Admissions", desc: "How the admission process works", q: "How does the admission process work?" },
];

const QUICK = [
  "Is the program free?",
  "Where are the centers located?",
  "What is the course duration?",
  "How do I register?",
];

const PATHS = {
  send: "M5 12h14M13 6l6 6-6 6",
  plus: "M12 5v14M5 12h14",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6L6 18",
  copy: "M9 9h10v10H9zM5 15V5h10",
  check: "M5 12l4 4 10-10",
  flag: "M5 21V4h11l-2 4 2 4H5",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.6-6 8-6s8 2 8 6",
  book: "M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19a2 2 0 012-2h13",
  chat: "M21 12a8 8 0 01-11.5 7.2L4 20l1-4.5A8 8 0 1121 12z",
  pulse: "M3 12h4l3-8 4 16 3-8h4",
};

const Icon = ({ name, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[name]} />
  </svg>
);

const Bot = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v3" />
    <circle cx="12" cy="2.6" r="0.6" fill="currentColor" />
    <rect x="4" y="7" width="16" height="12" rx="4" />
    <circle cx="9" cy="13" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="13" r="1.2" fill="currentColor" stroke="none" />
    <path d="M2 12v2M22 12v2" />
  </svg>
);

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const patchLast = (fn) =>
    setMessages((prev) => {
      const copy = [...prev];
      copy[copy.length - 1] = fn(copy[copy.length - 1]);
      return copy;
    });

  async function send(text) {
    const question = text.trim();
    if (!question || loading) return;
    setInput("");
    setSidebarOpen(false);
    setLoading(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: "", sources: [], question, logged: false },
    ]);

    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok || !res.body) throw new Error(`Server error ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          const msg = JSON.parse(line);
          if (msg.token) patchLast((m) => ({ ...m, content: m.content + msg.token }));
          if (msg.sources) patchLast((m) => ({ ...m, sources: msg.sources }));
          if (msg.error) patchLast((m) => ({ ...m, content: `⚠️ ${msg.error}` }));
        }
      }
    } catch (err) {
      patchLast((m) => ({ ...m, content: `⚠️ ${err.message}. Is the backend running?` }));
    } finally {
      setLoading(false);
    }
  }

  async function markWrong(index) {
    const m = messages[index];
    try {
     await fetch("http://localhost:8000/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: m.question, answer: m.content, sources: m.sources }),
      });
      setMessages((prev) => prev.map((x, i) => (i === index ? { ...x, logged: true } : x)));
    } catch {}
  }

  async function copyAnswer(text, index) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(index);
      setTimeout(() => setCopied(null), 1600);
    } catch {}
  }

  const newChat = () => {
    if (loading) return;
    setMessages([]);
    setSidebarOpen(false);
  };

  const questionsAsked = messages.filter((m) => m.role === "user").length;
  const flagged = messages.filter((m) => m.logged).length;

  return (
    <div className="shell">
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />
      <div className={`scrim ${sidebarOpen ? "show" : ""}`} onClick={() => setSidebarOpen(false)} />

      {/* ---------------- SIDEBAR ---------------- */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="logo"><Bot size={24} /></div>
          <div>
            <h1>Bano Qabil</h1>
            <p>AI Assistant</p>
          </div>
          <button className="icon-btn close-btn" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <Icon name="close" />
          </button>
        </div>

        <button className="new-chat" onClick={newChat} disabled={loading}>
          <Icon name="plus" /> New conversation
        </button>

        <section className="panel" style={{ "--d": "0.1s" }}>
          <h3><Icon name="chat" size={15} /> Quick questions</h3>
          <ul className="quick">
            {QUICK.map((q) => (
              <li key={q}>
                <button onClick={() => send(q)} disabled={loading}>
                  <span>{q}</span>
                  <Icon name="send" size={14} />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel" style={{ "--d": "0.2s" }}>
          <h3><Icon name="pulse" size={15} /> Session</h3>
          <div className="stats">
            <div className="stat">
              <strong>{questionsAsked}</strong>
              <span>Questions</span>
            </div>
            <div className="stat">
              <strong>{flagged}</strong>
              <span>Flagged</span>
            </div>
          </div>
        </section>

        <footer className="side-foot">
          <span className="dot" /> Gemini · Pinecone · Groq
        </footer>
      </aside>

      {/* ---------------- MAIN ---------------- */}
      <section className="main">
        <button className="icon-btn menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
          <Icon name="menu" />
        </button>
        <span className="status"><i /> Online</span>

        <div className="chat">
          {messages.length === 0 && (
            <div className="hero">
              <div className="orb-wrap">
                <span className="ring r1" />
                <span className="ring r2" />
                <div className="orb"><Bot size={36} /></div>
              </div>
              <h2>How can I <em>help</em> you today?</h2>
              <p>Ask anything about the Bano Qabil program in English, Urdu or Roman Urdu.</p>
              <div className="cards">
                {SUGGESTIONS.map((s, i) => (
                  <button key={s.title} className="s-card" style={{ animationDelay: `${0.15 + i * 0.09}s` }} onClick={() => send(s.q)}>
                    <span className="s-icon"><Icon name={s.icon} /></span>
                    <span className="s-text">
                      <strong>{s.title}</strong>
                      <small>{s.desc}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            const isLast = i === messages.length - 1;
            const streaming = loading && isLast;
            const typing = streaming && !m.content;
            return (
              <div key={i} className={`msg ${m.role}`}>
                {m.role === "assistant" && (
                  <div className={`avatar ${streaming ? "pulse" : ""}`}><Bot size={20} /></div>
                )}
                <div className="msg-body">
                  {m.role === "assistant" && <span className="who">Bano Qabil AI</span>}
                  <div className={`bubble ${streaming && m.content ? "streaming" : ""}`}>
                    {typing ? <span className="typing"><i /><i /><i /></span> : m.content}

                    {m.role === "assistant" && m.sources?.length > 0 && (
                      <details className="sources">
                        <summary>Sources ({m.sources.length})</summary>
                        <ul>
                          {m.sources.map((s) => (
                            <li key={s.url}>
                              <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>

                  {m.role === "assistant" && m.content && !streaming && (
                    <div className={`actions ${m.logged ? "keep" : ""}`}>
                      <button onClick={() => copyAnswer(m.content, i)}>
                        <Icon name={copied === i ? "check" : "copy"} size={14} />
                        {copied === i ? "Copied" : "Copy"}
                      </button>
                      <button className={`flag ${m.logged ? "done" : ""}`} disabled={m.logged} onClick={() => markWrong(i)}>
                        <Icon name={m.logged ? "check" : "flag"} size={14} />
                        {m.logged ? "Flagged" : "Wrong answer"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <div className="input-wrap">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question..."
              disabled={loading}
            />
            <button type="submit" className="send" disabled={loading || !input.trim()} aria-label="Send message">
              <Icon name="send" />
            </button>
          </div>
          <p className="hint">AI can make mistakes. Use “Wrong answer” to flag hallucinations for review.</p>
        </form>
      </section>
    </div>
  );
}