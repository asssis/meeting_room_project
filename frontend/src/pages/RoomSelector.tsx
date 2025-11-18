import React from "react";

export type Room = { id: string; name: string };

type Props = {
  rooms: Room[];
  selectedRoomId?: string;
  onSelect: (room: Room) => void;
};

export default function RoomSelector({ rooms, selectedRoomId, onSelect }: Props) {
  return (
    <div className="card mb-3">
      <div className="card-header"><strong>Salas</strong></div>
      <div className="list-group list-group-flush">
        {rooms.length === 0 && <div className="list-group-item">Nenhuma sala</div>}
        {rooms.map(r => (
          <button
            key={r.id}
            className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${r.id === selectedRoomId ? "active" : ""}`}
            onClick={() => onSelect(r)}
          >
            <span>{r.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
