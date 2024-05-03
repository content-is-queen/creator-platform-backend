/* eslint-disable no-prototype-builtins */
const dotenv = require("dotenv");
const admin = require("firebase-admin");
const { Util } = require("../../helper/utils");
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
    const { first_name, last_name, email, password, role, isActivated } = req.body;

    const db = admin.firestore();
    try {
      const user = await admin.auth().createUser({
        email,
        password,
      });

      const uid = user.uid;
      await admin.auth().setCustomUserClaims(uid, { role, isActivated, emailVerified: true, });
      const usersCollectionRef = db.collection("users");
        await usersCollectionRef
        .doc(user.uid)
        .set({ uid: user.uid, first_name, last_name, role, isActivated });
        util.statusCode = 200;
        util.setSuccess(200, "User created successfull!");
        return util.send(res);
    } catch (error) {
      const errorMessage = error?.errorInfo?.message;
      util.statusCode = 500;
      util.message = errorMessage || error.message || "Server error";
      return util.send(res);
    }
  }

  static async adminActivateUser(req,res){
    const { user_id } = req.params;
    try {
      const db = admin.firestore();
      const userRecord = await admin.auth().getUser(user_id);
      const currentClaims = userRecord.customClaims || {};
      const updatedClaims = {
        ...currentClaims,
        isActivated: true
      };
      await admin.auth().setCustomUserClaims(user_id, updatedClaims);
      const usersCollectionRef = db.collection("users");
      await usersCollectionRef
      .doc(user_id)
      .set({ isActivated: true });
      util.statusCode = 200;
      util.setSuccess(200, "User activated successfull!");
      return util.send(res);
      
    } catch (error) {
      console.log(error);
      util.statusCode = 500;
      util.message = error.mesage || "Server error";
      return util.send(res);
    }
  }

  static async adminDeActivateUser(req, res) {
    const { user_id } = req.params;
    try {
      const db = admin.firestore();
      const userRecord = await admin.auth().getUser(user_id);
      const currentClaims = userRecord.customClaims || {};
      const updatedClaims = {
        ...currentClaims,
        isActivated: false
      };
      await admin.auth().setCustomUserClaims(user_id, updatedClaims);
      const usersCollectionRef = db.collection("users");
      await usersCollectionRef
      .doc(user_id)
      .set({ isActivated: false });
      util.statusCode = 200;
      util.setSuccess(200, "User Deactivated successfull!");
      return util.send(res);
      
    } catch (error) {
      console.log(error);
      util.statusCode = 500;
      util.message = error.mesage || "Server error";
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
            if (userObj.hasOwnProperty("uid")) {
              users.push(userObj);
            }
          });
        }
  
        return res.status(200).json(users);
      } catch (error) {
        console.log(error);
        util.statusCode = 500;
        util.message = error.mesage || "Server error";
        return util.send(res);
      }
  }
}

exports.AdminController = AdminController;