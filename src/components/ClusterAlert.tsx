import React from "react";
import type { Cluster } from "../../server/db/queries";

export function ClusterAlert({ clusters }: { clusters: Cluster[] }) {
  if (!clusters || clusters.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-2 mb-6">
      {clusters.map((c) => (
        <div key={c.id} className="border border-echo-red bg-echo-red-dim p-3 flex justify-between items-center text-echo-red">
          <div className="flex items-center gap-3">
            <span className="animate-pulse">⚠</span>
            <span className="uppercase tracking-widest font-bold text-sm">
              Systemic Alert: "{c.keyword}"
            </span>
          </div>
          <div className="text-xs font-mono">
            {c.count} REPORTS | SEVERITY: {c.severity.toUpperCase()}
          </div>
        </div>
      ))}
    </div>
  );
}
