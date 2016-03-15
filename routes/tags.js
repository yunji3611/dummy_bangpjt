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
  var page = parseInt(req.query.page);
  page = isNaN(page) ? 1 : page;

  console.log('tag:', tag);
  console.log(page);

  var limit = 10;
  var offset = (page - 1) * limit;

  if (tag != null) {

    function selectPosts(connection, callback) {
      var post1 = "SELECT p.id, f.file_path, u.username, u.photo_path, h.tag, count(s.post_id) as scrap, p.category, p.content " +
        "FROM post p LEFT JOIN file f ON(f.post_id = p.id) " +
        "LEFT JOIN scrap s ON(s.post_id = p.id) " +
        "LEFT JOIN user u ON(u.id = p.user_id) " +
        "LEFT JOIN hashtag_has_post hp ON(p.id = hp.post_id) " +
        "LEFT JOIN hashtag h ON(h.id=hp.hashtag_id) " +
        "WHERE h.tag like '%" + tag + "%' " +//'% tag %'
        "GROUP BY p.id " +
        "LIMIT ? OFFSET ?";
      connection.query(post1, [limit, offset], function (err, posts) {
        if (err) {
          callback(err);
        } else {
          console.log('포스트' + posts);
          callback(null, connection, posts);
        }
      })

    }


    function selectTags(connection, posts, callback) {
      var postlist = [];
      async.each(posts, function (item, cb) {
        var hashtag = "SELECT h.tag " +
          "FROM hashtag_has_post hp LEFT JOIN hashtag h ON (h.id = hp.hashtag_id) " +
          "LEFT JOIN post p on(p.id = hp.post_id) " +
          "WHERE p.id = ? ";
        connection.query(hashtag, [item.id], function (err, hashtags) {
          if (err) {
            connection.release();
            cb(err);
          } else {
            var tagList = [];
            async.each(hashtags, function (tags, cb2) {

              tagList.push(tags.tag);
              cb2(null);
            }, function (err) {
              connection.release();
              if (err) {
                cb(err);
              } else {
                var postresult = {

                    "post_id": item.id,
                    "username" :item.username,
                    "photo_url" :item.photo_path,
                    "file_url": item.file_path,
                    "scrap_count": item.scrap,
                    "hash_tag": tagList,
                    "category": item.category,
                    "content": item.content

                };
                postlist.push(postresult);
                cb(null, postlist);
              }
            });
          }
        })

      }, function (err) {
        connection.release();
        if (err) {
          callback(err);
        } else {
          var postList = postlist;
          var results =
          {
            "result": {
              "message": "해당 검색어에대한 게시물이 조회되었습니다.",
              "page": page,
              "listperPage": limit,
              "postData":{"postList":postList}
            }
          };
          callback(null, results);
        }
      })
    };

    async.waterfall([getConnection, selectPosts, selectTags], function (err, result) {
      if (err) {
        var err = {
          "code": "E00003",
          "message": "검색어 조회에 실패하였습니다."
        }
        next(err);
      } else {
        res.json(result);

      }
    });
  }
});

    module.exports = router;