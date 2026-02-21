const dotenv = require("dotenv");
const admin = require("../../../shared/firebaseAdmin");

dotenv.config();

/**
 * @class ChatController
 * @classdesc ChatController
 */
class ChatController {
  static async sendMessage(req, res) {
    try {
      const { fullName, id, profile_image, receiver, sender, message } =
        req.body;

      if (
        !message ||
        !sender ||
        !receiver ||
        !profile_image ||
        !id ||
        !fullName
      ) {
        return res.status(400).json({ error: "Invalid request" });
      }

      const db = admin.firestore();
      const roomRef = db.collection("rooms").doc(id);

      const messageData = {
        message,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        sender,
        receiver,
      };

      const batch = db.batch();
      const messagesRef = roomRef.collection("messages").doc();
      batch.set(messagesRef, messageData);

      // Update the lastMessage field with the latest message
      batch.update(roomRef, { lastMessage: message });

      await batch.commit();
      res.json({ success: true });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async getRoomInfo(req, res) {
    try {
      const roomId = req.params.roomId;
      const db = admin.firestore();
      const roomRef = db.collection("rooms").doc(roomId);
      const roomSnapshot = await roomRef.get();

      if (!roomSnapshot.exists) {
        return res.status(404).json({ error: "Room not found" });
      }

      const roomData = roomSnapshot.data();
      res.status(200).json(roomData);
    } catch (error) {
      console.error("Error fetching room info:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async getUserRooms(req, res) {
    try {
      const { userId } = req.params; // Assuming you have user information in the request
      const db = admin.firestore();
      const roomsRef = db
        .collection("rooms")
        .where("participantIds", "array-contains", userId);
      const roomsSnapshot = await roomsRef.get();

      const userRooms = [];
      roomsSnapshot.forEach((roomDoc) => {
        const roomData = roomDoc.data();
        userRooms.push({
          id: roomDoc.id,
          ...roomData,
        });
      });

      res.status(200).json(userRooms);
    } catch (error) {
      console.error("Error fetching user rooms:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async receiveMessages(req, res) {
    try {
      const { receiverId } = req.params;
      const db = admin.firestore();
      const roomRef = db.collection("rooms").doc(receiverId);
      const messagesRef = roomRef
        .collection("messages")
        .orderBy("createdAt", "desc")
        .limit(10);

      const messagesSnapshot = await messagesRef.get();
      const messages = messagesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      res.status(200).json(messages);
    } catch (error) {
      console.error("Error receiving messages:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async getUsers(req, res) {
    try {
      const db = admin.firestore();
      const userCollections = await db.collection("users").get();

      const userList = userCollections.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      res.status(200).json(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async getUserProfiles(req, res) {
    try {
      const users = await admin.auth().listUsers();
      const userProfiles = users.users.map((userRecord) => userRecord.toJSON());

      res.status(200).json(userProfiles);
    } catch (error) {
      console.error("Error fetching user profiles:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async getMessages(req, res) {
    try {
      const roomId = req.params.roomId;
      const db = admin.firestore();
      const messagesRef = db
        .collection("rooms")
        .doc(roomId)
        .collection("messages");
      const snapshot = await messagesRef.get();
      const messages = snapshot.docs.map((doc) => doc.data());
      res.status(200).json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async createRoom(req, res) {
    try {
      const { id, fullName, participantIds } = req.body;

      if (!id || !fullName || !Array.isArray(participantIds)) {
        return res.status(400).json({ error: "Invalid request" });
      }

      const db = admin.firestore();
      const roomRef = db.collection("rooms").doc(id);

      const roomData = {
        id,
        fullName,
        lastMessage: "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        participantIds,
      };

      await roomRef.set(roomData);

      res.json({ success: true, room: roomData });
    } catch (error) {
      console.error("Error creating room:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async addUserToRoom(req, res) {
    try {
      const { roomId, userId } = req.body;

      if (!roomId || !userId) {
        return res.status(400).json({ error: "Invalid request" });
      }

      const db = admin.firestore();
      const roomRef = db.collection("rooms").doc(roomId);

      await roomRef.update({
        participantIds: admin.firestore.FieldValue.arrayUnion(userId),
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error adding user to room:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

exports.ChatController = ChatController;
