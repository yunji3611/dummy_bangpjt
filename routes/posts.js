var express = require('express');
var router = express.Router();
var async = require('async');
var formidable = require('formidable');
var path = require('path');
var fs = require('fs');
var AWS = require('aws-sdk');
var s3Config = require('../config/s3_config');
var mime = require('mime');
var request = require('request');

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

  var category = req.query.category;
  var page = parseInt(req.query.page);
  page = isNaN(page) ? 1 : page;

  console.log('카테고리명:' +category);
  var limit = 10;
  var offset = (page - 1) * limit;

  function selectPosts(connection, callback) {

    var post1 = "SELECT p.id, p.category, f.file_path, u.username, u.photo_path, count(s.post_id) as scrap "+
                "FROM post p LEFT JOIN file f ON(f.post_id = p.id) "+
                "LEFT JOIN scrap s ON(s.post_id = p.id) "+
                "LEFT JOIN user u ON(u.id = p.user_id) "+
                "WHERE p.category =? "+
                "GROUP BY p.id "+
                "LIMIT ? OFFSET ? ";

    connection.query(post1, [category, limit, offset], function (err, post_results) {
      if (err) {
        callback(err);
      } else { //ddd
        callback(null, connection, post_results);
      }
    });
  }

  function resultJSON(connection, post_results, callback) {
    var interiorList = [];
    async.each(post_results, function (item, cb) {
      var hashtag = "SELECT h.tag " +
        "FROM hashtag_has_post hp LEFT JOIN hashtag h ON (h.id = hp.hashtag_id) " +
        "LEFT JOIN post p on(p.id = hp.post_id) " +
        "WHERE p.id = ? ";

      var furniture = "SELECT f.fphoto_path, f.brand, f.name, f.no, f.size, f.color_id, f.link "+
      "FROM furniture f LEFT JOIN post p ON(f.post_id = p.id) "+
      "LEFT JOIN color c ON(f.color_id = c.id) "+
      "WHERE p.id = ? ";

      var reply = "SELECT r.username as username, r.reply_content, r.reply_time "+
      "FROM reply r LEFT JOIN post p on(r.post_id = p.id) "+
      "WHERE p.id = ? ";

      connection.query(hashtag, [item.id], function (err, hashtags) {
        if (err) {
          connection.release();
          cb(err);
        } else {
          var tagList = [];
          async.each(hashtags, function (tags, cb2) {
            var result = {
              "tag": tags.tag
            };
            tagList.push(result);
            cb2(null);
          }, function (err) {
            if (err) {
              cb(err);
            } else {
              var postresult = {

                "post_id": item.id,
                "username": item.username,
                "photo_url": item.photo_path,
                "file_url": item.file_path,
                "scrap_count": item.scrap,
                "hash_tag": tagList,
                "category": item.category,
                "content": item.content
                //"furnitures": hashtags.furnitures,
                //"reply": hashtags.replies

              };
              interiorList.push(postresult);
              cb(null);
            }
          });
        }
      })

    }, function (err) {
      connection.release();
      if (err) {

      } else {
        var results =
        {
          "result": {
            "message": "임대 게시물 목록이 조회되었습니다.",
            "page": page,
            "listperPage": limit,
            "postData": interiorList
          }

        };
        callback(null, results);
      }
    })
  };


  //  var furniture = "select f.fphoto_path as furniture_url, f.brand, f.name, f.no, f.size, f.color_id, f.link " +
  //    "from furniture f join post p on(f.post_id = p.id) " +
  //    "join color c on(f.color_id = c.id) " +
  //    "where post_type= ? and p.id = ? ";
  //
  //  var reply = "select  r.username as username, r.reply_content, r.reply_time " +
  //    "from reply r join post p on(r.post_id = p.id) " +
  //    "where post_type= ? and p.id = ? ";
  //
  //  var index = 0;
  //  async.eachSeries(results, function (element, cb1) {
  //    async.series([function (cb2) {
  //      connection.query(hashtag, [post_type, element.post_id], function (err, tag_results) {
  //        if (err) {
  //          cb2(err);
  //        } else {
  //          results[index].hash_tag = tag_results;
  //          cb2(null);
  //        }
  //      });
  //
  //    }, function (cb2) {
  //      connection.query(furniture, [post_type, element.post_id], function (err, furniture_results) {
  //        if (err) {
  //          cb2(err);
  //        } else {
  //          results[index].furnitures = furniture_results;
  //          console.log(furniture_results);
  //          cb2(null);
  //        }
  //      });
  //    }, function (cb2) {
  //      connection.query(reply, [post_type, element.post_id], function (err, reply_results) {
  //        if (err) {
  //          cb2(err);
  //        } else {
  //          results[index].replies = reply_results;
  //          cb2(null);
  //        }
  //      });
  //    }], function (err) {
  //      if (err) {
  //        cb1(err);
  //      } else {
  //        index++;
  //        console.log(index);
  //        cb1(null);
  //      }
  //    });
  //  }, function (err) {
  //    connection.release();
  //    if (err) {
  //      callback(err);
  //    } else {
  //
  //      callback(null, results);
  //    }
  //  });
  //}
  //
  //function resultJSON(results, callback) {
  //  var postList = [];
  //
  //
  //  async.eachSeries(results, function (results, cb) {
  //    var postresult = {
  //
  //      "post_id": results.id,
  //      "username": results.username,
  //      "photo_url": results.photo_path,
  //      "file_url": results.file_path,
  //      "scrap_count": "확인",
  //      "hash_tag": results.tag,
  //      "category": results.category,
  //      "content": results.content,
  //      "furnitures": results.furnitures,
  //      "reply": results.replies
  //
  //
  //    };
  //    postList.push(postresult);
  //    cb(null);
  //
  //  }, function (err) {
  //    if (err) {
  //      callback(err);
  //    } else {
  //      var results =
  //      {
  //        "result": {
  //          "message": "게시물 목록이 조회되었습니다.",
  //          "page": page,
  //          "listperPage": limit,
  //          "postData": postList
  //        }
  //
  //      };
  //      callback(null, results);
  //    }
  //  });
  //}

  async.waterfall([getConnection, selectPosts, resultJSON], function (err, result) {
    if (err) {
      var err = {
        "code": "E00003",
        "message": "게시물 목록 조회에 실패하였습니다."
      }
      next(err); //처리도중문제이거나 쿼리수행증..// 뭇
    } else {
      res.json(result);

    }
  });

});


function isLoggedIn(req, res, next) {
  if (!req.isAuthenticated()) {
    var err = new Error('로그인이 필요합니다..');
    err.status = 401;
    next(err);
  } else {
    next();

  }
}

router.post('/', isLoggedIn, function (req, res, next) {


  function getConnection(callback) {
    pool.getConnection(function (err, connection) {
      if (err) {
        callback(err);
      } else {
        callback(null, connection);
      }
    });
  }

  function insertPost(connection, callback) {
    var form = new formidable.IncomingForm();
    form.uploadDir = path.join(__dirname, '../uploads');
    form.keepExtensions = true;
    form.multiples = true;

    form.parse(req, function(err, fields, files) {
      var file = files['photo'];
      var mimeType = mime.lookup(path.basename(files.path));
      if (files['photo'] instanceof  Array) {
        async.each(files['photo'], function(file, cb) {
          var s3 = new AWS.S3({
            "accessKeyId" : s3Config.key,
            "secretAccessKey" : s3Config.secret,
            "region" : s3Config.region,
            "params" : {
              "Bucket" : s3Config.bucket,
              "Key": s3Config.posts.imageDir + "/" + path.basename(file.path), //목적지의 이름을 만들어줌.
              "ACL": s3Config.imageACL,
              "ContentType" : mimeType
            }
          });
          var body = fs.createReadStream(file.path);
          s3.upload({"Body": body})
            .on('httpUploadProgress', function (event) {
              console.log(event);
            })
            .send(function (err, data) {
              if (err) {
                cb(err);
              } else {
                var user = req.user.id;
                var location = data.Location;
                var originalFile = file.name;
                var modifiedFile = path.basename(file.path);
                var post_type = req.body.post_type;
                var content = req.body.content;
                var package = req.body.package;

                console.log('데이터정보'+location);
                console.log('원본파일' +originalFile);
                console.log('수정파일' +modifiedFile);
                var sql = "insert into post (post_type, content, category, package, user_id) " +
                  "values (?, ?, ?, ?, ?) ";
                connection.query(sql, [fields['post_type'], fields['content'], fields['category'], fields['package'], user], function (err, result) {
                  if (err) {

                    callback(err);
                  } else {
                    post_id = result.insertId;
                    var sql2 = "insert into file (file_path, file_name, post_id, original_name) " +
                      "values ( ?, ?, ?, ?)" ;
                    connection.query(sql2, [location, originalFile, post_id, modifiedFile], function(err, result) {
                      if (err) {
                        connection.release();
                        callback(err);
                      } else {

                        var sql3 = "";
                        connection.query(sql3,[], function(err, result) {
                          if (err) {
                            connection.release();
                            callback(err);
                          } else {
                            var sql4 = "";
                            connection.query(sql4, [], function(err, result) {
                              if (err) {
                                connection.release();
                                callback(err);
                              } else {
                                var sql5 = "";

                              }
                            })
                          }
                        })
                        var fileId = result.insertId;
                        callback(null, connection);
                      }
                    })

                  }
                });
              }
            })
        })
      } else {


      }


    })


  }






  async.waterfall([getConnection, insertPost], function (err, result) {
    if (err) {
      var err = {
        "code" : "E00005",
        "message" : "게시물 등록이 실패하였습니다."
      }
      next(err);
    } else {
      var result = {
        "message" : "게시물이 등록되었습니다."
      }
      res.json(result);
    }
  });
});



router.put('/', function (req, res, next) {
  var result = {
    "result": {
      "message": "게시물이 수정되었습니다.",
      "data": {
        "id": 33,
        "content": "게시물 내용",
        "file": "사진"
      }
    }
  }
  res.json(result);

});

router.delete('/', function (req, res, next) {

  var user = {
    "id": req.user.id,
    "post_id": req.query.post_id
  };
  console.log('userid2:', user.id);

  function getConnection(callback) {
    pool.getConnection(function (err, connection) {
      if (err) {
        callback(err);
      } else {
        callback(null, connection);
      }
    });
  }

  function compareUserId(connection, callback) {
    var sql = "select user_id " +
      "from post " +
      "where id = ? ";
    connection.query(sql, [user.post_id], function (err, user_results) {

      console.log('userresults:', user_results[0].user_id);
      if (err) {
        callback(err);
      } else {
        if (user.id === user_results[0].user_id) {
          callback(null, connection);
        } else {
          var err = {"message": "삭제실패"};
          callback(err);
        }

      }
    });
  }

  function deletePost(connection, callback) {
    var deletesql = "delete from post " +
      "where id = ? ";

    connection.query(deletesql, [user.post_id], function (err, result) {
      connection.release();
      if (err) {
        callback(err);
      } else {
        callback(null);
      }
    })
  }

  async.waterfall([getConnection, compareUserId, deletePost], function (err, result) {
    if (err) {
      next(err);
    } else {
      var result = {
        "result": {
          "message": "게시물이 삭제되었습니다."
        }
      };
      res.json(result);
    }
  });
});


router.post('/:post_id/replies', isLoggedIn, function (req, res, next) {

  var user = req.user;
  console.log('정보', user);
  var pid = req.params.post_id;
  console.log('유저', user.username);

  console.log('게시울아이디', pid);

  function getConnection(callback) {
    pool.getConnection(function (err, connection) {
      if (err) {
        callback(err);
      } else {
        callback(null, connection);
      }
    });
  }

  function insertReply(connection, callback) {
    var sql = "insert into reply (username, reply_time, reply_content, post_id) " +
      "values (?, now(), ?, ?) ";
    var values = [];
    values.push(user.username);
    values.push(req.body.reply_content);
    values.push(pid);

    connection.query(sql, values, function (err, result) {
      if (err) {
        callback(err);
      } else {
        callback(null, {
          "message": "댓글이 등록되었습니다."

        });
      }
    })
  }

  async.waterfall([getConnection, insertReply], function(err, result) {
    if (err) {
      next(err);
    } else {
      request.post('/replypushes', {form: {key:'post_id'}}, function(err, resp) {
        res.json(result);
      });
    }
  });

});

router.delete('/:post_id/replies/:reply_id', isLoggedIn, function (req, res, next) {

  var user = req.user;
  var pid = req.params.post_id;
  var rid = req.params.reply_id;

  console.log('사용자정보', user);
  console.log('게시물', pid);
  console.log('댓글아이디', rid);

  function getConnection(callback) {
    pool.getConnection(function (err, connection) {
      if (err) {
        callback(err);
      } else {
        callback(null, connection);
      }
    })
  }

  function compareUser(connection, callback) {
    var sql = "select u.id as userid, u.username, r.post_id as rpostid, r.id as replyid " +
      "from reply r join (select id, username " +
      "from user) u " +
      "on (u.username = r.username) " +
      "where u.id=? and r.id=? and post_id=?";
    connection.query(sql, [user.id, rid, pid], function (err, results) {
      if (err) {
        connection.release();
        callback(err);
      } else {
        callback(null, connection);
      }
    });
  }

  function deleteReply(connection, callback) {
    var deletesql = "delete from reply where id = ? ";
    connection.query(deletesql, [rid], function (err, r_results) {
      connection.release();
      if (err) {
        callback(err);
      } else {
        callback(null);

      }
    });
  }

  async.waterfall([getConnection, compareUser, deleteReply], function (err, result) {
    if (err) {
      next(err);
    } else {
      var result = {
        "result": {
          "message": "게시물의 댓글이 삭제되었습니다."
        }
      };
      res.json(result);
    }
  });

});

//var test = parseInt(1);
//console.log(test);


module.exports = router;
