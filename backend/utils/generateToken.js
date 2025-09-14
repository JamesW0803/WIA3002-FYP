const jwt = require("jsonwebtoken");
require("dotenv").config();

const generateToken = (payload, expiresIn = "1h") => {
  const secret_key = process.env.JWT_SECRET;
  const token = jwt.sign(payload, secret_key, { expiresIn });
  return token;
};

module.exports = generateToken;
