import cron from "node-cron";
import { AdminController } from "../restful/controllers/adminController";
import { OpportunitiesController } from "../restful/controllers/opportunitiesController";

export const cronJob = () => {
  cron.schedule("0 0 1 * *", () => {
    AdminController.resetAllUsersLimit();
  });

  cron.schedule("0 0 * * *", () => {
    OpportunitiesController.deleteExpiredOpportunities();
  });
};
