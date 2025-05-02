const express = require('express');
const router = express.Router();
const { createStudent } = require('../controllers/studentController');

router.post('/', createStudent);

module.exports = router;