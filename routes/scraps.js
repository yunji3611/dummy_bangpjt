/**
 * Created by skplanet on 2016-03-07.
 */
var express = require('express');
var async = require('async');
var router = express.Router();

function isLoggedIn(req, res, next) {
    if (!req.isAuthenticated()) {
        var err = new Error('로그인이 필요합니다');
        err.status = 401;
        next(err);
    } else {
        next();
    }
}

// 스크랩함 목록 조회
router.get('/', isLoggedIn, function (req, res, next) {
    var user = req.user;

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
        var sql = "SELECT p.id as id, fi.file_path, u.photo_path " +
            "FROM bangdb.scrap s LEFT JOIN bangdb.post p on (s.post_id = p.id) " +
            "LEFT JOIN bangdb.file fi on(p.id = fi.post_id) " +
            "LEFT JOIN bangdb.hashtag_has_post hp on(p.id = hp.post_id) " +
            "LEFT JOIN bangdb.user u on (u.id = s.user_id) " +
            "WHERE s.user_id = ? " +
            "GROUP BY p.id";
        connection.query(sql, [user.id], function (err, scraps) {
            //connection.release();
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
                    connection.release();
                    cb1(err);
                } else {
                    var tagList = [];
                    async.each(tags, function (tags, cb2) {
                        var tag = {
                            "tag": tags.tag
                        };
                        tagList.push(tag);
                        cb2(null);
                    }, function (err) {
                        if (err) {
                            cb1(err);
                        } else {
                            var posts = {
                                "post_id": scrap.id,
                                "photo_url": scrap.photo_path,
                                "file_url": scrap.file_path,
                                "hash_tag": tagList
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

    function selectScrap(connection, callback) {
        var sql = "SELECT post_id " +
            "FROM bangdb.scrap " +
            "WHERE user_id = ? and post_id = ?";
        connection.query(sql, [user.id, postId], function (err, post) {
            if (post.length) {
                var err = new Error("이미 스크랩되었습니다");
                err.status = 409;
                callback(err);
            } else {
                callback(null, connection);
            }
        });
    }

    function insertScrap(connection, callback) {
        var sql = "INSERT INTO bangdb.scrap(user_id, post_id) " +
            "VALUES (?, ?)";
        connection.query(sql, [user.id, postId], function (err, post) {
            connection.release();
            if (err) {
                callback(err);
            } else {
                callback(null, post);
            }
        })
    }

    async.waterfall([getConnection, selectScrap, insertScrap], function (err, post) {
        if (err) {
            next(err);
        } else {
            res.json({
                "result": {"message": "스크랩되었습니다"}
            });
        }
    })

});

module.exports = router;