import { useAuth } from "@/providers/auth-provider";

export default function UserInfo() {
  const auth = useAuth();
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
        User Info
      </h2>
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
        <p className="text-sm text-slate-600 dark:text-slate-400">Username</p>
        <p className="text-lg text-slate-900 dark:text-white">
          {auth.user?.username ?? "—"}
        </p>
      </div>
    </div>
  );
}
