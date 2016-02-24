var express = require('express');

var router = express.Router();

// 반남기간 알림
router.post('/', function (req, res, next) {

        res.json({
            "message": "반납기간 알림이 완료되었습니다..."
        })

});

module.exports = router;