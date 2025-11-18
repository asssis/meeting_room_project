// Reservation.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import 'sweetalert2/dist/sweetalert2.min.css';
import api from "../api/api";
import RoomSelector, { Room } from "./RoomSelector";

type ReservationItem = {
  id: string;
  roomId: string;
  userId: string;
  date: string;      // "YYYY-MM-DD" ou "YYYY-MM-DDTHH:MM:SS"
  startTime: string; // "HH:MM:SS"
  endTime: string;   // "HH:MM:SS"
  userName?: string;
};

/* helpers */
function pad(n:number){ return String(n).padStart(2,"0"); }
function isoDate(y:number,m:number,d:number){ return `${y}-${pad(m+1)}-${pad(d)}`; }
function toMinutes(hm:string){ const [hh="0", mm="0"] = hm.split(":"); return Number(hh)*60 + Number(mm); }
function normalizeHM(t:string){ // "HH:MM" -> "HH:MM"
  if (!t) return "00:00";
  const p = t.split(":");
  return `${pad(Number(p[0]))}:${pad(Number(p[1]||0))}`;
}
function normalizeToDateOnly(s?: string | null): string {
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.includes('T')) return s.split('T')[0];
  if (s.includes(' ')) return s.split(' ')[0];
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(s);
  if (!isNaN(d.getTime())) return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  return s;
}

export default function Reservation() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // calendar view
  const today = new Date();
  const [viewYearMonth, setViewYearMonth] = useState<{y:number,m:number}>({ y: today.getFullYear(), m: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());

  // reservation form
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("10:00");
  const [userId, setUserId] = useState<string>(() => localStorage.getItem("userId") || "");
  const [userName, setUserName] = useState<string>(() => localStorage.getItem("userName") || "");

  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // build auth headers if token present
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // tries to ensure we have token + userId; if userId missing attempt /me
  const ensureAuth = async (): Promise<{ id: string | null; name?: string | null } | null> => {
    const token = localStorage.getItem('token');
    if (!token) return null; // not authenticated

    const storedUserId = localStorage.getItem("userId");
    const storedUserName = localStorage.getItem("userName");
    // if (storedUserId) return { id: storedUserId, name: storedUserName ?? null };

    // try /me
    try {
      const res = await api.get("/auth/me");
      const id = res?.data?.id ?? res?.data?.userId ?? null;
      const name = res?.data?.name ?? res?.data?.userName ?? null;
      if (id) {
        localStorage.setItem("userId", id);
        if (name) localStorage.setItem("userName", name);
        return { id, name };
      }
    } catch (err) {
      console.warn("Falha ao obter /auth/me", err);
    }
    return null;
  };

  // load rooms
  const loadRooms = useCallback(async () => {
    try {
      const res = await api.get("/rooms");
      const data = Array.isArray(res.data) ? res.data : [];
      setRooms(data);
      setSelectedRoom(prev => prev ?? (data.length ? data[0] : null));
    } catch (err) {
      console.error(err);
      setRooms([]);
    }
  }, []);

  // load reservations
  const loadReservations = useCallback(async (roomId?: string) => {
    const rid = roomId ?? selectedRoom?.id;
    if (!rid) { setReservations([]); return; }
    setLoading(true);
    try {
      const res = await api.get("/reservations", { params: { roomId: rid }});
      let data:any = res.data ?? [];
      if (data.reservations && Array.isArray(data.reservations)) data = data.reservations;
      if (!Array.isArray(data)) data = [];
      setReservations(data);
    } catch (err) {
      console.error(err);
      setReservations([]);
    } finally { setLoading(false); }
  }, [selectedRoom]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  // try to populate user info on mount (non-blocking)
  useEffect(() => {
    (async () => {
      try {
        const info = await ensureAuth();
        if (info && info.id) {
          setUserId(info.id);
          if (info.name) setUserName(info.name);
        }
      } catch (err) {
        // ignore
      }
    })();
  }, []); // run once

  useEffect(() => { if (selectedRoom) loadReservations(selectedRoom.id); }, [selectedRoom, loadReservations]);

  // ensure selectedDay valid
  const totalDays = useMemo(() => new Date(viewYearMonth.y, viewYearMonth.m + 1, 0).getDate(), [viewYearMonth]);
  useEffect(() => { setSelectedDay(d => Math.min(d, totalDays)); }, [viewYearMonth, totalDays]);

  const firstWeekDay = useMemo(() => new Date(viewYearMonth.y, viewYearMonth.m, 1).getDay(), [viewYearMonth]);

  const reservationsByDate = useMemo(() => {
    const m = new Map<string, ReservationItem[]>();
    for (const r of reservations) {
      const key = normalizeToDateOnly(r.date);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    for (const [k, arr] of m.entries()) {
      arr.sort((a,b) => a.startTime.localeCompare(b.startTime));
      m.set(k, arr);
    }
    return m;
  }, [reservations]);

  const days = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => {
      const d = i + 1;
      const iso = isoDate(viewYearMonth.y, viewYearMonth.m, d);
      return { d, iso, has: reservationsByDate.has(iso), count: (reservationsByDate.get(iso) || []).length };
    });
  }, [totalDays, viewYearMonth, reservationsByDate]);

  const prevMonth = () => setViewYearMonth(v => {
    const next = v.m === 0 ? { y: v.y-1, m:11 } : { y: v.y, m: v.m-1 };
    setSelectedDay(1);
    return next;
  });
  const nextMonth = () => setViewYearMonth(v => {
    const next = v.m === 11 ? { y: v.y+1, m:0 } : { y: v.y, m: v.m+1 };
    setSelectedDay(1);
    return next;
  });

  const handleDaySelect = (d:number, iso:string) => {
    setSelectedDay(d);
    setDate(iso);
  };

  const hasConflict = (dateISO:string, startHM:string, endHM:string) => {
    const list = reservationsByDate.get(dateISO) ?? [];
    const s = toMinutes(startHM);
    const e = toMinutes(endHM);
    return list.some(r => {
      const rs = toMinutes(r.startTime.slice(0,5));
      const re = toMinutes(r.endTime.slice(0,5));
      return s < re && rs < e;
    });
  };

  // helper: toast
  const toast = (title:string, icon:'success'|'error'|'info'='info') => {
    Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2500, icon, title });
  };

  const create = async () => {
    setError(null);

    // check token first
    const token = localStorage.getItem('token');
    if (!token) {
      const result = await Swal.fire({
        title: 'Você precisa estar logado',
        text: 'Deseja ir para a tela de login?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ir ao login',
        cancelButtonText: 'Cancelar'
      });
      if (result.isConfirmed) navigate('/login');
      return;
    }

    // ensure user info
    const info = await ensureAuth();
    if (!info || !info.id) {
      const r = await Swal.fire({
        title: 'Informação de usuário ausente',
        text: 'Seu token está presente, mas não foi possível recuperar seu usuário. Deseja ir ao login para renovar a sessão?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ir ao login',
        cancelButtonText: 'Cancelar'
      });
      if (r.isConfirmed) navigate('/login');
      return;
    }

    if (!userId) setUserId(info.id);
    if (!userName && info.name) setUserName(info.name);

    if (!selectedRoom) {
      setError("Selecione uma sala");
      return;
    }

    const s = toMinutes(startTime), e = toMinutes(endTime);
    if (e <= s) {
      setError("Horário final deve ser maior que o inicial");
      return;
    }

    if (hasConflict(date, normalizeHM(startTime), normalizeHM(endTime))) {
      setError("Conflito com reserva existente");
      return;
    }

    setBusy(true);
    try {
      await api.post("/reservations", {
        roomId: selectedRoom.id,
        userId: userId || info.id,
        date,
        startTime: startTime + ":00",
        endTime: endTime + ":00"
      }, { headers: getAuthHeaders() });
      await loadReservations(selectedRoom.id);
      toast('Reserva criada', 'success');
    } catch (err:any) {
      console.error(err);
      setError(err?.response?.data?.message ?? "Erro ao criar reserva");
      toast('Erro ao criar reserva', 'error');
    } finally { setBusy(false); }
  };

  // delete reservation (SweetAlert confirm)
  const remove = async (id:string) => {
    const result = await Swal.fire({
      title: 'Confirmar exclusão',
      text: 'Deseja realmente excluir esta reserva?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Não'
    });
    if (!result.isConfirmed) return;

    // require auth to delete
    const token = localStorage.getItem('token');
    if (!token) {
      toast('Você precisa estar logado para excluir', 'error');
      return;
    }

    setBusy(true);
    try {
      await api.delete(`/reservations/${id}`, { headers: getAuthHeaders() });
      await loadReservations(selectedRoom?.id);
      toast('Reserva excluída', 'success');
    } catch (err:any) {
      console.error(err);
      setError("Falha ao excluir");
      toast('Falha ao excluir', 'error');
    } finally { setBusy(false); }
  };

  return (
    <div>
      <h3 className="mb-3">Agendar Sala</h3>

      <div className="row">
        <div className="col-md-4">
          <RoomSelector
            rooms={rooms}
            selectedRoomId={selectedRoom?.id}
            onSelect={(r) => {
              setSelectedRoom(r);
              setViewYearMonth({ y: new Date().getFullYear(), m: new Date().getMonth() });
              setSelectedDay(new Date().getDate());
              setDate(new Date().toISOString().slice(0,10));
              loadReservations(r.id);
            }}
          />

          <div className="card mt-3 p-3">
            <label className="form-label">Data selecionada</label>
            <input className="form-control mb-2" type="date" value={date} onChange={e => setDate(e.target.value)} />

            <label className="form-label">Início</label>
            <input className="form-control mb-2" type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} />

            <label className="form-label">Fim</label>
            <input className="form-control mb-2" type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} />

            {userName && <div className="mb-2 small text-muted">Logado como <strong>{userName}</strong></div>}

            {error && <div className="alert alert-danger">{error}</div>}
            <button className="btn btn-primary w-100" onClick={create} disabled={busy}>Agendar</button>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div>
                <button className="btn btn-sm btn-outline-secondary me-2" onClick={prevMonth}>&lt;</button>
                <button className="btn btn-sm btn-outline-secondary" onClick={nextMonth}>&gt;</button>
              </div>
              <strong>{viewYearMonth.y} — {new Date(viewYearMonth.y, viewYearMonth.m).toLocaleString(undefined, { month: 'long' })}</strong>
              <div />
            </div>

            <div className="p-2">
              <div className="d-flex justify-content-between text-muted small mb-1">
                <div className="text-center" style={{ width: '14%' }}>Sun</div>
                <div className="text-center" style={{ width: '14%' }}>Mon</div>
                <div className="text-center" style={{ width: '14%' }}>Tue</div>
                <div className="text-center" style={{ width: '14%' }}>Wed</div>
                <div className="text-center" style={{ width: '14%' }}>Thu</div>
                <div className="text-center" style={{ width: '14%' }}>Fri</div>
                <div className="text-center" style={{ width: '14%' }}>Sat</div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:6 }}>
                {Array.from({ length: firstWeekDay }).map((_,i)=> <div key={`e-${i}`} />)}

                {days.map(day => {
                  const isSelected = date === day.iso;
                  const cls = `border rounded p-2 text-center ${day.has ? 'bg-warning bg-opacity-25' : ''} ${isSelected ? 'border-primary' : ''}`;
                  return (
                    <div key={day.iso} className={cls} style={{ cursor: 'pointer' }} onClick={() => { handleDaySelect(day.d, day.iso); }}>
                      <div className="fw-bold">{day.d}</div>
                      {day.has && <div className="small text-muted">{day.count} reserva(s)</div>}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 p-2">
                <h6>Reservas no dia {date}</h6>
                {loading ? <div>Carregando...</div> : (
                  <ul className="list-group">
                    {(reservationsByDate.get(date) || []).map(r => (
                      <li key={r.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <div><strong>{r.userName ?? r.userId}</strong></div>
                          <div className="small text-muted">{r.startTime.slice(0,5)} — {r.endTime.slice(0,5)}</div>
                        </div>
                        <div>
                          <button className="btn btn-sm btn-danger" onClick={() => remove(r.id)} disabled={busy}>Excluir</button>
                        </div>
                      </li>
                    ))}
                    {(reservationsByDate.get(date) || []).length === 0 && <li className="list-group-item">Nenhuma reserva neste dia</li>}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
