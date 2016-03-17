/**
 * Created by skplanet on 2016-03-07.
 */
var express = require('express');
var async = require('async');
var router = express.Router();

function isLoggedIn(req, res, next) {
    if (!req.isAuthenticated()) {
        var err = new Error('로그인이 필요합니다');
        err.code = "E00000";
        err.status = 401;
        next(err);
    } else {
        next();
    }
}

// 스크랩함 목록 조회
router.get('/', isLoggedIn, function (req, res, next) {
    var user = req.user;
    var page = parseInt(req.query.page);
    page = isNaN(page) ? 1 : page;
    var limit = 10;
    var offset = (page - 1) * limit;

    function getConnection(callback) {
        pool.getConnection(function (err, connection) {
            if (err) {
                callback(err);
            } else {
                callback(null, connection);
            }
        });
    }

    function selectScrap(connection, callback) {
        var sql = "SELECT p.id as id, p.category, fi.file_path, u.photo_path " +
                "FROM bangdb.scrap s LEFT JOIN bangdb.post p on (s.post_id = p.id) " +
                "LEFT JOIN bangdb.file fi on(p.id = fi.post_id) " +
                "LEFT JOIN bangdb.hashtag_has_post hp on(p.id = hp.post_id) " +
                "LEFT JOIN bangdb.user u on (u.id = p.user_id) " +
                "WHERE s.user_id = ? " +
                "GROUP BY p.id " +
                "LIMIT ? OFFSET ? ";
        connection.query(sql, [user.id, limit, offset], function (err, scraps) {
            if (err) {
                connection.release();
                callback(err);
            } else {
                callback(null, connection, scraps);

            }
        });
    }

    function resultJSON(connection, scraps, callback) {
        var postList = [];
        var index = 0;
        async.each(scraps, function (scrap, cb1) {
            var sql =   "SELECT h.tag " +
                        "FROM bangdb.post p  LEFT JOIN bangdb.hashtag_has_post hp on(p.id = hp.post_id) " +
                        "LEFT JOIN bangdb.hashtag h on (h.id = hp.hashtag_id) " +
                        "WHERE p.id = ?";
            connection.query(sql, [scrap.id], function (err, tags) {
                if (err) {
                    cb1(err);
                } else {
                    var tagList = [];
                    async.each(tags, function (tags, cb2) {
                        tagList.push(tags.tag);
                        cb2(null);
                    }, function (err) {
                        if (err) {
                            var err = new Error("tag 생성 에러발생");
                            err.code = "E00003";
                            cb1(err);
                        } else {
                            var posts = {
                                "post_id": scrap.id,
                                "photo_url": scrap.photo_path,
                                "file_url": scrap.file_path,
                                "hash_tag": tagList,
                                "category": scrap.category
                            };
                            index++;
                            postList.push(posts);
                            cb1(null);
                        }
                    });
                }
            });
        }, function (err) {
            connection.release();
            if (err) {
                callback(err);
            } else {
                var result = {
                    "postList": postList,
                    "myscrap_count": index
                };
                callback(null, result);
            }
        });

    }


    async.waterfall([getConnection, selectScrap, resultJSON], function (err, result) {
        if (err) {
            next(err);
        } else {
            res.json({
                "result": {
                    "message": "스크랩함 조회가 성공하였습니다",
                    "scrapData": result
                }
            })
        }

    });


});

// 게시물 스크랩
router.post('/', isLoggedIn, function (req, res, next) {
    var user = req.user;
    var postId = req.body.post_id;

    function getConnection(callback) {
        pool.getConnection(function (err, connection) {
            if (err) {
                callback(err);
            } else {
                callback(null, connection);
            }
        })
    }

    function insertScrap(connection, callback) {
        var sql = "INSERT INTO bangdb.scrap(user_id, post_id) " +
            "VALUES (?, ?)";
        connection.query(sql, [user.id, postId], function (err, post) {
            if (err) {
                connection.release();
                var err = new Error("scrap insert 에러");
                err.code = "E00007";
                callback(err);
            } else {
                callback(null, connection);
            }
        })
    }

    function insertState(connection, callback) {
        var sql = "INSERT INTO state(post_id, user_id) "+
                  "VALUES (?, ?)";
        connection.query(sql, [postId, user.id], function (err, state) {
            connection.release();
            if (err) {
                var err = new Error("state insert 에러");
                err.code = "E00007";
                callback(err);
            } else {
                callback(null);
            }
        })
    }

    async.waterfall([getConnection, insertScrap, insertState], function (err) {
        if (err) {
            // err.code = "E00007";
            next(err);
        } else {
            res.json({
                "result": {"message": "스크랩되었습니다"}
            });
        }
    })

});

router.delete('/', isLoggedIn, function(req, res, next) {

    var user = req.user;
    var postId = req.body.post_id;

    function getConnection(callback) {
        pool.getConnection(function (err, connection) {
            if (err) {
                callback(err);
            } else {
                callback(null, connection);
            }
        })
    }

    function deleteScrap (connection, callback) {
        var sql = "DELETE FROM bangdb.scrap "+
                  "WHERE user_id=? and post_id=?";
        connection.query(sql, [user.id, postId], function(err) {
            if (err) {
                connection.release();
                var err = new Error("스크랩 삭제 에러");
                err.code = "E00006";
                callback(err);
            } else {
                callback(null, connection);
            }
        })
    }

    function deletetState(connection, callback) {
        var sql = "DELETE FROM bangdb.state "+
                  "WHERE user_id=? and post_id=?";
        connection.query(sql, [user.id, postId], function (err, state) {
            connection.release();
            if (err) {
                var err = new Error("state insert 에러");
                err.code = "E00007";
                callback(err);
            } else {
                callback(null);
            }
        })
    }

    async.waterfall([getConnection, deleteScrap, deletetState], function (err) {
        if (err) {
            callback(err);
        } else {
            res.json({
                "result": {"message": "스크랩이 취소되었습니다"}
            })
        }
    })

});

module.exports = router;