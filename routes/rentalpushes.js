var express = require('express');
var gcm = require('node-gcm');
var async = require('async');
var passport = require('passport');
var moment = require('moment');
var nodeschedule = require('node-schedule');
var router = express.Router();

// 임대 알림
router.get('/:orderId', function (req, res, next) {

    var reqPost = req.params.orderId;    //  order한 주문 id

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
        console.log('orderId===>'+reqPost);
        var sql = "SELECT user_id, registration_token " +
                          "year(rental_endtime) as year, month(rental_endtime) as month, day(rental_endtime) as day "+
                   "FROM bangdb.orders o LEFT JOIN bangdb.user u ON (o.user_id = u.id) "+
                   "WHERE user_id = ?";
        connection.query(sql, [reqPost], function (err, order) {
            connection.release();
            if (err) {
                callback(err);
            } else {
                callback(null, order);
            }
        });
    }

    function sendPush(order, callback) {
        console.log('===> registration_token :' + order[0].registration_token);
        console.log('year==>'+order[0].year +'year==>'+order[0].month +'year==>'+order[0].day-7)
        var year = order[0].year;
        var month = order[0].month;
        var day = order[0].day - 7;
        var hour = 13;
        var minute = 0;
        var second = 0;

        var m = moment({"year": year, "month": month, "day": day,
                "hour": hour, "minute": minute, "second": second}).tz('Asia/Seoul');
        //var date= m.format(YYYYMMDD);

        var job = nodeschedule.scheduleJob(m, function () {

            // push 알람 실행
            var message = new gcm.Message({
                collapseKey: 'demo',
                delayWhileIdle: true,
                timeToLive: 3,
                data: {
                    "key": "massage"
                },
                notification: {
                    "title": "임대기간 알림",
                    "body": "임대기간이 일주일 남았습니다",
                    "icon": "ic_launcher"
                }
            });

            var server_access_key = "AIzaSyCTqs_tFwUjY-HUEj_tM01nH7Yfg4uBlVE";
            var sender = new gcm.Sender(server_access_key);
            var registrationIds = [];
            var registration_id = key[0].registration_token;
            registrationIds.push(registration_id);

            sender.send(message, registrationIds, function (err, response) {
                if (err) {
                    console.error(err);
                    callback(err);
                } else {
                    console.log(response);
                    callback(null);
                }
            });
            // push


        });
    }

    async.waterfall([getConnection, selectKey, sendPush], function (err, result) {
        if (err) {
            var err = new Error('임대 푸시 알람 에러가 발생했습니다');
            next(err);
        } else {
            res.json({"message": "임대 푸시 알람이 전송되었습니다"});
        }
    })

});

module.exports = router;