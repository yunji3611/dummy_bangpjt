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
        var sql = "SELECT q.question as question, i.questionary_id as qid, i.item_seq as iseq, i.item as item "+
                  "FROM bangdb.questionary q JOIN bangdb.item i "+
                  "ON (q.id = i.questionary_id)";
        connection.query(sql, [], function(err, questions) {
            connection.release();
            if (err) {
                callback(err);
            } else {
                callback(null, questions);
            }
        })
    }

    function resultJSON (questions, callback) {
        var preferList = [];
        var index =0;
        async.each(questions, function(item, callback) {
            var result = {
                "questionary_id": questions[index]["qid"],
                "questionary": questions[index]["question"],
                "item_seq": questions[index]["iseq"],
                "item": questions[index]["item"]
            };
            index++;
            preferList.push(result);
            callback(null);

        }, function(err){
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