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

  const { email, role } = req.user;

  const product = {
    brand: process.env.STRIPE_P_BRAND,
    creator: process.env.STRIPE_P_CREATOR,
  };

  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      line_items: [
        {
          price: product[role],
          quantity: 1,
        },
      ],
      customer_email: email,
      mode: "subscription",
      return_url: `${origin}/return?sessionId={CHECKOUT_SESSION_ID}`,
      automatic_tax: { enabled: true },
    });

    console.log("Created checkout session:", session.id);

    res.status(200).json({ clientSecret: session.client_secret });
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

      console.log(`${userId} subscribed successfully`);
      res.status(200).json({ status: session.status, subscriptionId });
    } else {
      console.log(`Problem subscribing ${userId}`);
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
    const { subscriptionId } = userDoc.data();

    if (!subscriptionId) {
      res
        .status(404)
        .json({ error: { message: "Subscription id couldn't be found." } });
    }

    res.status(200).json({ subscriptionId });
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
