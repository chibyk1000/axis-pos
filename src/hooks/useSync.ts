import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { sqlite } from "@/db/database";
import { useSettings } from "./useSettings";

export interface DiscoveredServer {
  name: string;
  ip: string;
  port: number;
  storeName: string;
  storeId: string;
}

export interface SyncDevice {
  id: string;
  name: string;
  ip: string;
  role: string;
  last_seen: number;
}

// localStorage keys
const LS_DEVICE_ID = "axis_sync_device_id";
const LS_LAST_SEQ = "axis_sync_last_seq";
const LS_LAST_TIME = "axis_sync_last_time";
// Track whether this device has ever received a full snapshot from the server.
// Reset to "0" whenever the server URL changes so a new snapshot is fetched.
const LS_SNAPSHOT_OK = "axis_sync_snapshot_ok";

export function useSync() {
  const { settings, updateSetting, saveSettings } = useSettings();

  const [deviceId] = useState<string>(() => {
    let id = localStorage.getItem(LS_DEVICE_ID);
    if (!id) {
      id = "pos-" + Math.random().toString(36).substring(2, 11);
      localStorage.setItem(LS_DEVICE_ID, id);
    }
    return id;
  });

  const [serverRunning, setServerRunning] = useState(false);
  const [serverStats, setServerStats] = useState({
    ip: "",
    port: 8080,
    liveRequests: 0,
    storeName: "",
    storeId: "",
  });
  const [connectedDevices, setConnectedDevices] = useState<SyncDevice[]>([]);
  const [discoveredServers, setDiscoveredServers] = useState<
    DiscoveredServer[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >(() => {
    // Restore persisted connection state so UI doesn't flash "disconnected"
    // on every re-render if the WS is still alive.
    return (
      (localStorage.getItem("axis_sync_conn_status") as any) || "disconnected"
    );
  });
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() =>
    localStorage.getItem(LS_LAST_TIME),
  );

  const wsRef = useRef<WebSocket | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectionStatusRef = useRef(connectionStatus);
  // Prevent concurrent syncs
  const syncingRef = useRef(false);

  // ── helpers ─────────────────────────────────────────────────────────────────

  const persistStatus = (s: typeof connectionStatus) => {
    localStorage.setItem("axis_sync_conn_status", s);
    connectionStatusRef.current = s;
    setConnectionStatus(s);
  };

  // 1. Pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const rows: any = await sqlite.select(
        "SELECT COUNT(*) as cnt FROM sync_queue WHERE synced = 0",
      );
      setPendingSyncCount(rows?.[0]?.cnt ?? 0);
    } catch (err) {
      console.error("Failed to fetch pending sync count", err);
    }
  }, []);

  // 2. mDNS discovery
  const discoverServers = useCallback(async () => {
    setIsSearching(true);
    try {
      const servers = await invoke<DiscoveredServer[]>("discover_sync_servers");
      setDiscoveredServers(servers);
      return servers;
    } catch (err) {
      console.error("Discovery failed", err);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  // 3. Start server (admin)
  const startServer = useCallback(async () => {
    try {
      const status: any = await invoke("start_sync_server", {
        deviceName: settings.deviceName || "POS Admin",
        storeName: settings.storeName || "Axis POS Store",
        storeId: settings.storeId || "store-001",
      });
      setServerRunning(status.running);
      setServerStats({
        ip: status.ip,
        port: status.port,
        liveRequests: status.live_requests,
        storeName: status.store_name,
        storeId: status.store_id,
      });
      updateSetting("isStoreServer", true);
      saveSettings();
    } catch (err) {
      console.error("Failed to start server", err);
      alert("Failed to start sync server: " + err);
    }
  }, [settings, updateSetting, saveSettings]);

  // 4. Stop server
  const stopServer = useCallback(async () => {
    try {
      await invoke("stop_sync_server");
      setServerRunning(false);
      setConnectedDevices([]);
      updateSetting("isStoreServer", false);
      saveSettings();
    } catch (err) {
      console.error("Failed to stop server", err);
    }
  }, [updateSetting, saveSettings]);

  // 5. Apply delta changes
  const applyPulledChanges = useCallback(async (changes: any[]) => {
    if (changes.length === 0) return;
    try {
      await invoke("apply_sync_changes", { changes });
      console.log(`[SYNC] Applied ${changes.length} delta changes`);
    } catch (err) {
      console.error("Failed to apply pulled changes", err);
      throw err;
    }
  }, []);

  // 6. Pull delta changes
  const pullChanges = useCallback(
    async (url: string) => {
      try {
        const lastSeq = parseInt(localStorage.getItem(LS_LAST_SEQ) || "0", 10);
        const result = await invoke<{ changes: any[]; maxSequence: number }>(
          "sync_pull",
          {
            serverUrl: url,
            deviceId,
            lastSequence: lastSeq,
          },
        );

        if (result.changes.length > 0) {
          console.log(`[SYNC] Pulling ${result.changes.length} changes from server`);
          await applyPulledChanges(result.changes);
          localStorage.setItem(LS_LAST_SEQ, result.maxSequence.toString());
          console.log(`[SYNC] Updated sequence to ${result.maxSequence}`);
        }

        const now = new Date().toLocaleTimeString();
        setLastSyncTime(now);
        localStorage.setItem(LS_LAST_TIME, now);
      } catch (err) {
        console.error("[SYNC] Pull error:", err);
      }
    },
    [deviceId, applyPulledChanges],
  );

  // 7. Full snapshot — called on first-ever connection or after server URL changes
  const pullSnapshot = useCallback(async (url: string) => {
    console.log("[SYNC] Fetching full snapshot from server…");
    try {
      const snapshot: any = await invoke("sync_fetch_snapshot", {
        serverUrl: url,
      });
      // snapshot = { maxSequence: number, tables: { tableName: row[] } }
      const maxSeq: number = snapshot.maxSequence ?? 0;
      const tables: Record<string, any[]> = snapshot.tables ?? {};

      await invoke("apply_sync_snapshot", {
        tables,
        maxSequence: maxSeq,
      });

      localStorage.setItem(LS_LAST_SEQ, maxSeq.toString());
      localStorage.setItem(LS_SNAPSHOT_OK, "1");

      const now = new Date().toLocaleTimeString();
      setLastSyncTime(now);
      localStorage.setItem(LS_LAST_TIME, now);

      console.log(
        `[SYNC] Snapshot applied — maxSequence=${maxSeq}, tables=${Object.keys(tables).join(", ")}`,
      );
    } catch (err) {
      console.error("[SYNC] Snapshot failed", err);
      throw err;
    }
  }, []);

  // 8. Register device; returns server's currentSequence
  const registerDevice = useCallback(
    async (url: string): Promise<number> => {
      try {
        const res: any = await invoke("sync_register", {
          serverUrl: url,
          deviceId,
          deviceName: settings.deviceName || "POS Cashier",
        });
        // res is the full JSON from /register: { deviceId, status, currentSequence }
        return typeof res?.currentSequence === "number"
          ? res.currentSequence
          : -1;
      } catch (err) {
        console.error("Registration failed", err);
        return -1;
      }
    },
    [deviceId, settings.deviceName],
  );

  // 9. Push local changes
  const pushLocalChanges = useCallback(
    async (url: string) => {
      try {
        const count = await invoke<number>("sync_push", {
          serverUrl: url,
          deviceId,
        });
        if (count > 0) {
          console.log(`[SYNC] Pushed ${count} local changes to server`);
          updatePendingCount();
        }
      } catch (err) {
        console.error("[SYNC] Push error:", err);
      }
    },
    [deviceId, updatePendingCount],
  );

  // 9b. Push this terminal's current database to the admin server.
  const pushLocalSnapshot = useCallback(
    async (url: string) => {
      try {
        const count = await invoke<number>("sync_push_snapshot", {
          serverUrl: url,
          deviceId,
        });
        if (count > 0) {
          console.log(`[SYNC] Pushed ${count} snapshot rows to server`);
        }
      } catch (err) {
        console.error("[SYNC] Snapshot push error:", err);
        throw err;
      }
    },
    [deviceId],
  );

  // 10. Full sync cycle (register → snapshot-if-needed → push → pull)
  const forceSync = useCallback(async () => {
    if (settings.isStoreServer) {
      // Admin machine: update pending count and ensure local changes are tracked
      updatePendingCount();
      return;
    }

    const url = settings.syncServerUrl;
    if (!url) return;

    if (syncingRef.current) return; // don't pile up
    syncingRef.current = true;

    persistStatus("connecting");

    try {
      // Register and get the server's current max sequence
      const serverSeq = await registerDevice(url);
      if (serverSeq === -1) {
        persistStatus("error");
        return;
      }

      persistStatus("connected");

      const localSeq = parseInt(localStorage.getItem(LS_LAST_SEQ) || "0", 10);
      const snapshotDone = localStorage.getItem(LS_SNAPSHOT_OK) === "1";

      // Need snapshot if:
      //  a) we've never done one for this server, OR
      //  b) the server has data (serverSeq > 0) but our local seq is still 0
      const needSnapshot = !snapshotDone || (serverSeq > 0 && localSeq === 0);

      if (needSnapshot) {
        console.log("[SYNC] Need snapshot, serverSeq:", serverSeq, "localSeq:", localSeq);
        await pullSnapshot(url);
      } else {
        await pullChanges(url);
      }

      await pushLocalSnapshot(url);
      await pushLocalChanges(url);
      console.log("[SYNC] Sync cycle completed");
    } finally {
      syncingRef.current = false;
    }
  }, [
    settings.isStoreServer,
    settings.syncServerUrl,
    registerDevice,
    pullSnapshot,
    pullChanges,
    pushLocalSnapshot,
    pushLocalChanges,
    updatePendingCount,
  ]);

  // 11. WebSocket for real-time push notifications from the server
  const connectWebSocket = useCallback(
    (url: string) => {
      if (wsRef.current) {
        wsRef.current.close();
      }

      const wsUrl = url.replace(/^http/, "ws") + "/ws";
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[WS] Connected to server");
        persistStatus("connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[WS] Received:", data);
          if (data.event === "changes_pushed" && data.deviceId !== deviceId) {
            // A different terminal pushed — pull immediately
            console.log("[WS] Triggering immediate sync due to changes from", data.deviceId);
            pullChanges(url);
          }
        } catch (err) {
          console.error("[WS] Failed to parse message:", err);
        }
      };

      ws.onerror = () => {
        persistStatus("error");
      };

      ws.onclose = () => {
        console.log("[WS] Closed");
        if (settings.syncEnabled && !settings.isStoreServer) {
          // Reconnect after 5 s
          setTimeout(() => connectWebSocket(url), 5000);
        } else {
          persistStatus("disconnected");
        }
      };

      wsRef.current = ws;
    },
    [deviceId, pullChanges, settings.syncEnabled, settings.isStoreServer],
  );

  // 12. Admin: fetch connected devices + live request count
  const fetchServerInfo = useCallback(async () => {
    if (!serverRunning) return;
    try {
      const response = await fetch(
        `http://localhost:${serverStats.port}/devices`,
      );
      if (response.ok) {
        setConnectedDevices(await response.json());
      }
      const status: any = await invoke("get_sync_server_status");
      setServerStats((prev) => ({
        ...prev,
        liveRequests: status.live_requests,
      }));
    } catch (err) {
      console.error("Failed to fetch server devices", err);
    }
  }, [serverRunning, serverStats.port]);

  // ── effects ──────────────────────────────────────────────────────────────────

  // Admin stats loop
  useEffect(() => {
    if (settings.isStoreServer && serverRunning) {
      fetchServerInfo();
      statsTimerRef.current = setInterval(fetchServerInfo, 3000);
    }
    return () => {
      if (statsTimerRef.current) clearInterval(statsTimerRef.current);
    };
  }, [settings.isStoreServer, serverRunning, fetchServerInfo]);

  // Cashier sync loop + WS
  useEffect(() => {
    if (settings.isStoreServer) {
      wsRef.current?.close();
      wsRef.current = null;
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
      persistStatus("disconnected");
      return;
    }

    if (settings.syncEnabled && settings.syncServerUrl) {
      const url = settings.syncServerUrl;

      forceSync();
      connectWebSocket(url);

      syncTimerRef.current = setInterval(() => {
        if (connectionStatusRef.current === "connected") {
          pushLocalChanges(url);
          pullChanges(url);
          return;
        }

        forceSync();
      }, 5_000);
    } else {
      wsRef.current?.close();
      wsRef.current = null;
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
      persistStatus("disconnected");
    }

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [settings.isStoreServer, settings.syncEnabled, settings.syncServerUrl]); // intentionally shallow — forceSync etc. are stable refs

  // Init: pending count + auto-start server / auto-discover
  useEffect(() => {
    const init = async () => {
      updatePendingCount();

      if (settings.isStoreServer) {
        startServer();
      } else if (settings.syncEnabled && !settings.syncServerUrl) {
        const found = await discoverServers();
        if (found.length === 1) {
          const url = `http://${found[0].ip}:${found[0].port}`;
          updateSetting("syncServerUrl", url);
          saveSettings();
        }
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // ── public API ───────────────────────────────────────────────────────────────

  return {
    deviceId,
    serverRunning,
    serverStats,
    connectedDevices,
    discoveredServers,
    isSearching,
    connectionStatus,
    pendingSyncCount,
    lastSyncTime,
    discoverServers,
    startServer,
    stopServer,
    connectToServer: async (url: string) => {
      // Invalidate snapshot flag so a fresh snapshot is fetched for the new server
      localStorage.removeItem(LS_SNAPSHOT_OK);
      localStorage.setItem(LS_LAST_SEQ, "0");
      persistStatus("connecting");

      try {
        const serverSeq = await registerDevice(url);
        if (serverSeq === -1) {
          persistStatus("error");
          return false;
        }

        updateSetting("syncServerUrl", url);
        updateSetting("syncEnabled", true);
        updateSetting("isStoreServer", false);
        saveSettings();

        if (serverSeq > 0) {
          await pullSnapshot(url);
        } else {
          localStorage.setItem(LS_SNAPSHOT_OK, "1");
        }

        await pushLocalSnapshot(url);
        await pushLocalChanges(url);
        connectWebSocket(url);
        persistStatus("connected");
        return true;
      } catch (err) {
        console.error("[SYNC] Connect failed:", err);
        persistStatus("error");
        return false;
      }
    },
    forceSync,
    updatePendingCount,
  };
}
