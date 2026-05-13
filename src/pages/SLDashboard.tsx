import React, { useState, useEffect } from "react";
import { fetchSLSubmissions, fetchAdminTicket, replyToTicketAdmin, postGlobalUpdate } from "../lib/api";

export function SLDashboard() {
  const [passphrase, setPassphrase] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ticketDetails, setTicketDetails] = useState<any>(null);
  const [replyContent, setReplyContent] = useState("");
  const [globalUpdateContent, setGlobalUpdateContent] = useState("");

  const authenticate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError("");
    try {
      await loadData(passphrase);
      setIsAuthenticated(true);
    } catch (err) {
      setError("AUTH FAILED. UNAUTHORIZED.");
    } finally {
      setLoading(false);
    }
  };

  const loadData = async (pass: string) => {
    const data = await fetchSLSubmissions(pass);
    setSubmissions(data.data);
  };

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setTicketDetails(null);
      return;
    }
    
    setExpandedId(id);
    try {
      const details = await fetchAdminTicket(id, passphrase, true);
      setTicketDetails(details);
    } catch (err) {
      setExpandedId(null);
      alert("Failed to load details");
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !expandedId) return;
    try {
      const newReply = await replyToTicketAdmin(expandedId, passphrase, true, replyContent);
      setTicketDetails({ ...ticketDetails, replies: [...ticketDetails.replies, newReply] });
      setReplyContent("");
    } catch (err) {
      alert("Failed to reply");
    }
  };

  const handlePostUpdate = async () => {
    if (!globalUpdateContent.trim()) return;
    try {
      await postGlobalUpdate(passphrase, true, globalUpdateContent);
      setGlobalUpdateContent("");
      alert("GLOBAL UPDATE POSTED.");
    } catch (err) {
      alert("FAILED TO POST UPDATE.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-echo-black text-echo-text font-mono">
        <form onSubmit={authenticate} className="border border-echo-cyan p-8 bg-echo-surface max-w-md w-full">
          <h2 className="text-echo-cyan uppercase tracking-widest font-bold mb-6">RESTRICTED ACCESS (SCHOOL LEADERS)</h2>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="ENTER SL PASSPHRASE"
            className="bg-echo-black border border-echo-dim text-echo-text px-4 py-2 w-full outline-none focus:border-echo-cyan mb-4"
          />
          {error && <div className="text-echo-red text-xs mb-4 animate-pulse">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-echo-cyan text-echo-black py-2 uppercase tracking-widest font-bold hover:bg-[#00b0d4] transition-all">
            {loading ? "VERIFYING..." : "AUTHORIZE"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-echo-black text-echo-text font-mono p-6">
      <header className="flex justify-between items-end border-b border-echo-cyan pb-4 mb-8">
        <div>
          <h1 className="text-2xl text-echo-cyan uppercase tracking-widest font-bold">SCHOOL LEADER OPS</h1>
          <div className="text-echo-dim text-xs mt-1">ESCALATED TICKETS OVERSIGHT</div>
        </div>
        <div className="text-right text-xs text-echo-dim">
          ESCALATED: <span className="text-echo-cyan font-bold">{submissions.length}</span>
        </div>
      </header>

      <div className="mb-8 flex gap-4 border border-echo-border p-4 bg-echo-surface items-center max-w-4xl mx-auto">
        <span className="text-echo-cyan uppercase text-sm whitespace-nowrap font-bold">BROADCAST UPDATE:</span>
        <input 
          type="text" 
          value={globalUpdateContent}
          onChange={(e) => setGlobalUpdateContent(e.target.value)}
          placeholder="Enter school-wide announcement..."
          className="flex-1 bg-echo-black border border-echo-dim text-echo-text px-4 py-2 outline-none focus:border-echo-cyan"
        />
        <button onClick={handlePostUpdate} className="bg-echo-cyan text-echo-black px-6 py-2 uppercase font-bold text-sm">POST</button>
      </div>

      <div className="max-w-4xl mx-auto space-y-4">
        {submissions.length === 0 ? (
          <div className="text-center text-echo-dim py-12 uppercase tracking-widest border border-dashed border-echo-dim">
            NO ESCALATED TICKETS
          </div>
        ) : (
          submissions.map((sub) => {
            const isExpanded = expandedId === sub.id;
            
            return (
              <div key={sub.id} className={`border p-4 transition-all ${isExpanded ? 'border-echo-cyan bg-echo-surface' : 'border-echo-border bg-echo-black hover:border-echo-cyan/50'}`}>
                <div className="flex justify-between items-start mb-3 cursor-pointer" onClick={() => handleExpand(sub.id)}>
                  <div className="flex gap-3 items-center">
                    <span className="text-echo-cyan font-bold text-xs border border-echo-cyan px-2 py-1">T{sub.tier} {sub.tier_label}</span>
                    <span className="text-echo-dim text-xs">ID: {sub.id.split('-')[0]}...</span>
                  </div>
                  <span className="text-echo-dim text-xs">
                    {new Date(sub.created_at).toLocaleString()}
                  </span>
                </div>
                
                <p className="text-sm leading-relaxed cursor-pointer" onClick={() => handleExpand(sub.id)}>{sub.content}</p>
                
                {!isExpanded && (
                  <div className="mt-3 text-xs text-echo-cyan/70 italic line-clamp-1 cursor-pointer" onClick={() => handleExpand(sub.id)}>
                    {sub.ai_reasoning}
                  </div>
                )}

                {isExpanded && ticketDetails && (
                  <div className="mt-6 pt-4 border-t border-echo-border">
                    <div className="text-echo-dim text-xs uppercase mb-4">Communication Thread</div>
                    
                    <div className="space-y-4 mb-6">
                      {ticketDetails.replies.map((reply: any) => {
                        const isSL = reply.author_role === "School Leader";
                        return (
                          <div key={reply.id} className={`flex ${isSL ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 border max-w-[80%] ${isSL ? 'border-echo-cyan bg-echo-cyan/10 text-echo-cyan' : 'border-echo-dim bg-echo-black text-echo-text'}`}>
                              <div className="flex justify-between gap-4 opacity-70 mb-2 text-[10px] uppercase">
                                <span>{reply.author_role}</span>
                                <span>{new Date(reply.created_at).toLocaleString()}</span>
                              </div>
                              <div className="text-sm">{reply.content}</div>
                            </div>
                          </div>
                        );
                      })}
                      {ticketDetails.replies.length === 0 && <div className="text-echo-dim text-xs italic text-center">No replies yet.</div>}
                    </div>
                    
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Reply as School Leader..."
                        className="flex-1 bg-echo-black border border-echo-dim px-3 py-2 outline-none focus:border-echo-cyan text-sm"
                      />
                      <button 
                        onClick={handleReply} 
                        disabled={!replyContent.trim()}
                        className="bg-echo-cyan text-echo-black px-6 py-2 uppercase font-bold text-sm disabled:opacity-50"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
