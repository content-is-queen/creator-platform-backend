const stripe = require("stripe")(process.env.STRIPE_SK);
require("firebase-functions/logger/compat");

const { onRequest, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

const secret = process.env.STRIPE_WHSEC;

exports.stripeEvent = onRequest(async (request, response) => {
  const signature = request.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.rawBody, signature, secret);
    if (event.type === "customer.subscription.deleted") {
      const subscriptionId = event.data.object.id;
      // Find user that has subscription id and remove from their profile

      try {
        const db = admin.firestore();
        const usersRef = db.collection("users");

        const snapshot = await usersRef
          .where("subscriptionId", "==", subscriptionId)
          .get();

        if (snapshot.empty) {
          logger.warn(
            `There is no user with the subscription ID: ${subscriptionId}`,
          );
          return;
        }

        for (const doc of snapshot.docs) {
          await doc.ref.update({ subscriptionId: null, subscribed: false });

          await admin.auth().setCustomUserClaims(doc.id, { subscribed: false });

          logger.info(
            `Removed the the subscription id: ${subscriptionId} from user: ${doc.id}`,
          );
        }
      } catch (error) {
        throw new HttpsError(
          "unknown",
          `Error removing subscription id: ${error}`,
        );
      }
    }

    response.send();
  } catch (error) {
    throw new HttpsError(
      "unknown",
      `Error constructing Stripe event: ${error}`,
    );
  }
});
