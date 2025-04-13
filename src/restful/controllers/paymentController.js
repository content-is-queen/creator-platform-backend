// controllers/paymentController.js

const stripe = require("stripe")(process.env.STRIPE_SK); // Make sure to set your Stripe secret key in your environment variables
const admin = require("../../../functions/admin");

/**
 * Create a subscription for a customer.
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 */

const createCheckoutSession = async (req, res) => {
  const origin = req.headers.origin || process.env.DOMAIN;

  const { role } = req.body;

  const product = {
    brand: "price_1QRe4CA0tTttcwfyG3erBU5D",
    creator: "price_1QRe27A0tTttcwfyik9VAcdA",
  };

  try {
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: product[role],
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/thankyou?sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/plus`,
    });

    console.log("Created checkout session:", session.id); // Logging session ID

    res.status(200).json({ id: session.id });
  } catch (error) {
    console.error("Error creating checkout session backend:", error.code);
    res.status(500).json({
      error,
    });
  }
};

const cancelSubscription = async (req, res) => {
  const { userId } = req.body;
  const db = admin.firestore();

  try {
    // Get the user's subscription ID from Firestore
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }
    const { subscriptionId } = userDoc.data();
    if (!subscriptionId) {
      return res.status(400).json({ error: "No subscription found for user" });
    }

    // Cancel the subscription using Stripe API
    const cancellation = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    res
      .status(200)
      .json({ message: "Subscription cancelled successfully", cancellation });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    res.status(500).json({
      error: {
        message: "An error occurred while canceling the subscription.",
      },
    });
  }
};

const subscribeUser = async (req, res) => {
  const { sessionId, userId } = req.body;
  const db = admin.firestore();

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      // Retrieve the subscription ID
      const subscriptionId = session.subscription;

      // Update user to subscribed and store subscription ID
      await db.collection("users").doc(userId).update({
        subscribed: true,
        subscriptionId,
      });

      await admin.auth().setCustomUserClaims(userId, { subscribed: true });

      res.status(200).json({ session, subscriptionId });
    } else {
      res.status(400).json({
        error: {
          message: "Payment not completed.",
        },
      });
    }
  } catch (error) {
    console.error("Error retrieving the session:", error);
    res.status(500).json({
      error: {
        message: "Something went wrong when retrieving the session",
      },
    });
  }
};

const getUserPaymentInfo = async (req, res) => {
  const { user_id } = req.user;
  const db = admin.firestore();

  try {
    const userDoc = await db.collection("users").doc(user_id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }
    const { subscriptionId, subscribed } = userDoc.data();

    res.status(200).json({ subscriptionId, subscribed });
  } catch (error) {
    console.error("Error getting user payment info:", error);
    res.status(500).json({
      error: {
        message: "An error occurred while getting user payment info.",
      },
    });
  }
};

const getSubscriptionInfo = async (req, res) => {
  const { subscription_id } = req.query;

  if (!subscription_id) {
    console.error("Subscription ID is required");
    return res.status(400).json({ error: "Subscription ID is required" });
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscription_id);
    console.log("Retrieved subscription info:", subscription);
    res.status(200).json({ subscription });
  } catch (error) {
    console.error("Error retrieving subscription info:", error);
    res.status(500).json({
      error: {
        message: "An error occurred while retrieving subscription info.",
        details: error.message,
      },
    });
  }
};

module.exports = {
  createCheckoutSession,
  subscribeUser,
  cancelSubscription,
  getSubscriptionInfo,
  getUserPaymentInfo,
};
