const { Router } = require("express");
const { AdminController } = require("../controllers/adminController");
const { protect } = require("../../middleware/index");
const { default: allowedRole } = require("../../helper/allowedRole");

const router = Router();

router.post(
  "/users",
  protect,
  allowedRole(["admin"]),
  AdminController.adminCreateUser,
);
router.get("/users", AdminController.admingetAllUsers);
router.get(
  "/info",
  protect,
  allowedRole(["admin"]),
  AdminController.adminGetInfo,
);
router.put(
  "/activate/:user_id",
  protect,
  allowedRole(["admin"]),
  AdminController.adminActivateUser,
);
router.put(
  "/deactivate/:user_id",
  protect,
  allowedRole(["admin"]),
  AdminController.adminDeActivateUser,
);
router.delete(
  "/delete/:user_id",
  protect,
  allowedRole(["admin"]),
  AdminController.adminDeleteUser,
);

// New route to update user limits
router.patch(
  "/updateUserLimits/:user_id",
  AdminController.adminUpdateUserLimits,
);
router.get("/opportunities", AdminController.getAllOpportunities);

module.exports.adminRouter = router;
