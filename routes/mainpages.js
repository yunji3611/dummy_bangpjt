var express = require('express');
var async= require('async');

var router = express.Router();

router.get('/', function (req, res, next) {
  function getConnection(callback) {
    pool.getConnection(function(err, connection) {
      if (err) {
        next(err);
      } else {
        callback(null, connection)
      }
    })
  }

  function selectMain (connection, callback) {
    var sql = "SELECT p.id, p.category, p.content, f.file_path, count(p.id) as count, count(s.post_id) as scrap "+
              "FROM post p LEFT JOIN file f ON(f.post_id = p.id) "+
              "LEFT JOIN scrap s ON(s.post_id = p.id) "+
              "WHERE p.category IS NOT NULL "+
              "group by category";
    connection.query(sql, [], function(err, results) {
      if (err) {
        connection.release();
        callback(err);
      } else {
        callback(null, results);
      }
    })
  }
  var mainList = [];
  function resultJSON(results, callback) {
    async.eachSeries(results, function (item, cb) {
      var mainresult = {
        "mainList": {
          "post_id": item.id,
          "file_url": item.file_path,
          "scrap_count": item.scrap,
          "post_count": item.count,
          "category": item.category,
          "content": item.content
        }
      };
      mainList.push(mainresult);
      cb(null);

    }, function (err) {
      if (err) {
        callback(err);
      } else {
        var results =
        {
          "result": {
            "message": "메인페이지가 조회되었습니다.",
            "mainData": mainList
          }

        };
        callback(null, results);
      }
    });
  }

  async.waterfall([getConnection, selectMain, resultJSON], function (err, result) {
    if (err) {
      var err = {
        "code": "E00003",
        "message": "메인 조회에 실패하였습니다."
      }
      next(err);
    } else {
      res.json(result);

    }
  });

});


module.exports = router;
