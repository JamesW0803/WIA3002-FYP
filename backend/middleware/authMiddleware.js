const jwt = require("jsonwebtoken");
require("dotenv").config();

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    try{
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decodedToken; // Attach the user information to the request object
        next(); // Call the next middleware or route handler
    }catch(err){
        return res.status(403).json({ message: "Invalid or expired token" });
    }
}

const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if(!req.user || !req.user.role){
            return res.status(403).json({ message: "Forbidden" });
        }

        if(!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        next();
    }
}

module.exports = {
    authenticate, 
    checkRole
};