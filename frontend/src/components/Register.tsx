import { useState } from "react";

type RegisterProps = {
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  onSwitchToLogin: () => void;
};

export default function Register({
  onRegister,
  onSwitchToLogin,
}: RegisterProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await onRegister(name, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <h2>Create your FreshFilter account</h2>
      <p>Start making smarter grocery choices.</p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          required
        />

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password (minimum 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p>
        Already have an account?{" "}
        <button type="button" onClick={onSwitchToLogin}>
          Login
        </button>
      </p>
    </div>
  );
}