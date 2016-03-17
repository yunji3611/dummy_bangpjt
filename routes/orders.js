var express = require('express');
var async = require('async');
var request = require('request');

var router = express.Router();
var hexkey = process.env.HEX_KEY;

function isLoggedIn(req, res, next) {
    if (!req.isAuthenticated()) {
        var err = new Error("로그인이 필요합니다");
        err.status = 401;
        next(err);
    } else {
        next();
    }
}

// 임대게시물 주문
router.post('/', isLoggedIn, function (req, res, next) {
    if (req.secure) {
        var user = req.user;
        var postId = req.body.post_id;
        var period = req.body.period;
        var address = req.body.address;
        var phone = req.body.phone;
        var paymethod = req.body.paymethod;
        var monthPrice = req.body.month_price;

        function getConnection(callback) {
            pool.getConnection(function (err, connection) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, connection);
                }
            })
        }

        function selectOrder(connection, callback) {
            var sql = "SELECT post_id " +
                "FROM bangdb.orders " +
                "WHERE user_id=? and post_id=? ";
            connection.query(sql, [user.id, postId], function (err, orders) {
                if (orders.length) {
                    var err = new Error("이미 주문된 소품입니다");
                    err.status = 401;
                    callback(err);
                } else {
                    callback(null, connection);
                }
            })
        }

        function insertOrder(connection, callback) {
            var sql = "INSERT INTO bangdb.orders(user_id, post_id, rental_start, rental_end, address, phone, paymethod, month_price) " +
                      "VALUES (" + connection.escape(user.id) + ", " + connection.escape(postId) + ", " +
                              " DATE_ADD(utc_timestamp(), INTERVAL 1 week), DATE_ADD(utc_timestamp(), INTERVAL " + connection.escape(period) + " month), " +
                              " aes_encrypt( " + connection.escape(address) + ", unhex(" + connection.escape(hexkey) + "))," +
                              " aes_encrypt(" + connection.escape(phone) + ", unhex(" + connection.escape(hexkey) + "))," +
                              " " + connection.escape(paymethod) + ", " + connection.escape(monthPrice) + ")";
            connection.query(sql, function (err, orderdetail) {
                connection.release();
                if (err) {
                    callback(err);
                } else {
                    callback(null, orderdetail.insertId);
                }
            })
        }

        async.waterfall([getConnection, selectOrder, insertOrder], function (err, orderId) {
            if (err) {
                err.code = "E00005";
                next(err);
            } else {
                console.log("orderId====>"+orderId);
                request.get({url: 'http://localhost/rentalpushes/'+ orderId}, function (err, httpResponse, body) {
                    console.log(body);
                    res.json({"result": {"message": "임대되었습니다"}});
                });
                // res.json({"result":{"message":"임대되었습니다"}});
            }
        })

    } else {
        var err = new Error('SSL/TLS Upgrade Required');
        err.status = 426;
        next(err);
    }
});

module.exports = router;