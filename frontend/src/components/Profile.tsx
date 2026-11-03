type ProfileProps = {
  user: {
    id: number;
    name: string;
    email: string;
  };
  onLogout: () => void;
};

export default function Profile({ user, onLogout }: ProfileProps) {
  return (
    <div className="auth-container">
      <h2>My FreshFilter Account</h2>
      <p>Welcome, {user.name}!</p>

      <div className="profile-details">
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Account ID:</strong> {user.id}</p>
      </div>

      <button type="button" onClick={onLogout}>
        Logout
      </button>
    </div>
  );
}