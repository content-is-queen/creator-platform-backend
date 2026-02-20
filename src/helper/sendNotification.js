const admin = require("./admin");

async function sendNotification({ body, userId }) {
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

    return {
      statusCode: 200,
      message: "Notification sent successfully",
    };
  } catch (error) {
    return {
      statusCode: 500,
      message: error.message || "Failed to send notification",
    };
  }
}

module.exports = sendNotification;
