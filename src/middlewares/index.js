import admin from "firebase-admin";
import Util from "../helper/utils";
const util = new Util();
const protect = async (req, res, next) => {
  let token;
  if (!req.headers.authorization) {
    util.setError(401, "Token not found");
    return util.send(res);
  }
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      next();
    } catch (error) {
      return res.status(401).json({ error: "Not Authorized!" });
    }
  }

  if (!token) {
    return res.status(401).json({ error: "Not Authenticated!" });
  }
};
export default protect;
