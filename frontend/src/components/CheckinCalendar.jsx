import React, { useEffect, useMemo, useRef, useState } from "react";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

function toDateKey(value) {
  if (!value) return "";
  const sourceDateKey = String(value).match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  if (sourceDateKey) return sourceDateKey;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthFromDateKey(dateKey) {
  const match = dateKey?.match(/^(\d{4})-(\d{2})/);
  return match
    ? new Date(Number(match[1]), Number(match[2]) - 1, 1)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
}

function formatDayKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function CheckinCalendar({ icon, records, selectedDate, onDateChange }) {
  const rootRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => monthFromDateKey(selectedDate));

  const completedDates = useMemo(() => new Set(
    records
      .filter((record) => record.status === "completed" && record.checkin_time)
      .map((record) => toDateKey(record.checkin_time))
      .filter(Boolean),
  ), [records]);

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return [
      ...Array.from({ length: leadingBlanks }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  }, [visibleMonth]);

  useEffect(() => {
    if (selectedDate) setVisibleMonth(monthFromDateKey(selectedDate));
  }, [selectedDate]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [isOpen]);

  const moveMonth = (offset) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const selectDay = (day) => {
    const dateKey = formatDayKey(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
    onDateChange(dateKey);
    setIsOpen(false);
  };

  return (
    <div className="checkin-calendar" ref={rootRef}>
      <button
        className="checkin-calendar__trigger"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="打开签到日期日历"
        aria-expanded={isOpen}
      >
        <img src={icon} alt="" />
      </button>

      {isOpen && (
        <div className="checkin-calendar__popover" role="dialog" aria-label="选择签到日期">
          <div className="checkin-calendar__month-header">
            <button type="button" onClick={() => moveMonth(-1)} aria-label="上个月">‹</button>
            <strong>{visibleMonth.getFullYear()}年 {visibleMonth.getMonth() + 1}月</strong>
            <button type="button" onClick={() => moveMonth(1)} aria-label="下个月">›</button>
          </div>

          <div className="checkin-calendar__weekdays" aria-hidden="true">
            {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
          </div>

          <div className="checkin-calendar__days">
            {calendarDays.map((day, index) => {
              if (day == null) return <span className="checkin-calendar__blank" key={`blank-${index}`} />;
              const dateKey = formatDayKey(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
              const isCompleted = completedDates.has(dateKey);
              const isSelected = selectedDate === dateKey;
              return (
                <button
                  type="button"
                  key={dateKey}
                  className={[
                    "checkin-calendar__day",
                    isCompleted ? "is-completed" : "",
                    isSelected ? "is-selected" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => selectDay(day)}
                  aria-pressed={isSelected}
                  aria-label={`${dateKey}${isCompleted ? "，有签到记录" : ""}`}
                >
                  <span>{day}</span>
                  {isCompleted && <i aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <button
            className="checkin-calendar__clear"
            type="button"
            onClick={() => { onDateChange(""); setIsOpen(false); }}
            disabled={!selectedDate}
          >
            显示全部日期
          </button>
        </div>
      )}
    </div>
  );
}
