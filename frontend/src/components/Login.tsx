import { useState } from "react";
import {
  GoogleLogin,
  GoogleOAuthProvider,
} from "@react-oauth/google";

type LoginProps = {
  onLogin: (email: string, password: string) => Promise<void>;
  onGoogleLogin: (credential: string) => Promise<void>;
  onSwitchToRegister: () => void;
};

function LoginForm({
  onLogin,
  onGoogleLogin,
  onSwitchToRegister,
}: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(credential: string) {
    setError("");
    setLoading(true);

    try {
      await onGoogleLogin(credential);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Google login failed"
      );
    } finally {
      setLoading(false);
    }
  }

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <div className="auth-container">
      <h2>Welcome back!</h2>
      <p>Login to your FreshFilter account.</p>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <div style={{ textAlign: "center", margin: "20px 0" }}>
        <p>Or continue with</p>

        {clientId ? (
          <GoogleLogin
            onSuccess={(response) => {
              if (response.credential) {
                void handleGoogleSuccess(response.credential);
              } else {
                setError("Google did not return a login credential.");
              }
            }}
            onError={() => {
              setError("Google login was unsuccessful. Please try again.");
            }}
            useOneTap={false}
          />
        ) : (
          <p className="auth-error">
            Google Login is not configured. Check your frontend .env file.
          </p>
        )}
      </div>

      <p>
        Don't have an account?{" "}
        <button type="button" onClick={onSwitchToRegister}>
          Register
        </button>
      </p>
    </div>
  );
}

export default function Login(props: LoginProps) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return <LoginForm {...props} />;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <LoginForm {...props} />
    </GoogleOAuthProvider>
  );
}