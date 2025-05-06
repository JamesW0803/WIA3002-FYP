require("dotenv").config();

const express = require("express");
const app = express();
const database = require("./config/database");
app.use(express.json());

const cors = require("cors");
app.use(cors());

const port = process.env.PORT;

const userRoutes = require("./routes/userRoutes");
const courseRoutes = require("./routes/courseRoutes");
const studentRoutes = require("./routes/studentRoutes");
const passwordResetRoutes = require("./routes/passwordResetRoutes");
const curriculumRoutes = require("./routes/curriculumRoutes");

app.use("/api/user", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/student", studentRoutes);
app.use("/api", passwordResetRoutes);
app.use("/api/curriculums", curriculumRoutes);

// Connect to MongoDB
database.connectToMongoDB();

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
