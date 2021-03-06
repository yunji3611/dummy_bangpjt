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

// 내가 올린 게시물 목록 조회
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

    function selectMyPosts (connection, callback) {
        var sql =   "SELECT p.id as id, fi.file_path, u.photo_path " +
                    "FROM bangdb.post p	LEFT JOIN bangdb.file fi on(p.id = fi.post_id) " +
                                        "LEFT JOIN bangdb.hashtag_has_post hp on(p.id = hp.post_id) " +
                                        "LEFT JOIN bangdb.hashtag h on (h.id = hp.hashtag_id) " +
                                        "LEFT JOIN bangdb.user u on (u.id = p.user_id) "+
                    "WHERE user_id = ? " +
                     "group by p.id " +
                     "LIMIT ? OFFSET ?";
        connection.query(sql, [user.id, limit, offset], function (err, myposts) {
            if (err) {
                callback(err);
            } else {
                callback(null, connection, myposts);
            }
        })
    }

    function resultJSON (connection, myposts, callback) {
        var postList = [];
        var index = 0;
        async.each(myposts, function (mypost, cb1) {
            var sql =   "SELECT h.tag " +
                        "FROM bangdb.post p  LEFT JOIN bangdb.hashtag_has_post hp on(p.id = hp.post_id) " +
                        "LEFT JOIN bangdb.hashtag h on (h.id = hp.hashtag_id) " +
                        "WHERE p.id = ?";
            connection.query(sql, [mypost.id], function (err, tags) {
                if (err) {
                    connection.release();
                    cb2(err);
                } else {
                    var tagList = [];
                    async.each(tags, function (tags, cb2) {
                        tagList.push(tags.tag);
                        cb2(null);
                    }, function (err) {
                        if (err) {
                            var err = new Error("tag 에러");
                            err.code = "E00003";
                            cb1(err);
                        } else {
                            var posts = {
                                "post_id": mypost.id,
                                "photo_url": mypost.photo_path,
                                "file_url": mypost.file_path,
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
                err.code = "E00003";
                callback(err);
            } else {
                var result = {
                    "postList": postList,
                    "mypost_count": index
                };
                callback(null, result);
            }
        });

    }

    async.waterfall([getConnection, selectMyPosts, resultJSON], function (err, result) {
        if (err) {
            next(err);
        } else {
            res.json({
                "result": {
                    "message": "내가 쓴 글이 조회되었습니다",
                    "postData": result
                }
            });
        }
    });
});

module.exports = router;