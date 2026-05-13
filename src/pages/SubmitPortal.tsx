import React, { useState, useEffect } from "react";
import { EchoInput } from "../components/EchoInput";
import { CategoryPicker } from "../components/CategoryPicker";
import { submitReport, fetchGlobalUpdates } from "../lib/api";

export function SubmitPortal() {
  const [content, setContent] = useState("");
  const [proposedSolution, setProposedSolution] = useState("");
  const [category, setCategory] = useState("Facilities");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [ticketData, setTicketData] = useState<{ id: string; pin: string } | null>(null);
  const [updates, setUpdates] = useState<any[]>([]);

  useEffect(() => {
    fetchGlobalUpdates()
      .then((data) => setUpdates(data))
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (content.trim().length < 5) {
      setErrorMsg("ERR: INPUT TOO SHORT (MIN 5 CHARS)");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await submitReport(content, category, proposedSolution || undefined);
      setStatus("success");
      setTicketData({ id: res.id, pin: res.ticket_pin });

      // Save ticket to history array
      const saved = JSON.parse(localStorage.getItem("echo_tickets") || "[]");
      saved.unshift({ id: res.id, pin: res.ticket_pin, date: new Date().toISOString(), category });
      localStorage.setItem("echo_tickets", JSON.stringify(saved.slice(0, 20)));
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(`ERR: ${err.message.toUpperCase()}`);
    }
  };

  const handleReset = () => {
    setContent("");
    setProposedSolution("");
    setStatus("idle");
    setTicketData(null);
    setErrorMsg("");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-echo-black text-echo-text">
      <div className="w-full max-w-3xl mb-10">
        <h1 className="text-4xl text-echo-green mb-2 opacity-90 drop-shadow-[0_0_8px_rgba(0,255,65,0.4)]">
          PROJECT ECHO
        </h1>
        <div className="text-echo-dim font-mono text-sm uppercase tracking-widest flex justify-between border-b border-echo-border pb-2">
          <span>Decentralized Triage Node</span>
          <span>Status: ACTIVE</span>
        </div>
        <p className="mt-4 text-echo-text/80 font-mono text-sm leading-relaxed max-w-2xl">
          Enter your report below. The system uses natural language processing to
          categorize and route your submission. Identity tracking is disabled.
        </p>

        {/* Identity Reassurance */}
        <div className="mt-4 border border-echo-green/30 bg-echo-green/5 px-4 py-3 flex items-center gap-3">
          <span className="text-echo-green text-lg">🔒</span>
          <div>
            <div className="text-echo-green text-[10px] uppercase font-bold tracking-widest">YOUR IDENTITY IS UNKNOWN</div>
            <div className="text-echo-dim text-[10px] mt-0.5">
              We do not collect your name, class, IP address, or any identifying information. Your submission is fully anonymous and cannot be traced back to you.
            </div>
          </div>
        </div>
      </div>

      {/* Global Updates Banner */}
      {updates.length > 0 && status !== "success" && (
        <div className="w-full max-w-3xl mb-8 border border-echo-cyan/40 bg-echo-cyan/5 p-4">
          <div className="text-echo-cyan text-[10px] uppercase font-bold tracking-widest mb-3 flex items-center gap-2">
            <span className="animate-pulse">●</span> OPS UPDATES
          </div>
          <div className="space-y-3">
            {updates.slice(0, 3).map((up: any) => (
              <div key={up.id} className="border-l-2 border-echo-cyan/50 pl-3">
                <div className="flex gap-3 items-center mb-0.5">
                  <span className="text-[9px] uppercase bg-echo-cyan/20 text-echo-cyan px-1 border border-echo-cyan/30">
                    {up.author_role}
                  </span>
                  <span className="text-echo-dim text-[9px]">
                    {new Date(up.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="text-echo-text text-xs leading-relaxed">{up.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full max-w-3xl space-y-8 relative z-10">
        {status === "success" && ticketData ? (
          <div className="border border-echo-green bg-echo-surface p-8 text-center animate-fade-in">
            <h2 className="text-echo-green text-xl uppercase tracking-widest font-bold mb-4">
              TRANSMISSION SUCCESSFUL
            </h2>
            <p className="text-echo-text font-mono mb-2">
              Your report has been logged. Use the credentials below to track its
              status or communicate with EXCO.
            </p>
            <p className="text-echo-dim text-xs mb-6">
              Your identity remains completely unknown to us. Nobody can trace this back to you.
            </p>
            <div className="inline-block border border-echo-border bg-echo-black p-4 text-left">
              <div className="text-echo-dim text-xs uppercase mb-1">Ticket ID</div>
              <div className="text-echo-text font-mono mb-4 text-sm break-all">
                {ticketData.id}
              </div>
              <div className="text-echo-dim text-xs uppercase mb-1">Access PIN</div>
              <div className="text-echo-cyan font-mono text-2xl font-bold tracking-widest">
                {ticketData.pin}
              </div>
            </div>
            <div className="mt-4 text-echo-amber text-[10px] uppercase">
              ⚠ SAVE YOUR PIN — IT CANNOT BE RECOVERED
            </div>
            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={handleReset}
                className="px-6 py-2 border border-echo-dim text-echo-dim hover:text-echo-text uppercase text-sm tracking-widest"
              >
                SUBMIT ANOTHER
              </button>
              <a
                href={`/track?id=${ticketData.id}`}
                className="px-6 py-2 bg-echo-green text-echo-black uppercase text-sm tracking-widest font-bold"
              >
                TRACK TICKET →
              </a>
            </div>
          </div>
        ) : (
          <>
            <div>
              <div className="text-echo-green text-sm uppercase tracking-widest mb-3 font-bold">
                01. SELECT CATEGORY
              </div>
              <CategoryPicker
                selected={category}
                onSelect={setCategory}
                disabled={status === "submitting"}
              />
            </div>

            <div>
              <div className="text-echo-green text-sm uppercase tracking-widest mb-3 font-bold flex justify-between">
                <span>02. DESCRIBE THE ISSUE</span>
                {status === "error" && (
                  <span className="text-echo-red animate-pulse">{errorMsg}</span>
                )}
              </div>
              <EchoInput
                value={content}
                onChange={setContent}
                onSubmit={handleSubmit}
                disabled={status === "submitting"}
              />
            </div>

            {/* Proposed Solution */}
            <div>
              <div className="text-echo-green text-sm uppercase tracking-widest mb-3 font-bold flex items-center gap-2">
                <span>03. HOW WOULD YOU SOLVE THIS?</span>
                <span className="text-echo-dim text-[10px] font-normal">(OPTIONAL)</span>
              </div>
              <div className="border border-echo-border bg-echo-surface">
                <div className="px-4 py-2 border-b border-echo-border bg-echo-black text-echo-dim text-xs uppercase tracking-wider flex justify-between">
                  <span>sys.solution</span>
                  <span className={proposedSolution.length > 0 ? "text-echo-green" : "text-echo-dim"}>
                    {proposedSolution.length}/500
                  </span>
                </div>
                <div className="p-4">
                  <textarea
                    value={proposedSolution}
                    onChange={(e) => setProposedSolution(e.target.value.slice(0, 500))}
                    disabled={status === "submitting"}
                    placeholder="Share your idea on how this could be fixed or improved..."
                    className="w-full bg-transparent text-echo-text font-mono text-sm leading-relaxed outline-none resize-none h-20 placeholder:text-echo-dim"
                    spellCheck="false"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4">
              <a
                href="/track"
                className="text-echo-cyan hover:text-echo-green text-sm uppercase tracking-widest transition-colors"
              >
                [ TRACK EXISTING TICKET ]
              </a>
              <button
                onClick={handleSubmit}
                disabled={status === "submitting"}
                className="
                  px-8 py-3 bg-echo-surface border border-echo-green text-echo-green font-mono uppercase tracking-widest
                  hover:bg-echo-green hover:text-echo-black transition-colors duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {status === "submitting" ? "TRANSMITTING..." : "TRANSMIT"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
