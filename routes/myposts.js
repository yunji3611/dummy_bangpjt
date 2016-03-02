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
        var sql =   "SELECT p.id, fi.file_path, h.tag " +
                    "FROM bangdb.post p	LEFT JOIN bangdb.file fi on(p.id = fi.post_id) " +
                    "LEFT JOIN bangdb.hashtag_has_post hp on(p.id = hp.post_id) " +
                    "LEFT JOIN bangdb.hashtag h on (h.id = hp.hashtag_id) " +
                    "WHERE user_id = ? " +
                    "group by p.id";
        connection.query(sql, [user.id], function (err, myposts) {
            connection.release();
            if (err) {
                callback(err);
            } else {
                callback(null, myposts);
            }
        })
    }

    function resultJSON (myposts, callback) {
        var postList = [];
        var index = 0;
        async.each(myposts, function (item, callback) {
            var posts = {
                "postId": myposts[index]["id"],
                "file": myposts[index]["file_path"],
                "hashtag": myposts[index]["tag"]
            };
            postList.push(posts);
            callback(null);
            index++;

        }, function (err) {
            if (err) {
                callback(err);
            } else {
                var result = {
                    "postList" :postList
                };
                callback(null, result);
            }
        });
    }

    async.waterfall([getConnection, selectMyPosts, resultJSON], function (err, result) {
        if (err) {
            callback(err);
        } else {
            res.json(result);
        }
    });
});

module.exports = router;