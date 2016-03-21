var express = require('express');
var gcm = require('node-gcm');
var async = require('async');
var passport = require('passport');
var router = express.Router();



// 댓글 알림
router.get('/:pid', function (req, res, next) {

    var reqPost = req.params.pid;

    console.log('=== req.form.key :'+ req.params.pid);

    function getConnection(callback) {
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
            connection.release();
            if (err) {
                err.message = "select registration token 에러발생 ";
                err.code = "E00007";
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
                "key": "reply"
            },
            notification: {
                "title": "댓글알림",
                "body": "게시글에 댓글이 등록되었습니다.",
                "icon": "ic_launcher"
            }
        });

        var server_access_key = "AIzaSyAlgqej6nnBzv91WzphZy3EkfG9OLAHs9o"; //"AIzaSyCTqs_tFwUjY-HUEj_tM01nH7Yfg4uBlVE";
        var sender = new gcm.Sender(server_access_key);
        var registrationIds = [];
        var registration_id = key[0].registration_token;
        registrationIds.push(registration_id);

        sender.send(message, registrationIds, function (err, response) {
            if (err) {
                console.error(err);
                var err = new Error("send에 실패했습니다");
                err.code = "E00007";
                callback(err);
            } else {
                console.log(response);
                callback(null);
            }
        });
    }

    async.waterfall([getConnection, selectKey, sendPush], function (err) {
        if (err) {
            next(err);
        } else {
            res.json({"message": "댓글 푸시 알람이 전송되었습니다"});
        }
    })

});

module.exports = router;