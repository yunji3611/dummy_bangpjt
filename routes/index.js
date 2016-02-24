var express = require('express');
var router = express.Router();


router.get('/', function(req, res, next) {
  if (req.secure) {
    res.render('index', { title: 'Express' });
  } else {
    var err = new Error('SSL/TLS Upgrade Required !!!!!');
    err.status = 426;
    next(err);
  }
});

module.exports = router;
