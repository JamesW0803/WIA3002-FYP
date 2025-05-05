require("dotenv").config();

const express = require("express");
const app = express();
const database = require("./config/database");
app.use(express.json());

const port = process.env.PORT;

const studentRoutes = require("./routes/studentRoutes");
const courseRoutes = require("./routes/courseRoutes");

app.use("/api/students", studentRoutes);
app.use("/api/courses", courseRoutes);

// Connect to MongoDB
database.connectToMongoDB();

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});


