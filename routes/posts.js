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

    var post_type = parseInt(req.query.post_type);
    var page = parseInt(req.query.page);
    page = isNaN(page) ? 1 : page;
    post_type = post_type > 1 ? 0 : post_type;
    //var category =

    //var postList = [];
    var limit = 10;
    var offset = (page - 1) * limit;
    function selectPosts(connection, callback) {

        var post1 = "select p.id, p.content, p.category, u.username, u.photo_path, fi.file_path " +
          "from post p left join file fi on(p.id = fi.post_id) " +
          "left join (select id, username, photo_path from user) u " +
          "on(p.user_id = u.id) " +
          "where post_type =0 " +
          "limit ? offset ?  ";

        connection.query(post1, [limit, offset], function (err, results) {
            if (err) {
                callback(err);
            } else { //ddd
                callback(null, connection, results);
            }
        });
    }

    function selectPosts2(connection, results, callback) {
        var hashtag = "select h.tag " +
          "from hashtag_has_post hp join hashtag h on (h.id = hp.hashtag_id) " +
          "join post p on(p.id=hp.post_id) " +
          "where post_type= ? and  p.id= ?";

        var furniture = "select f.fphoto_path as furniture_url, f.brand, f.name, f.no, f.size, f.color_id, f.link "+
          "from furniture f join post p on(f.post_id = p.id) " +
          "join color c on(f.color_id = c.id) "+
          "where post_type= ? and p.id = ? ";

        var reply = "select  r.username as username, r.reply_content, r.reply_time " +
          "from reply r join post p on(r.post_id = p.id) " +
          "where post_type= ? and p.id = ? ";

        var index = 0;
        async.eachSeries(results, function (element, cb1) {
            async.series([function (cb2) {
                connection.query(hashtag, [post_type, element.post_id], function (err, tag_results) {
                    if (err) {
                        cb2(err);
                    } else {
                        results[index].hash_tag = tag_results;
                        cb2(null);
                    }
                });

            }, function (cb2) {
                connection.query(furniture, [post_type, element.post_id], function (err, furniture_results) {
                    if (err) {
                        cb2(err);
                    } else {
                        results[index].furnitures = furniture_results;
                        console.log(furniture_results);
                        cb2(null);
                    }
                });
            }, function (cb2) {
                connection.query(reply, [post_type, element.post_id], function (err, reply_results) {
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
                    console.log(index);
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
                "photo_url": results.photo_path,
                "file_url": results.file_path,
                "scrap_count": "확인",
                // "post_count": "",
                "hash_tag": results.tag,
                "category": results.category,
                "furnitures": results.furnitures,
                "content": results.content,
                //"reply_username": results.replys.username,
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
                        "message": "게시물 목록이 조회되었습니다.",
                        "postData": {
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
    var user = req.user.id;
    console.log('userid:' ,user.id);
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
        var sql = "insert into post (post_type, content,category, package, user_id) "+
          "values (?, ?, ?, ?, ?)";
        var values = [];
        values.push(req.body.post_type);
        values.push(req.body.content);
        values.push(req.body.category);
        values.push(req.body.package);
        values.push(user.id);
        connection.query(sql, values, function (err, result) {
            connection.release();
            if (err) {
                callback(err);
            } else {
                callback(null, {"message": "게시물이 등록되었습니다."

                });
            }
        });
    }
    async.waterfall([getConnection, insertPost], function (err, result) {
        if (err) {
            next(err);
        } else {
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

    var user = { "id" : req.user.id ,
        "post_id" : req.query.post_id };
    console.log('userid2:' ,user.id);

    function getConnection(callback) {
        pool.getConnection(function (err, connection) {
            if (err) {
                callback(err);
            } else {
                callback(null, connection);
            }
        });
    }
    function compareUserId (connection, callback) {
        var sql = "select user_id " +
          "from post "+
          "where id = ? ";
        connection.query(sql, [user.post_id], function(err, user_results) {

            console.log('userresults:',user_results[0].user_id);
            if (err) {
                callback(err);
            } else {
                if(user.id === user_results[0].user_id) {
                    callback(null, connection);
                } else  {
                    var err = {"message":"삭제실패"};
                    callback(err);
                }

            }
        });
    }
    function deletePost(connection, callback) {
        var deletesql = "delete from post " +
          "where id = ? ";

        connection.query(deletesql, [user.post_id], function(err, result) {
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
    console.log('정보',user);
    var pid = req.params.post_id;
    console.log('유저',user.username);

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
                callback(null, {"message": "댓글이 등록되었습니다."

                });
            }
        })
    }

    async.waterfall([getConnection, insertReply], function(err, result) {
        if (err) {
            next(err);
        } else {
            res.json(result);
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
          "from user) u "+
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
        var deletesql = "delete from reply where id = ? " ;
        connection.query(deletesql, [rid], function (err, r_results) {
            connection.release();
            if (err) {
                callback(err);
            } else {
                callback(null);

            }
        });
    }
    async.waterfall([getConnection, compareUser, deleteReply], function(err, result) {
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
