const admin = require("firebase-admin");

const checkEmailVerified = async (uid) => {
  if (!uid) {
    throw new Error("User ID (uid) is required");
  }

  try {
    const userRecord = await admin.auth().getUser(uid);
    return userRecord.emailVerified;
  } catch (error) {
    console.error("Error checking email verification status:", error);
    throw new Error("Error checking email verification status");
  }
};

module.exports = checkEmailVerified;
