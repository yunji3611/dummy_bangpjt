var express = require('express');

var router = express.Router();

// 마이페이지 조회
router.get('/', function (req, res, next) {
    if (req.secure) {
        res.json({
            "message": "프로필이 조회되었습니다...",
            "date": {
                "name": "홍길동",
                "photo_url": "https://www.google.co.kr/imgres?imgurl=http://file2.instiz.net/data/file2/2016/01/10/3/7/9/379f6ddda72b634b23a567a4b2217103.jpg&imgrefurl=http://www.instiz.net/pt/1323326&h=581&w=513&tbnid=NFLPI_2vxt_BAM:&docid=PyD6eyEzexOeeM&ei=oDLMVtvwJOezmwWtx6iIDw&tbm=isch&ved=0ahUKEwjbwIz81I3LAhXn2aYKHa0jCvEQMwgfKAQwBA",
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