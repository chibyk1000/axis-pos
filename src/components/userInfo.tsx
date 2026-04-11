

export default function UserInfoModal() {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
      <div className="w-[900px] h-[500px] bg-slate-800 rounded-lg shadow-lg flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-1/4 bg-slate-900 border-r border-slate-700">
          <div className="p-4 text-white font-semibold border-b border-slate-700">
            User info
          </div>

          <div className="mt-2">
            <button className="w-full text-left px-4 py-2 bg-sky-600 text-white">
              Profile
            </button>
            <button className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-700">
              User report
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 text-white relative">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              Profile
              <span className="text-slate-400 cursor-pointer">✎</span>
            </h2>
            <button className="text-slate-400 hover:text-white text-xl">
              ✕
            </button>
          </div>

          {/* Form */}
          <div className="mt-6 space-y-4 max-w-md">
            <div>
              <label className="text-sm text-slate-400">First Name</label>
              <input
                type="text"
                defaultValue="Admin"
                className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400">Last Name</label>
              <input
                type="text"
                defaultValue="mike"
                className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400">Email</label>
              <input
                type="email"
                defaultValue="ochibuike798@gmail.com"
                className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <button className="mt-4 flex items-center gap-2 px-4 py-2 border border-slate-500 text-slate-200 hover:bg-slate-700 rounded">
              ✎ Change profile or password
            </button>
          </div>

          {/* Close Button */}
          <div className="absolute bottom-4 right-4">
            <button className="bg-red-600 hover:bg-red-700 px-5 py-2 rounded text-white">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
