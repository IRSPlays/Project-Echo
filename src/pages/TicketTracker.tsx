import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchTicket, replyToTicketStudent } from "../lib/api";

interface SavedTicket {
  id: string;
  pin: string;
  date: string;
  category?: string;
}

export function TicketTracker() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get("id") || "";

  const [id, setId] = useState(initialId);
  const [pin, setPin] = useState("");
  
  const [ticket, setTicket] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [savedTickets, setSavedTickets] = useState<SavedTicket[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [replyContent, setReplyContent] = useState("");
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("echo_tickets") || "[]") as SavedTicket[];
    setSavedTickets(saved);

    // Auto-load if we have an ID from the URL and it's in saved tickets
    if (initialId) {
      const found = saved.find((t) => t.id === initialId);
      if (found) {
        setPin(found.pin);
        loadTicket(found.id, found.pin);
      }
    }
  }, []);

  const loadTicket = async (ticketId: string, ticketPin: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchTicket(ticketId, ticketPin);
      setTicket(data.ticket);
      setReplies(data.replies);
      setId(ticketId);
      setPin(ticketPin);
    } catch {
      setError("AUTH FAILED. INVALID ID OR PIN.");
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await loadTicket(id, pin);
  };

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    setReplying(true);
    try {
      const newReply = await replyToTicketStudent(id, pin, replyContent);
      setReplies([...replies, newReply]);
      setReplyContent("");
    } catch {
      setError("FAILED TO TRANSMIT REPLY.");
    } finally {
      setReplying(false);
    }
  };

  const handleBack = () => {
    setTicket(null);
    setReplies([]);
    setError("");
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Pending": return "border-echo-amber text-echo-amber";
      case "Investigating": return "border-echo-cyan text-echo-cyan";
      case "Resolved": return "border-echo-green text-echo-green";
      case "Closed": return "border-echo-dim text-echo-dim";
      default: return "border-echo-dim text-echo-dim";
    }
  };

  // ─── Ticket Loaded View ────────────────────────────────────────────────────
  if (ticket) {
    const isClosed = ticket.action_status === "Closed" || ticket.action_status === "Archived";
    const isResolved = ticket.action_status === "Resolved";

    return (
      <div className="min-h-screen bg-echo-black text-echo-text font-mono p-6 flex flex-col items-center">
        <div className="w-full max-w-3xl">
          <div className="flex justify-between items-end border-b border-echo-border pb-4 mb-6">
            <div>
              <h1 className="text-2xl text-echo-cyan uppercase tracking-widest font-bold">TICKET TRACKER</h1>
              <div className="text-echo-dim text-xs mt-1">ID: {ticket.id.split("-")[0]}...</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs uppercase px-2 py-1 border ${getStatusStyle(ticket.action_status)}`}>
                {ticket.action_status}
              </span>
              <button
                onClick={handleBack}
                className="text-echo-dim hover:text-echo-text text-xs uppercase border border-echo-dim px-3 py-1"
              >
                ← ALL TICKETS
              </button>
            </div>
          </div>

          {/* Resolved / Closed Banner */}
          {isResolved && (
            <div className="border border-echo-green bg-echo-green/10 p-4 mb-6 text-center">
              <div className="text-echo-green text-sm uppercase font-bold tracking-widest">✓ THIS TICKET HAS BEEN RESOLVED</div>
              <div className="text-echo-dim text-xs mt-1">
                Resolved on {ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleDateString() : "–"}
              </div>
            </div>
          )}
          {isClosed && ticket.action_status === "Closed" && (
            <div className="border border-echo-dim bg-echo-dim/10 p-4 mb-6 text-center">
              <div className="text-echo-dim text-sm uppercase font-bold tracking-widest">THIS TICKET IS CLOSED</div>
              <div className="text-echo-dim text-xs mt-1">
                This ticket has been resolved and archived. It is saved as a historical record.
              </div>
            </div>
          )}

          {/* Original Submission */}
          <div className="border border-echo-dim bg-echo-surface p-4 mb-4 relative">
            <span className="absolute -top-3 left-4 bg-echo-black text-echo-dim text-[10px] px-2">ORIGINAL REPORT</span>
            <p className="text-sm mt-2">{ticket.content}</p>
            <div className="text-[10px] text-echo-dim mt-4 text-right">
              {new Date(ticket.created_at).toLocaleString()}
            </div>
          </div>

          {/* Proposed Solution */}
          {ticket.proposed_solution && (
            <div className="border border-echo-green/30 bg-echo-green/5 p-4 mb-4 relative">
              <span className="absolute -top-3 left-4 bg-echo-black text-echo-green text-[10px] px-2">YOUR PROPOSED SOLUTION</span>
              <p className="text-sm mt-2 text-echo-green/90 italic">{ticket.proposed_solution}</p>
            </div>
          )}

          {/* Identity Reassurance */}
          <div className="border border-echo-green/20 bg-echo-green/5 px-4 py-2 mb-6 flex items-center gap-2 text-[10px] text-echo-green uppercase">
            <span>🔒</span> Your identity is unknown to us and cannot be traced
          </div>

          {/* Replies */}
          <div className="space-y-4 mb-8">
            {replies.length === 0 && !isClosed && (
              <div className="text-echo-dim text-xs text-center uppercase border border-dashed border-echo-dim py-6">
                No replies yet. EXCO will review your submission.
              </div>
            )}
            {replies.map((reply) => {
              const isStudent = reply.author_role === "Student";
              return (
                <div key={reply.id} className={`flex ${isStudent ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] border p-3 ${
                    isStudent
                      ? "border-echo-dim bg-echo-black"
                      : reply.author_role === "School Leader"
                        ? "border-echo-cyan bg-echo-cyan/10 text-echo-cyan"
                        : "border-echo-green bg-echo-surface text-echo-green"
                  }`}>
                    <div className="text-[10px] uppercase opacity-70 mb-1 flex justify-between gap-4">
                      <span>{reply.author_role}</span>
                      <span>{new Date(reply.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-sm">{reply.content}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reply Box — only if not Closed/Archived */}
          {!isClosed && (
            <div className="border border-echo-border bg-echo-surface p-4">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Provide more details or reply to EXCO..."
                className="w-full bg-echo-black border border-echo-dim text-echo-text p-3 text-sm h-24 outline-none focus:border-echo-cyan mb-3 resize-none"
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-echo-red">{error}</span>
                <button
                  onClick={handleReply}
                  disabled={replying || !replyContent.trim()}
                  className="bg-echo-cyan text-echo-black px-6 py-2 uppercase tracking-widest text-sm font-bold hover:bg-[#00b0d4] disabled:opacity-50"
                >
                  {replying ? "TRANSMITTING..." : "SEND REPLY"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Login / Ticket List View ──────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-echo-black text-echo-text font-mono p-6">
      <div className="w-full max-w-md">
        <form onSubmit={handleAuth} className="border border-echo-border p-8 bg-echo-surface mb-6">
          <h2 className="text-echo-cyan uppercase tracking-widest font-bold mb-2">TICKET TRACKER</h2>
          <p className="text-echo-dim text-[10px] uppercase mb-6">Enter your Ticket ID and PIN to access</p>

          <label className="block text-echo-dim text-xs mb-1">TICKET ID</label>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            className="bg-echo-black border border-echo-dim text-echo-text px-4 py-2 w-full outline-none focus:border-echo-cyan mb-4 text-sm"
          />

          <label className="block text-echo-dim text-xs mb-1">ACCESS PIN</label>
          <input
            type="text"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="bg-echo-black border border-echo-dim text-echo-text px-4 py-2 w-full outline-none focus:border-echo-cyan mb-6 tracking-widest font-bold text-center text-lg"
            maxLength={6}
          />

          {error && <div className="text-echo-red text-xs mb-4 animate-pulse">{error}</div>}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-echo-cyan text-echo-black py-2 uppercase tracking-widest font-bold hover:bg-[#00b0d4] transition-all"
          >
            {loading ? "VERIFYING..." : "ACCESS TICKET"}
          </button>
        </form>

        {/* Saved Tickets */}
        {savedTickets.length > 0 && (
          <div className="border border-echo-border bg-echo-surface">
            <div className="p-3 border-b border-echo-border bg-echo-black">
              <h3 className="text-echo-text uppercase tracking-widest font-bold text-sm">
                YOUR TICKETS <span className="text-echo-dim font-normal">[{savedTickets.length}]</span>
              </h3>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {savedTickets.map((st) => (
                <button
                  key={st.id}
                  onClick={() => loadTicket(st.id, st.pin)}
                  className="w-full text-left px-4 py-3 border-b border-echo-border hover:bg-echo-black transition-all flex justify-between items-center group"
                >
                  <div>
                    <div className="text-echo-text text-xs">
                      {st.id.split("-")[0]}...
                    </div>
                    {st.category && (
                      <div className="text-echo-dim text-[10px] uppercase mt-0.5">{st.category}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-echo-dim text-[10px]">
                      {new Date(st.date).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                    <span className="text-echo-cyan text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <a href="/" className="text-echo-dim hover:text-echo-green text-xs uppercase tracking-widest transition-colors">
            ← BACK TO SUBMIT
          </a>
        </div>
      </div>
    </div>
  );
}
