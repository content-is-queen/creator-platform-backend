const { Router } = require("express");
const {
  ApplicationsController,
} = require("../controllers/applicationsController");
const { protect } = require("../../middleware");
const checkSubscribedUser = require("../../helper/checkSubscribedUser");
const allowedRole = require("../../helper/allowedRole");

const router = Router();

// GET all applications
router.get("/", protect, ApplicationsController.getAllApplications);

// GET applications by opportunity ID
router.get(
  "/opportunity/:opportunityId",
  protect,
  allowedRole(["admin", "super_admin", "brand"]),
  ApplicationsController.getAllApplicationsById,
);

// GET applications by user ID
router.get(
  "/user/:userId",
  protect,
  ApplicationsController.getApplicationsByUserId,
);

// GET application by ID
router.get(
  "/:applicationId",
  protect,
  allowedRole(["admin", "super_admin", "brand"]),
  ApplicationsController.getApplicationById,
);

// POST a new application
router.post(
  "/",
  protect,
  checkSubscribedUser(),
  ApplicationsController.createApplication,
);

// PATCH update an existing application
router.patch(
  "/:applicationId",
  protect,
  ApplicationsController.updateApplication,
);

// DELETE an application
router.delete(
  "/:applicationId",
  protect,
  ApplicationsController.deleteApplication,
);

module.exports.applicationsRouter = router;
