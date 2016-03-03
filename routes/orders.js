var express = require('express');
var async = require('async');
var router = express.Router();

function isLoggedIn(req, res, next){
    if(!req.isAuthenticated()) {
        var err = new Error("로그인이 필요합니다");
        err.status = 401;
        next(err);
    } else {
        next();
    }
}

// 임대게시물 주문
router.post ('/', isLoggedIn, function (req, res, next) {
    if (req.secure) {
        var user = req.user;
        var postId = req.body.post_id;
        var address = req.body.address;
        var phone = req.body.phone;
        var paymethod = req.body.paymethod;
        var monthPrice = req.body.month_price;

        function getConnection (callback) {
            pool.getConnection(function(err, connection) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, connection);
                }
            })
        }

        function selectOrder (connection, callback) {
            var sql = "SELECT post_id "+
                      "FROM bangdb.orders "+
                      "WHERE user_id=? and post_id=? ";
            connection.query(sql, [user.id, postId], function(err, orders) {
                if (orders.length) {
                    var err = new Error("이미 주문된 소품입니다");
                    err.status = 401;
                    callback(err);
                } else {
                    callback(null, connection);
                }
            })
        }

        function insertOrder (connection, callback) {
            var sql = "INSERT INTO bangdb.orders(user_id, post_id, address, phone, paymethod, month_price) "+
                      "VALUES (?, ?, ?, ?, ?, ?)";
            connection.query(sql, [user.id, postId, address, phone, paymethod, monthPrice], function (err, orderdetail) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, orderdetail);
                }
            })
        }

        async.waterfall([getConnection, selectOrder, insertOrder], function (err, orderdetail) {
            if (err) {
                next(err);
            } else {
                res.json("임대되었습니다");
            }
        })

    } else {
        var err = new Error('SSL/TLS Upgrade Required');
        err.status = 426;
        next(err);
    }
});

module.exports = router;