// import mongoose from 'mongoose';
// import dotenv from 'dotenv';
// import cors from 'cors';

require("dotenv").config();

const express = require("express");
const app = express();
const port = process.env.PORT;

const studentRoutes = require('./routes/studentRoutes');

app.use('/api/students', studentRoutes)

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// }).then(() => {
//   app.listen(5000, () => console.log('Server running on port 5000'));
// }).catch(err => console.error(err));
