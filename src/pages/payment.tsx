import { useState } from "react";

export default function PaymentScreen() {
  const [amount, setAmount] = useState("500000");

  const handleKeyPress = (val: string) => {
    if (val === "⌫") {
      setAmount((prev) => prev.slice(0, -1));
    } else if (val === "C") {
      setAmount("");
    } else if (val === "↵") {
      alert(`Payment Submitted: ${amount}`);
    } else {
      setAmount((prev) => prev + val);
    }
  };

  const keys = [
    "1",
    "2",
    "3",
    "⌫",
    "4",
    "5",
    "6",
    "C",
    "7",
    "8",
    "9",
    "↵",
    "-",
    "0",
    ".",
    "",
  ];

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200">
      {/* LEFT PANEL */}
      <div className="w-1/3 border-r border-slate-700 p-4 flex flex-col justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-4">Items</h2>

          <div className="flex justify-between border-b border-slate-700 pb-2">
            <span>prid11</span>
            <span>500,000.00</span>
          </div>
        </div>

        <div className="text-sm">
          <div className="flex justify-between py-1">
            <span>Subtotal</span>
            <span>500,000.00</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Tax</span>
            <span>0.00</span>
          </div>
          <div className="flex justify-between py-2 text-xl font-bold text-cyan-400">
            <span>Total</span>
            <span>500,000.00</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-2/3 p-6 flex flex-col justify-between">
        {/* TOP ACTIONS */}
        <div className="flex justify-between items-center mb-6">
          <button className="bg-red-600 px-4 py-2 rounded">Cancel</button>

          <div className="flex gap-3">
            {["Taxes", "Discount", "Rounds", "Customer"].map((btn) => (
              <button
                key={btn}
                className="bg-slate-800 px-4 py-2 rounded hover:bg-slate-700"
              >
                {btn}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-8 flex-1">
          {/* PAYMENT TYPES */}
          <div className="w-1/3">
            <h3 className="mb-3 text-slate-400">Payment Type</h3>

            <div className="space-y-3">
              {["Cash", "Card", "Check", "Split Payments"].map((type) => (
                <button
                  key={type}
                  className="w-full bg-slate-800 py-3 rounded hover:bg-slate-700"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* PAYMENT AREA */}
          <div className="w-2/3 flex flex-col justify-between">
            <div>
              <div className="text-slate-400">Total:</div>
              <div className="text-3xl text-cyan-400 font-bold mb-3">
                500,000.00
              </div>

              <div className="text-slate-400">Paid:</div>
              <input
                value={amount}
                readOnly
                className="w-full bg-transparent border-b border-cyan-500 text-3xl text-cyan-300 focus:outline-none"
              />
            </div>

            {/* KEYPAD */}
            <div className="grid grid-cols-4 gap-3 mt-6">
              {keys.map((key, index) => (
                <button
                  key={index}
                  onClick={() => key && handleKeyPress(key)}
                  className={`py-4 rounded text-lg 
                    ${key === "⌫" ? "bg-red-700" : "bg-slate-800"} 
                    ${key === "" ? "invisible" : "hover:bg-slate-700"}
                  `}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
