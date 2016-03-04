var express = require('express');
var router = express.Router();
var async = require('async');

router.get('/', function (req, res, next) {
  function getConnection(callback) {
    pool.getConnection(function (err, connection) {
      if (err) {
        callback(err);
      } else {
        callback(null, connection);
      }
    });
  }
  var tag = req.query.tag;
  //var post_type = parseInt(req.query.post_type);
  var page = parseInt(req.query.page);
  page = isNaN(page) ? 1 : page;
  //post_type = post_type > 1 ? 0 : post_type;
  console.log('tag:', tag);
  console.log(page);


  var limit = 10;
  var offset = (page - 1) * limit;
  function selectPosts(connection, callback) {

    var post1 = "select p.id, p.content, p.category, u.username, u.photo_path, fi.file_path "+
      "from post p left join file fi on(p.id = fi.post_id) " +
      "left join (select id, username, photo_path from user) u "+
      "on(p.user_id = u.id) ";


    if(tag != null) {
      //console.log('nn');
      var select = "left join hashtag_has_post hp on (p.id = hp.post_id) "+
          "left join hashtag h on (h.id = hp.hashtag_id) " +
          "where h.tag like " + '"%' + tag + '%"'
        ;
      post1 += select;
      post1 += "group by p.id " +
               "limit ? offset ? ";
      //console.log(select);

    }
    connection.query(post1, [limit, offset], function (err, results) {
      if (err) {
        callback(err);
      } else {
        callback(null, connection, results);
      }
    });
  }

  function selectPosts2(connection, results, callback) {
    var hashtag = "select h.tag " +
      "from hashtag_has_post hp join hashtag h on (h.id = hp.hashtag_id) " +
      "join post p on(p.id=hp.post_id) " +
      "where p.id= ?";

    var furniture = "select f.fphoto_path as furniture_url, f.brand, f.name, f.no, f.size, f.color_id, f.link "+
      "from furniture f join post p on(f.post_id = p.id) " +
      "join color c on(f.color_id = c.id) "+
      "where p.id = ? ";

    var reply = "select r.username as username, r.reply_content, r.reply_time " +
      "from reply r join post p on(r.post_id = p.id) " +
      "where  p.id = ? ";

    var index = 0;
    async.eachSeries(results, function (element, cb1) {
      async.series([function (cb2) {
        connection.query(hashtag, [element.id], function (err, tag_results) {
          if (err) {
            cb2(err);
          } else {
            results[index].tag = tag_results;
            cb2(null);
          }
        });

      }, function (cb2) {
        connection.query(furniture, [ element.id], function (err, furniture_results) {
          if (err) {
            cb2(err);
          } else {
            results[index].furnitures = furniture_results;
            console.log(furniture_results);
            cb2(null);
          }
        });
      }, function (cb2) {
        connection.query(reply, [ element.id], function (err, reply_results) {
          if (err) {
            cb2(err);
          } else {
            results[index].replies = reply_results;
            cb2(null);
          }
        });
      }], function (err) {
        if (err) {
          cb1(err);
        } else {
          index++;
          cb1(null);
        }
      });
    }, function (err) {
      connection.release();
      if (err) {
        callback(err);
      } else {

        callback(null, results);
      }
    });
  }

  function resultJSON(results, callback) {
    var postList = [];
    async.eachSeries(results, function (results, cb) {
      var postresult = {

        "post_id": results.id,
        "username": results.username,
        "photo_url": results.photo_path,
        "file_url": results.file_path,
        "scrap_count": "확인",

        "hash_tag": results.tag,
        "category": results.category,
        "content": results.content,
        "furnitures": results.furnitures,

        //"reply_username": results.replys.r_username,
        "reply": results.replies


      };
      postList.push(postresult);
      cb(null);

    }, function (err) {
      if (err) {
        callback(err);
      } else {
        var results =
        {
          "result": {
            "message": "해당 검색에어대한 게시물 목록이 조회되었습니다.",
            "data": {
              //"count": results.length,
              "page": page,
              "listperPage": limit
            },
            "postList": postList
          }

        };
        callback(null, results);
      }
    });
  }


  async.waterfall([getConnection, selectPosts, selectPosts2, resultJSON], function (err, result) {
    if (err) {
      next(err); //처리도중문제이거나 쿼리수행증..// 뭇
    } else {
      res.json(result);

    }
  });
});

module.exports = router;