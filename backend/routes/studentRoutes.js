const express = require('express');
const router = express.Router();
const { getProgrammePlans } = require('../controllers/programmePlanController');

router.get('/programme-plans', getProgrammePlans)

module.exports = router;