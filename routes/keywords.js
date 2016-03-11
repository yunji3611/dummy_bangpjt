var express = require('express');
var router = express.Router();
var async = require('async');


router.get('/', function(req, res, next) {
  function getConnection(callback) {
    pool.getConnection(function(err, connection) {
      if (err) {
        callback(err);
      } else {
        callback(null, connection);
      }
    });
  }

  var word = req.query.word;

  function selectKeyword(connection, callback){
    var sql = "SELECT tag "+
      "FROM hashtag "+
      "WHERE tag like '%"+word+"%' ";
    connection.query(sql, [], function(err, words) {
      if (err) {
        callback(err);
      } else {
        var word = [];
        async.each(words, function(item, cb) {
          word.push(item.tag);
          cb(null);
        }, function(err) {
          if (err) {
            callback(err);
          } else {
            var results = {
              "message" : "해당검색어에 대한 결과",
              "words" : word };
            console.log('단어' +words);
            callback(null, results);
          }
        })

      }
    });
  }

  async.waterfall([getConnection, selectKeyword], function(err, results) {
    if (err) {
      var err = {
        "code": "E00003",
        "message": "게시물 목록 조회에 실패하였습니다."
      }
      next (err);
    } else {
      res.json(results);
    }
  })


})



module.exports = router;