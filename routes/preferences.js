var express = require('express');
var async = require('async');
var router = express.Router();

// 취향조사
router.get('/', function (req, res, next) {

    function getConnection (callback) {
        pool.getConnection(function (err, connection) {
            if (err) {
                callback (err);
            } else {
                callback(null, connection);
            }
        })
    }

    function selectQuestion (connection, callback) {
        var sql = "SELECT id, question "+
                  "FROM bangdb.questionary";
        connection.query(sql, [], function(err, questions) {
            if (err) {
                callback(err);
            } else {
                callback(null, questions, connection);
            }
        })
    }

    function resultJSON (questions, connection, callback) {
        var preferList = [];
        async.each(questions, function(question, cb1) {
            var sql = "SELECT i.item_seq as iseq, i.item as item "+
                    "FROM bangdb.questionary q JOIN bangdb.item i "+
                    "ON (q.id = i.questionary_id) " +
                    "WHERE q.id =?";
            connection.query(sql, [question.id], function (err, item) {
                if (err) {
                    cb1(err);
                } else {
                    console.log('===질문 id=== :' + question.id);
                    var itemList = [];
                    async.each(item, function (item, cb2) {
                        var items = {
                            "seq": item.iseq,
                            "item": item.item
                        };
                        itemList.push(items);
                        cb2(null);
                    }, function (err) {
                        if (err) {
                            cb1(err);
                        } else {
                            var result = {
                                "questionary_id": question.qid,
                                "questionary": question.question,
                                "item": itemList
                            };
                            preferList.push(result);
                            cb1(null);
                        }
                    });
                }
            });  // query

        }, function(err){
            connection.release();
            if (err) {
                callback(err);
            } else {
                callback(null, preferList);
            }
        });
    }

    async.waterfall([getConnection, selectQuestion, resultJSON], function (err, preferList) {
        if (err) {
            next(err);
        } else {
            res.json({
                "result" : {
                    "message" : "취향조사 설문내용이 전달되었습니다",
                    "preferData": preferList
                }
            })
        }
    })
});

module.exports = router;