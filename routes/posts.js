var express = require('express');
var router = express.Router();


router.get('/', function (req, res, next) {
    var result = {
        "result": {
            "message": "게시물 목록이 조회되었습니다.",
            "data": {
                "count": 20,
                "page": 1,
                "listperPage": 6
            },
            "list": [{
                "id": 1111,
                "photo_url" : "./public/photos/user/xxxxx.jpg",
                "interior_url" : "./public/photos/interior/xxxxx.jpg",
                "scrap_count": 22,
                "hashtag": ["의자", "침대"],
                "category": "북유럽",
                "post_count": 50,
                "detail": [{
                    "furniture_url" : "./public/photos/furniture/xxxxx.jpg",
                    "furniture": ["IKEA", 12000, "20*40", "link", "color"],
                    "content": "게시물 내용",
                    "reply": "게시물 댓글"
                }]
            }]
        }
    }
    res.json(result);
})


router.post('/', function (req, res, next) {
    var result = {
        "result": {
            "message": "게시물이 등록되었습니다."
        }
    }
    res.json(result);

});


router.put('/', function (req, res, next) {
    var result = {
        "result": {
            "message": "게시물이 수정되었습니다.",
            "data": {
                "id": 33,
                "content": "게시물 내용",
                "file": "사진"
            }
        }
    }
    res.json(result);

});

router.delete('/', function (req, res, next) {
    var result = {
        "result": {
            "message": "게시물이 삭제되었습니다."
        }
    }
    res.json(result);

});


router.post('/:post_id/replies', function (req, res, next) {
    var result = {
        "result": {
            "message": "게시물의 댓글이 등록되었습니다."
        }
    }
    res.json(result);

});

router.delete('/:post_id/replies/:reply_id', function (req, res, next) {
    var result = {
        "result": {
            "message": "게시물의 댓글이 삭제되었습니다."
        }
    }
    res.json(result);

});

router.get('/', function (req, res, next) {
    var result = {
        "result": {
            "message": "게시물 목록이 조회되었습니다.",
            "data": {
                "count": 20,
                "page": 1,
                "listperPage": 6
            },
            "list": [{
                "id": 1111,
                "file": "사진",
                "scrap_count": 22,
                "hashtag": ["의자", "침대"],
                "category": "북유럽",
                "post_count": 50,
                "detail": [{
                    "furniture": ["IKEA", 12000, "20*40", "link", "color"],
                    "content": "게시물 내용",
                    "reply": "게시물 댓글"
                }]
            }]
        }
    }
    res.json(result);
})


module.exports = router;
