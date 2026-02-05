import  { useState } from "react";

interface CounterProps {
  initialValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
}

export default function Counter({
  initialValue = 0,
  min = 0,
  max = Infinity,
  step = 1,
  onChange,
}: CounterProps) {
  const [value, setValue] = useState(initialValue);

  const handleIncrement = () => {
    setValue((prev) => {
      const newValue = Math.min(prev + step, max);
      onChange?.(newValue);
      return newValue;
    });
  };

  const handleDecrement = () => {
    setValue((prev) => {
      const newValue = Math.max(prev - step, min);
      onChange?.(newValue);
      return newValue;
    });
  };

  return (
    <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded px-2 py-1 w-max">
      <button
        onClick={handleDecrement}
        className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-white"
      >
        −
      </button>
      <span className="px-3 text-white">{value}</span>
      <button
        onClick={handleIncrement}
        className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-white"
      >
        +
      </button>
    </div>
  );
}
