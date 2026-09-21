import { useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";
import "./AdminLogin.css";

interface AdminLoginProps {
  onLogin: () => void;
  onClose: () => void;
}

function AdminLogin({ onLogin, onClose }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setEnviando(true);

    const { data, error: authError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (authError || !data.user) {
      setEnviando(false);
      setError("Correo o contraseña incorrectos.");
      return;
    }

    // Comprobamos mediante la función protegida si el usuario es administrador.
    const { data: esAdmin, error: adminError } =
      await supabase.rpc("es_admin");

    if (adminError || !esAdmin) {
      await supabase.auth.signOut();
      setEnviando(false);
      setError("Este usuario no tiene permisos de administrador.");
      return;
    }

    setEnviando(false);
    onLogin();
    onClose();
  };

  return (
    <div className="admin-login__overlay" onClick={onClose}>
      <div
        className="admin-login"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="admin-login__close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>

        <div className="admin-login__header">
          <span className="admin-login__icon">🔐</span>
          <h2>Acceso de administrador</h2>
          <p>Inicia sesión para gestionar los eventos.</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login__form">
          <label className="admin-login__field">
            <span>Correo electrónico</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@geoportal.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="admin-login__field">
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </label>

          {error && (
            <p className="admin-login__error">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="admin-login__submit"
            disabled={enviando}
          >
            {enviando ? "Verificando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;
