"use client";

import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import { Spanish } from "flatpickr/dist/l10n/es.js";
import "flatpickr/dist/flatpickr.min.css";
import "flatpickr/dist/themes/dark.css";

interface BookingDatePickerProps {
  value: string;
  onChange: (fechaDMY: string) => void;
}

export function BookingDatePicker({ value, onChange }: BookingDatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<flatpickr.Instance | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!inputRef.current || fpRef.current) return;

    fpRef.current = flatpickr(inputRef.current, {
      dateFormat: "d/m/Y",
      locale: Spanish,
      minDate: "today",
      disable: [(date) => date.getDay() === 0],
      onDayCreate: (_dObj, _dStr, _fp, dayElem) => {
        if (dayElem.dateObj.getDay() === 0) {
          dayElem.title = "Este día no está disponible";
        }
      },
      onChange: (_selectedDates, dateStr) => {
        onChangeRef.current(dateStr);
      },
    });

    return () => {
      fpRef.current?.destroy();
      fpRef.current = null;
    };
  }, []);

  useEffect(() => {
    const fp = fpRef.current;
    if (!fp) return;
    if (value && fp.input.value !== value) {
      fp.setDate(value, false, "d/m/Y");
    } else if (!value && fp.input.value) {
      fp.clear();
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      id="fecha"
      type="text"
      className="input"
      required
      placeholder="dd/mm/aaaa"
      readOnly
    />
  );
}
