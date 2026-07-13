import { useAuth } from "@/providers/auth-provider";

export default function UserInfo() {
  const auth = useAuth();
  return (
    <div>
      <h2 className="text-2xl font-semibold text-stone-900 dark:text-white mb-4">
        User Info
      </h2>
      <div className="bg-white dark:bg-stone-900 p-4 rounded-lg border border-stone-200 dark:border-stone-800">
        <p className="text-sm text-stone-600 dark:text-stone-400">Username</p>
        <p className="text-lg text-stone-900 dark:text-white">
          {auth.user?.username ?? "—"}
        </p>
      </div>
    </div>
  );
}
