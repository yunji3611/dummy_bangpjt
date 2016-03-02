var express = require('express');

var router = express.Router();

function isLoggedIn(req, res, next) {
    if (!req.isAuthenticated()) {
        var err = new Error('로그인이 필요합니다');
        err.status = 401;
        next(err);
    } else {
        next();
    }
}

// 마이페이지 조회
router.get('/', isLoggedIn, function (req, res, next) {
    if (req.secure) {

        var user = req.user;
        res.json({
            "message": "프로필이 조회되었습니다",
            "date": {
                "name": user.username,
                "photo_url": "",
                "myscrap_count": 5,
                "mypost_count": 10
            }
        });

    } else {
        var err = new Error('SSL/TLS Upgrade Required');
        err.status = 426;
        next(err);
    }
});

// 마이페이지 프로필 사진 수정
router.put('/', function (req, res, next) {
    if (req.secure) {
        res.json({
            "message": "프로필 사진이 수정되었습니다..."
        })
    } else {
        var err = new Error('SSL/TLS Upgrade Required');
        err.status = 426;
        next(err);
    }
});

module.exports = router;