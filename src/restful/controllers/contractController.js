// contractController.js
const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid"); // Import uuidv4 directly

const admin = require("../../../shared/firebaseAdmin");

dotenv.config();

class ContractController {
  static async createContract(req, res) {
    const db = admin.firestore();
    try {
      const {
        status,
        description,
        deadline,
        duration,
        brand,
        creatorId,
        opportunityId,
        compensation,
      } = req.body;

      // Validate required fields
      if (
        !status ||
        !description ||
        !deadline ||
        !duration ||
        !brand ||
        !creatorId ||
        !opportunityId ||
        !compensation
      ) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Generate UID for the contract
      const contractId = uuidv4();

      // Create the contract document
      await db.collection("contracts").doc(contractId).set({
        contractId,
        status,
        description,
        deadline,
        duration,
        brand,
        creatorId,
        opportunityId,
        compensation,
      });

      return res
        .status(201)
        .json({ message: "Contract created successfully", contractId });
    } catch (error) {
      console.error("Error creating contract:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  static async deleteContractById(req, res) {
    const db = admin.firestore();
    try {
      const { contractId } = req.params;

      // Check if the contract exists
      const contractRef = db.collection("contracts").doc(contractId);
      const contractSnapshot = await contractRef.get();
      if (!contractSnapshot.exists) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Delete the contract
      await contractRef.delete();

      return res.status(200).json({ message: "Contract deleted successfully" });
    } catch (error) {
      console.error("Error deleting contract by ID:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  static async getAllContracts(req, res) {
    const db = admin.firestore();
    try {
      const contractsData = [];
      const contractsSnapshot = await db.collection("contracts").get();

      contractsSnapshot.forEach((doc) => {
        const contractData = doc.data();
        contractsData.push(contractData);
      });

      return res.status(200).json(contractsData);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  static async getContractById(req, res) {
    const db = admin.firestore();
    try {
      const { contractId } = req.params;

      // Fetch the contract document from Firestore
      const contractRef = db.collection("contracts").doc(contractId);
      const docSnapshot = await contractRef.get();

      if (!docSnapshot.exists) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Extract the data of the contract
      const contractData = docSnapshot.data();

      return res.status(200).json(contractData);
    } catch (error) {
      console.error("Error fetching contract by ID:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  static async updateContractById(req, res) {
    const db = admin.firestore();
    try {
      const { contractId } = req.params;
      const { status, description, deadline, duration, compensation } =
        req.body;

      // Fetch the contract document
      const contractRef = db.collection("contracts").doc(contractId);
      const contractSnapshot = await contractRef.get();

      // Check if the contract exists
      if (!contractSnapshot.exists) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Prepare the update object with only provided fields
      const updateData = {};
      if (status) updateData.status = status;
      if (description) updateData.description = description;
      if (deadline) updateData.deadline = deadline;
      if (duration) updateData.duration = duration;
      if (compensation) updateData.compensation = compensation;

      // Perform the update
      await contractRef.update(updateData);

      // Return success response
      return res.status(200).json({ message: "Contract updated successfully" });
    } catch (error) {
      console.error("Error updating contract:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }
}

exports.ContractController = ContractController;
