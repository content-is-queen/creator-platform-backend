const { Router } = require("express");
const {
  OpportunitiesController,
} = require("../controllers/opportunitiesController");
const { protect } = require("../../middleware");
const checkSubscribedUser = require("../../helper/checkSubscribedUser");

const router = Router();

router.get("/", OpportunitiesController.getAllOpportunities);
router.get("/id/:userId", OpportunitiesController.getAllOpportunitiesByUserId);
router.get("/status/:status", OpportunitiesController.getOpportunitiesByStatus);
router.delete(
  "/opportunityid/:opportunityId",
  OpportunitiesController.deleteOpportunityById,
);
router.get(
  "/opportunityid/:opportunityId",
  OpportunitiesController.getOpportunityById,
);

// POST endpoint for creating opportunities
router.post("/", protect, checkSubscribedUser, async (req, res) => {
  const { type } = req.body;
  if (!type || !["job", "pitch", "campaign"].includes(type)) {
    return res
      .status(400)
      .json({ message: "Invalid or missing opportunity type" });
  }

  try {
    switch (type) {
      case "job":
        return OpportunitiesController.createJobOpportunity(req, res);
      case "pitch":
        return OpportunitiesController.createPitchOpportunity(req, res);
      case "campaign":
        return OpportunitiesController.createCampaignOpportunity(req, res);
      default:
        return res.status(400).json({ message: "Invalid opportunity type" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

// UPDATE endpoint
router.put(
  "/opportunityid/:opportunityId",
  OpportunitiesController.updateOpportunityById,
); // New route for update

module.exports.opportunitiesRouter = router;
