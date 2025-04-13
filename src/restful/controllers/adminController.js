/* eslint-disable no-prototype-builtins */
const dotenv = require("dotenv");
const admin = require("../../../functions/admin");
const { Util } = require("../../helper/utils");
const Joi = require("joi");
/* eslint-disable quotes */

dotenv.config();
/**
 * @class AuthController
 * @classdesc AuthController
 */

const util = new Util();

class AdminController {
  /**
   * @param {Object} req request Object.
   * @param {Object} res response Object.
   * @returns {Object} response Object.
   */

  static async adminCreateUser(req, res) {
    const { firstName, lastName, email, role, password } = req.body;
    let uid = null;
    const db = admin.firestore();
    try {
      const user = await admin.auth().createUser({
        email,
        password,
      });

      uid = user.uid;
      await admin
        .auth()
        .setCustomUserClaims(uid, { role, emailVerified: true });
      const usersCollectionRef = db.collection("users");

      const userData = {
        uid: user.uid,
        email,
        firstName,
        lastName,
        role,
        ...((role === "creator" || role === "brand") && { subscribed: false }), // Add subscription field for admin or creators
        disabled: false,
      };
      if (role === "admin" || role === "super_admin") {
        userData.organization = db.doc("settings/organization");
      }

      await usersCollectionRef.doc(user.uid).set(userData);

      util.statusCode = 200;
      util.setSuccess(200, "User created successfully!");
      return util.send(res);
    } catch (error) {
      if (uid) {
        const userRecord = await admin.auth().getUser(uid);
        await admin.auth().deleteUser(userRecord);
      }
      const errorMessage = error?.errorInfo?.message;
      util.statusCode = 500;
      util.message = errorMessage || error.message || "Server error";
      return util.send(res);
    }
  }

  static async adminActivateUser(req, res) {
    const { userId } = req.params;
    try {
      const db = admin.firestore();
      await admin.auth().updateUser(userId, { disabled: false });
      const usersCollectionRef = db.collection("users");
      await usersCollectionRef
        .doc(userId)
        .set({ disabled: false }, { merge: true });
      util.statusCode = 200;
      util.setSuccess(200, "User activated successfully!");
      return util.send(res);
    } catch (error) {
      console.log(error.message);
      util.statusCode = 500;
      util.message = error.message || "Server error";
      return util.send(res);
    }
  }

  static async adminDeActivateUser(req, res) {
    const { userId } = req.params;
    try {
      const db = admin.firestore();
      await admin.auth().updateUser(userId, { disabled: true });
      const usersCollectionRef = db.collection("users");
      await usersCollectionRef
        .doc(userId)
        .set({ disabled: true }, { merge: true });
      util.statusCode = 200;
      util.setSuccess(200, "User deactivated successfully!");
      return util.send(res);
    } catch (error) {
      console.log(error.message);
      util.statusCode = 500;
      util.message = error.message || "Server error";
      return util.send(res);
    }
  }

  static async admingetAllUsers(req, res) {
    try {
      const db = admin.firestore();
      const usersCollection = db.collection("users");

      const querySnapshot = await usersCollection.get();

      const users = [];

      if (!querySnapshot.empty) {
        querySnapshot.forEach((doc) => {
          const userObj = doc.data();
          // Only push objects with a uid field
          if (Object.hasOwn(userObj, "uid")) {
            users.push(userObj);
          }
        });
      }

      return res.status(200).json(users);
    } catch (error) {
      console.log(error.message);
      util.statusCode = 500;
      util.message = error.message || "Server error";
      return util.send(res);
    }
  }

  static async adminDeleteUser(req, res) {
    const { userId } = req.params;
    try {
      const db = admin.firestore();
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();
      const { role } = userData;
      if (role === "super_admin") {
        util.statusCode = 403;
        util.setSuccess(403, "Super admin cannot be deleted");
        return util.send(res);
      }

      if (role === "admin" && req.user.role === "admin") {
        util.statusCode = 403;
        util.setSuccess(403, "Only a super admin can delete an admin");
        return util.send(res);
      }
      const bucket = admin.storage().bucket();

      const profilePhoto = userData?.profilePhoto || null;

      const removeDocument = await db.collection("users").doc(userId).delete();

      const removeAuth = await admin.auth().deleteUser(userId);

      const tasks = [removeDocument, removeAuth];

      if (profilePhoto) {
        let file = userData.profilePhoto?.split("%2F").pop();

        file = file?.substring(0, file.lastIndexOf("?"));

        const fileRef = bucket?.file(`profilePhotos/${file}`);

        const removeProfilePhoto = await fileRef.delete();
        tasks.unshift(removeProfilePhoto);
      }

      await Promise.all(tasks);

      util.statusCode = 200;
      util.setSuccess(200, "User deleted successfully!");
      return util.send(res);
    } catch (error) {
      console.log(error.message || "Server error");
      util.statusCode = 500;
      util.message = "There was an error deleting the user";
      return util.send(res);
    }
  }

  static async adminUpdateUserLimits(req, res) {
    const { userId } = req.params;
    const { maxOpportunities, maxOpportunitiesApplied } = req.body;

    const db = admin.firestore();

    try {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        util.statusCode = 404;
        util.message = "User not found";
        return util.send(res);
      }

      const updateData = {};

      if (maxOpportunities !== undefined) {
        updateData.maxOpportunities = maxOpportunities;
      }
      if (maxOpportunitiesApplied !== undefined) {
        updateData.maxOpportunitiesApplied = maxOpportunitiesApplied;
      }

      await userRef.update(updateData);

      util.statusCode = 200;
      util.setSuccess(200, "User limits updated successfully!");
      return util.send(res);
    } catch (error) {
      console.log(error.message);
      util.statusCode = 500;
      util.message = error.message || "Server error";
      return util.send(res);
    }
  }

  static async adminGetInfo(req, res) {
    try {
      const db = admin.firestore();
      const usersQuery = await db.collection("users").get();
      const subscribedUsersQuery = await db
        .collection("users")
        .where("subscribed", "==", true)
        .get();
      const opportunitiesQuery = await db.collection("opportunities").get();
      const completedOpportunitiesQuery = await db
        .collection("opportunities")
        .where("status", "==", "completed")
        .get();
      const infoData = [
        { title: "Users", children: `${usersQuery.size}` },
        { title: "Subscribed Users", children: `${subscribedUsersQuery.size}` },
        { title: "Opportunities", children: `${opportunitiesQuery.size}` },
        {
          title: "Completed Opportunities",
          children: `${completedOpportunitiesQuery.size}`,
        },
      ];

      util.setSuccess(200, "Admin data retirved successfully!", infoData);
      return util.send(res);
    } catch (error) {
      util.statusCode = 500;
      util.message = error.mesage || "Server error";
      return util.send(res);
    }
  }

  static async getAllOpportunities(req, res) {
    const db = admin.firestore();

    try {
      const applicationsSnapshot = await db
        .collectionGroup("applications")
        .get();
      const opportunityApplicationsCount = {};

      // Count the number of applications for each opportunity
      applicationsSnapshot.forEach((doc) => {
        const applicationData = doc.data();
        const opportunityId = applicationData.opportunityId;
        if (opportunityApplicationsCount[opportunityId]) {
          opportunityApplicationsCount[opportunityId]++;
        } else {
          opportunityApplicationsCount[opportunityId] = 1;
        }
      });

      // Fetch opportunities separately
      const opportunitiesSnapshot = await db
        .collection("opportunities")
        .where("status", "!=", "archived")
        .get();

      // Fetch user data for each opportunity asynchronously
      const opportunitiesDataPromises = opportunitiesSnapshot.docs.map(
        async (doc) => {
          const opportunityData = doc.data();
          const userId = opportunityData.userId;
          const userRef = db.collection("users").doc(userId);
          const userDoc = await userRef.get();
          const userData = userDoc.data();
          const opportunityId = doc.id;
          const applicationsSnapshot = await db
            .collection("applications")
            .where("opportunityId", "==", opportunityId)
            .get();

          const applications = applicationsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          return {
            ...opportunityData,
            applications,
            fullName: userData?.firstName + " " + userData?.lastName,
          };
        },
      );

      // Wait for all promises to resolve
      const opportunitiesData1 = await Promise.all(opportunitiesDataPromises);

      if (opportunitiesData1.length > 0) {
        util.statusCode = 200;
        util.message = opportunitiesData1;
        return util.send(res);
      } else {
        util.statusCode = 404;
        util.message = "Not found";
        return util.send(res);
      }
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      util.statusCode = 500;
      util.message = error.message || "Server error";
      return util.send(res);
    }
  }

  static async getCompanyInfo(req, res) {
    try {
      const db = admin.firestore();
      const ciQRef = db.collection("settings").doc("organization");
      const userDoc = await ciQRef.get();
      util.setSuccess(200, userDoc.data());
      return util.send(res);
    } catch (error) {
      util.statusCode = 500;
      util.message = error.message || "Error fetching companiy's data";
      return util.send(res);
    }
  }

  static async updateCompanyInfo(req, res) {
    const schema = Joi.object({
      organizationName: Joi.string().allow(""),
      organizationBio: Joi.string().allow(""),
      organizationLogo: Joi.string().uri().allow(""),
    });

    try {
      await schema.validateAsync(req.body);

      const db = admin.firestore();
      const ciQRef = db.collection("settings").doc("organization");

      await ciQRef.set(req.body, { merge: true });
      util.setSuccess(200, "Organization info updated successfully!", req.body);
      return util.send(res);
    } catch (error) {
      util.statusCode = 500;
      util.message = error.message || "Error updating Organization's data";
      return util.send(res);
    }
  }

  static async addNumberOfAccountLimits(req, res) {
    const db = admin.firestore();
    try {
      const { numberOfApplicationsAllowed, numberOfOpportunitiesAllowed } =
        req.body;
      if (
        numberOfApplicationsAllowed === undefined &&
        numberOfOpportunitiesAllowed === undefined
      ) {
        return res
          .status(400)
          .json({ message: "No valid fields provided for update" });
      }
      const updateData = {};
      if (numberOfApplicationsAllowed !== undefined) {
        updateData.numberOfApplicationsAllowed = numberOfApplicationsAllowed;
      }
      if (numberOfOpportunitiesAllowed !== undefined) {
        updateData.numberOfOpportunitiesAllowed = numberOfOpportunitiesAllowed;
      }
      const settingsRef = db.collection("settings").doc("limits");
      await settingsRef.set(updateData, { merge: true });
      util.statusCode = 200;
      util.message = "Settings updated successfully";
      return util.send(res);
    } catch (error) {
      util.statusCode = 500;
      util.message = error.message || "Error updating settings";
      return util.send(res);
    }
  }
}

exports.AdminController = AdminController;
