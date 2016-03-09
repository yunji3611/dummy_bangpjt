var express = require('express');
var gcm = require('node-gcm');
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

// 임대 알림
router.post('/', isLoggedIn, function (req, res, next) {


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
        var sql = "";
        connection.query(sql, [], function (err, key) {
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
                title: "임대 기간 알림",
                desc: "임대기간이 일주일 남았습니다"
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
            res.json({"message": "임대 푸시 알람이 전송되었습니다"});
        }
    })

});

module.exports = router;