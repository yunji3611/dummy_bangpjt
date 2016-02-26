var express = require('express');
var router = express.Router();
var async = require('async');

router.get('/', function (req, res, next) {
    function getConnection(callback) {
        pool.getConnection(function (err, connection) {
            if (err) {
                callback(err);
            } else {
                callback(null, connection);
            }
        });
    }

    function selectPosts(connection, callback) {
        var sql = "select p.id, p.content, p.post_time, p.category, u.username, u.photo_path,  " +
            "f.brand, f.size, f.link, f.name, f.no, f.fphoto_path, " +
            "c.color , re.reply_content, re.reply_time, re.username, " +
            "fi.file_path, h.tag " +
            "from bangdb.post p left join (select id, username, photo_path from bangdb.user) u " +
            "on(p.user_id = u.id) " +
            "left join furniture f on(p.id = f.post_id) " +
            "left join bangdb.reply re on(p.id = re.post_id) " +
            "left join bangdb.file fi on(p.id = fi.post_id) " +
            "left join bangdb.hashtag_has_post hp on(p.id = hp.post_id) " +
            "left join bangdb.hashtag h on (h.id = hp.hashtag_id) " +
            "left join bangdb.color c on(f.color_id = c.id);";

        connection.query(sql, [], function (err, results) {
            connection.release; //미리 커넥션확인.
            if (err) {
                callback(err);
            } else {
                callback(null, results);
            }
        });

    }

    function resultJSON(results, callback) {
        var postList = [];

        async.each(results, function (item, callback) {
            var postresult = {
                "list": [{
                    "post_id": results[0]["id"],
                    "photo_url": results[0]["photo_path"],
                    "interior_url": results[0]["file_path"],
                    "scrap_count": "보류",
                    "post_count": results.length,
                    "hashtag": results[0]["tag"],
                    "category": results[0]["category"],
                    "detail": [{
                        "furniture_url": results[0]["fphoto_path"],
                        "furniture": [{
                            "브랜드명": results[0]["brand"], "소품이름": results[0]["name"], "품번": results[0]["no"],
                            "사이즈": results[0]["size"], "상세보기": results[0]["link"], "색상": results[0]["color"]
                        }],
                        "content": results[0]["content"],
                        "reply_username": results[0]["re.reply_content"],
                        "reply": results[0]["reply_content"]
                    }]
                }]
            }
            postList.push(postresult);
            callback(null);

        }, function (err) {
            if (err) {
                callback(err);
            } else {
                var results =
                {
                    "result": {
                        "message": "게시물 목록이 조회되었습니다.",
                        "data": {
                            "count": 20,
                            "page": 1,
                            "listperPage": 6
                        },
                        "postList" :postList
                    }

                };
                callback(null, results);
            }
        });
    }

//callback(null, results);


    async.waterfall([getConnection, selectPosts, resultJSON], function (err, result) {
        if (err) {
            next(err); //처리도중문제이거나 쿼리수행증..// 뭇
        } else {
            res.json(result);

        }
    })

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
                "photo_url": "./public/photos/user/profile.jpg",
                "interior_url": "./public/photos/interior/europe.jpg",
                "scrap_count": 22,
                "post_count": 50,
                "hashtag": ["의자", "침대", "북유럽"],
                "category": "북유럽",
                "detail": [{
                    "furniture_url": "./public/photos/furniture/chair.jpg",
                    "furniture": [{
                        "브랜드명": "IKEA", "소품이름": "의자", "품번": "ABC-000",
                        "사이즈": "20*40", "상세보기": "link", "색상": "white"
                    },
                        {
                            "브랜드명": "한샘", "소품이름": "침대", "품번": "BBC-002",
                            "사이즈": "100*200", "상세보기": "link", "색상": "black"
                        }],
                    "content": "게시물 내용",
                    "reply": "게시물 댓글"
                }]
            }]
        }
    }
    res.json(result);
});


module.exports = router;