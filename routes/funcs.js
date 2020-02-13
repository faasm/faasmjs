var express = require('express');
var router = express.Router();

router.get('/hello', function (req, res, next) {
    res.render('hello', {title: 'Hello Faasmjs'});
});

router.get('/chain', function (req, res, next) {
    res.render('chain', {title: 'Chained Faasmjs'});
});

module.exports = router;
