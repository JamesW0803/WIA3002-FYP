const jwt = require("jsonwebtoken");
module.exports = function socketAuth(io) {
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");
      if (!token) return next(new Error("UNAUTHORIZED"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.user_id, role: decoded.role };
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });
};
