import React, { useState, useEffect } from "react";
import { fetchStats, fetchClusters, fetchGlobalUpdates } from "../lib/api";
import { ClusterAlert } from "../components/ClusterAlert";

export function StatusBoard() {
  const [stats, setStats] = useState<any>(null);
  const [clusters, setClusters] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [st, cl, up] = await Promise.all([
          fetchStats(),
          fetchClusters(),
          fetchGlobalUpdates(),
        ]);
        setStats(st);
        setClusters(cl);
        setUpdates(up);
      } catch (err) {
        console.error("Failed to load status board", err);
      } finally {
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-echo-black flex items-center justify-center">
        <div className="text-echo-green font-mono uppercase tracking-widest animate-pulse">
          SYNCING...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-echo-black text-echo-text font-mono p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="border-b border-echo-border pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl text-echo-green uppercase tracking-widest font-bold mb-1">
              STATUS BOARD
            </h1>
            <div className="text-echo-dim text-sm uppercase">Global Operational Overview</div>
          </div>
          <div className="text-right">
            <div className="text-echo-green text-sm uppercase tracking-widest animate-pulse">LIVE</div>
            <div className="text-echo-dim text-xs mt-1">REFRESH RATE: 30s</div>
          </div>
        </header>

        {updates.length > 0 && (
          <div className="border border-echo-cyan bg-echo-black p-6">
            <h2 className="text-echo-cyan uppercase text-sm font-bold tracking-widest mb-4">
              GLOBAL OPS UPDATES
            </h2>
            <div className="space-y-4">
              {updates.slice(0, 5).map((up: any) => (
                <div key={up.id} className="border-l-2 border-echo-cyan pl-4 py-1">
                  <div className="flex gap-4 items-center mb-1">
                    <span className="text-[10px] uppercase bg-echo-cyan text-echo-black px-1 font-bold">
                      {up.author_role}
                    </span>
                    <span className="text-echo-dim text-[10px]">
                      {new Date(up.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{up.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="TOTAL ECHOES" value={stats?.total || 0} />
          <StatCard label="PENDING" value={stats?.pending || 0} color="text-echo-amber" />
          <StatCard label="INVESTIGATING" value={stats?.investigating || 0} color="text-echo-cyan" />
          <StatCard label="RESOLVED" value={stats?.resolved || 0} color="text-echo-green" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-echo-border bg-echo-surface p-4">
            <div className="text-echo-dim text-xs uppercase mb-2">TIER 1 (CRITICAL)</div>
            <div className="text-3xl text-echo-green">{stats?.tier1 || 0}</div>
          </div>
          <div className="border border-echo-border bg-echo-surface p-4">
            <div className="text-echo-dim text-xs uppercase mb-2">TIER 2 (STANDARD)</div>
            <div className="text-3xl text-echo-amber">{stats?.tier2 || 0}</div>
          </div>
          <div className="border border-echo-border bg-echo-surface p-4">
            <div className="text-echo-dim text-xs uppercase mb-2">TIER 3 (NOISE)</div>
            <div className="text-3xl text-echo-red">{stats?.tier3 || 0}</div>
          </div>
        </div>

        <div>
          <h2 className="text-echo-text uppercase text-sm font-bold tracking-widest mb-4">
            ACTIVE SYSTEMIC CLUSTERS
          </h2>
          <ClusterAlert clusters={clusters} />
          {(!clusters || clusters.length === 0) && (
            <div className="text-echo-dim text-xs uppercase text-center border border-dashed border-echo-dim py-6">
              NO ACTIVE CLUSTER ALERTS
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "text-echo-text" }: { label: string; value: number; color?: string }) {
  return (
    <div className="border border-echo-border bg-echo-surface p-4 flex flex-col justify-between h-24">
      <div className="text-echo-dim text-xs uppercase">{label}</div>
      <div className={`text-3xl ${color}`}>{value}</div>
    </div>
  );
}
