import React, { useState } from "react";
import { marked } from "marked";
import {
  fetchSubmissions, fetchClusters, fetchStats, updateSubmissionStatus,
  exportReport, escalateSubmission, postGlobalUpdate, fetchAdminTicket,
  replyToTicketAdmin, fetchSLSubmissions, fetchHistorySummary,
} from "../lib/api";
import { ClusterAlert } from "../components/ClusterAlert";
import { PieChart, BarChart, StatusBar } from "../components/Charts";

type LoginMode = "exco" | "sl";
type Tab = "feedback" | "history";

export function AdminDashboard() {
  const [passphrase, setPassphrase] = useState("");
  const [loginMode, setLoginMode] = useState<LoginMode>("exco");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authRole, setAuthRole] = useState<LoginMode>("exco");
  const [activeTab, setActiveTab] = useState<Tab>("feedback");

  const [stats, setStats] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [globalUpdateContent, setGlobalUpdateContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [ticketReplies, setTicketReplies] = useState<any[]>([]);
  const [replyContent, setReplyContent] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);

  // History
  const [histFrom, setHistFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [histTo, setHistTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [histSummary, setHistSummary] = useState("");
  const [histStats, setHistStats] = useState<any>(null);
  const [histLoading, setHistLoading] = useState(false);

  const authenticate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true); setError("");
    try {
      if (loginMode === "exco") await fetchSubmissions(passphrase, { limit: 1 });
      else await fetchSLSubmissions(passphrase);
      setIsAuthenticated(true); setAuthRole(loginMode);
      await loadData();
    } catch { setError("AUTH FAILED. UNAUTHORIZED."); }
    finally { setLoading(false); }
  };

  const loadData = async () => {
    try {
      if (loginMode === "sl" || authRole === "sl") {
        const slData = await fetchSLSubmissions(passphrase);
        setSubmissions(slData.data);
      } else {
        const subsData = await fetchSubmissions(passphrase, { limit: 200 });
        setSubmissions(subsData.data);
      }
      const [cl, st] = await Promise.all([fetchClusters(), fetchStats()]);
      setClusters(cl); setStats(st);
    } catch { setError("DATA SYNC FAILED."); }
  };

  const handleSelectSub = async (sub: any) => {
    if (selectedSub?.id === sub.id) { setSelectedSub(null); setTicketReplies([]); return; }
    setSelectedSub(sub); setDetailLoading(true);
    try {
      const data = await fetchAdminTicket(sub.id, passphrase, authRole === "sl");
      setTicketReplies(data.replies || []);
    } catch { setTicketReplies([]); }
    finally { setDetailLoading(false); }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateSubmissionStatus(passphrase, id, newStatus, authRole === "sl");
      await loadData();
      if (selectedSub?.id === id) setSelectedSub({ ...selectedSub, action_status: newStatus });
    } catch { setError("UPDATE FAILED."); }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !selectedSub) return;
    try {
      const r = await replyToTicketAdmin(selectedSub.id, passphrase, authRole === "sl", replyContent);
      setTicketReplies([...ticketReplies, r]); setReplyContent("");
    } catch { alert("Failed to send reply."); }
  };

  const handleEscalate = async (id: string) => {
    try {
      await escalateSubmission(passphrase, id); await loadData();
      if (selectedSub?.id === id) setSelectedSub({ ...selectedSub, escalated_to_sl: 1 });
    } catch { alert("Escalation failed."); }
  };

  const handlePostUpdate = async () => {
    if (!globalUpdateContent.trim()) return;
    try { await postGlobalUpdate(passphrase, authRole === "sl", globalUpdateContent); setGlobalUpdateContent(""); }
    catch { setError("FAILED TO POST UPDATE."); }
  };

  const handleExport = async () => {
    try {
      const md = await exportReport(passphrase, "md");
      const blob = new Blob([md], { type: "text/markdown" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `echo-report-${new Date().toISOString().split("T")[0]}.md`; a.click();
    } catch { setError("EXPORT FAILED."); }
  };

  const handleHistorySummary = async () => {
    setHistLoading(true); setHistSummary(""); setHistStats(null);
    try {
      const data = await fetchHistorySummary(passphrase, authRole === "sl", histFrom, histTo);
      setHistSummary(data.summary); setHistStats(data.stats);
    } catch { setHistSummary("Failed to generate summary."); }
    finally { setHistLoading(false); }
  };

  const getTierColor = (t: number) => t === 1 ? "text-echo-green border-echo-green" : t === 2 ? "text-echo-amber border-echo-amber" : "text-echo-red border-echo-red";
  const getStatusColor = (s: string) => {
    if (s === "Pending") return "text-echo-amber border-echo-amber";
    if (s === "Investigating") return "text-echo-cyan border-echo-cyan";
    if (s === "Resolved") return "text-echo-green border-echo-green";
    if (s === "Closed") return "text-echo-dim border-echo-dim bg-echo-dim/10";
    return "text-echo-dim border-echo-dim";
  };

  const accentColor = authRole === "sl" ? "echo-cyan" : "echo-red";
  const roleName = authRole === "sl" ? "SCHOOL LEADER" : "EXCO";
  const allStatuses = ["Pending", "Investigating", "Resolved", "Closed", "Archived"];

  // ─── Login ──────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    const isExco = loginMode === "exco";
    return (
      <div className="min-h-screen flex items-center justify-center bg-echo-black text-echo-text font-mono">
        <form onSubmit={authenticate} className="border border-echo-border p-8 bg-echo-surface w-full max-w-sm">
          <h2 className={`uppercase tracking-widest font-bold mb-4 ${isExco ? "text-echo-red" : "text-echo-cyan"}`}>RESTRICTED ACCESS</h2>
          <div className="flex mb-6 border border-echo-border">
            <button type="button" onClick={() => setLoginMode("exco")}
              className={`flex-1 py-2 text-xs uppercase tracking-widest font-bold transition-all ${isExco ? "bg-echo-red text-echo-black" : "text-echo-dim hover:text-echo-text"}`}>EXCO</button>
            <button type="button" onClick={() => setLoginMode("sl")}
              className={`flex-1 py-2 text-xs uppercase tracking-widest font-bold transition-all ${!isExco ? "bg-echo-cyan text-echo-black" : "text-echo-dim hover:text-echo-text"}`}>SCHOOL LEADER</button>
          </div>
          <input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)}
            placeholder={isExco ? "ENTER EXCO PASSPHRASE" : "ENTER SL PASSPHRASE"}
            className="bg-echo-black border border-echo-dim text-echo-text px-4 py-2 w-full outline-none mb-4" />
          {error && <div className="text-echo-red text-xs mb-4 animate-pulse">{error}</div>}
          <button type="submit" disabled={loading}
            className={`w-full py-2 uppercase tracking-widest font-bold border transition-all ${isExco ? "bg-echo-red text-echo-black border-echo-red hover:bg-transparent hover:text-echo-red" : "bg-echo-cyan text-echo-black border-echo-cyan hover:bg-transparent hover:text-echo-cyan"}`}>
            {loading ? "VERIFYING..." : "AUTHORIZE"}</button>
        </form>
      </div>
    );
  }

  // ─── Dashboard ──────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-echo-black text-echo-text font-mono flex flex-col overflow-hidden">
      <header className="flex justify-between items-end border-b border-echo-border px-6 py-4 shrink-0">
        <div>
          <h1 className={`text-2xl uppercase tracking-widest font-bold text-${accentColor}`}>
            {authRole === "sl" ? "SCHOOL LEADER OPS" : "OPS CONTROL ROOM"}</h1>
          <div className="text-echo-dim text-xs mt-1">PROJECT ECHO // {roleName}</div>
        </div>
        <div className="flex gap-4 items-end">
          <div className="text-right text-xs text-echo-dim">
            <div>TOTAL: <span className="text-echo-text">{stats?.total ?? "–"}</span></div>
            <div>TODAY: <span className={`text-${accentColor}`}>{stats?.todayCount ?? "–"}</span></div>
          </div>
          {authRole === "exco" && (
            <button onClick={handleExport} className="border border-echo-cyan text-echo-cyan px-4 py-2 text-xs uppercase tracking-widest hover:bg-echo-cyan hover:text-echo-black transition-all">EXPORT</button>
          )}
        </div>
      </header>

      {error && (
        <div className="mx-6 mt-3 text-echo-red text-sm border border-echo-red px-4 py-2 bg-echo-red/10">
          {error} <button onClick={() => setError("")} className="ml-4 text-xs opacity-70">×</button>
        </div>
      )}

      {/* Tab Bar */}
      <div className="mx-6 mt-3 flex gap-0 border-b border-echo-border shrink-0">
        <button onClick={() => setActiveTab("feedback")}
          className={`px-6 py-2 text-xs uppercase tracking-widest font-bold border-b-2 transition-all ${activeTab === "feedback" ? `border-${accentColor} text-${accentColor}` : "border-transparent text-echo-dim hover:text-echo-text"}`}>
          FEEDBACK</button>
        <button onClick={() => setActiveTab("history")}
          className={`px-6 py-2 text-xs uppercase tracking-widest font-bold border-b-2 transition-all ${activeTab === "history" ? `border-${accentColor} text-${accentColor}` : "border-transparent text-echo-dim hover:text-echo-text"}`}>
          HISTORY</button>
      </div>

      {/* ═══ FEEDBACK TAB ═══ */}
      {activeTab === "feedback" && (
        <>
          <div className="mx-6 mt-3 flex gap-3 border border-echo-border p-3 bg-echo-surface items-center shrink-0">
            <span className={`text-${accentColor} uppercase text-xs whitespace-nowrap font-bold`}>BROADCAST:</span>
            <input type="text" value={globalUpdateContent} onChange={(e) => setGlobalUpdateContent(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePostUpdate()} placeholder="Enter school-wide announcement..."
              className="flex-1 bg-echo-black border border-echo-dim text-echo-text px-3 py-1.5 text-sm outline-none focus:border-echo-green" />
            <button onClick={handlePostUpdate} className="bg-echo-green text-echo-black px-4 py-1.5 uppercase font-bold text-xs">POST</button>
          </div>

          {authRole === "exco" && <div className="mx-6 mt-2"><ClusterAlert clusters={clusters} /></div>}

          <div className="flex flex-1 min-h-0 mx-6 mt-3 mb-6 gap-4">
            {/* List */}
            <div className="w-[360px] shrink-0 flex flex-col border border-echo-border bg-echo-surface">
              <div className="p-3 border-b border-echo-border bg-echo-black flex justify-between items-center shrink-0">
                <h3 className="text-echo-text uppercase tracking-widest font-bold text-sm">
                  {authRole === "sl" ? "ESCALATED" : "ALL FEEDBACK"}</h3>
                <span className="text-echo-dim text-xs">[{submissions.length}]</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {submissions.length === 0 ? <div className="text-echo-dim text-xs uppercase text-center mt-8">NO DATA</div> :
                  submissions.map((sub) => (
                    <div key={sub.id} onClick={() => handleSelectSub(sub)}
                      className={`border p-3 cursor-pointer transition-all ${selectedSub?.id === sub.id ? "border-echo-cyan bg-echo-cyan/5" : "border-echo-border bg-echo-black hover:border-echo-dim"}`}>
                      <div className="flex justify-between items-start mb-1.5">
                        <div className="flex gap-1.5 items-center flex-wrap">
                          <span className={`text-[10px] uppercase border px-1 ${getTierColor(sub.tier)}`}>T{sub.tier}</span>
                          <span className={`text-[10px] uppercase border px-1 ${getStatusColor(sub.action_status)}`}>{sub.action_status}</span>
                          <span className="text-[10px] text-echo-dim uppercase">{sub.category}</span>
                          {sub.escalated_to_sl === 1 && <span className="text-[10px] uppercase border px-1 border-echo-cyan text-echo-cyan">SL</span>}
                        </div>
                        <span className="text-echo-dim text-[10px] whitespace-nowrap ml-2">
                          {new Date(sub.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div className="text-echo-text text-sm line-clamp-2">{sub.content}</div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Detail Panel */}
            <div className="flex-1 min-w-0 border border-echo-border bg-echo-surface flex flex-col">
              {!selectedSub ? (
                <div className="flex-1 flex items-center justify-center text-echo-dim text-xs uppercase tracking-widest">SELECT A FEEDBACK TO MANAGE</div>
              ) : (
                <>
                  <div className="p-5 border-b border-echo-border bg-echo-black shrink-0">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-2 flex-wrap">
                        <span className={`text-[10px] uppercase border px-1.5 py-0.5 ${getTierColor(selectedSub.tier)}`}>T{selectedSub.tier} {selectedSub.tier_label}</span>
                        <span className={`text-[10px] uppercase border px-1.5 py-0.5 ${getStatusColor(selectedSub.action_status)}`}>{selectedSub.action_status}</span>
                        {selectedSub.escalated_to_sl === 1 && <span className="text-[10px] uppercase border px-1.5 py-0.5 border-echo-cyan text-echo-cyan bg-echo-cyan/10">SL ✓</span>}
                      </div>
                      <button onClick={() => { setSelectedSub(null); setTicketReplies([]); }} className="text-echo-dim hover:text-echo-text text-sm px-2">✕</button>
                    </div>
                    <div className="flex gap-6 text-echo-dim text-xs uppercase">
                      <span>Category: <span className="text-echo-text">{selectedSub.category}</span></span>
                      <span>{new Date(selectedSub.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    <div className="p-5 border-b border-echo-border">
                      <div className="text-echo-dim text-[10px] uppercase mb-2 font-bold">STUDENT REPORT</div>
                      <div className="text-echo-text text-sm leading-relaxed">{selectedSub.content}</div>
                    </div>

                    {selectedSub.proposed_solution && (
                      <div className="p-5 border-b border-echo-border bg-echo-green/5">
                        <div className="text-echo-green text-[10px] uppercase mb-2 font-bold">STUDENT'S PROPOSED SOLUTION</div>
                        <div className="text-echo-green/90 text-sm italic leading-relaxed">{selectedSub.proposed_solution}</div>
                      </div>
                    )}

                    <div className="p-5 border-b border-echo-border bg-echo-cyan/5">
                      <div className="text-echo-cyan text-[10px] uppercase mb-2 font-bold">AI TRIAGE ANALYSIS</div>
                      <div className="text-echo-cyan text-sm italic leading-relaxed">{selectedSub.ai_reasoning}</div>
                    </div>

                    {/* Status Controls — both EXCO and SL */}
                    <div className="p-5 border-b border-echo-border">
                      <div className="text-echo-dim text-[10px] uppercase mb-3 font-bold">STATUS CONTROL</div>
                      <div className="flex gap-2 flex-wrap">
                        {allStatuses.map((s) => (
                          <button key={s} onClick={() => handleStatusChange(selectedSub.id, s)}
                            disabled={selectedSub.action_status === s}
                            className={`text-xs uppercase border px-3 py-1.5 transition-all ${selectedSub.action_status === s ? "bg-echo-text text-echo-black border-echo-text" : `${getStatusColor(s)} hover:opacity-80`}`}>{s}</button>
                        ))}
                        {authRole === "exco" && selectedSub.escalated_to_sl !== 1 && (
                          <button onClick={() => handleEscalate(selectedSub.id)}
                            className="text-xs text-echo-cyan border border-echo-cyan px-3 py-1.5 uppercase hover:bg-echo-cyan hover:text-echo-black transition-all">↑ ESCALATE</button>
                        )}
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="text-echo-dim text-[10px] uppercase mb-3 font-bold">COMMUNICATION</div>
                      <div className="space-y-3 mb-4">
                        {detailLoading ? <div className="text-echo-dim text-xs text-center animate-pulse py-4">LOADING...</div> :
                          ticketReplies.length === 0 ? <div className="text-echo-dim text-xs italic text-center py-4 border border-dashed border-echo-dim">No messages yet.</div> :
                            ticketReplies.map((r: any) => (
                              <div key={r.id} className={`flex ${r.author_role === "Student" ? "justify-start" : "justify-end"}`}>
                                <div className={`p-3 border max-w-[70%] ${r.author_role === "Student" ? "border-echo-dim bg-echo-black" : r.author_role === "School Leader" ? "border-echo-cyan/50 bg-echo-cyan/10 text-echo-cyan" : "border-echo-green/50 bg-echo-green/10 text-echo-green"}`}>
                                  <div className="flex justify-between gap-4 opacity-70 mb-1.5 text-[10px] uppercase"><span>{r.author_role}</span><span>{new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
                                  <div className="text-sm">{r.content}</div>
                                </div>
                              </div>
                            ))}
                      </div>
                      <div className="flex gap-2">
                        <input type="text" value={replyContent} onChange={(e) => setReplyContent(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleReply()} placeholder={`Reply as ${roleName}...`}
                          className="flex-1 bg-echo-black border border-echo-dim text-sm px-3 py-2 outline-none focus:border-echo-cyan" />
                        <button onClick={handleReply} disabled={!replyContent.trim()}
                          className="bg-echo-cyan text-echo-black px-5 py-2 text-xs uppercase font-bold disabled:opacity-50">Send</button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══ HISTORY TAB ═══ */}
      {activeTab === "history" && (
        <div className="flex-1 overflow-y-auto mx-6 mt-4 mb-6">
          <div className="max-w-5xl mx-auto">
            {/* Date Picker */}
            <div className="border border-echo-border bg-echo-surface p-6 mb-4">
              <h3 className="text-echo-text uppercase tracking-widest font-bold text-sm mb-4">AI TREND ANALYSIS</h3>
              <div className="flex gap-4 items-end flex-wrap">
                <div>
                  <label className="block text-echo-dim text-[10px] uppercase mb-1">FROM</label>
                  <input type="date" value={histFrom} onChange={(e) => setHistFrom(e.target.value)}
                    className="bg-echo-black border border-echo-dim text-echo-text px-3 py-2 outline-none focus:border-echo-cyan text-sm" />
                </div>
                <div>
                  <label className="block text-echo-dim text-[10px] uppercase mb-1">TO</label>
                  <input type="date" value={histTo} onChange={(e) => setHistTo(e.target.value)}
                    className="bg-echo-black border border-echo-dim text-echo-text px-3 py-2 outline-none focus:border-echo-cyan text-sm" />
                </div>
                <button onClick={handleHistorySummary} disabled={histLoading}
                  className={`bg-${accentColor} text-echo-black px-6 py-2 uppercase font-bold text-xs disabled:opacity-50`}>
                  {histLoading ? "ANALYZING..." : "GENERATE REPORT"}</button>
              </div>
            </div>

            {histLoading && (
              <div className="border border-echo-cyan/30 bg-echo-surface p-12 text-center">
                <div className="text-echo-cyan text-sm animate-pulse mb-2">GENERATING AI ANALYSIS...</div>
                <div className="text-echo-dim text-xs">Analyzing submissions from {histFrom} to {histTo}</div>
              </div>
            )}

            {histStats && !histLoading && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                  <div className="border border-echo-border bg-echo-surface p-4"><div className="text-echo-dim text-[10px] uppercase">Total</div><div className="text-3xl text-echo-text font-bold">{histStats.total}</div></div>
                  <div className="border border-echo-green/30 bg-echo-green/5 p-4"><div className="text-echo-green text-[10px] uppercase">T1 Infra</div><div className="text-3xl text-echo-green font-bold">{histStats.tier1}</div></div>
                  <div className="border border-echo-amber/30 bg-echo-amber/5 p-4"><div className="text-echo-amber text-[10px] uppercase">T2 Strategic</div><div className="text-3xl text-echo-amber font-bold">{histStats.tier2}</div></div>
                  <div className="border border-echo-red/30 bg-echo-red/5 p-4"><div className="text-echo-red text-[10px] uppercase">T3 Noise</div><div className="text-3xl text-echo-red font-bold">{histStats.tier3}</div></div>
                  <div className="border border-echo-cyan/30 bg-echo-cyan/5 p-4"><div className="text-echo-cyan text-[10px] uppercase">Resolved</div><div className="text-3xl text-echo-cyan font-bold">{histStats.resolved}</div></div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Category Pie Chart */}
                  <div className="border border-echo-border bg-echo-surface p-6">
                    <div className="text-echo-dim text-[10px] uppercase font-bold mb-4 tracking-widest">CATEGORY DISTRIBUTION</div>
                    <PieChart data={[
                      { label: "Facilities", value: histStats.categories?.facilities || 0, color: "#00ff41" },
                      { label: "Culture", value: histStats.categories?.culture || 0, color: "#ffb800" },
                      { label: "Academics", value: histStats.categories?.academics || 0, color: "#00d4ff" },
                      { label: "Safety", value: histStats.categories?.safety || 0, color: "#ff3366" },
                    ]} />
                  </div>

                  {/* Tier Bar Chart */}
                  <div className="border border-echo-border bg-echo-surface p-6">
                    <div className="text-echo-dim text-[10px] uppercase font-bold mb-4 tracking-widest">TIER BREAKDOWN</div>
                    <BarChart data={[
                      { label: "T1 Infra", value: histStats.tier1, color: "#00ff41" },
                      { label: "T2 Strategic", value: histStats.tier2, color: "#ffb800" },
                      { label: "T3 Noise", value: histStats.tier3, color: "#ff3366" },
                    ]} />
                  </div>
                </div>

                {/* Resolution Status Bar */}
                <div className="border border-echo-border bg-echo-surface p-6 mb-4">
                  <div className="text-echo-dim text-[10px] uppercase font-bold mb-4 tracking-widest">RESOLUTION PIPELINE</div>
                  <StatusBar data={[
                    { label: "Pending", value: histStats.pending || 0, color: "#ffb800" },
                    { label: "Resolved", value: histStats.resolved || 0, color: "#00ff41" },
                    { label: "Closed", value: histStats.closed || 0, color: "#666" },
                  ]} />
                </div>

                {/* AI Report */}
                {histSummary && (
                  <div className="border border-echo-cyan/30 bg-echo-black p-6 mb-4">
                    <div className="text-echo-cyan text-[10px] uppercase font-bold mb-4 tracking-widest flex items-center gap-2">
                      <span>⚡</span> AI GENERATED REPORT
                    </div>
                    <div className="prose prose-invert prose-sm max-w-none text-echo-text text-sm leading-relaxed [&_h2]:text-echo-cyan [&_h2]:text-sm [&_h2]:uppercase [&_h2]:tracking-widest [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-echo-green [&_h3]:text-xs [&_h3]:uppercase [&_ul]:pl-4 [&_li]:text-echo-text/90 [&_strong]:text-echo-text"
                      dangerouslySetInnerHTML={{ __html: marked.parse(histSummary) as string }} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
