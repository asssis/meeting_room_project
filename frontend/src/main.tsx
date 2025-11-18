import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Rooms from './pages/Rooms';
import Login from './pages/Login';
import Reservation from './pages/Reservation';
import Register from './pages/Register';

/**
 * Pequeno utilitário para centralizar checagem de autenticação.
 * Ajuste a chave ('userId') se você armazenar um token diferente.
 */
function isUserLogged() {
  try {
    return Boolean(localStorage.getItem('userId') || localStorage.getItem('token'));
  } catch (error) {
    false;
  }
}

function NavBar() {
  const [logged, setLogged] = useState<boolean>(isUserLogged());
  const navigate = useNavigate();

  useEffect(() => {
    const update = () => setLogged(isUserLogged());

    const onAuthChanged = () => update();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === 'userId' || e.key === 'token') update();
    };

    window.addEventListener('authChanged', onAuthChanged);
    window.addEventListener('storage', onStorage);

    // estado inicial
    update();

    return () => {
      window.removeEventListener('authChanged', onAuthChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const logout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('token');
    // notifica a mesma aba
    window.dispatchEvent(new Event('authChanged'));
    setLogged(false);
    navigate('/');
  };

  return (
    <nav className="navbar navbar-dark bg-dark navbar-expand-lg px-3">
      <Link className="navbar-brand" to="/">MeetingRooms</Link>

      <div className="collapse navbar-collapse">
        <ul className="navbar-nav">
          {logged && (
            <li className="nav-item">
              <Link className="nav-link" to="/room">Salas</Link>
            </li>
          )}
          <li className="nav-item">
            <Link className="nav-link" to="/">Reservation</Link>
          </li>
        </ul>

        <ul className="navbar-nav ms-auto">
          {!logged && (
            <>
              <li className="nav-item">
                <Link className="nav-link" to="/login">Login</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/register">Register</Link>
              </li>
            </>
          )}

          {logged && (
            <li className="nav-item">
              <button className="nav-link btn btn-link p-0" onClick={logout}>
                Logout
              </button>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <NavBar />

      <div className="container py-4">
        <Routes>
          <Route path="/" element={<Reservation />} />
          <Route path="/reservation" element={<Reservation />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/room" element={<Rooms />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
