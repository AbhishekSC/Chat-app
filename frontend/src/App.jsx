import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import SignupPage from "./pages/SignupPage";

import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./store/UseAuthStore";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";

import { Loader } from "lucide-react";

const App = () => {
  const { authUser, checkAuth, authStatus, onlineUsers } = useAuthStore();

  console.log(`Online Users- ${onlineUsers}`);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  console.log(`****authUser: `, authUser);

  // Check if the user is authenticated
  if (authStatus.isCheckingAuth === "pending" && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <Navbar />

      <Routes>
        <Route
          path="/"
          element={authUser ? <HomePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/signup"
          element={!authUser ? <SignupPage /> : <Navigate to="/" />}
        />
        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to="/" />}
        />
        <Route
          path="/settings"
          element={authUser ? <SettingsPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile"
          element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
        />
      </Routes>

      {/* Toast notification */}
      <Toaster />
    </div>
  );
};

export default App;
