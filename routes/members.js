var express = require('express');

var router = express.Router();

// 회원가입
router.post('/', function (req, res, next) {
    if (req.secure) {
        res.json({
            "message": "가입이 정상적으로 처리되었습니다..."
        });

    } else {
        var err = new Error('SSL/TLS Upgrade Required');
        err.status = 426;    // https가 들어와야하는데 http가 들어왔을 때
        next(err);
    }
});

//로그인(로컬)
router.post('/login', function (req, res, next) {
   if (req.secure) {
       res.json({
           "message": "로그인 되었습니다..."
       })
   } else {
       var err = new Error('SSL/TLS Upgrade Required');
       err.status = 426;
       next(err);
   }
});

//로그인(페이스북)
router.post('/facebook', function (req, res, next) {
    if (req.secure) {

    } else {
        var err = new Error('SSL/TLS Upgrade Required');
        err.status = 426;
        next(err);
    }
});

module.exports = router;