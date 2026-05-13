import React, { useState } from "react";
import type { Submission } from "../../server/db/queries";
import { fetchAdminTicket, replyToTicketAdmin, escalateSubmission } from "../lib/api";

interface KanbanBoardProps {
  submissions: Submission[];
  onStatusChange: (id: string, newStatus: string) => void;
  adminPassphrase?: string;
  isAdmin?: boolean;
}

const COLUMNS = ["Pending", "Investigating", "Resolved"] as const;

export function KanbanBoard({ submissions, onStatusChange, adminPassphrase, isAdmin }: KanbanBoardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ticketDetails, setTicketDetails] = useState<any>(null);
  const [replyContent, setReplyContent] = useState("");
  const [loading, setLoading] = useState(false);
  
  const getTierColor = (tier: number) => {
    switch(tier) {
      case 1: return "text-echo-green border-echo-green";
      case 2: return "text-echo-amber border-echo-amber";
      case 3: return "text-echo-red border-echo-red";
      default: return "text-echo-dim border-echo-dim";
    }
  };

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setTicketDetails(null);
      return;
    }
    
    if (isAdmin && adminPassphrase) {
      setExpandedId(id);
      setLoading(true);
      try {
        const details = await fetchAdminTicket(id, adminPassphrase, false);
        setTicketDetails(details);
      } catch (err) {
        console.error("Failed to load ticket details");
        setExpandedId(null);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !isAdmin || !adminPassphrase || !expandedId) return;
    try {
      const newReply = await replyToTicketAdmin(expandedId, adminPassphrase, false, replyContent);
      setTicketDetails({ ...ticketDetails, replies: [...ticketDetails.replies, newReply] });
      setReplyContent("");
    } catch (err) {
      alert("Failed to reply");
    }
  };

  const handleEscalate = async (id: string) => {
    if (!isAdmin || !adminPassphrase) return;
    if (confirm("Escalate to School Leaders?")) {
      try {
        await escalateSubmission(adminPassphrase, id);
        alert("ESCALATED TO SL.");
        // We'd ideally reload the board or update state, but this is okay for now
      } catch (err) {
        alert("Escalation failed.");
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-start">
      {COLUMNS.map((col) => {
        const items = submissions.filter((s) => s.action_status === col);
        
        return (
          <div key={col} className="bg-echo-surface border border-echo-border flex flex-col h-full min-h-[500px]">
            <div className="p-3 border-b border-echo-border bg-echo-black flex justify-between items-center">
              <h3 className="text-echo-text uppercase tracking-widest font-bold text-sm">
                {col}
              </h3>
              <span className="text-echo-dim text-xs">[{items.length}]</span>
            </div>
            
            <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto">
              {items.length === 0 ? (
                <div className="text-echo-dim text-xs uppercase text-center mt-8">NO DATA</div>
              ) : (
                items.map((sub) => {
                  const isExpanded = expandedId === sub.id;
                  
                  return (
                    <div key={sub.id} className={`border p-3 relative transition-all ${isExpanded ? 'border-echo-cyan bg-echo-surface z-10' : 'border-echo-border bg-echo-black group hover:border-echo-dim'}`}>
                      <div className="flex justify-between items-start mb-2 cursor-pointer" onClick={() => handleExpand(sub.id)}>
                        <div className="flex gap-2">
                          <span className={`text-[10px] uppercase border px-1 ${getTierColor(sub.tier)}`}>
                            T{sub.tier} {sub.tier_label}
                          </span>
                          {sub.escalated_to_sl === 1 && (
                            <span className="text-[10px] uppercase border px-1 border-echo-cyan text-echo-cyan">
                              ESCALATED
                            </span>
                          )}
                        </div>
                        <span className="text-echo-dim text-[10px]">
                          {new Date(sub.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      
                      <div className="text-echo-text text-sm mb-3 cursor-pointer" onClick={() => handleExpand(sub.id)}>
                        {sub.content}
                      </div>
                      
                      {!isExpanded && (
                        <div className="text-echo-cyan text-xs italic line-clamp-2 opacity-80 mb-3 cursor-pointer" onClick={() => handleExpand(sub.id)}>
                          {sub.ai_reasoning}
                        </div>
                      )}

                      {/* Expanded View */}
                      {isExpanded && ticketDetails && (
                        <div className="mt-4 pt-4 border-t border-echo-dim/30">
                          <div className="text-echo-dim text-xs uppercase mb-2">Communication Thread</div>
                          <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
                            {ticketDetails.replies.map((reply: any) => (
                              <div key={reply.id} className={`p-2 border text-xs ${reply.author_role === 'Student' ? 'border-echo-dim bg-echo-black text-echo-text' : 'border-echo-cyan/50 bg-echo-cyan/10 text-echo-cyan'}`}>
                                <div className="flex justify-between opacity-70 mb-1 text-[10px] uppercase">
                                  <span>{reply.author_role}</span>
                                  <span>{new Date(reply.created_at).toLocaleString()}</span>
                                </div>
                                <div>{reply.content}</div>
                              </div>
                            ))}
                            {ticketDetails.replies.length === 0 && <div className="text-echo-dim text-xs italic">No replies yet.</div>}
                          </div>
                          
                          <div className="flex gap-2 mb-4">
                            <input 
                              type="text" 
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              placeholder="Reply as EXCO..."
                              className="flex-1 bg-echo-black border border-echo-dim text-xs px-2 py-1 outline-none focus:border-echo-cyan"
                            />
                            <button onClick={handleReply} className="bg-echo-cyan text-echo-black px-3 py-1 text-xs uppercase font-bold">Send</button>
                          </div>
                        </div>
                      )}

                      <div className={`flex gap-2 mt-auto transition-opacity ${isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        {col !== "Pending" && (
                          <button onClick={() => onStatusChange(sub.id, "Pending")} className="text-[10px] text-echo-dim hover:text-echo-text uppercase border border-echo-dim px-2 py-1">← Pending</button>
                        )}
                        {col !== "Investigating" && (
                          <button onClick={() => onStatusChange(sub.id, "Investigating")} className="text-[10px] text-echo-amber hover:text-echo-amber-dim border border-echo-amber px-2 py-1 flex-1">Investigate</button>
                        )}
                        {col !== "Resolved" && (
                          <button onClick={() => onStatusChange(sub.id, "Resolved")} className="text-[10px] text-echo-green hover:text-echo-green-dim border border-echo-green px-2 py-1 flex-1">Resolve</button>
                        )}
                        {isAdmin && sub.escalated_to_sl !== 1 && (
                          <button onClick={() => handleEscalate(sub.id)} className="text-[10px] text-echo-cyan hover:bg-echo-cyan hover:text-echo-black border border-echo-cyan px-2 py-1" title="Escalate to School Leaders">↑ SL</button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
