var express = require('express');

var router = express.Router();

// 내가 올린 게시물 목록 조회
router.get('/', function (req, res, next) {

        res.json({
            "message": "내가쓴 글이 조회되었습니다...",
            "data": {
                "count": 20,
                "page": 1,
                "listPerPage": 2,
                "list": [{"myposts_id": 1111,
                         "photo_url": "###",
                         "hashtag":"침대"},
                         {"post_id": 2,
                             "photo_url": "###",
                            "hashtag":"의자"}]
            }
        });

});

module.exports = router;