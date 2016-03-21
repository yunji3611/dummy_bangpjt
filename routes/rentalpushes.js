var express = require('express');
var gcm = require('node-gcm');
var async = require('async');
var passport = require('passport');
var moment = require('moment-timezone');
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
        var sql = "SELECT o.id as oid, user_id, registration_token, " +
                   "year(rental_end) as year, month(rental_end) as month, day(rental_end) as day "+
                   "FROM bangdb.orders o LEFT JOIN bangdb.user u ON (o.user_id = u.id) "+
                   "WHERE o.id =?";
        connection.query(sql, [reqPost], function (err, order) {
            if (err) {
                connection.release();
                err.message = "select registration token 에러발생 ";
                err.code = "E00007";
                callback(err);
            } else {
                callback(null, order, connection);
            }
        });
    }

    function sendPush(order, connection, callback) {
        console.log('===> registration_token :' + order[0].registration_token);
        console.log('year==>'+order[0].year +' month==>'+order[0].month +' day==>'+order[0].day);
        var year = order[0].year;
        var month = order[0].month;
        var day = parseInt(order[0].day) - parseInt(7);
        var hour = 13;
        var minute = 0;
        var second = 0;

        var m = moment({"year": year, "month": month, "day": day,
                "hour": hour, "minute": minute, "second": second}).tz('Asia/Seoul').format();
        console.log('m===>'+m);
        var mSql =  "UPDATE orders "+
                    "SET push_time= '"+m+"' "+
                    "WHERE id=?";
        connection.query(mSql, [reqPost], function (err) {
            if (err) {
                var err = new Error('push time등록 에러발생');
                err.code = "E00007";
                callback(err);
            } else {

            }
        });

        var job = nodeschedule.scheduleJob(m, function () {
            console.log('job들어왔음===');
            // push 알람 실행
            var message = new gcm.Message({
                collapseKey: 'demo',
                delayWhileIdle: true,
                timeToLive: 3,
                data: {
                    "key1": "order"    // orderId
                }
            });

            var server_access_key = "AIzaSyCTqs_tFwUjY-HUEj_tM01nH7Yfg4uBlVE";
            var sender = new gcm.Sender(server_access_key);
            var registrationIds = [];
            var registration_id = order[0].registration_token;
            registrationIds.push(registration_id);

            sender.send(message, registrationIds, function (err, response) {
                if (err) {
                    // err 상태 저장
                    var errSql = "UPDATE orders "+
                                 "SET push_state= 'err' "+
                                 "WHERE id=?";
                    connection.query(errSql, [reqPost], function (err) {
                        connection.release();
                        if (err) {

                        } else {

                        }
                    });
                } else {
                    console.log(response);
                    // push보냈는지 저장
                    var successSql = "UPDATE orders "+
                                     "SET push_state= 'send' "+
                                     "WHERE id=?";
                    connection.query(successSql, [reqPost], function (err) {
                        connection.release();
                        if (err) {

                        } else {

                        }
                    });
                }
            });
            // push
        });

        callback(null);
    }

    async.waterfall([getConnection, selectKey, sendPush], function (err) {
        if (err) {
            next(err);
        } else {
            res.json({"message": "임대 푸시 알람이 등록되었습니다"});
        }
    })

});

module.exports = router;