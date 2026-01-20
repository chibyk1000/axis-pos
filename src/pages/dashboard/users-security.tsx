"use client";

import { useState } from "react";
import {
  RotateCcw,
  Plus,
  Pen,
  Trash2,
  Pocket as LockReset,
  Eye,
  HelpCircle,
} from "lucide-react";
import AccessLevelSettings from "@/components/securityTab";

interface User {
  firstName: string;
  lastName: string;
  email: string;
  accessLevel: number;
  active: boolean;
}

export default function UsersSecurityClient() {
  const [users, setUsers] = useState<User[]>([
    {
      firstName: "chibuike",
      lastName: "Okorie",
      email: "ochibuike798@gmail.com",
      accessLevel: 9,
      active: true,
    },
  ]);

  const [activeTab, setActiveTab] = useState<"users" | "security">("users");
  const [showInactive, setShowInactive] = useState(false);

  const displayedUsers = showInactive ? users : users.filter((u) => u.active);

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-200">
      {/* Tab Navigation */}
      <div className="border-b border-slate-800 px-6 flex gap-6">
        {[
          { label: "Users", tab: "users" },
          { label: "Security", tab: "security" },
        ].map(({ label, tab }) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as "users" | "security")}
            className={`py-4 px-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab
                ? "border-sky-500 text-sky-500 bg-slate-800/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Toolbar */}

      {/* Content Area */}
      {activeTab === "users" ? (
        <>
          <div className="border-b border-slate-800 px-6 py-4 flex items-center gap-4 bg-slate-800">
            {[
              {
                icon: RotateCcw,
                label: "Refresh",
                onClick: () => console.log("Refresh"),
              },
              {
                icon: Plus,
                label: "Add user",
                onClick: () => console.log("Add user"),
                primary: true,
              },
              { icon: Pen, label: "Edit", onClick: () => console.log("Edit") },
              {
                icon: Trash2,
                label: "Delete",
                onClick: () => console.log("Delete"),
              },
              {
                icon: LockReset,
                label: "Reset password",
                onClick: () => console.log("Reset"),
              },
              {
                icon: Eye,
                label: "Show inactive users",
                onClick: () => setShowInactive(!showInactive),
                toggle: true,
              },
              {
                icon: HelpCircle,
                label: "Help",
                onClick: () => console.log("Help"),
                mlAuto: true,
              },
            ].map(
              (
                { icon: Icon, label, onClick, primary, toggle, mlAuto },
                idx,
              ) => (
                <button
                  key={idx}
                  onClick={onClick}
                  className={`flex flex-col items-center gap-1 text-sm transition-colors ${
                    primary
                      ? "text-sky-500 hover:text-sky-400 font-medium"
                      : toggle && showInactive
                        ? "text-sky-500"
                        : "text-slate-400 hover:text-slate-200"
                  } ${mlAuto ? "ml-auto" : ""}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{label}</span>
                </button>
              ),
            )}
          </div>
          <div className="flex-1 overflow-auto px-6 py-6">
            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 sticky top-0 border-b border-slate-700">
                  <tr>
                    {[
                      "First name",
                      "Last name",
                      "Email",
                      "Access level",
                      "Active",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="text-left py-3 px-4 font-semibold text-slate-400 border-r last:border-r-0"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayedUsers.length > 0 ? (
                    displayedUsers.map((user, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-3 px-4">{user.firstName}</td>
                        <td className="py-3 px-4">{user.lastName}</td>
                        <td className="py-3 px-4 text-slate-400">
                          {user.email}
                        </td>
                        <td className="py-3 px-4">{user.accessLevel}</td>
                        <td className="py-3 px-4">
                          {user.active && (
                            <span className="text-sky-500">✓</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-slate-400"
                      >
                        No users to display
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Security Tab */
        <AccessLevelSettings />
      )}
    </div>
  );
}
