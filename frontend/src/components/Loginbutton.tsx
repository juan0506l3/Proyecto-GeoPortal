import "./LoginButton.css";

interface LoginButtonProps {
  onClick: () => void;
}

function LoginButton({ onClick }: LoginButtonProps) {
  return (
    <button type="button" className="login-button" onClick={onClick}>
      <svg
        className="login-button__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
        <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
        <circle cx="12" cy="15.5" r="1.2" fill="currentColor" />
      </svg>

      <span>Iniciar sesión</span>
    </button>
  );
}

export default LoginButton;
