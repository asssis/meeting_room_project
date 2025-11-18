// Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

export default function Login(){
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const doLogin = async () => {
    setMsg('');

    // validação simples antes de chamar API
    if (!login.trim() || !password.trim()) {
      setMsg('Preencha login e senha');
      return;
    }

    try {
      const { data } = await api.post('/auth/login', { login, password });

      if (data?.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.userId);
        window.dispatchEvent(new Event('authChanged'));
      
        setMsg('Login realizado!');
        navigate('/reservation');
      }
    } catch (err) {
      console.error(err);
      setMsg('Erro ao logar');
    }
  };

  const goToRegister = () => {
    navigate('/register');
  };

  return (
    <div className="card p-4 col-md-4 container mt-5">
      <h3>Login</h3>

      <input
        className="form-control mb-2"
        placeholder="Login"
        value={login}
        onChange={e => setLogin(e.target.value)}
      />

      <input
        type="password"
        className="form-control mb-3"
        placeholder="Senha"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />

      <div className="d-flex gap-2">
        <button className="btn btn-primary w-50" onClick={doLogin}>Entrar</button>
        <button className="btn btn-secondary w-50" onClick={goToRegister}>Cadastrar</button>
      </div>

      <p className="mt-2">{msg}</p>
    </div>
  );
}
