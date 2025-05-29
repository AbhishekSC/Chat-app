import { create } from "zustand";
import axiosInstance from "../config/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

// Define Auth types for better type checking
const AuthStatus = {
  IDLE: "idle",
  PENDING: "pending",
  SUCCESS: "success",
  ERROR: "error",
};

// Defining constants
const BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:5001"
    : "https://secretwire-backend.onrender.com";

export const useAuthStore = create((set, get) => ({
  // User data
  authUser: null,
  onlineUsers: [],
  socket: null,

  // Auth status
  authStatus: {
    isSigningUp: AuthStatus.IDLE,
    isLoggingIn: AuthStatus.IDLE,
    isLoggingOut: AuthStatus.IDLE,
    IsUpdatingProfile: AuthStatus.IDLE,
    isCheckingAuth: AuthStatus.IDLE,
  },

  // Setters for auth status
  checkAuth: async () => {
    try {
      // Set the auth status to pending
      set((state) => ({
        authStatus: {
          ...state.authStatus,
          isCheckingAuth: AuthStatus.PENDING,
        },
      }));

      // Make the API call to check authentication
      const response = await axiosInstance.get("/auth/check-auth");

      if (response.status === 200) {
        set((state) => ({
          authUser: response.data,
          authStatus: {
            ...state.authStatus,
            isCheckingAuth: AuthStatus.SUCCESS,
          },
        }));

        //connecting socket
        get().connectSocket();
      }
    } catch (error) {
      console.error("****Error checking auth:", error);
      set((state) => ({
        authStatus: {
          ...state.authStatus,
          isCheckingAuth: AuthStatus.ERROR,
        },
        authUser: null,
      }));
      // toast.error(
      //   error.response?.data?.message ||
      //     "Something went wrong. Please try again."
      // );
    } finally {
      set((state) => ({
        authStatus: {
          ...state.authStatus,
          isCheckingAuth: AuthStatus.IDLE,
        },
      }));
    }
  },

  // signpup
  signpup: async (data) => {
    try {
      // Set the signup status to pending
      set((state) => ({
        authStatus: {
          ...state.authStatus,
          isSigningUp: AuthStatus.PENDING,
        },
      }));

      // Making the API call to sign up
      const response = await axiosInstance.post("/auth/signup", data);

      console.log("****Response from signup:", response.data);
      if (response.status === 201) {
        set((state) => ({
          authUser: response.data,
          authStatus: {
            ...state.authStatus,
            isSigningUp: AuthStatus.SUCCESS,
          },
        }));

        // connecting socket
        get().connectSocket();
      }
      toast.success("Account created successfully.");
    } catch (error) {
      console.error("****Error signing up:", error);
      set((state) => ({
        authStatus: {
          ...state.authStatus,
          isSigningUp: AuthStatus.ERROR,
        },
      }));

      toast.error(
        error.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      set((state) => ({
        authStatus: {
          ...state.authStatus,
          isCheckingAuth: AuthStatus.IDLE,
        },
      }));
    }
  },

  // login
  login: async (data) => {
    try {
      set((state) => ({
        authStatus: {
          ...state.authStatus,
          isLoggingIn: AuthStatus.PENDING,
        },
      }));

      const response = await axiosInstance.post("/auth/login", data);
      console.log(`reponse login: ${response}`);

      if (response.status === 200) {
        set((state) => ({
          authUser: response.data,
          authStatus: {
            ...state.authStatus,
            isLoggingIn: AuthStatus.SUCCESS,
          },
        }));

        // connecting socket IO
        get().connectSocket();
      }
      toast.success("Logged in successfully.");
    } catch (error) {
      console.error("****Error Login:", error);
      set((state) => ({
        authStatus: {
          ...state.authStatus,
          isLoggingIn: AuthStatus.ERROR,
        },
      }));

      toast.error(
        error.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    }
  },

  // Update profile info
  updateProfile: async (data) => {
    try {
      set((state) => ({
        authStatus: {
          ...state.authStatus,
          IsUpdatingProfile: AuthStatus.PENDING,
        },
      }));

      // Making API call
      // Using toast.promise to wrap the API call
      const response = await toast.promise(
        axiosInstance.put("/auth/update-profile", data),
        {
          loading: "Updating profile...",
          success: "Profile updated successfully!",
          error: (err) =>
            `Update failed: ${
              err.response?.data?.message || "Something went wrong."
            }`,
        }
      );

      if (response.status === 200) {
        set((state) => ({
          authUser: response.data,
          authStatus: {
            ...state.authStatus,
            IsUpdatingProfile: AuthStatus.SUCCESS,
          },
        }));
      }
    } catch (error) {
      console.error("****Error updateProfile:", error);
      set((state) => ({
        authStatus: {
          ...state.authStatus,
          IsUpdatingProfile: AuthStatus.ERROR,
        },
      }));

      toast.error(
        error.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      set((state) => ({
        authStatus: {
          ...state.authStatus,
          IsUpdatingProfile: AuthStatus.IDLE,
        },
      }));
    }
  },

  // logout
  logout: async () => {
    try {
      // Set the logout status to pending
      set((state) => ({
        authStatus: {
          ...state.authStatus,
          isLoggingOut: AuthStatus.PENDING,
        },
      }));

      // Making the API call to log out
      const response = await axiosInstance.post("/auth/logout");
      console.log(response);
      // If the logout is successful, clear the authUser state
      set((state) => ({
        authUser: null,
        authStatus: {
          ...state.authStatus,
          isLoggingOut: AuthStatus.SUCCESS,
        },
      }));

      //Discoonect socket
      get().disconnectSocket();

      toast.success("Logged out successfully.");
    } catch (error) {
      console.error("****Error logging out:", error);
      set((state) => ({
        authStatus: {
          ...state.authStatus,
          isLoggingOut: AuthStatus.ERROR,
        },
      }));
      toast.error(
        error.response.message || "Something went wrong. Please try again."
      );
    } finally {
      set((state) => ({
        authStatus: {
          ...state.authStatus,
          isLoggingOut: AuthStatus.IDLE,
        },
      }));
    }
  },

  // Methods- socket
  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) {
      return;
    }
    const socket = io(BASE_URL, {
      query: {
        userId: authUser.user._id,
      },
    });
    socket.connect();

    // Set socket
    set({ socket: socket });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
  },

  disconnectSocket: () => {
    if (get().socket?.connected) {
      get().socket.disconnect();
    }
  },
}));
