require("dotenv").config();
const express = require("express");
const cors = require("cors");
const database = require("./config/database");
const routes = require("./routes/routes");
const http = require("http");
const chatRoutes = require("./routes/chatRoutes");
const initSocket = require("./socket");

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use("/api", routes);
app.use("/api/chat", chatRoutes);

const server = http.createServer(app);
initSocket(server);

// Connect to MongoDB
database.connectToMongoDB();

server.listen(port, "0.0.0.0", () => {
  console.log(`Server is listening on port ${port || 5000}`);
});
