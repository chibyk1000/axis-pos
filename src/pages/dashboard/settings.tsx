import { useAuth } from "@/App";

export default function Settings() {
  const auth = useAuth();
  return (
    <div>
      <h2 className="text-2xl font-semibold text-white mb-4">Settings</h2>
      <div className="bg-slate-900 p-4 rounded-lg space-y-3">
        <div>
          <p className="text-sm text-slate-400">Username</p>
          <p className="text-white">{auth.user?.username ?? "—"}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Preferences</p>
          <p className="text-white">No preferences configured yet.</p>
        </div>
      </div>
    </div>
  );
}
