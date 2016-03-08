var express = require('express');
var gcm = require('node-gcm');
var async = require('async');
var passport = require('passport');
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


// 댓글 알림
router.post('/', isLoggedIn, function (req, res, next) {

    var reqPost = req.form.key;

    console.log('=== req.form.key :'+ req.form.key);
    console.log('=== req.form.key.post_id :'+ req.form.key.post_id);

    function getConnection(connection, callback) {
        pool.getConnection(function (err, connection) {
            if (err) {
                callback(err);
            } else {
                callback(null, connection);
            }
        })
    }

    function selectKey(connection, callback) {
        var sql = "SELECT registration_token "+
                  "FROM bangdb.post p LEFT JOIN  bangdb.user u ON (p.user_id = u.id) "+
                  "WHERE p.id = ?";
        connection.query(sql, [reqPost], function (err, key) {
            if (err) {
                callback(err);
            } else {
                callback(null, key);
            }
        });
    }

    function sendPush(key, callback) {
        console.log('===> registration_token :' + key[0].registration_token);
        var message = new gcm.Message({
            collapseKey: 'demo',
            delayWhileIdle: true,
            timeToLive: 3,
            data: {
                lecture_id: "notice",
                title: "댓글알림",
                desc: "게시글에 댓글이 등록되었습니다"
            }
        });

        var server_access_key = "안드로이드에서 받아오기";
        var sender = new gcm.Sender(server_access_key);
        var registrationIds = [];
        var registration_id = key[0].registration_token;
        registrationIds.push(registration_id);

        sender.send(message, registrationIds, 4, function (err, response) {
            if (err) {
                console.error(err);
            } else {
                console.log(response);
            }
        });
        callback(result);
    }

    async.waterfall([getConnection, selectKey, sendPush], function (err, result) {
        if (err) {
            next(err);
        } else {
            res.json({"message": "댓글 푸시 알람이 전송되었습니다"});
        }
    })

});

module.exports = router;