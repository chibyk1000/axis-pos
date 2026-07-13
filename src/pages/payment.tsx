import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { setAmount as setAmountAction } from "@/store/paymentSlice";

export default function PaymentScreen() {
  const dispatch = useDispatch();
  const amount = useSelector((state: RootState) => state.payment.amount);

  const setAmount = (val: string | ((prev: string) => string)) => {
    if (typeof val === "function") {
      dispatch(setAmountAction(val(amount)));
    } else {
      dispatch(setAmountAction(val));
    }
  };

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
    <div className="flex h-screen bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-200">
      {/* LEFT PANEL */}
      <div className="w-1/3 border-r border-stone-300 dark:border-stone-700 p-4 flex flex-col justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-4 text-stone-900 dark:text-stone-100">
            Items
          </h2>

          <div className="flex justify-between border-b border-stone-300 dark:border-stone-700 pb-2">
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
          <div className="flex justify-between py-2 text-xl font-bold text-amber-400">
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
                className="bg-white dark:bg-stone-800 px-4 py-2 rounded hover:bg-stone-200 dark:hover:bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-stone-100"
              >
                {btn}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-8 flex-1">
          {/* PAYMENT TYPES */}
          <div className="w-1/3">
            <h3 className="mb-3 text-stone-700 dark:text-stone-400">
              Payment Type
            </h3>

            <div className="space-y-3">
              {["Cash", "Card", "Check", "Split Payments"].map((type) => (
                <button
                  key={type}
                  className="w-full bg-white dark:bg-stone-800 py-3 rounded hover:bg-stone-200 dark:hover:bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-stone-100"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* PAYMENT AREA */}
          <div className="w-2/3 flex flex-col justify-between">
            <div>
              <div className="text-stone-700 dark:text-stone-400">Total:</div>
              <div className="text-3xl text-amber-400 font-bold mb-3">
                500,000.00
              </div>

              <div className="text-stone-700 dark:text-stone-400">Paid:</div>
              <input
                value={amount}
                readOnly
                className="w-full bg-transparent border-b border-amber-500 text-3xl text-amber-300 focus:outline-none"
              />
            </div>

            {/* KEYPAD */}
            <div className="grid grid-cols-4 gap-3 mt-6">
              {keys.map((key, index) => (
                <button
                  key={index}
                  onClick={() => key && handleKeyPress(key)}
                  className={`py-4 rounded text-lg text-stone-900 dark:text-stone-100
                    ${key === "⌫" ? "bg-red-700" : "bg-white dark:bg-stone-800"} 
                    ${key === "" ? "invisible" : "hover:bg-stone-200 dark:hover:bg-stone-100 dark:bg-stone-700"}
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
