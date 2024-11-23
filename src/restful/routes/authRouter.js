const { Router } = require("express");
const { AuthController } = require("../controllers/authController");
const { protect } = require("../../middleware");

const router = Router();

router.get("/user", protect, AuthController.getUser);
router.get("/user/:userId", AuthController.getPublicUser);
router.get("/check-email", AuthController.checkEmailExists);
router.get("/users", AuthController.getAllUsers);
router.get("/subscription", protect, AuthController.checkSubscription);
router.delete("/delete-account", protect, AuthController.deleteAccount);

router.post("/user", protect, AuthController.updateUser);
router.post("/signup", AuthController.signup);
router.post("/verify", AuthController.verifyOtp);
router.post("/forgot", AuthController.forgetPassword);
router.post("/reset", AuthController.resetUserPassword);
router.post("/password", protect, AuthController.changePassword);
router.post("/emailupdate", protect, AuthController.changeEmail);

router.put("/subscription", protect, AuthController.updateUserSubscription);

module.exports.authRouter = router;
