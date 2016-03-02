var express = require('express');
var router = express.Router();
var async = require('async');

function isLoggedIn(req, res, next) {
    if (!req.isAuthenticated()) {
        var err = new Error('로그인이 필요합니다');
        err.status = 401;
        next(err);
    } else {
        next();
    }
}

// 마이페이지 조회
router.get('/', isLoggedIn, function (req, res, next) {
    if (req.secure) {
        var user = req.user;

        function getConnection(callback){
            pool.getConnection(function (err, connection) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, connection);
                }
            })
        }

        function selectUser (connection, callback) {
            var sql =   "SELECT username, photo_path "+
                        "FROM bangdb.user "+
                        "WHERE id = ?";
            connection.query(sql, [user.id], function (err, info) {
                connection.release();
                if (err) {
                    callback(err);
                } else {
                    callback(null, info)
                }
            })
        }

        function resultJSON (info, callback) {
            var result = {
                "username": info[0].username,
                "photo_path": info[0].photo_path
            };
            callback(null, result);
        }

        async.waterfall([getConnection, selectUser, resultJSON], function (err, result) {
            if (err) {
                next(err);
            } else {
                res.json(result);
            }
        })
    } else {
        var err = new Error('SSL/TLS Upgrade Required');
        err.status = 426;
        next(err);
    }
});




// 마이페이지 프로필 사진 수정
router.put('/', function (req, res, next) {
    if (req.secure) {
        res.json({
            "message": "프로필 사진이 수정되었습니다..."
        })
    } else {
        var err = new Error('SSL/TLS Upgrade Required');
        err.status = 426;
        next(err);
    }
});

module.exports = router;