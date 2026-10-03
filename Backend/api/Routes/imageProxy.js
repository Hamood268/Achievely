const express = require("express");
const router = express.Router();

const { imageProxy } = require("../Controllers/imageProxy");

router.get("/", imageProxy);

module.exports = router;