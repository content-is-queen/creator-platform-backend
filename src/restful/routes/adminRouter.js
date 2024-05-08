const { Router } = require("express");
const { AdminController } = require("../controllers/adminController");
const { protect } = require("../../middleware/index");
const { default: allowedRole } = require("../../helper/allowedRole");


const router = Router();


router.post("/users",protect,allowedRole(["admin"]), AdminController.adminCreateUser);
router.get("/users",protect,allowedRole(["admin"]),  AdminController.admingetAllUsers);
router.put("/activate/:user_id",protect,allowedRole(["admin"]),  AdminController.adminActivateUser);
router.put("/deactivate/:user_id",protect,allowedRole(["admin"]),  AdminController.adminDeActivateUser);

module.exports.adminRouter = router;
