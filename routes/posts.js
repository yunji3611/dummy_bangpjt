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

//게시물 목록 조회
router.get('/', function (req, res, next) {
  var user = req.user;

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
  console.log('카테고리명:' + category);
  var limit = 10;
  var offset = (page - 1) * limit;


  if (category != 'community') {
    function selectPosts(connection, callback) {
      var post1 = "SELECT p.id, p.category, f.file_path, u.username, u.photo_path, count(s.post_id) as scrap " +
        "FROM post p LEFT JOIN file f ON(f.post_id = p.id) " +
        "LEFT JOIN scrap s ON(s.post_id = p.id) " +
        "LEFT JOIN user u ON(u.id = p.user_id) " +
        "WHERE p.category =? " +
        "GROUP BY p.id " +
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
      var state = 0;
      async.each(post_results, function (item, cb) {
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
              if (err) {
                cb(err);
              } else {
                //
                if (user) {
                  console.log("statesql====>" + state);
                  var statesql = "SELECT * " +
                    "FROM state " +
                    "WHERE post_id=? and user_id=?";
                  connection.query(statesql, [item.id, user.id], function (err, states) {
                    if (err) {
                      connection.release();
                      var err = new Error("state err 발생");
                      err.code = "E00003";
                      callback(err);
                    } else {
                      if (states.length) {
                        state = 1;
                      } else {
                        state = 0;
                      }
                      var postresult = {
                        "post_id": item.id,
                        "file_url": item.file_path,
                        "scrap_count": item.scrap,
                        "hash_tag": tagList,
                        "category": item.category,
                        "state": state
                      };
                      interiorList.push(postresult);
                      cb(null);
                    }
                  });
                } else {
                  var postresult = {
                    "post_id": item.id,
                    "file_url": item.file_path,
                    "scrap_count": item.scrap,
                    "hash_tag": tagList,
                    "category": item.category,
                    "state": state
                  };
                  interiorList.push(postresult);
                  cb(null);
                }

                //

              }
            });
          }
        })

      }, function (err) {
        connection.release();
        if (err) {
          err.code = "E00003";
          err.message = "임대게시물 목록 조회에 실패하였습니다.";
          callback(err);
        } else {
          var results =
          {
            "result": {
              "message": "임대 게시물 목록이 조회되었습니다.",
              "page": page,
              "listperPage": limit,
              "postData": {"interiorList": interiorList}
            }
          };
          callback(null, results);
        }
      })
    };

    async.waterfall([getConnection, selectPosts, resultJSON], function (err, result) {
      if (err) {

        next(err); //처리도중문제이거나 쿼리수행증..// 뭇
      } else {
        res.json(result);

      }
    });

  } else {
    function selectCommunity(connection, callback) {
      var community = "SELECT p.id, f.file_path, u.username, u.photo_path, count(s.post_id) as scrap " +
        "FROM post p LEFT JOIN file f ON(f.post_id = p.id) " +
        "LEFT JOIN scrap s ON(s.post_id = p.id) " +
        "LEFT JOIN user u ON(u.id = p.user_id) " +
        "WHERE p.category = ? " +
        "GROUP BY p.id " +
        "LIMIT ? OFFSET ? ";

      connection.query(community, [category, limit, offset], function (err, community_results) {
        if (err) {
          connection.release();
          callback(err);
        } else {
          callback(null, connection, community_results)
        }
      })

    }

    function resultJSON2(connection, community_results, callback) {
      var communityList = [];
      var state = 0;
      async.each(community_results, function (item, cb) {
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
              if (err) {
                cb(err);
              } else {
                //
                if (user) {
                  var statesql = "SELECT * " +
                    "FROM state " +
                    "WHERE post_id=? and user_id=?";
                  connection.query(statesql, [item.id, user.id], function (err, states) {
                    if (err) {
                      connection.release();
                      var err = new Error("state err 발생");
                      err.code = "E00003";
                      callback(err);
                    } else {
                      if (states.length) {
                        state = 1;
                      } else {
                        state = 0;
                      }
                      var postresult = {
                        "post_id": item.id,
                        "username": item.username,
                        "photo_url": item.photo_path,
                        "file_url": item.file_path,
                        "scrap_count": item.scrap,
                        "hash_tag": tagList,
                        "state": state
                      };
                      communityList.push(postresult);
                      cb(null);
                    }
                  });
                } else {
                  var postresult = {
                    "post_id": item.id,
                    "username": item.username,
                    "photo_url": item.photo_path,
                    "file_url": item.file_path,
                    "scrap_count": item.scrap,
                    "hash_tag": tagList,
                    "state": state
                  };
                  communityList.push(postresult);
                  cb(null);
                }


                //
              }
            });
          }
        })

      }, function (err) {
        connection.release();
        if (err) {
          err.code = "E00003";
          err.message = "커뮤니티 목록 조회에 실패하였습니다.";
          callback(err);

        } else {
          var results =
          {
            "result": {
              "message": "커뮤니티 게시물 목록이 조회되었습니다.",
              "page": page,
              "listperPage": limit,
              "postData": {"communityList": communityList}
            }
          };
          callback(null, results);
        }
      })
    };

    async.waterfall([getConnection, selectCommunity, resultJSON2], function (err, result) {
      if (err) {
        next(err); //처리도중문제이거나 쿼리수행증..// 뭇
      } else {
        res.json(result);

      }
    });

  } //else

});

//게시물 상세 조회
router.get('/:post_id', function (req, res, next) {

  var category = req.query.category;
  var pid = req.params.post_id;
  console.log('카테고리' + category);
  console.log('게시물id' + pid);

  if (category === 'community') {
    var replyList = [];
    var tagList = [];

    function getConnection(callback) {
      pool.getConnection(function (err, connection) {
        if (err) {
          callback(err);
        } else {
          callback(null, connection);
        }
      });
    }

    function communityDetail(connection, callback) {
      var sql = "SELECT p.id, f.file_path, u.username, u.photo_path, count(s.post_id) as scrap, p.content " +
        "FROM post p LEFT JOIN file f ON(f.post_id = p.id) " +
        "LEFT JOIN scrap s ON(s.post_id = p.id) " +
        "LEFT JOIN user u ON(u.id = p.user_id) " +
        "WHERE p.category ='community' and p.id = ? " +
        "GROUP BY p.id ";
      connection.query(sql, [pid], function (err, c_details) {
        if (err) {
          callback(err);
        } else {
          console.log('결과' + c_details);
          callback(null, c_details, connection);
        }
      });
    }

    function selectTags2(c_details, connection, callback) {
      var hash = "SELECT p.id, h.tag " +
        "FROM hashtag_has_post hp LEFT JOIN hashtag h ON (h.id = hp.hashtag_id) " +
        "LEFT JOIN post p on(p.id = hp.post_id) " +
        "WHERE p.id = ? ";

      connection.query(hash, [pid], function (err, tags) {
        if (err) {
          callback(err);
        } else {

          async.each(tags, function (item, cb) {
            tagList.push(item.tag);
            cb(null);
          }, function (err) {
            if (err) {
              err.code = "E00003";
              err.message = "해시태그 조회에 실패하였습니다.";
              callback(err);
            } else {

              callback(null, c_details, connection);
            }
          })
        }
      })
    }

    function selectReply2(c_details, connection, callback) {
      var replysql = "SELECT r.id, r.username as username, r.reply_content, r.reply_time " +
        "FROM reply r LEFT JOIN post p on(r.post_id = p.id) " +
        "WHERE p.id = ? ";

      connection.query(replysql, [pid], function (err, replies) {
        if (err) {
          callback(err);
        } else {
          async.each(replies, function (item2, cb2) {
            var reply = {
              "username": item2.username,
              "id": item2.id,
              "reply_content": item2.reply_content,
              "reply_time": item2.reply_time
            };
            replyList.push(reply);
            cb2(null);
          }, function (err) {
            connection.release();
            if (err) {
              err.code = "E00003";
              err.message = "커뮤니티 게시물 상세 조회에 실패하였습니다.";
              callback(err);
            } else {
              callback(null, c_details, replies);
            }
          })

        }
      })
    }

    async.waterfall([getConnection, communityDetail, selectTags2, selectReply2], function (err, results) {
      if (err) {
        next(err);
      } else {
        console.log('결과' + results);
        res.json({
          "result": {
            "message": "커뮤니티 게시물 상세페이지입니다",
            "detailData": {
              "post_id": results[0].id,
              "username": results[0].username,
              "photo_url": results[0].photo_path,
              "file_url": results[0].file_path,
              "scrap_count": results[0].scrap,
              "hash_tag": tagList,
              "reply": replyList,
              "content": results[0].content
            }
          }
        });
      }
    })
  }
  else {

    var tagList = [];
    var furnitureList = [];

    function getConnection(callback) {
      pool.getConnection(function (err, connection) {
        if (err) {
          callback(err);
        } else {
          callback(null, connection);
        }
      });
    }

    function interiorDetail(connection, callback) {
      var sql = "SELECT p.id, p.category, p.package, f.file_path,p.month_price, count(s.post_id) as scrap " +
        "FROM post p LEFT JOIN file f ON(f.post_id = p.id) " +
        "LEFT JOIN scrap s ON(s.post_id = p.id) " +
        "LEFT JOIN user u ON(u.id = p.user_id) " +
        "WHERE p.category NOT LIKE '%c%' and p.id=? " +
        "GROUP BY p.id ";
      connection.query(sql, [pid], function (err, i_details) {
        if (err) {
          connection.release();
          callback(err);
        } else {

          callback(null, i_details, connection);

        }
      });
    }

    function selectTags(i_details, connection, callback) {
      var hash = "SELECT p.id, h.tag " +
        "FROM hashtag_has_post hp LEFT JOIN hashtag h ON (h.id = hp.hashtag_id) " +
        "LEFT JOIN post p on(p.id = hp.post_id) " +
        "WHERE p.id = ? ";

      connection.query(hash, [pid], function (err, tags) {
        if (err) {
          callback(err);
        } else {
          async.each(tags, function (tag, cb) {
            tagList.push(tag.tag);
            cb(null);

          }, function (err) {
            if (err) {
              err.code = "E00003";
              err.message = "해시태그 조회에 실패하였습니다.";
              callback(err);
            } else {
              callback(null, i_details, connection);
            }
          });
        }
      })
    }


    function selectFurniture(i_details, connection, callback) {
      var furnituresql = "SELECT f.f_photo_path, f.brand, f.name, f.no, f.size, f.color_id, f.link, f.price " +
        "FROM furniture f LEFT JOIN post p ON(f.post_id = p.id) " +
        "LEFT JOIN color c ON(f.color_id = c.id) " +
        "WHERE p.id = ? ";

      connection.query(furnituresql, [pid], function (err, furnitures) {
        if (err) {
          callback(err);
        } else {
          async.each(furnitures, function (furnitures, cb2) {
            var furniture = {
              "furniture_url": furnitures.f_photo_path,
              "brand": furnitures.brand,
              "name": furnitures.name,
              "no": furnitures.no,
              "size": furnitures.size,
              "color_id": furnitures.color_id,
              "link": furnitures.link,
              "price": furnitures.price
            };
            furnitureList.push(furniture);
            cb2(null);

          }, function (err) {
            connection.release();
            if (err) {
              err.code = "E00003";
              err.message = "임대 게시물 상세 조회에 실패하였습니다.";
              callback(err);
            } else {
              callback(null, i_details);
            }
          })
        }
      })
    }


    async.waterfall([getConnection, interiorDetail, selectTags, selectFurniture], function (err, results) {
      if (err) {
        next(err);
      } else {
        console.log('결과' + results);
        console.log(results.id);
        res.json({
          "result": {
            "message": "임대 게시물 상세페이지입니다",
            "detailData": {
              "post_id": results[0].id,
              "file_url": results[0].file_path,
              "scrap_count": results[0].scrap,
              "package": results[0].package,
              "month_price": results[0].month_price,
              "hash_tag": tagList,
              //"reply": replyList,
              "furnitures": furnitureList
            }
          }
        });
      }
    })
  }


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


//게시물 등록
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

  var user = req.user;

  function uploadPhoto(connection, callback) {


    var form = new formidable.IncomingForm();
    form.uploadDir = path.join(__dirname, '../uploads');
    form.keepExtensions = true;

    var formFields = {};

    // tag[0] = '의자', tag[1] = '러그'
    // tag[] = '의자', tag[] = '러그'
    // tag = '의자', tag = '러그'

    form.on('field', function(name, value) {

      function makeFormFields(prop, val) {
        if (!formFields[prop]) {
          formFields[prop] = val;
        } else {
          if (formFields[prop] instanceof Array) { // 배열일 경우
            formFields[prop].push(val);
          } else { // 배열이 아닐 경우
            var tmp = formFields[prop];
            formFields[prop] = [];
            formFields[prop].push(tmp);
            formFields[prop].push(val);
          }
        }//
      }

      var re1 = /\[\]/;
      var re2 = /\[\d+\]/;
      if (name.match(re1)) {
        name = name.replace(re1, '');
      } else if (name.match(/\[\d+\]/)) {
        name = name.replace(re2, '');
      }
      makeFormFields(name, value);
    });

    form.parse(req, function (err, fields, files) {
      console.log("===================================================");
      console.log(req);
      console.log("===================================================");
      var file = files['photo'];
      console.log("파일의 내용 " + file.name);
      console.log("필드의 내용 " + formFields);
      var mimeType = mime.lookup(path.basename(file.path));
      var s3 = new AWS.S3({
        "accessKeyId": s3Config.key,
        "secretAccessKey": s3Config.secret,
        "region": s3Config.region,
        "params": {
          "Bucket": s3Config.bucket,
          "Key": s3Config.posts.imageDir + "/" + path.basename(file.path),
          "ACL": s3Config.imageACL,
          "ContentType": mimeType
        }
      });

      var body = fs.createReadStream(file.path);
      s3.upload({"Body": body}) //pipe역할
        .on('httpUploadProgress', function (event) {
          console.log(event);
        })
        .send(function (err, data) {
          if (err) {
            console.log(err);
            callback(err);
          } else {
            console.log("데이터의 정보 " + data);
            var location = data.Location;
            var originalFilename = file.name;
            var modifiedFilename = path.basename(file.path);
            fs.unlink(file.path, function () {
              console.log(files['photo'].path + " 파일이 삭제되었습니다...");
            });

                var sql = "insert into post (content, user_id) " +
                  "values (?, ?)";
                connection.query(sql, [formFields['content'], user.id], function (err, result) {
                  if (err) {
                    connection.rollback();
                    err.code = "E00005";
                    err.message = "게시물 등록이 실패하였습니다.";
                    connection.release();
                    callback(err);
                  } else {
                    var post_id = result.insertId;
                    console.log("포스트" + post_id);
                    var sql2 = "INSERT INTO file(post_id, file_path, file_name, original_name) " +
                      "VALUES (?, ?, ?, ?)";
                    connection.query(sql2, [post_id, location, modifiedFilename, originalFilename], function (err, result) {
                      if (err) {
                        connection.rollback();
                        connection.release();
                        err.code = "E00005";
                        err.message = "게시물 파일 업로드가 실패하였습니다.";
                        callback(err);
                      } else {


                        var hash_tag = formFields['tag'];
                        console.log('짠2' + (hash_tag instanceof Array));
                        console.log('태그' +hash_tag);

                        var tagid = "SELECT id FROM hashtag " +
                          "WHERE tag in(?)";
                        connection.query(tagid, [hash_tag], function (err, tags) {
                          if (err) {
                            connection.rollback();
                            connection.release();
                            callback(err);
                          } else {
                            async.eachSeries(tags, function(item, cb){
                            var sql = "INSERT INTO hashtag_has_post(hashtag_id, post_id) " +
                              "VALUES (?,?) ";
                              connection.query(sql, [item.id, post_id], function(err, result) {
                                if (err) {
                                  connection.release();
                                  cb(err);
                                } else {
                                  //console.log('ㅁㅁ'+post_id);
                                  //console.log('ㅁㅁ'+item.id);
                                  cb(null);
                                }
                              })

                            }, function(err) {
                              if (err) {
                              callback(err);
                            } else {
                              callback(null);
                            }
                          })
                          }
                        });
                      }//else
                  })
                };
             })
        };
        })

    })
  }

  async.waterfall([getConnection, uploadPhoto], function (err, result) {
    if (err) {
      next(err);
    } else {
      var result = {
        "result" :{"message": "게시물이 등록되었습니다."}

      }
      res.json(result);
    }
  });


});


//게시물 수정
router.put('/:post_id', isLoggedIn, function (req, res, next) {


  var postId = req.params.post_id;
  console.log('========postId========??' + postId);
  var form = new formidable.IncomingForm();
  form.uploadDir = path.join(__dirname, '../uploads');
  form.keepExtensions = true;
  form.multiples = true;
  form.maxFieldsSize = 2 * 1024 * 1024;

  console.log('==========form.parse들어간당==========');
  form.parse(req, function (err, fields, files) {
    console.log('==========form.parse들어간왔당==========누가????' + req.user.id);
    var user = req.user;
    var file = files['photo'];
    var content = fields['content'];
    console.log("content, file ===================>" + content + file);
    var location = "";
    var originalFileName = "";
    var modifiedFileName = "";
    var photoType = "";
    var mimeType = mime.lookup(path.basename(file.path));

    function getConnection(callback) {
      pool.getConnection(function (err, connection) {
        if (err) {
          callback(err);
        } else {
          callback(null, connection);
        }
      });
    }

    // 사진 하나올렸을 때, (커뮤니티 게시글)

    // 기존 파일 삭제
    function deletePhoto(connection, callback) {
      var sql = "SELECT p.id, file_path, file_name, original_name " +
        "FROM bangdb.post p   LEFT JOIN bangdb.file fi on(p.id = fi.post_id) " +
        "WHERE p.user_id = ? and p.id=?";
      connection.query(sql, [user.id, postId], function (err, photo_exit) {
        if (err) {
          callback(err);
        } else {
          console.log('====photo_exit[0].file_name :' + photo_exit[0].file_name);
          if (photo_exit.length === 0) {  // 파일이 없을 때
            console.log('사진이 존재하지 않습니다');
            callback(null, connection);
          } else {   // 파일이 들어 있을 때
            console.log('사진이 존재해서 이제 삭제할꺼예요');
            var s3 = new AWS.S3({
              "accessKeyId": s3Config.key,
              "secretAccessKey": s3Config.secret,
              "region": s3Config.region,
              "params": {
                "Bucket": s3Config.bucket,
                "Key": s3Config.posts.imageDir + "/" + photo_exit[0].file_name,
                "ACL": s3Config.imageACL,
                "ContentType": mimeType
              }
            });
            s3.deleteObject(s3.params, function (err, data) {
              if (err) {
                err.code = "E00004";
                err.message = "파일을 삭제할 수 없습니다.";
                connection.release();
                console.log(err, err.stack)
              } else {
                console.log(data);
                // db에서 삭제
                var deletesql = "DELETE FROM bangdb.file " +
                  "WHERE post_id=?";
                connection.query(deletesql, [postId], function (err, deleteResult) {
                  if (err) {
                    callback(err);
                  } else {
                    callback(null, connection);
                  }
                });
              }
            })
          }
        }
      })
    } // deletePhoto

    // 사진 insert
    function upDatePhoto(connection, callback) {
      console.log("mimtype===>" + mimeType);
      var s3 = new AWS.S3({
        "accessKeyId": s3Config.key,
        "secretAccessKey": s3Config.secret,
        "region": s3Config.region,
        "params": {
          "Bucket": s3Config.bucket,
          "Key": s3Config.posts.imageDir + "/" + path.basename(file.path),
          "ACL": s3Config.imageACL,
          "ContentType": mimeType
        }
      });
      console.log('===file.path=== :' + file.path);
      var body = fs.createReadStream(file.path);
      s3.upload({"Body": body}) //pipe역할
        .on('httpUploadProgress', function (event) {
          console.log(event);
        })
        .send(function (err, data) {
          if (err) {
            console.log(err);
            callback(err);
          } else {
            console.log("데이터Location의 정보 " + data.Location);
            location = data.Location;
            originalFileName = file.name;
            modifiedFileName = path.basename(file.path);
            photoType = file.type;
            fs.unlink(file.path, function () {
              console.log(files['photo'].path + " 파일이 삭제되었습니다...");
            });
            var filesql = "INSERT INTO bangdb.file(post_id, file_path, file_name, original_name) " +
              "VALUES (?, ?, ?, ?)";
            connection.query(filesql, [postId, location, modifiedFileName, originalFileName], function (err, result) {
              if (err) {
                err.code = "E00004";
                err.message = "파일을 업로드 할 수 없습니다.";
                callback(err);
              } else {
                // 수정할 내용이 있는지 없는지
                if (!content) {
                  callback(null);
                } else {
                  var contentsql = "UPDATE bangdb.post " +
                    "SET content = ? " +
                    "WHERE id=? and user_id=?";
                  connection.query(contentsql, [content, postId, user.id], function (err, result) {
                    connection.release();
                    if (err) {
                      err.code = "E00004";
                      err.message = "게시물을 수정할 수 없습니다.";
                      callback(err);
                    } else {
                      callback(null);
                    }
                  })
                } // content Update
              }
            });   // 큰 connection.query
          }
        }); //  .send
    } // upDatePhoto

    async.waterfall([getConnection, deletePhoto, upDatePhoto], function (err, result) {
      if (err) {
        next(err);
      } else {
        res.json('커뮤니티 게시글 사진 변경이 완료되었습니다');
      }
    }); // async.waterfall

  });   // form.parse
});

//게시물 삭제

router.delete('/:post_id', isLoggedIn, function (req, res, next) {
  var user = req.user;
  var postId = req.params.post_id;
  console.log('========postId========??' + postId);
  var form = new formidable.IncomingForm();
  form.uploadDir = path.join(__dirname, '../uploads');
  form.keepExtensions = true;
  form.multiples = true;
  form.maxFieldsSize = 2 * 1024 * 1024;

  form.parse(req, function (err, fields, files) {
    var user = req.user;
    var file = files['photo'];
    var content = fields['content'];
    var mimeType = mime.lookup(path.basename(files.path));

    function getConnection(callback) {
      pool.getConnection(function (err, connection) {
        if (err) {
          callback(err);
        } else {
          callback(null, connection);
        }
      });
    }

    function compareUser(connection, callback) {
      var sql = "SELECT user_id FROM post " +
        "WHERE id = ?";
      connection.query(sql, [postId], function (err, results) {
        if (err) {
          callback(err);
        } else {
          if (results[0].user_id !== user.id) {
            //console.log('삭제' + results[0].user_id);
            var err = new Error();
            err.code = "E00006";
            err.message = "삭제 권한이 없습니다.";
            callback(err);
          } else {
            callback(null, connection);
          }

        }
      })

    }

    function deleteTotal(connection, callback) {
      connection.beginTransaction(function (err) {
        if (err) {
          connection.release();
          callback(err);

        } else {
          function deleteReply(callback) {
            if (err) {
              console.log('댓글삭제실패');
              connection.release();
              callback(err);
            } else {
              var sql = "DELETE FROM reply " +
                "WHERE post_id = ? ";
              connection.query(sql, [postId], function (err, result) {
                if (err) {
                  console.log('댓글삭제2');
                  err.code = "E00006";
                  err.message = "댓글을 삭제할 수 없습니다.";
                  connection.release();
                  callback(err);
                } else {
                  console.log('댓글삭제');
                  callback(null);
                }
              });
            }
          }

          function deleteTags(callback) {
            if (err) {
              console.log('태그삭제실패');
              connection.rollback();
              connection.release();
              callback(err);
            } else {
              var sql = "DELETE FROM hashtag_has_post " +
                "WHERE post_id = ? ";
              connection.query(sql, [postId], function (err, result) {
                if (err) {
                  console.log('댓글삭제2');
                  err.code = "E00006";
                  err.message = "태그를 삭제할 수 없습니다.";
                  connection.release();
                  callback(err);
                } else {
                  callback(null);
                }
              });
            }
          }

          function deletePhoto(callback) {
            if (err) {
              console.log('포토삭제실패');
              connection.release();
              callback(err);
            } else {
              var sql = "SELECT p.id, file_path, file_name, original_name " +
                "FROM post p LEFT JOIN file fi on(p.id = fi.post_id) " +
                "WHERE p.user_id = ? and p.id=?";
              connection.query(sql, [user.id, postId], function (err, photo_exit) {
                if (err) {
                  connection.rollback();
                  connection.release();
                  callback(err);
                } else {
                  console.log("게시물아이디" + postId);
                  console.log("사용자아이디" + user.id);
                  //console.log('====photo_exit[0].file_name :' + photo_exit[0].file_name);
                  if (photo_exit.length === 0) {  // 파일이 없을 때
                    console.log('사진이 존재하지 않습니다');
                    callback(null, connection);
                  } else {   // 파일이 들어 있을 때
                    console.log('사진이 존재해서 이제 삭제할꺼예요');
                    var s3 = new AWS.S3({
                      "accessKeyId": s3Config.key,
                      "secretAccessKey": s3Config.secret,
                      "region": s3Config.region,
                      "params": {
                        "Bucket": s3Config.bucket,
                        "Key": s3Config.posts.imageDir + "/" + photo_exit[0].file_name,
                        "ACL": s3Config.imageACL,
                        "ContentType": mimeType
                      }
                    });
                    s3.deleteObject(s3.params, function (err, data) {
                      if (err) {
                        connection.release();
                        console.log(err, err.stack)
                      } else {
                        console.log(data);
                        // db에서 삭제
                        var deletesql = "DELETE FROM bangdb.file " +
                          "WHERE post_id=?";
                        connection.query(deletesql, [postId], function (err, deleteResult) {
                          if (err) {
                            err.code = "E00006";
                            err.message = "파일을 삭제할 수 없습니다.";
                            callback(err);
                          } else {
                            callback(null);

                          }
                        });
                      }
                    })
                  }
                }
              });
            }


          } // deletePhoto

          function deletePost(callback) {
            if (err) {
              connection.release();
              callback(err);
            } else {
              var sql = "DELETE from post " +
                "WHERE id = ? ";
              connection.query(sql, [postId], function (err, result) {

                if (err) {
                  err.code = "E00006";
                  err.message = "게시물을 삭제할 수 없습니다.";
                  connection.rollback();
                  connection.release();
                  callback(err);
                } else {
                  connection.commit();
                  connection.release();
                  callback(null);
                }
              });
            }
          }

          async.series([deleteReply, deleteTags, deletePhoto, deletePost], function (err, result) {
            if (err) {
              callback(err);
            } else {
              callback(null, result);
            }
          });
        }
      });
    }


//, deleteReply, deletePhoto, deletePost
    async.waterfall([getConnection, compareUser, deleteTotal], function (err, result) {
      if (err) {
        next(err);
      } else {
        var result = {"result": {"message": "게시물이 삭제되었습니다."}}
        res.json(result);
      }
    }); // async.waterfall

  });   // form.parse


});


//댓글 등록
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
      connection.release();
      if (err) {
        err.code = "E00005";
        err.message = "댓글을 등록할 수 없습니다.";
        callback(err);
      } else {
        callback(null);
      }
    })
  }

  async.waterfall([getConnection, insertReply], function (err, result) {
    if (err) {
      next(err);
    } else {
      request.get({url: 'http://localhost/replypushes/' + pid}, function (err, httpResponse, body) {
        console.log(body);
        var result = {
          "result": {
            "message": "댓글이 등록되었습니다."
          }
        };
        res.json(result);
      });
    }
  });

});

//댓글 삭제
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
    var sql = "select u.id as userid, u.username, r.post_id as rpostid, r.id as replyId " +
      "from reply r join (select id, username " +
      "from user) u " +
      "on (u.username = r.username) " +
      "where r.id=? and post_id=?";
    connection.query(sql, [rid, pid], function (err, results) {
      if (err) {
        connection.release();
        callback(err);
      } else {
        if (results[0].userid !== user.id) {
          console.log('확인' + results[0].userid);
          var err = new Error('삭제권한이 없습니다');
          err.code = "E00005";
          callback(err);
        } else {
          console.log('ㅇㅇㅇㅇ' + results);
          callback(null, results, connection);
        }

      }
    });
  }


  function deleteReply(results, connection, callback) {
    var deletesql = "delete from reply where id = ? ";
    console.log('결과' + results[0]);
    console.log('결과' + results[0].username);
    console.log('결과2' + results[0].rpostid);
    console.log('결과2' + results[0].replyId);
    connection.query(deletesql, [results[0].replyId], function (err, r_results) {
      connection.release();
      if (err) {
        err.code = "E00005";
        err.message = "댓글을 삭제할 수 없습니다.";
        console.log('???' + results[0].replyId);
        callback(err);
      } else {
        console.log('아이디' + results[0].replyId);
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
