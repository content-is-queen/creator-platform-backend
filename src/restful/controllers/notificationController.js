/* eslint-disable no-prototype-builtins */
const dotenv = require("dotenv");
const { Util } = require("../../helper/utils");
/* eslint-disable quotes */
const admin = require(".././admin");

dotenv.config();
/**
 * @class AuthController
 * @classdesc AuthController
 */

const util = new Util();

class NotificationsController {
  /**
   * @param {Object} req request Object.
   * @param {Object} res response Object.
   * @returns {Object} response Object.
   */

  static async sendNotification(req, res) {
    const { body, userId } = req.body;
    try {
      const notificationData = {
        body,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };

      await admin
        .firestore()
        .collection("users")
        .doc(userId)
        .collection("notifications")
        .add(notificationData);
      util.statusCode = 200;
      util.message = "Notification sent successfully";
      return util.send(res);
    } catch (error) {
      console.log(error);
      util.statusCode = 500;
      util.message = error.message || "Failed to send verification email";
      return util.send(res);
    }
  }

  static async getAllNotifications(req, res) {
    const { user_id } = req.user;
    const notificationsRef = admin
      .firestore()
      .collection("users")
      .doc(user_id)
      .collection("notifications");

    try {
      // Attempt to fetch from cache first
      const cacheSnapshot = await notificationsRef
        .orderBy("timestamp", "desc")
        .get({ source: "cache" });
      let notifications = cacheSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (notifications.length > 0) {
        // Cache exists, check if it's up-to-date
        const serverSnapshot = await notificationsRef
          .orderBy("timestamp", "desc")
          .limit(1)
          .get();
        if (!serverSnapshot.empty) {
          const latestServerNotification = serverSnapshot.docs[0];
          const latestServerTimestamp =
            latestServerNotification.updateTime ||
            latestServerNotification.createTime;
          const latestCacheTimestamp =
            cacheSnapshot.docs[0].updateTime ||
            cacheSnapshot.docs[0].createTime;

          if (latestServerTimestamp.isEqual(latestCacheTimestamp)) {
            util.setSuccess(
              200,
              "Notifications retrieved successfully",
              notifications,
            );
            return util.send(res);
          }
        }
      }

      const freshSnapshot = await notificationsRef
        .orderBy("timestamp", "desc")
        .get();
      notifications = freshSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      util.setSuccess(
        200,
        "Notifications retrieved successfully",
        notifications,
      );
      return util.send(res);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      util.statusCode = 500;
      util.message = error.message || "Failed to retrieve notifications";
      return util.send(res);
    }
  }

  static async clearAllNotifications(req, res) {
    const { user_id } = req.user;

    try {
      const snapshot = await admin
        .firestore()
        .collection("users")
        .doc(user_id)
        .collection("notifications")
        .get();

      const batch = admin.firestore().batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));

      await batch.commit();

      util.statusCode = 200;
      util.message = "All notifications cleared successfully";
      return util.send(res);
    } catch (error) {
      util.statusCode = 500;
      util.message = error.message || "Failed to clear notifications";
      return util.send(res);
    }
  }
}

exports.NotificationsController = NotificationsController;
