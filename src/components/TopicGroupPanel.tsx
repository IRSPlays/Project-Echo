import React, { useState, useEffect } from "react";
import { SEED_TAGS } from "../lib/tags";
import {
  fetchTopicGroups, fetchTopicGroup, sendMassReply,
  renameTopicGroup, deleteTopicGroup, retagSubmission,
} from "../lib/api";

interface TopicGroup { id: string; tag: string; count: number; last_seen: string; }
interface Submission { id: string; content: string; category: string; tier: number; action_status: string; created_at: string; ai_topic_tag: string; }

interface Props {
  passphrase: string;
  isSL: boolean;
  accentColor: string;
}

export function TopicGroupPanel({ passphrase, isSL, accentColor }: Props) {
  const [groups, setGroups] = useState<TopicGroup[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [groupSubs, setGroupSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [subLoading, setSubLoading] = useState(false);

  // Mass reply state
  const [massMsg, setMassMsg] = useState("");
  const [markInv, setMarkInv] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [sentResult, setSentResult] = useState<string | null>(null);

  // Group management state
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [retagging, setRetagging] = useState<string | null>(null); // submission id
  const [retagVal, setRetagVal] = useState("");

  useEffect(() => { loadGroups(); }, []);

  const loadGroups = async () => {
    setLoading(true);
    try { setGroups(await fetchTopicGroups(passphrase, isSL)); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const selectGroup = async (tag: string) => {
    if (selectedTag === tag) { setSelectedTag(null); setGroupSubs([]); return; }
    setSelectedTag(tag); setGroupSubs([]); setSentResult(null); setMassMsg(""); setConfirmSend(false);
    setSubLoading(true);
    try {
      const data = await fetchTopicGroup(passphrase, isSL, tag);
      setGroupSubs(data.submissions);
    } catch { /* ignore */ }
    finally { setSubLoading(false); }
  };

  const handleMassReply = async () => {
    if (!selectedTag || !massMsg.trim()) return;
    setSending(true);
    try {
      const res = await sendMassReply(passphrase, isSL, selectedTag, massMsg, markInv);
      setSentResult(`✓ Sent to ${res.repliedCount} tickets`);
      setMassMsg(""); setConfirmSend(false);
      // Refresh subs to show updated statuses
      const data = await fetchTopicGroup(passphrase, isSL, selectedTag);
      setGroupSubs(data.submissions);
    } catch { setSentResult("✗ Failed to send"); }
    finally { setSending(false); }
  };

  const handleRename = async (oldTag: string) => {
    if (!renameVal.trim() || renameVal === oldTag) { setRenaming(null); return; }
    await renameTopicGroup(passphrase, isSL, oldTag, renameVal.trim());
    if (selectedTag === oldTag) setSelectedTag(renameVal.trim());
    setRenaming(null); setRenameVal("");
    await loadGroups();
  };

  const handleDelete = async (tag: string) => {
    if (!confirm(`Delete group "${tag}"? All its tickets will move to "General Issue".`)) return;
    await deleteTopicGroup(passphrase, isSL, tag);
    if (selectedTag === tag) { setSelectedTag(null); setGroupSubs([]); }
    await loadGroups();
  };

  const handleRetag = async (subId: string) => {
    if (!retagVal.trim()) { setRetagging(null); return; }
    await retagSubmission(passphrase, isSL, subId, retagVal.trim());
    setRetagging(null); setRetagVal("");
    if (selectedTag) {
      const data = await fetchTopicGroup(passphrase, isSL, selectedTag);
      setGroupSubs(data.submissions);
      await loadGroups();
    }
  };

  const getStatusColor = (s: string) => {
    if (s === "Pending") return "text-echo-amber border-echo-amber";
    if (s === "Investigating") return "text-echo-cyan border-echo-cyan";
    if (s === "Resolved") return "text-echo-green border-echo-green";
    return "text-echo-dim border-echo-dim";
  };

  const activeCount = groupSubs.filter(s => !["Closed", "Archived"].includes(s.action_status)).length;

  return (
    <div className="flex flex-1 min-h-0 mx-6 mt-3 mb-6 gap-4">
      {/* ── Group List ───────────────────────────────────────── */}
      <div className="w-[300px] shrink-0 flex flex-col border border-echo-border bg-echo-surface">
        <div className="p-3 border-b border-echo-border bg-echo-black flex justify-between items-center shrink-0">
          <h3 className="text-echo-text uppercase tracking-widest font-bold text-sm">
            AI TOPIC GROUPS
          </h3>
          <span className="text-echo-dim text-xs">[{groups.length}]</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <div className="text-echo-dim text-xs text-center animate-pulse py-8">LOADING...</div>}
          {!loading && groups.length === 0 && (
            <div className="text-echo-dim text-[10px] uppercase text-center py-8 px-4">
              No groups yet. Submit feedback to generate AI topic tags.
            </div>
          )}
          {groups.map((g) => (
            <div key={g.tag}>
              {renaming === g.tag ? (
                <div className="flex gap-1 p-2 border-b border-echo-border bg-echo-black">
                  <input
                    value={renameVal}
                    onChange={(e) => setRenameVal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRename(g.tag); if (e.key === "Escape") setRenaming(null); }}
                    autoFocus
                    className="flex-1 bg-echo-surface border border-echo-cyan text-echo-text px-2 py-1 text-xs outline-none"
                    placeholder="New tag name..."
                  />
                  <button onClick={() => handleRename(g.tag)} className="text-echo-cyan text-xs px-2 border border-echo-cyan">✓</button>
                  <button onClick={() => setRenaming(null)} className="text-echo-dim text-xs px-2">✕</button>
                </div>
              ) : (
                <div
                  className={`flex items-center justify-between border-b border-echo-border px-3 py-2.5 cursor-pointer transition-all group ${selectedTag === g.tag ? `border-l-2 border-l-${accentColor} bg-${accentColor}/5` : "hover:bg-echo-black"}`}
                  onClick={() => selectGroup(g.tag)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 bg-${accentColor}`} />
                    <span className="text-echo-text text-xs truncate">{g.tag}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className={`text-xs font-bold font-mono text-${accentColor}`}>{g.count}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setRenaming(g.tag); setRenameVal(g.tag); }}
                      className="opacity-0 group-hover:opacity-100 text-echo-dim hover:text-echo-cyan text-[10px] px-1 transition-all"
                      title="Rename group"
                    >✎</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(g.tag); }}
                      className="opacity-0 group-hover:opacity-100 text-echo-dim hover:text-echo-red text-[10px] px-1 transition-all"
                      title="Delete group"
                    >✕</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Group Detail ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0 border border-echo-border bg-echo-surface flex flex-col">
        {!selectedTag ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-echo-dim text-xs uppercase tracking-widest mb-2">SELECT A GROUP</div>
              <div className="text-echo-dim text-[10px]">to view tickets and send mass replies</div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b border-echo-border bg-echo-black shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className={`text-${accentColor} uppercase tracking-widest font-bold text-sm`}>{selectedTag}</h3>
                  <div className="text-echo-dim text-[10px] mt-0.5">
                    {groupSubs.length} tickets · {activeCount} active
                  </div>
                </div>
                <button onClick={() => { setSelectedTag(null); setGroupSubs([]); }}
                  className="text-echo-dim hover:text-echo-text text-sm px-2">✕</button>
              </div>
            </div>

            {/* Ticket List */}
            <div className="flex-1 overflow-y-auto">
              {subLoading && <div className="text-echo-dim text-xs text-center animate-pulse py-8">LOADING...</div>}
              {!subLoading && groupSubs.length === 0 && (
                <div className="text-echo-dim text-xs text-center py-8">No tickets in this group</div>
              )}
              {groupSubs.map((sub) => (
                <div key={sub.id} className="border-b border-echo-border px-4 py-3 hover:bg-echo-black transition-all group">
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="flex gap-1.5 flex-wrap">
                      <span className={`text-[10px] uppercase border px-1 ${getStatusColor(sub.action_status)}`}>{sub.action_status}</span>
                      <span className="text-[10px] uppercase text-echo-dim border border-echo-dim px-1">{sub.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-echo-dim text-[10px]">
                        {new Date(sub.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                      {/* Retag button */}
                      {retagging === sub.id ? (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={retagVal}
                            onChange={(e) => setRetagVal(e.target.value)}
                            className="bg-echo-black border border-echo-cyan text-echo-text text-[10px] px-1 py-0.5 outline-none"
                          >
                            <option value="">— pick tag —</option>
                            {SEED_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                            {groups.filter(g => !SEED_TAGS.includes(g.tag)).map(g => (
                              <option key={g.tag} value={g.tag}>{g.tag}</option>
                            ))}
                          </select>
                          <button onClick={() => handleRetag(sub.id)} className="text-echo-cyan text-[10px] px-1 border border-echo-cyan">✓</button>
                          <button onClick={() => setRetagging(null)} className="text-echo-dim text-[10px] px-1">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setRetagging(sub.id); setRetagVal(""); }}
                          className="opacity-0 group-hover:opacity-100 text-echo-dim hover:text-echo-cyan text-[10px] border border-echo-dim px-1.5 py-0.5 transition-all"
                          title="Move to different group"
                        >RETAG</button>
                      )}
                    </div>
                  </div>
                  <div className="text-echo-text text-sm line-clamp-2">{sub.content}</div>
                </div>
              ))}
            </div>

            {/* Mass Reply Box */}
            <div className="border-t border-echo-border bg-echo-black p-4 shrink-0">
              <div className="text-echo-dim text-[10px] uppercase font-bold mb-3 tracking-widest">
                MASS REPLY — SENDS TO {activeCount} ACTIVE TICKETS
              </div>

              {sentResult && (
                <div className={`text-xs mb-3 px-3 py-2 border ${sentResult.startsWith("✓") ? "border-echo-green text-echo-green bg-echo-green/10" : "border-echo-red text-echo-red"}`}>
                  {sentResult}
                </div>
              )}

              <textarea
                value={massMsg}
                onChange={(e) => { setMassMsg(e.target.value); setSentResult(null); }}
                placeholder={`Write a message to all ${activeCount} students in "${selectedTag}"...`}
                className="w-full bg-echo-surface border border-echo-dim text-echo-text p-3 text-sm h-24 outline-none focus:border-echo-cyan mb-3 resize-none font-mono"
              />

              <div className="flex justify-between items-center">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => setMarkInv(!markInv)}
                    className={`w-4 h-4 border flex items-center justify-center cursor-pointer transition-all ${markInv ? "bg-echo-cyan border-echo-cyan" : "border-echo-dim"}`}
                  >
                    {markInv && <span className="text-echo-black text-[10px] font-bold">✓</span>}
                  </div>
                  <span className="text-echo-dim text-[10px] uppercase">Also mark all as Investigating</span>
                </label>

                {!confirmSend ? (
                  <button
                    onClick={() => setConfirmSend(true)}
                    disabled={!massMsg.trim() || activeCount === 0}
                    className={`px-5 py-2 text-xs uppercase font-bold tracking-widest transition-all border bg-${accentColor} text-echo-black border-${accentColor} disabled:opacity-40`}
                  >
                    SEND TO {activeCount} TICKETS
                  </button>
                ) : (
                  <div className="flex gap-2 items-center">
                    <span className={`text-xs text-${accentColor} animate-pulse`}>Confirm send to {activeCount}?</span>
                    <button
                      onClick={handleMassReply}
                      disabled={sending}
                      className="bg-echo-red text-echo-black px-4 py-2 text-xs uppercase font-bold disabled:opacity-50"
                    >
                      {sending ? "SENDING..." : "CONFIRM"}
                    </button>
                    <button onClick={() => setConfirmSend(false)} className="text-echo-dim text-xs border border-echo-dim px-3 py-2">CANCEL</button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
