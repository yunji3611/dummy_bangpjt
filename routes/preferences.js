var express = require('express');

var router = express.Router();

// 취향조사
router.get('/', function (req, res, next) {
    res.json({
        "message": "취향조사 내용이 전달되었습니다..",
        "data": [{"questionary_id": 1,
                  "questionary": "당신의 나이대는?",
                  "item_seq": 1,
                   "item": "20"},
                {"questionary_id": 1,
                "questionary": "어떤 스타일을 좋아해요?",
                "item_seq": 2,
                "item": "도시적인 스타일"}]
    })
});

module.exports = router;