const dotenv = require("dotenv");
dotenv.config();

const admin = require("./admin");
const stripe = require("stripe")(process.env.STRIPE_SK);

const functions = require("firebase-functions"); // Ensure this is using GCFv1
const logger = require("firebase-functions/logger");

const secret = process.env.STRIPE_WHSEC;

const resetAllUsersLimit = async () => {
  try {
    const db = admin.firestore();
    const usersCollection = db.collection("users");

    const querySnapshot = await usersCollection.get();

    if (!querySnapshot.empty) {
      const batch = db.batch();

      querySnapshot.forEach((doc) => {
        const userObj = doc.data();
        const userRole = userObj.role;
        const userRef = usersCollection.doc(doc.id);

        if (userRole === "brand") {
          batch.update(userRef, {
            opportunitiesPostedCount: 0,
            // ...(userObj.hasOwnProperty("opportunitiesAppliedCount")
            //   ? {
            //       opportunitiesAppliedCount:
            //         admin.firestore.FieldValue.delete(),
            //     }
            //   : {}),
          });
        }

        if (userRole === "creator") {
          batch.update(userRef, {
            opportunitiesAppliedCount: 0,
            // ...(userObj.hasOwnProperty("opportunitiesPostedCount")
            //   ? {
            //       opportunitiesPostedCount:
            //         admin.firestore.FieldValue.delete(),
            //     }
            //   : {}),
          });
        }
      });

      const result = await batch.commit();
      console.log("All user limits have been reset.");

      return result;
    }
  } catch (error) {
    console.error("Error resetting user limits:", error);
  }
};

const deleteExpiredOpportunities = async () => {
  const db = admin.firestore();
  const now = new Date().toISOString().split("T")[0];

  try {
    const snapshot = await db
      .collection("opportunities")
      .where("deadline", "<=", now)
      .where("status", "not-in", ["archived", "closed"])
      .get();

    const batch = db.batch();

    snapshot.forEach((doc) => {
      const ref = doc.ref;
      batch.update(ref, { status: "closed" });
    });

    await batch.commit();
    logger.log(`Archived ${snapshot.size} expired opportunities.`);
  } catch (error) {
    logger.error("unknown", "Error deleting expired opportunities:", error);
    throw error;
  }
};

exports.resetUsersLimit = functions.pubsub
  .schedule("0 0 1 * *")
  .onRun(async () => {
    try {
      await resetAllUsersLimit;
      logger.log("User limits reset successfully.");
    } catch (error) {
      logger.error(
        "unknown",
        `There was a problem resetting user limits: ${error}`,
      );
    }
  });

exports.closeExpiredOpportunities = functions.pubsub
  .schedule("0 0 * * *")
  .onRun(async () => {
    await deleteExpiredOpportunities();
  });

exports.stripeEvent = functions.https.onRequest(async (request, response) => {
  const signature = request.headers["stripe-signature"];
  let event;

  const rawBody = request.rawBody;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);

    if (event.type === "customer.subscription.deleted") {
      const subscriptionId = event.data.object.id;
      const db = admin.firestore();
      const usersRef = db.collection("users");

      const snapshot = await usersRef
        .where("subscriptionId", "==", subscriptionId)
        .get();

      if (snapshot.empty) {
        logger.warn(`No user found with subscription ID: ${subscriptionId}`);
        return response.status(200).send("No matching user found.");
      }

      for (const doc of snapshot.docs) {
        await doc.ref.update({ subscriptionId: null, subscribed: false });
        await admin.auth().setCustomUserClaims(doc.id, { subscribed: false });
      }

      return response
        .status(200)
        .send(
          `Removed subscription ID: ${subscriptionId} from ${snapshot.size} user(s).`,
        );
    }

    return response.status(200).send("Unhandled event type");
  } catch (error) {
    logger.error("Error constructing Stripe event:", error);
    return response.status(400).send(`Webhook error: ${error.message}`);
  }
});
