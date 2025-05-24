import express from "express";
import {
  login,
  logout,
  signup,
  updateProfile,
  checkAuth,
} from "../controllers/auth.controller.js";
import isAuthenticated from "../middlewares/auth.middleware.js";

// Instantiating the router
const router = express.Router();

//routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

// **** Protected routes ****
// * Protected routes in Express.js are routes that require authentication or authorization
// * before access is granted. They're used to secure certain parts of your application that
// * should only be accessible to authenticated users or users with specific permissions.
router.put("/update-profile", isAuthenticated, updateProfile);
router.get("/check-auth", isAuthenticated, checkAuth);

//exporting the auth router
export default router;
