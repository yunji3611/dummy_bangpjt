var express = require('express');

var router = express.Router();

// 댓글 알림
router.post('/', function (req, res, next) {

        res.json({
            "message": "댓글 푸시 알림이 완료되었습니다..."
        });

});

module.exports = router;