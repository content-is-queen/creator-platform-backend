const dotenv = require("dotenv");
const { Util } = require("../../helper/utils");
const admin = require(".././admin");
const { v4: uuidv4 } = require("uuid"); // Import uuidv4 directly
const Joi = require("joi");

dotenv.config();
/**
 * @class OpportunitiesController
 * @classdesc OpportunitiesController
 */

const util = new Util();

const defaultSchema = {
  title: Joi.string(),
  description: Joi.string(),
  type: Joi.any().allow("pitch", "campaign", "job").required(),
  userId: Joi.string(),
  applicationInstructions: Joi.string().allow(""),
  link: Joi.string().uri().allow(""),
};

const schema = {
  job: Joi.object({
    ...defaultSchema,
    category: Joi.string(),
    contractType: Joi.string().allow(""),
    experience: Joi.string().allow(""),
    skills: Joi.array().items(Joi.string()).required(),
    location: Joi.string(),
    education: Joi.string().allow(""),
    salary: Joi.string().allow(""),
    terms: Joi.string().allow(""),
    deadline: Joi.date().required(),
    benefits: Joi.string().allow(""),
  }),
  pitch: Joi.object({
    ...defaultSchema,
    targetAudience: Joi.array().items(Joi.string()),
    contentDuration: Joi.string().allow(""),
    contentType: Joi.string().allow(""),
    keyMessage: Joi.string().allow(""),
    deadline: Joi.date().required(),
    budget: Joi.string(),
  }),
  campaign: Joi.object({
    ...defaultSchema,
    targetAudience: Joi.string().allow(""),
    targetDemographic: Joi.array().items(Joi.string()).required(),
    budget: Joi.string().allow(""),
    adType: Joi.string().allow(""),
    startDate: Joi.date().required(),
    length: Joi.string().allow(""),
    endDate: Joi.date().required(),
  }),
};

class OpportunitiesController {
  /**
   * @param {Object} req request Object.
   * @param {Object} res response Object.
   * @returns {Object} response Object.
   */

  static async getAllOpportunities(req, res) {
    const db = admin.firestore();
    const { limit = 10, page = 1 } = req.query;
    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);
    const formattedDate = new Intl.DateTimeFormat("en-CA")
      .format(new Date())
      .replace(/-/g, "/");

    try {
      // Fetch the initial set of documents to determine the correct starting point
      const query = db
        .collection("opportunities")
        .where("status", "!=", "archived")
        .where("deadline", ">=", formattedDate)
        .orderBy("createdAt", "desc");

      const initialSnapshot = await query.get();

      // Calculate the starting index
      const startIndex = (parsedPage - 1) * parsedLimit;

      if (initialSnapshot.size < startIndex) {
        throw new Error("Page number out of bounds");
      }

      // Retrieve the document to start after for the current page
      let queryWithLimit = query.limit(parsedLimit);
      if (parsedPage > 1) {
        const lastVisible = initialSnapshot.docs[startIndex - 1];
        queryWithLimit = queryWithLimit.startAfter(lastVisible);
      }

      // Fetch the documents for the current page
      const querySnapshot = await queryWithLimit.get();
      const opportunitiesData = [];

      await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const opportunitiesDetails = { id: doc.id, ...doc.data() };
          if (doc.data().profilePhotoRef) {
            const profileData = await doc.data().profilePhotoRef.get();
            opportunitiesDetails.profilePhoto = profileData.data().profilePhoto;
          } else {
            const profileData = await doc.data().profileCompanyPhotoRef.get();
            opportunitiesDetails.profilePhoto =
              profileData.data().organizationLogo;
            opportunitiesDetails.organizationLogo =
              profileData.data().organizationLogo;
            opportunitiesDetails.organizationName =
              profileData.data().organizationName;
          }
          const {
            profilePhotoRef,
            profileCompanyPhotoRef,
            ...restFromFiltered
          } = opportunitiesDetails;
          opportunitiesData.push(restFromFiltered);
        }),
      );

      // Calculate total items and total pages
      const totalItems = (
        await db
          .collection("opportunities")
          .where("status", "!=", "archived")
          .get()
      ).size;
      const totalPages = Math.ceil(totalItems / parsedLimit);

      if (opportunitiesData.length > 0) {
        util.statusCode = 200;
        util.message = {
          opportunities: opportunitiesData,
          currentPage: parsedPage,
          totalPages,
          totalItems,
        };
        return util.send(res);
      } else {
        util.statusCode = 404;
        util.message = "No opportunities found";
        return util.send(res);
      }
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      util.statusCode = 500;
      util.message = error.message || "Server error";
      return util.send(res);
    }
  }

  static async getAllOpportunitiesByUserId(req, res) {
    const db = admin.firestore();
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    try {
      const opportunitiesData = [];
      const query = db
        .collection("opportunities")
        .where("userId", "==", userId);

      const querySnapshot = await query.get();
      const promises = querySnapshot.docs.map(async (doc) => {
        if (doc.data().status !== "archived") {
          const opportunitiesDetails = { id: doc.id, ...doc.data() };
          if (doc.data().profilePhotoRef) {
            const profileData = await doc.data().profilePhotoRef.get();
            opportunitiesDetails.profilePhoto = profileData.data().profilePhoto;
          }
          const { profilePhotoRef, ...restFromFiltered } = opportunitiesDetails;
          opportunitiesData.push(restFromFiltered);
        }
      });

      await Promise.all(promises);

      if (opportunitiesData.length > 0) {
        return res.status(200).json({
          opportunities: opportunitiesData,
        });
      } else {
        return res.status(404).json({ message: "No opportunities found" });
      }
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  }

  static async getOpportunityById(req, res) {
    const db = admin.firestore();
    const { opportunityId } = req.params;

    if (!opportunityId) {
      return res.status(400).json({ message: "Opportunity ID is required" });
    }

    try {
      const opportunityRef = db.collection("opportunities").doc(opportunityId);
      const docSnapshot = await opportunityRef.get();

      if (!docSnapshot.exists) {
        return res.status(404).json({ message: "Opportunity not found" });
      }

      const opportunityData = docSnapshot.data();

      if (opportunityData.profilePhotoRef) {
        const profileData = await opportunityData.profilePhotoRef.get();
        opportunityData.profilePhoto = profileData.data().profilePhoto;
      } else if (opportunityData.profileCompanyPhotoRef) {
        const profileData = await opportunityData.profileCompanyPhotoRef.get();
        opportunityData.profilePhoto = profileData.data().organizationLogo;
        opportunityData.organizationName = profileData.data().organizationName;
      }

      const { profilePhotoRef, profileCompanyPhotoRef, ...restFromFiltered } =
        opportunityData;

      return res.status(200).json(restFromFiltered);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  }

  static async getOpportunitiesByStatus(req, res) {
    const db = admin.firestore();
    const { status } = req.params;
    const { limit = 10, startAfter: startAfterId = null } = req.query;

    if (
      !status ||
      !["open", "in_progress", "completed", "closed"].includes(status)
    ) {
      util.statusCode = 400;
      util.message = "Invalid or missing opportunity status";
      return util.send(res);
    }

    try {
      const opportunitiesData = [];
      let query = db
        .collection("opportunities")
        .where("status", "==", status)
        .limit(parseInt(limit));

      if (startAfterId) {
        const startAfterDoc = await db
          .collection("opportunities")
          .doc(startAfterId)
          .get();
        if (startAfterDoc.exists) {
          query = query.startAfter(startAfterDoc);
        } else {
          util.statusCode = 400;
          util.message = "Invalid startAfter ID";
          return util.send(res);
        }
      }

      const querySnapshot = await query.get();

      querySnapshot.forEach((doc) => {
        opportunitiesData.push({ id: doc.id, ...doc.data() });
      });

      if (opportunitiesData.length > 0) {
        util.statusCode = 200;
        util.message = {
          opportunities: opportunitiesData,
          nextStartAfterId: opportunitiesData[opportunitiesData.length - 1].id,
        };
        return util.send(res);
      } else {
        util.statusCode = 404;
        util.message = "No opportunities found";
        return util.send(res);
      }
    } catch (error) {
      console.error("Error fetching opportunities by status:", error);
      util.statusCode = 500;
      util.message = error.message || "Server error";
      return util.send(res);
    }
  }

  static async deleteOpportunityById(req, res) {
    const db = admin.firestore();
    try {
      const { opportunityId } = req.params;

      if (!opportunityId) {
        return res.status(400).json({ message: "Opportunity ID is required" });
      }

      // Fetch the opportunity document from Firestore
      const opportunityRef = db.collection("opportunities").doc(opportunityId);
      const docSnapshot = await opportunityRef.get();

      if (!docSnapshot.exists) {
        return res.status(404).json({ message: "Opportunity not found" });
      }

      // Update the status of the opportunity to "archived"
      await opportunityRef.update({ status: "archived" });

      return res
        .status(200)
        .json({ message: "Opportunity archived successfully" });
    } catch (error) {
      console.error("Error archiving opportunity:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  static async updateOpportunityById(req, res) {
    const db = admin.firestore();
    try {
      const { opportunityId } = req.params;
      const { status } = req.body;

      // Fetch the opportunity document
      const opportunityRef = db.collection("opportunities").doc(opportunityId);
      const opportunitySnapshot = await opportunityRef.get();

      // Check if the opportunity exists
      if (!opportunitySnapshot.exists) {
        return res.status(404).json({ message: "Opportunity not found" });
      }

      // Perform the update
      await opportunityRef.update({ status });

      // Return success response
      return res
        .status(200)
        .json({ message: "Opportunity updated successfully", statusCode: 200 });
    } catch (error) {
      console.log(error);
      console.error("Error updating opportunity:", error);
      return res
        .status(500)
        .json({ message: error?.message || "Server error", statusCode: 500 });
    }
  }

  static async createOpportunity(req, res) {
    const db = admin.firestore();
    try {
      const { userId, type } = req.body;

      await schema[type].validateAsync(req.body);

      // Fetch the user document
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        util.statusCode = 404;
        util.message = "User not found";
        return util.send(res);
      }
      const userData = userDoc.data();
      // Generate UUID for opportunityId
      const opportunityId = uuidv4();

      // Extract opportunity data from request body
      const { ...opportunityData } = req.body;

      // Set default status to "open" if not provided
      if (!Object.hasOwn(opportunityData, "status")) {
        opportunityData.status = "open";
      }

      opportunityData.createdAt = admin.firestore.FieldValue.serverTimestamp();

      // If company details are not provided, use organizationName from user data
      if (!opportunityData.company) {
        opportunityData.company = userData.organizationName || null;
      }
      if (userData.role === "admin" || userData.role === "super_admin") {
        const adminRef = db.collection("settings").doc("organization");
        opportunityData.profileCompanyPhotoRef = adminRef;
      } else {
        opportunityData.profilePhotoRef = userRef;
      }

      // Check if opportunity with same ID already exists
      const existingOpportunity = await db
        .collection("opportunities")
        .doc(opportunityId)
        .get();
      if (existingOpportunity.exists) {
        util.statusCode = 400;
        util.message = "Opportunity with same ID already exists";
        return util.send(res);
      }

      // Store the opportunity data in the opportunities collection
      await db
        .collection("opportunities")
        .doc(opportunityId)
        .set({
          opportunityId,
          type,
          ...opportunityData,
        });

      // Increment the opportunitiesPostedCount for the user
      await userRef.update({
        opportunitiesPostedCount: admin.firestore.FieldValue.increment(1),
      });

      util.statusCode = 201;
      util.message = "Opportunity created successfully";
      return util.send(res);
    } catch (error) {
      console.error(error);
      util.statusCode = 500;
      util.message = error.message || "Server error";
      return util.send(res);
    }
  }

  static async createJobOpportunity(req, res) {
    return OpportunitiesController.createOpportunity(req, res, "job");
  }

  static async createPitchOpportunity(req, res) {
    return OpportunitiesController.createOpportunity(req, res, "pitch");
  }

  static async createCampaignOpportunity(req, res) {
    return OpportunitiesController.createOpportunity(req, res, "campaign");
  }
}

exports.OpportunitiesController = OpportunitiesController;
