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

    function getConnection (callback) {
        pool.getConnection(function(err, connection) {
            if (err) {
                callback (err);
            } else {
                callback(null, connection);
            }
        });
    }

    function selectScrap (connection, callback) {
        var sql ="SELECT p.id, fi.file_path, h.tag "+
                "FROM bangdb.scrap s LEFT JOIN bangdb.post p on (s.post_id = p.id) "+
                "LEFT JOIN bangdb.file fi on(p.id = fi.post_id) "+
                "LEFT JOIN bangdb.hashtag_has_post hp on(p.id = hp.post_id) "+
                "LEFT JOIN bangdb.hashtag h on (h.id = hp.hashtag_id) "+
                "WHERE s.user_id = ? " +
                "group by p.id";
        connection.query(sql, [user.id], function (err, scraps) {
            connection.release();
            if (err) {
                callback(err);
            } else {
                callback(null, scraps);
            }
        });
    }

    function resultJSON (scraps, callback) {
        var postlist = [];
        var index =0;
        async.each(scraps, function (item, callback) {
            var posts = {
                "post_id" : scraps[index]["id"],
                "file_url": scraps[index]["file_path"],
                "hash_tag": scraps[index]["tag"]
            };
            index ++;
            postlist.push(posts);
            callback(null);

        }, function (err) {
            if (err) {
                callback(err);
            } else {
                var result = {
                    "postlist": postlist,
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
            res.json(result);
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
        var sql = "SELECT post_id "+
                  "FROM bangdb.scrap "+
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
        var sql = "INSERT INTO bangdb.scrap(user_id, post_id) "+
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
                "message": "스크랩되었습니다"
            });
        }
    })

});

module.exports = router;
