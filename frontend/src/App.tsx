import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import CreateRoom from './pages/CreateRoom';
import JoinRoom from './pages/JoinRoom';
import GameRoom from './pages/GameRoom';
import GameHistory from './pages/GameHistory';
import Profile from './pages/Profile';
import Loading from './components/Loading';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="auth/callback" element={<AuthCallback />} />

        <Route
          path="dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="create"
          element={
            <PrivateRoute>
              <CreateRoom />
            </PrivateRoute>
          }
        />

        <Route
          path="join"
          element={
            <PrivateRoute>
              <JoinRoom />
            </PrivateRoute>
          }
        />

        <Route
          path="room/:roomId"
          element={
            <PrivateRoute>
              <GameRoom />
            </PrivateRoute>
          }
        />

        <Route
          path="history/:roomId"
          element={
            <PrivateRoute>
              <GameHistory />
            </PrivateRoute>
          }
        />

        <Route
          path="profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
