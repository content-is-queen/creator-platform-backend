const dotenv = require("dotenv");
dotenv.config();

const admin = require("./admin");
const stripe = require("stripe")(process.env.STRIPE_SK);
const generator = require("generate-password");
const functions = require("firebase-functions");
const logger = require("firebase-functions/logger");
const AccountCreated = require("./AccountCreatedHTML");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

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
          });
        }

        if (userRole === "creator") {
          batch.update(userRef, {
            opportunitiesAppliedCount: 0,
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

exports.resetUsersLimit = functions.pubsub
  .schedule("0 0 1 * *")
  .onRun(async () => {
    await resetAllUsersLimit();
  });

exports.stripeEvent = functions.https.onRequest(async (request, response) => {
  const signature = request.headers["stripe-signature"];
  let event;
  const rawBody = request.rawBody;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);

    logger.log(`${event.type} stripe event has been triggered`);

    if (event.type === "customer.subscription.deleted") {
      const subscriptionId = event.data.object.id;
      const db = admin.firestore();
      const usersRef = db.collection("users");

      const snapshot = await usersRef
        .where("subscriptionId", "==", subscriptionId)
        .get();

      if (snapshot.empty) {
        logger.warn(`No user found with subscription ID: ${subscriptionId}`);
        return response.status(404);
      }

      for (const doc of snapshot.docs) {
        await doc.ref.update({ subscriptionId: null, subscribed: false });
        await admin.auth().setCustomUserClaims(doc.id, { subscribed: false });
      }

      logger.log(
        `Removed subscription ID: ${subscriptionId} from ${snapshot.size} user(s).`,
      );
    }

    if (event.type === "invoice.payment_succeeded") {
      const productRoleMap = {
        [process.env.STRIPE_P_BRAND]: "brand",
        [process.env.STRIPE_P_CREATOR]: "creator",
      };

      const invoice = event.data.object;
      const { customer_email: email } = invoice;
      const customerId = invoice.customer;

      const { name } = await stripe.customers.retrieve(customerId);

      const lineItems = await stripe.invoices.listLineItems(invoice.id);
      const [firstName, lastName] = name.split(" ");

      // Check if this email has an account in firestore
      const db = admin.firestore();

      const usersRef = db.collection("users");
      const snapshot = await usersRef.where("email", "==", email).get();

      // Determine role from price id
      const matchedItem = lineItems.data.find(
        (i) => productRoleMap[i.pricing.price_details.price],
      );
      const role = matchedItem
        ? productRoleMap[matchedItem.pricing.price_details.price]
        : null;

      if (!role) {
        throw new Error(`No matching role found for ${matchedItem}`);
      }

      if (snapshot.empty) {
        logger.log("Creating new user");

        const password = generator.generate({
          length: 10,
          numbers: true,
        });

        const user = await admin.auth().createUser({ email, password });

        try {
          await Promise.all([
            admin
              .auth()
              .setCustomUserClaims(user.uid, { role, subscribed: true }),
            usersRef.doc(user.uid).set({
              uid: user.uid,
              firstName,
              lastName: lastName || " ",
              role,
              email,
              disabled: false,
              subscribed: true,
              subscriptionId: invoice.subscription,
            }),
          ]);
        } catch (error) {
          await admin.auth().deleteUser(user.uid);
          throw new Error(`Failed to complete user setup: ${error.message}`);
        }

        const mailOptions = {
          from: process.env.EMAIL,
          to: email,
          subject: `${role} Account created`,
          html: AccountCreated({ email, password }),
        };

        try {
          await transporter.sendMail(mailOptions);
          logger.log(`Account details successfully sent to ${email}`);
        } catch (error) {
          logger.error(`Mailing error: ${error}`);
        }

        logger.log(
          `Successfully created an account for user ${email} on a ${role}+ plan`,
        );
      } else {
        for (const doc of snapshot.docs) {
          const uid = doc.id;
          const userData = doc.data();

          if (userData.role !== role) {
            logger.error(
              `${uid} can not upgraded user with the role ${userData.role} to ${role}`,
            );
            throw new Error(`${uid} can not be upgrade to ${role}`);
          }

          logger.log(`Upgrading user ${uid}`);

          const updateUserDoc = async () => {
            await usersRef.doc(uid).update({
              subscriptionId: invoice.subscription,
              subscribed: true,
            });
          };

          const updateCustomUserClaims = async () => {
            await admin.auth().setCustomUserClaims(uid, { subscribed: true });
          };

          await Promise.all([updateUserDoc(), updateCustomUserClaims()]);

          logger.log(`Successfully upgraded user ${uid} to ${role}+ plan`);
        }
      }
    }

    return response.status(200);
  } catch (error) {
    logger.error(error);
    return response.status(400);
  }
});
