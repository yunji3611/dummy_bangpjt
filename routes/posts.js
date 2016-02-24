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
                "photo_url" : "./public/photos/user/profile.jpg",
                "interior_url" : "./public/photos/interior/europe.jpg",
                "scrap_count": 22,
                "post_count": 50,
                "hashtag": ["의자", "침대","북유럽"],
                "category": "북유럽",
                "detail": [{
                    "furniture_url" : "./public/photos/furniture/chair.jpg",
                    "furniture": [{"브랜드명": "IKEA", "소품이름" : "의자", "품번" : "ABC-000",
                        "사이즈": "20*40", "상세보기" : "link", "색상" :"white"},
                        {"브랜드명": "한샘", "소품이름" : "침대", "품번" : "BBC-002",
                            "사이즈": "100*200", "상세보기" : "link", "색상" :"black"}],
                    "content": "게시물 내용",
                    "reply": "게시물 댓글"
                }]
            }]
        }
    }
    res.json(result);
});


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
                "photo_url" : "./public/photos/user/profile.jpg",
                "interior_url" : "./public/photos/interior/europe.jpg",
                "scrap_count": 22,
                "post_count": 50,
                "hashtag": ["의자", "침대","북유럽"],
                "category": "북유럽",
                "detail": [{
                    "furniture_url" : "./public/photos/furniture/chair.jpg",
                    "furniture": [{"브랜드명": "IKEA", "소품이름" : "의자", "품번" : "ABC-000",
                                   "사이즈": "20*40", "상세보기" : "link", "색상" :"white"},
                                  {"브랜드명": "한샘", "소품이름" : "침대", "품번" : "BBC-002",
                                   "사이즈": "100*200", "상세보기" : "link", "색상" :"black"}],
                    "content": "게시물 내용",
                    "reply": "게시물 댓글"
                }]
            }]
        }
    }
    res.json(result);
});


module.exports = router;
