// Register.tsx
import React, { useState } from 'react';
import api from '../api/api';
import { useNavigate } from 'react-router-dom';

type Errors = {
  name?: string;
  login?: string;
  password?: string;
  confirm?: string;
};

export default function Register() {
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<{ [K in keyof Errors]?: boolean }>({});

  const navigate = useNavigate();

  const validateAll = (): Errors => {
    const e: Errors = {};
    if (!name.trim()) e.name = 'Nome é obrigatório';
    if (!login.trim()) e.login = 'Login (email/usuário) é obrigatório';
    if (!password) e.password = 'Senha é obrigatória';
    else if (password.length < 6) e.password = 'Senha precisa ter ao menos 6 caracteres';
    if (!confirm) e.confirm = 'Confirme a senha';
    else if (password !== confirm) e.confirm = 'Senhas não conferem';
    return e;
  };

  const validateField = (field: keyof Errors) => {
    const all = validateAll();
    setErrors(prev => ({ ...prev, [field]: all[field] }));
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const doRegister = async () => {
    setMsg(null);
    const e = validateAll();
    setErrors(e);
    setTouched({ name: true, login: true, password: true, confirm: true });

    if (Object.keys(e).length > 0) {
      setMsg('Corrija os erros do formulário');
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.post('/auth/register', { name, login, password });

      if (data?.token) localStorage.setItem('token', data.token);

      setMsg('Cadastro realizado com sucesso!');
      setTimeout(() => navigate('/login'), 900);
    } catch (err: any) {
      console.error(err);
      const backend = err?.response?.data?.message ?? err?.message ?? 'Erro ao cadastrar';
      setMsg(String(backend));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-4 col-md-4 container mt-5">
      <h3>Cadastro</h3>

      {msg && <div className="alert alert-info">{msg}</div>}

      {/* NOME */}
      <div className="mb-2">
        <label className="form-label">
          Nome <span className="text-danger">*</span>
        </label>
        <input
          className={`form-control ${touched.name && errors.name ? 'is-invalid' : ''}`}
          value={name}
          onChange={e => { setName(e.target.value); if (touched.name) validateField('name'); }}
          onBlur={() => validateField('name')}
          placeholder="Seu nome"
        />
        {touched.name && errors.name && <div className="invalid-feedback">{errors.name}</div>}
      </div>

      {/* LOGIN */}
      <div className="mb-2">
        <label className="form-label">
          Login (email ou usuário) <span className="text-danger">*</span>
        </label>
        <input
          className={`form-control ${touched.login && errors.login ? 'is-invalid' : ''}`}
          value={login}
          onChange={e => { setLogin(e.target.value); if (touched.login) validateField('login'); }}
          onBlur={() => validateField('login')}
          placeholder="seu@email.com"
        />
        {touched.login && errors.login && <div className="invalid-feedback">{errors.login}</div>}
      </div>

      {/* SENHA */}
      <div className="mb-2">
        <label className="form-label">
          Senha <span className="text-danger">*</span>
        </label>
        <input
          type="password"
          className={`form-control ${touched.password && errors.password ? 'is-invalid' : ''}`}
          value={password}
          onChange={e => { setPassword(e.target.value); if (touched.password) validateField('password'); }}
          onBlur={() => validateField('password')}
        />
        {touched.password && errors.password && <div className="invalid-feedback">{errors.password}</div>}
      </div>

      {/* CONFIRMAR SENHA */}
      <div className="mb-3">
        <label className="form-label">
          Confirmar senha <span className="text-danger">*</span>
        </label>
        <input
          type="password"
          className={`form-control ${touched.confirm && errors.confirm ? 'is-invalid' : ''}`}
          value={confirm}
          onChange={e => { setConfirm(e.target.value); if (touched.confirm) validateField('confirm'); }}
          onBlur={() => validateField('confirm')}
        />
        {touched.confirm && errors.confirm && <div className="invalid-feedback">{errors.confirm}</div>}
      </div>

      <div className="d-flex">
        <button className="btn btn-primary" onClick={doRegister} disabled={busy}>
          {busy ? 'Aguarde...' : 'Cadastrar'}
        </button>
        <button className="btn btn-link ms-2" onClick={() => navigate('/login')}>Ir para login</button>
      </div>
    </div>
  );
}
