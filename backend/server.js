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

app.use("/api/user", userRoutes);
app.use("/api/courses", courseRoutes);

// Connect to MongoDB
database.connectToMongoDB();

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
