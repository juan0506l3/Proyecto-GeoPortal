import { useEffect, useState } from "react";
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
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  // Cerrar con la tecla Escape
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-login-titulo"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-login__header">
          <button
            type="button"
            className="admin-login__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>

          <span className="admin-login__icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
              <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
              <circle cx="12" cy="15.5" r="1.2" fill="currentColor" />
            </svg>
          </span>

          <h2 id="admin-login-titulo">Acceso de administrador</h2>
          <p>Inicia sesión para gestionar los eventos.</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login__form">
          <label className="admin-login__field">
            <span>Correo electrónico</span>

            <div className="admin-login__input-wrap">
              <svg
                className="admin-login__input-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="5" width="18" height="14" rx="2.5" />
                <path d="m3.5 7 8.5 6 8.5-6" />
              </svg>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@geoportal.com"
                autoComplete="email"
                autoFocus
                required
              />
            </div>
          </label>

          <label className="admin-login__field">
            <span>Contraseña</span>

            <div className="admin-login__input-wrap">
              <svg
                className="admin-login__input-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
                <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
              </svg>

              <input
                type={verPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="admin-login__toggle-pass"
                onClick={() => setVerPassword((prev) => !prev)}
                aria-label={
                  verPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                  {verPassword && <path d="M4 4l16 16" />}
                </svg>
              </button>
            </div>
          </label>

          {error && (
            <p className="admin-login__error" role="alert">
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
