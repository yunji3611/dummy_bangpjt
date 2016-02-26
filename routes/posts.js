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

    var post_type = parseInt(req.query.post_type);
    var page = parseInt(req.query.page);
    page = isNaN(page) ? 1 : page;
    post_type = post_type > 1 ? 0 : post_type;

    var postList = [];
    var limit = 10;
    var offset = (page - 1) * limit;
    function selectPosts(connection, callback) {



        var post1 = "select p.id, p.content, p.category, u.username " +
          "from post p join (select id, username, photo_path from user) u " +
          "on(p.user_id = u.id) " +
          "where post_type= ? " +
          "limit ? offset ? ";
        connection.query(post1, [post_type, limit, offset], function (err, results) {
            if (err) {
                callback(err);
            } else {
                callback(null, connection, results);
            }
        });
    }

    function selectPosts2(connection, results, callback) {
        async.eachSeries(results, function (element, callback) {
            var hashtag = "select h.tag, hp.post_id " +
              "from hashtag_has_post hp join hashtag h on (h.id = hp.hashtag_id) " +
              "join post p on(p.id=hp.post_id) " +
              "where post_type= ? and p.id= ?";

            var interior = "select file_path, post_id " +
              "from file ";

            var photo = "select u.photo_path, p.id " +
              "from post p join user u on (p.user_id = u.id) ";
            index = 0;
            async.series([function (callback) {
                connection.query(hashtag, [post_type, element.id], function (err, tag_results) {
                    if (err) {
                        callback(err);
                    } else {
                        results[index].tag = tag_results;
                        callback(null);
                    }
                });

            }, function (callback) {
                connection.query(interior, [post_type, element.id], function (err, interior_results) {
                    if (err) {
                        callback(err);
                    } else {
                        results[index].file_path = interior_results;
                        callback(null);
                    }
                });
            }, function (callback) {
                connection.query(photo, [post_type, element.id], function (err, photo_results) {
                    if (err) {
                        callback(err);
                    } else {
                        results[index].photo_path = photo_results;
                        callback(null);
                    }
                });
            }], function (err) {
                if (err) {
                    callback(err);
                } else {
                    index++;
                    callback(null);
                }

            }, function (err) {
                if (err) {
                    callback(err);
                } else {
                    connection.release();
                    callback(null, results);
                }

            });
        });
    }


function resultJSON(results, callback) {
    var postList = [];


    async.forEach(results, function (results, callback) {
        var postresult = {
            "list": [{
                "post_id": results.id,
                "photo_url": results.photo_path,
                "interior_url": results.file_path,
                "scrap_count": "확인",
                "post_count": results.length,
                "hashtag": results.tag,
                "category": results.category,
                "detail": [{
                    "furniture_url": results.fphoto_path,
                    "furniture": [{
                        "브랜드명": results.brand, "소품이름": results.name, "품번": results.no,
                        "사이즈": results.size, "상세보기": results.link, "색상": results.color
                    }],
                    "content": results.content,
                    "reply_username": results.reply_content,
                    "reply": results.reply_content
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
                        "count": "",
                        "page": "page",
                        "listperPage": "limit"
                    },
                    "postList": postList
                }

            };
            callback(null, results);
        }
    });
}


    async.waterfall([getConnection, selectPosts, selectPosts2, resultJSON], function (err, result) {
        if (err) {
            next(err); //처리도중문제이거나 쿼리수행증..// 뭇
        } else {
            res.json(result);

        }
    });
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