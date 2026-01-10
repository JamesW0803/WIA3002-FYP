require("dotenv").config();
const http = require("http");

const app = require("./app");
const database = require("./config/database");
const initSocket = require("./socket");

const port = process.env.PORT || 5000;

const server = http.createServer(app);
initSocket(server);

// Connect to MongoDB
database.connectToMongoDB();

server.listen(port, "0.0.0.0", () => {
  console.log(`Server is listening on port ${port}`);
});
