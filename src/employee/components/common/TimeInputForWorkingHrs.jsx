// components/common/TimeInputForWorkingHrs.jsx
import React, { useState, useEffect, useRef } from "react";
import { FiX } from "react-icons/fi";

export const TimeInputWorking = ({
  value,
  onChange,
  className = "",
  required = false,
  maxHours = 24 * 60,
  disabled = false,
}) => {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [error, setError] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const hoursRef = useRef(null);
  const minutesRef = useRef(null);

  const maxTotalMinutesAllowed = Math.floor(maxHours);

  // Parse the value (which could be in decimal hours like "2.42")
  const parseTime = (val) => {
    const totalMinutes = parseInt(val, 10) || 0;
    return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
  };

  // Update internal state when value changes externally
  useEffect(() => {
    const parsed = parseTime(value);
    setHours(parsed.hours);
    setMinutes(parsed.minutes);
  }, [value]);

  // Convert hours and minutes to decimal for parent
  const updateParent = (h, m) => {
    const totalMinutes = h * 60 + m; // integer, exact
    onChange?.({ target: { value: String(totalMinutes) } });
  };

  const handleHoursChange = (e) => {
    let val = e.target.value;
    if (val === "") {
      setHours(0);
      updateParent(0, minutes);
      return;
    }
    let h = parseInt(val);
    if (isNaN(h)) h = 0;
    if (h < 0) h = 0;

    const maxH = Math.floor(maxTotalMinutesAllowed / 60);
    if (h > maxH && maxH > 0) h = maxH;

    setHours(h);
    updateParent(h, minutes);
    setError("");
  };

  const handleMinutesChange = (e) => {
    let val = e.target.value;
    if (val === "") {
      setMinutes(0);
      updateParent(hours, 0);
      return;
    }
    let m = parseInt(val);
    if (isNaN(m)) m = 0;
    if (m < 0) m = 0;
    if (m > 59) m = 59;

    const totalMinutes = hours * 60 + m;
    if (totalMinutes > maxTotalMinutesAllowed && maxTotalMinutesAllowed > 0) {
      setError(`Max ${formatMaxLabel(maxTotalMinutesAllowed)}`);
      const cappedMinutes = maxTotalMinutesAllowed - hours * 60;
      if (cappedMinutes >= 0) {
        setMinutes(cappedMinutes);
        updateParent(hours, cappedMinutes);
      }
      return;
    }

    setMinutes(m);
    updateParent(hours, m);
    setError("");
  };

  const handleHoursBlur = () => {
    setIsFocused(false);
    if (isNaN(hours) || hours < 0) {
      setHours(0);
      updateParent(0, minutes);
    }
    const maxH = Math.floor(maxTotalMinutesAllowed / 60);
    if (hours > maxH && maxH > 0) {
      setHours(maxH);
      updateParent(maxH, minutes);
    }
    setError("");
  };

  const isMaxedOut =
    maxTotalMinutesAllowed > 0 &&
    hours * 60 + minutes >= maxTotalMinutesAllowed;

  const formatMaxLabel = (totalMin) => {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Select all text when focusing for easy editing
    if (hoursRef.current) {
      hoursRef.current.select();
    }
  };

  const handleClear = () => {
    setHours(0);
    setMinutes(0);
    setError("");
    onChange?.({ target: { value: "" } });
  };

  const hasValue = hours > 0 || minutes > 0;

  return (
    <div className={`relative w-full ${className}`}>
      <div
        className={`flex items-center gap-1 bg-[var(--surface2)] border ${error ? "border-red-500" : "border-[var(--border)]"} rounded-lg focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/20 transition-all ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input
          ref={hoursRef}
          type="number"
          value={hours}
          onChange={handleHoursChange}
          onBlur={handleHoursBlur}
          onFocus={handleFocus}
          min="0"
          max={Math.floor(maxTotalMinutesAllowed / 60)}
          disabled={disabled}
          className="w-12 px-1 py-2 bg-transparent border-0 text-center text-sm text-[var(--text)] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          placeholder="0"
        />
        <span className="text-xs text-[var(--muted)]">h</span>
        <input
          ref={minutesRef}
          type="number"
          value={minutes}
          onChange={handleMinutesChange}
          onFocus={() => {
            if (minutesRef.current) {
              minutesRef.current.select();
            }
          }}
          min="0"
          max="59"
          disabled={disabled || isMaxedOut}
          className="w-12 px-1 py-2 bg-transparent border-0 text-center text-sm text-[var(--text)] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          placeholder="00"
        />
        <span className="text-xs text-[var(--muted)]">m</span>

        {/* Clear button - shows when there's a value and not disabled */}
        {hasValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-500/10"
            title="Clear time"
          >
            <FiX size={14} />
          </button>
        )}
      </div>

      {error && (
        <p className="absolute -bottom-5 left-0 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
};

export default TimeInputWorking;
