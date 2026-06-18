import React, { useState } from "react";
import { useSync } from "@/hooks/useSync";
import { useSettings } from "@/hooks/useSettings";
import { RefreshCw, Server, Wifi, WifiOff, AlertCircle, Laptop, Radio, Database } from "lucide-react";

export function SyncStatusWidget() {
  const { settings } = useSettings();
  const {
    serverRunning,
    serverStats,
    connectedDevices,
    connectionStatus,
    pendingSyncCount,
    lastSyncTime,
    forceSync,
    isSearching,
    deviceId,
  } = useSync();

  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleForceSync = async () => {
    setIsSyncing(true);
    await forceSync();
    setTimeout(() => setIsSyncing(false), 800);
  };

  if (!settings.syncEnabled && !settings.isStoreServer) {
    return null;
  }

  return (
    <div className="relative z-50">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer"
      >
        {settings.isStoreServer ? (
          <>
            <Server className={`w-3.5 h-3.5 ${serverRunning ? "text-emerald-500 animate-pulse" : "text-rose-500"}`} />
            <span>Store Server: {serverRunning ? "Active" : "Stopped"}</span>
          </>
        ) : (
          <>
            {connectionStatus === "connected" && (
              <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            )}
            {connectionStatus === "connecting" && (
              <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            )}
            {connectionStatus === "disconnected" && (
              <WifiOff className="w-3.5 h-3.5 text-slate-400" />
            )}
            {connectionStatus === "error" && (
              <AlertCircle className="w-3.5 h-3.5 text-rose-500 animate-bounce" />
            )}
            <span>
              Sync:{" "}
              {connectionStatus === "connected"
                ? "Connected"
                : connectionStatus === "connecting"
                ? "Syncing"
                : connectionStatus === "error"
                ? "Error"
                : "Disconnected"}
            </span>
          </>
        )}

        {pendingSyncCount > 0 && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 transition-all scale-100 opacity-100">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-cyan-500" />
                LAN Sync Manager
              </h4>
              <button
                onClick={handleForceSync}
                disabled={isSyncing || isSearching}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
                title="Force Sync Now"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-cyan-500" : ""}`} />
              </button>
            </div>

            {/* Content Body */}
            <div className="py-3 space-y-3.5">
              {/* SERVER MODE PANEL */}
              {settings.isStoreServer ? (
                <>
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Server IP Address</span>
                    <span className="text-xs font-semibold font-mono text-slate-800 dark:text-slate-200">
                      {serverStats.ip || "Identifying..."}:{serverStats.port}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Connected Terminals</span>
                      <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                        {connectedDevices.length}
                      </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Active Requests</span>
                      <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                        {serverStats.liveRequests}
                      </span>
                    </div>
                  </div>

                  {connectedDevices.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Connected Terminals
                      </span>
                      <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                        {connectedDevices.map((dev) => (
                          <div
                            key={dev.id}
                            className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-900"
                          >
                            <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <Laptop className="w-3 h-3 text-slate-400" />
                              {dev.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">{dev.ip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* CASHIER MODE PANEL */
                <>
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Sync Server URL</span>
                    <span className="text-xs font-semibold font-mono text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                      {settings.syncServerUrl || "No Server Configured"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Unsynced Local Changes</span>
                      <span className={`text-lg font-bold ${pendingSyncCount > 0 ? "text-cyan-500" : "text-slate-800 dark:text-slate-200"}`}>
                        {pendingSyncCount}
                      </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Connection</span>
                      <span
                        className={`text-xs font-bold mt-1.5 uppercase ${
                          connectionStatus === "connected"
                            ? "text-emerald-500"
                            : connectionStatus === "connecting"
                            ? "text-amber-500"
                            : "text-rose-500"
                        }`}
                      >
                        {connectionStatus}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="mt-2 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Radio className="w-3 h-3 text-slate-400" />
                ID: {deviceId}
              </span>
              <span>Last: {lastSyncTime || "Never"}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
