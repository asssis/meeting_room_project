// Rooms.tsx
import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import api from '../api/api';

type Room = { 
  id: string; 
  name: string; 
  capacity: number; 
  location?: string; 
  description?: string 
};

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);

  // Campos de criação
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(0);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  // Edição
  const [editing, setEditing] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);

  // toast helper
  const toast = (title: string, icon: 'success'|'error'|'info' = 'info') => {
    Swal.fire({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2200,
      icon,
      title
    });
  };

  // carregamento com useCallback para estabilidade de referência
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/rooms');
      setRooms(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Erro ao carregar salas', err);
      toast('Falha ao carregar salas', 'error');
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // chama load dentro de useEffect — NÃO passe uma função que retorna Promise diretamente ao useEffect
  useEffect(() => {
    load();
  }, [load]);

  // Criar sala
  const createRoom = async () => {
    if (!name.trim()) {
      Swal.fire({ icon: 'warning', title: 'Nome obrigatório', text: 'Preencha o nome da sala.' });
      return;
    }

    try {
      await api.post('/rooms', { 
        name: name.trim(), 
        capacity,
        location: location.trim(),
        description: description.trim()
      });

      // limpa os campos
      setName('');
      setCapacity(0);
      setLocation('');
      setDescription('');

      await load();
      toast('Sala criada', 'success');
    } catch (err) {
      console.error('Erro ao criar sala', err);
      toast('Erro ao criar sala', 'error');
    }
  };

  // Salvar edição
  const save = async () => {
    if (!editing) return;

    try {
      await api.put('/rooms/' + editing.id, editing);
      setEditing(null);
      await load();
      toast('Sala atualizada', 'success');
    } catch (err) {
      console.error('Erro ao salvar sala', err);
      toast('Erro ao salvar sala', 'error');
    }
  };

  // Remover sala (SweetAlert confirm)
  const remove = async (id: string) => {
    const room = rooms.find(r => r.id === id);
    const nameLabel = room ? ` "${room.name}"` : '';
    const result = await Swal.fire({
      title: 'Confirmar exclusão',
      text: `Deseja realmente excluir a sala${nameLabel}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete('/rooms/' + id);
      await load();
      toast('Sala excluída', 'success');
    } catch (err) {
      console.error('Erro ao excluir sala', err);
      toast('Erro ao excluir sala', 'error');
    }
  };

  return (
    <div>
      <h3>Salas</h3>

      {/* FORMULÁRIO DE CADASTRO */}
      <div className="card p-3 mb-3">
        <h5>Criar Sala</h5>

        <input 
          className="form-control mb-2" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          placeholder="Nome da sala"
        />

        <input 
          type="number"
          className="form-control mb-2" 
          value={capacity} 
          onChange={e => setCapacity(Number(e.target.value))} 
          placeholder="Capacidade"
        />

        <input 
          className="form-control mb-2" 
          value={location} 
          onChange={e => setLocation(e.target.value)} 
          placeholder="Localização"
        />

        <textarea 
          className="form-control mb-2" 
          value={description} 
          onChange={e => setDescription(e.target.value)} 
          placeholder="Descrição"
        />

        <div className="d-flex gap-2">
          <button className="btn btn-success" onClick={createRoom}>
            Criar
          </button>
          <button className="btn btn-outline-secondary" onClick={() => {
            setName(''); setCapacity(0); setLocation(''); setDescription('');
          }}>
            Limpar
          </button>
        </div>
      </div>

      {/* FORMULÁRIO DE EDIÇÃO */}
      {editing && (
        <div className="card p-3 mb-3">
          <h5>Editar Sala</h5>

          <input 
            className="form-control mb-2"
            value={editing.name}
            onChange={e => setEditing({ ...editing, name: e.target.value })}
          />

          <input 
            type="number"
            className="form-control mb-2"
            value={editing.capacity}
            onChange={e => setEditing({ ...editing, capacity: Number(e.target.value) })}
          />

          <input 
            className="form-control mb-2"
            value={editing.location || ''}
            onChange={e => setEditing({ ...editing, location: e.target.value })}
          />

          <textarea 
            className="form-control mb-2"
            value={editing.description || ''}
            onChange={e => setEditing({ ...editing, description: e.target.value })}
          />

          <div className="d-flex">
            <button className="btn btn-primary" onClick={save}>Salvar</button>
            <button className="btn btn-secondary ms-2" onClick={() => setEditing(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* LISTA */}
      <div className="card">
        <div className="card-body p-2">
          {loading ? (
            <div>Carregando...</div>
          ) : (
            <ul className="list-group">
              {rooms.map(r => (
                <li className="list-group-item d-flex justify-content-between align-items-start" key={r.id}>
                  <div>
                    <b>{r.name}</b><br />
                    Capacidade: {r.capacity}<br />
                    {r.location && <span>{r.location}<br /></span>}
                    {r.description}
                  </div>
                  <div className="d-flex align-items-start">
                    <button className="btn btn-sm btn-secondary me-2" onClick={() => setEditing(r)}>Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(r.id)}>Excluir</button>
                  </div>
                </li>
              ))}
              {rooms.length === 0 && <li className="list-group-item">Nenhuma sala cadastrada</li>}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
