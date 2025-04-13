const admin = require("../../functions/admin");
const { Util } = require("./utils");

const util = new Util();

const checkSubscribedUser = () => {
  return async (req, res, next) => {
    const db = admin.firestore();
    const userRole = req.user.role;
    const limitsRef = db.collection("settings").doc("limits");
    if (userRole === "admin" || userRole === "super_admin") {
      return next();
    } else if (req.user.subscribed) {
      return next();
    } else if (userRole === "brand") {
      const numberOfOpportunitiesAllowedSnapshot = await limitsRef.get();
      const { numberOfOpportunitiesAllowed } =
        numberOfOpportunitiesAllowedSnapshot.data();
      const { opportunitiesPostedCount } = req.body;
      if (opportunitiesPostedCount > numberOfOpportunitiesAllowed) {
        util.statusCode = 403;
        util.message =
          "The credit limit for unsubscribed accounts has been reached";
        return util.send(res);
      } else {
        return next();
      }
    } else if (userRole === "creator") {
      const numberOfApplicationsAllowedSnapshot = await limitsRef.get();
      const { numberOfApplicationsAllowed } =
        numberOfApplicationsAllowedSnapshot.data();
      const { opportunitiesAppliedCount } = req.body;
      if (opportunitiesAppliedCount > numberOfApplicationsAllowed) {
        util.statusCode = 403;
        util.message =
          "The credit limit for unsubscribed accounts has been reached";
        return util.send(res);
      } else {
        return next();
      }
    } else {
      util.statusCode = 400;
      util.message =
        "You have used up your free credits this month. Upgrade to plus to post unlimited opportunities";
      return util.send(res);
    }
  };
};
module.exports = checkSubscribedUser;
