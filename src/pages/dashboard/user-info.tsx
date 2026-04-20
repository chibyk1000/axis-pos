import { useAuth } from "@/App";

export default function UserInfo() {
  const auth = useAuth();
  return (
    <div>
      <h2 className="text-2xl font-semibold text-white mb-4">User Info</h2>
      <div className="bg-slate-900 p-4 rounded-lg">
        <p className="text-sm text-slate-400">Username</p>
        <p className="text-lg text-white">{auth.user?.username ?? "—"}</p>
      </div>
    </div>
  );
}
