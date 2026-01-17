require("dotenv").config();
const express = require("express");
const cors = require("cors");

const routes = require("./routes/routes");
const chatRoutes = require("./routes/chatRoutes");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get("/", (req, res) => {
  res.status(200).send("Backend is running");
});

app.use("/api", routes);
app.use("/api/chat", chatRoutes);

module.exports = app;
