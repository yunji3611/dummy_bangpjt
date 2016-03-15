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
          connection.release();
          if (err) {
            err.code = "E00003";
            err.message = "검색한 게시물 조회가 실패하였습니다.";
            callback(err);
          } else {
            var results = {
              "result" :{
                "message" : "해당검색어에 대한 결과",
                "words" : word }
              }

            console.log('단어' +words);
            callback(null, results);
          }
        })

      }
    });
  }

  async.waterfall([getConnection, selectKeyword], function(err, results) {
    if (err) {

      next (err);
    } else {
      res.json(results);
    }
  })


})



module.exports = router;