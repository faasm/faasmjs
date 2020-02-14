var express = require("express");
var router = express.Router();

router.get("/hello", function (req, res, next) {
    res.render("hello", {title: "Faasmjs - Hello"});
});

router.get("/chain", function (req, res, next) {
    res.render("chain", {title: "Faasmjs - Chaining"});
});

router.get("/state", function (req, res, next) {
    res.render("state", {title: "Faasmjs - State"});
});

module.exports = router;
