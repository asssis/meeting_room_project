import React, { useEffect, useMemo, useState } from "react";

export type ReservationItem = {
  id: string;
  roomId: string;
  userId: string;
  date: string;      // expected to be something like "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM:SS"
  startTime: string; // "HH:MM:SS"
  endTime: string;   // "HH:MM:SS"
  userName?: string;
};

type Props = {
  year?: number;
  month?: number; // 0-based (Jan=0) optional initial
  reservations: ReservationItem[]; // all reservations for the selected room (could be for many dates)
  onDelete?: (id: string) => Promise<void> | void;
  onDaySelect?: (date: string) => void;
};

function startOfMonth(y: number, m: number) {
  return new Date(y, m, 1);
}
function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}
function pad(n: number) { return String(n).padStart(2, "0"); }
function isoDate(y:number,m:number,d:number){ return `${y}-${pad(m+1)}-${pad(d)}`; }

// normalize a date string to "YYYY-MM-DD"
// accepts "YYYY-MM-DD", "YYYY-MM-DDTHH:MM:SS", "YYYY-MM-DD HH:MM:SS", "YYYY-MM-DDZ", etc.
function normalizeToDateOnly(s: string | undefined | null): string {
  if (!s) return "";
  // If already looks like YYYY-MM-DD exactly
  const simpleMatch = /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (simpleMatch) return s;
  // If includes 'T', take part before 'T'
  if (s.includes("T")) return s.split("T")[0];
  // If includes space between date and time
  if (s.includes(" ")) return s.split(" ")[0];
  // If it's an ISO-ish string with timezone like 2025-11-17+03:00 or 2025-11-17Z
  const isoDateMatch = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDateMatch) return isoDateMatch[1];
  // fallback: try to construct Date and extract local date (avoid timezone shifts by using Date parts)
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return s; // last resort
}

export default function RoomCalendar({ year, month, reservations, onDelete, onDaySelect }: Props) {
  const today = new Date();
  const initialView = {
    y: year ?? today.getFullYear(),
    m: month ?? today.getMonth()
  };

  const [viewYM, setViewYM] = useState<{ y:number; m:number }>(initialView);

  // selectedDay initial: if the initial view is current month/year use today's day, otherwise 1
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    return (initialView.y === today.getFullYear() && initialView.m === today.getMonth())
      ? today.getDate()
      : 1;
  });

  // map reservations by date "YYYY-MM-DD" — normaliza strings tipo "2025-11-28T00:00:00"
  const byDate = useMemo(() => {
    const map = new Map<string, ReservationItem[]>();
    for (const r of reservations || []) {
      const key = normalizeToDateOnly(r.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    // sort reservations for each day by startTime asc
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => {
        if (a.startTime < b.startTime) return -1;
        if (a.startTime > b.startTime) return 1;
        return 0;
      });
      map.set(k, arr);
    }
    return map;
  }, [reservations]);

  const firstWeekDay = new Date(viewYM.y, viewYM.m, 1).getDay(); // 0=Sun
  const totalDays = daysInMonth(viewYM.y, viewYM.m);

  // when changing month/year we adjust selectedDay:
  // - if the new view is the current month/year -> select today
  // - else -> clamp to 1..totalDays (we default to 1)
  useEffect(() => {
    if (viewYM.y === today.getFullYear() && viewYM.m === today.getMonth()) {
      setSelectedDay(today.getDate());
    } else {
      // clamp previous selectedDay into the new month's range; or set to 1
      setSelectedDay(prev => {
        if (prev < 1) return 1;
        if (prev > totalDays) return 1;
        return prev;
      });
    }
  // we intentionally depend on viewYM.y, viewYM.m and totalDays
  }, [viewYM.y, viewYM.m, totalDays, today.getFullYear(), today.getMonth(), today.getDate()]);

  const prevMonth = () => setViewYM(v => {
    const nm = v.m === 0 ? 11 : v.m - 1;
    const ny = v.m === 0 ? v.y - 1 : v.y;
    return { y: ny, m: nm };
  });
  const nextMonth = () => setViewYM(v => {
    const nm = v.m === 11 ? 0 : v.m + 1;
    const ny = v.m === 11 ? v.y + 1 : v.y;
    return { y: ny, m: nm };
  });

  const days: Array<{ d:number, iso:string, hasReservations:boolean }> = [];
  for (let d = 1; d <= totalDays; d++) {
    const iso = isoDate(viewYM.y, viewYM.m, d);
    days.push({ d, iso, hasReservations: byDate.has(iso) });
  }

  const handleSelectDay = (d:number, iso:string) => {
    setSelectedDay(d);
    if (onDaySelect) onDaySelect(iso);
  };

  const selectedIso = isoDate(viewYM.y, viewYM.m, selectedDay);

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <div>
          <button className="btn btn-sm btn-outline-secondary me-2" onClick={prevMonth}>&lt;</button>
          <button className="btn btn-sm btn-outline-secondary" onClick={nextMonth}>&gt;</button>
        </div>
        <strong>{viewYM.y} — {new Date(viewYM.y, viewYM.m).toLocaleString(undefined, { month: 'long' })}</strong>
        <div />
      </div>

      <div className="p-2">
        <div className="d-flex justify-content-between text-muted small">
          <div className="text-center" style={{ width: '14%' }}>Sun</div>
          <div className="text-center" style={{ width: '14%' }}>Mon</div>
          <div className="text-center" style={{ width: '14%' }}>Tue</div>
          <div className="text-center" style={{ width: '14%' }}>Wed</div>
          <div className="text-center" style={{ width: '14%' }}>Thu</div>
          <div className="text-center" style={{ width: '14%' }}>Fri</div>
          <div className="text-center" style={{ width: '14%' }}>Sat</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginTop: 6 }}>
          {Array.from({ length: firstWeekDay }).map((_, i) => <div key={`empty-${i}`} />)}

          {days.map(day => {
            const isSelected = Number(day.d) === selectedDay;
            const isToday = viewYM.y === today.getFullYear() && viewYM.m === today.getMonth() && day.d === today.getDate();
            const cls = [
              "border",
              "rounded",
              "p-2",
              "text-center",
              day.hasReservations ? 'bg-warning bg-opacity-25' : '',
              isSelected ? 'border-primary' : '',
              isToday ? 'fw-bold' : ''
            ].join(' ');
            return (
              <div
                key={day.iso}
                className={cls}
                style={{ cursor: 'pointer' }}
                onClick={() => handleSelectDay(day.d, day.iso)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectDay(day.d, day.iso); }}
              >
                <div className="fw-bold">{day.d}</div>
                {day.hasReservations && <div className="small text-muted">{byDate.get(day.iso)!.length} reserva(s)</div>}
              </div>
            );
          })}
        </div>

        <div className="mt-3">
          <h6>Reservas em {selectedIso}</h6>
          <ul className="list-group">
            {(byDate.get(selectedIso) || []).map(r => (
              <li
                key={r.id}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <div>
                  <div><strong>{r.userName ?? r.userId}</strong></div>
                  <div className="small text-muted">{r.startTime.slice(0,5)} — {r.endTime.slice(0,5)}</div>
                </div>
                <div>
                  {onDelete && (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={(e) => { e.stopPropagation(); onDelete(r.id); }}
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </li>
            ))}
            {(byDate.get(selectedIso) || []).length === 0 && <li className="list-group-item">Nenhuma reserva neste dia</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
