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

export function useSync() {
  const { settings, updateSetting, saveSettings } = useSettings();
  const [deviceId, setDeviceId] = useState<string>(() => {
    let id = localStorage.getItem("axis_sync_device_id");
    if (!id) {
      id = "pos-" + Math.random().toString(36).substring(2, 11);
      localStorage.setItem("axis_sync_device_id", id);
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
  >("disconnected");
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() =>
    localStorage.getItem("axis_sync_last_time"),
  );

  const wsRef = useRef<WebSocket | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Get local pending change count
  const updatePendingCount = useCallback(async () => {
    try {
      const rows: any = await sqlite.select(
        "SELECT COUNT(*) as cnt FROM sync_queue WHERE synced = 0",
      );
      if (rows && rows.length > 0) {
        setPendingSyncCount(rows[0].cnt || 0);
      }
    } catch (err) {
      console.error("Failed to fetch pending sync count", err);
    }
  }, []);

  // 2. Discover local servers using mDNS
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

  // 3. Start sync server (admin mode)
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

  // 4. Stop sync server
  const stopServer = useCallback(async () => {
    try {
      const status: any = await invoke("stop_sync_server");
      setServerRunning(false);
      setConnectedDevices([]);
      updateSetting("isStoreServer", false);
      saveSettings();
    } catch (err) {
      console.error("Failed to stop server", err);
    }
  }, [updateSetting, saveSettings]);

  // 5. Apply changes pulled from the server
  const applyPulledChanges = useCallback(async (changes: any[]) => {
    if (changes.length === 0) return;
    try {
      await invoke("apply_sync_changes", { changes });
      console.log(`Successfully applied ${changes.length} pulled changes`);
    } catch (err) {
      console.error("Failed to apply pulled changes", err);
      throw err;
    }
  }, []);

  // 6. Push local changes
  // const pushLocalChanges = useCallback(async (url: string) => {
  //   try {
  //     const pending: any = await sqlite.select(
  //       "SELECT id, entity, action, payload FROM sync_queue WHERE synced = 0 ORDER BY id ASC LIMIT 50"
  //     );
  //     if (!pending || pending.length === 0) return;

  //     const changes = pending.map((row: any) => ({
  //       entity: row.entity,
  //       action: row.action,
  //       payload: JSON.parse(row.payload),
  //     }));

  //     const response = await fetch(`${url}/sync/push`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         deviceId,
  //         changes,
  //       }),
  //     });

  //     if (response.ok) {
  //       const maxId = pending[pending.length - 1].id;
  //       await sqlite.execute("UPDATE sync_queue SET synced = 1 WHERE id <= ?", [maxId]);
  //       updatePendingCount();
  //       console.log(`Pushed ${changes.length} changes successfully`);
  //     } else {
  //       console.error("Failed to push changes, response code:", response.status);
  //     }
  //   } catch (err) {
  //     console.error("Push network error", err);
  //   }
  // }, [deviceId, updatePendingCount]);

  // 7. Pull changes
  const pullChanges = useCallback(
    async (url: string) => {
      try {
        const lastSeq = parseInt(
          localStorage.getItem("axis_sync_last_seq") || "0",
          10,
        );
        const result = await invoke<{ changes: any[]; maxSequence: number }>(
          "sync_pull",
          {
            serverUrl: url,
            deviceId,
            lastSequence: lastSeq,
          },
        );

        if (result.changes.length > 0) {
          await applyPulledChanges(result.changes);
          localStorage.setItem(
            "axis_sync_last_seq",
            result.maxSequence.toString(),
          );
        }

        const now = new Date().toLocaleTimeString();
        setLastSyncTime(now);
        localStorage.setItem("axis_sync_last_time", now);
      } catch (err) {
        console.error("Pull error", err);
      }
    },
    [deviceId, applyPulledChanges],
  );

  // 8. Register device
  const registerDevice = useCallback(
    async (url: string) => {
      try {
        return await invoke<boolean>("sync_register", {
          serverUrl: url,
          deviceId,
          deviceName: settings.deviceName || "POS Cashier",
        });
      } catch (err) {
        console.error("Registration failed", err);
        return false;
      }
    },
    [deviceId, settings.deviceName],
  );

  const pushLocalChanges = useCallback(
    async (url: string) => {
      try {
        const count = await invoke<number>("sync_push", {
          serverUrl: url,
          deviceId,
        });
        if (count > 0) updatePendingCount();
      } catch (err) {
        console.error("Push error", err);
      }
    },
    [deviceId, updatePendingCount],
  );
  // 9. Force Sync manual trigger
  const forceSync = useCallback(async () => {
    if (settings.isStoreServer) {
      updatePendingCount();
      return;
    }

    const url = settings.syncServerUrl;
    if (!url) return;

    setConnectionStatus("connecting");
    const regOk = await registerDevice(url);
    if (!regOk) {
      setConnectionStatus("error");
      return;
    }

    setConnectionStatus("connected");
    await pushLocalChanges(url);
    await pullChanges(url);
  }, [
    settings.isStoreServer,
    settings.syncServerUrl,
    registerDevice,
    pushLocalChanges,
    pullChanges,
  ]);

  // WebSocket connection handler
  const connectWebSocket = useCallback(
    (url: string) => {
      if (wsRef.current) {
        wsRef.current.close();
      }

      setConnectionStatus("connecting");
      const wsUrl = url.replace(/^http/, "ws") + "/ws";
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected to server");
        setConnectionStatus("connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket event received", data);
          if (data.event === "changes_pushed" && data.deviceId !== deviceId) {
            // Immediately trigger pull when notification arrives
            pullChanges(url);
          }
        } catch (err) {
          console.error("Failed to parse WS message", err);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error", err);
        setConnectionStatus("error");
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
        // Retry connection after 5 seconds if sync is still enabled
        if (settings.syncEnabled && !settings.isStoreServer) {
          setTimeout(() => connectWebSocket(url), 5000);
        }
      };

      wsRef.current = ws;
    },
    [deviceId, pullChanges, settings.syncEnabled, settings.isStoreServer],
  );

  // 10. Fetch server devices list and stats (admin only)
  const fetchServerInfo = useCallback(async () => {
    if (!serverRunning) return;
    try {
      const response = await fetch(
        `http://localhost:${serverStats.port}/devices`,
      );
      if (response.ok) {
        const list = await response.json();
        setConnectedDevices(list);
      }

      // Fetch live requests status from tauri
      const status: any = await invoke("get_sync_server_status");
      setServerStats((prev) => ({
        ...prev,
        liveRequests: status.live_requests,
      }));
    } catch (err) {
      console.error("Failed to fetch server devices", err);
    }
  }, [serverRunning, serverStats.port]);

  // Effect: Handle Admin Server Stats Loop
  useEffect(() => {
    if (settings.isStoreServer && serverRunning) {
      fetchServerInfo();
      statsTimerRef.current = setInterval(fetchServerInfo, 3000);
    }
    return () => {
      if (statsTimerRef.current) clearInterval(statsTimerRef.current);
    };
  }, [settings.isStoreServer, serverRunning, fetchServerInfo]);

  // Effect: Handle Cashier Sync background loops and WS connections
  useEffect(() => {
    if (settings.isStoreServer) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      setConnectionStatus("disconnected");
      return;
    }

    if (settings.syncEnabled && settings.syncServerUrl) {
      const url = settings.syncServerUrl;

      // Initial sync
      forceSync();

      // Connect WebSocket for real-time notifications
      connectWebSocket(url);

      // Periodic worker every 30 seconds
      syncTimerRef.current = setInterval(() => {
        pushLocalChanges(url);
        pullChanges(url);
      }, 30000);
    } else {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      setConnectionStatus("disconnected");
    }

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [
    settings.isStoreServer,
    settings.syncEnabled,
    settings.syncServerUrl,
    forceSync,
    connectWebSocket,
    pushLocalChanges,
    pullChanges,
  ]);

  // Effect: Automatically discover server on app load if sync is enabled but no server IP is configured yet
  useEffect(() => {
    const initSync = async () => {
      // Setup pending count on startup
      updatePendingCount();

      if (settings.isStoreServer) {
        // Auto start server if setting is active
        startServer();
      } else if (settings.syncEnabled) {
        if (!settings.syncServerUrl) {
          // Attempt auto discovery
          const found = await discoverServers();
          if (found && found.length === 1) {
            const url = `http://${found[0].ip}:${found[0].port}`;
            updateSetting("syncServerUrl", url);
            saveSettings();
          }
        }
      }
    };
    initSync();
  }, [settings.isStoreServer, settings.syncEnabled, settings.syncServerUrl]);

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
      updateSetting("syncServerUrl", url);
      saveSettings();
      // immediately force sync
      setTimeout(forceSync, 200);
    },
    forceSync,
    updatePendingCount,
  };
}
