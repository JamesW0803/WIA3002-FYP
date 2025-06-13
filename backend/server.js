require("dotenv").config();
const express = require("express");
const cors = require("cors");
const database = require("./config/database");
const routes = require("./routes/routes");

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(cors());

app.use("/api", routes);

// Connect to MongoDB
database.connectToMongoDB();

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
