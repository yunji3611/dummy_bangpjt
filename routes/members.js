var express = require('express');
var bcrypt = require('bcrypt');
var async = require('async');
var passport = require('passport');
var hexkey =  process.env.HEX_KEY;

var router = express.Router();


// 회원가입
router.post('/', function (req, res, next) {
    if (req.secure) {
        var username = req.body.username;
        var email = req.body.email;
        var password = req.body.password;
        // var preferences

        function getConnection(callback) {
            pool.getConnection(function(err, connection) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, connection);
                }
            });
        }

        function selectMember(connection, callback) {
            console.log('selectmember=========' + hexkey);
            var sql = "SELECT email "+
                      "FROM bangdb.user "+
                      "WHERE email = aes_encrypt(" + connection.escape(email) + ", unhex(" + connection.escape(hexkey) + ")); ";
            connection.query(sql, function (err, members) {
                if (err) {
                    callback(err);
                } else {
                    if (members.length) {
                        var err = new Error('아이디 중복!!');
                        err.status = 409;
                        err.code = "E00001";
                        callback(err);
                    } else {
                        callback(null, connection);
                    }
                }
            });
        }

        function generateSalt (connection, callback) {
            var rounds = 10;    // 횟수 default : 10
            bcrypt.genSalt(rounds, function (err, salt) {
               if (err) {
                   callback(err);
               } else {
                   callback(null, salt, connection);
               }
            });
        }

        function generateHashPassword (salt, connection, callback) {
            bcrypt.hash(password, salt, function (err, hashPassword) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, hashPassword, connection)
                }
            })
        }

        function insertMember(hashPassword, connection, callback) {
            console.log('insertmember=========');
            var sql = "INSERT INTO user(username, email, password) "+
                       "VALUES (" + connection.escape(username) + ", aes_encrypt(" + connection.escape(email) + ", unhex(" + connection.escape(hexkey) + ")), " + connection.escape(hashPassword) + ");";
            connection.query(sql, function (err, member) {
                connection.release();
                if (err) {
                    callback(err);
                } else {
                    callback(null, member);
                }
            })
        }

        async.waterfall([getConnection, selectMember, generateSalt, generateHashPassword, insertMember], function (err, result) {
            if (err) {
                next(err);
            } else {
                result.message = "회원가입이 완료되었습니다.";
                res.json({
                    "result": result
                });
            }
        })


    } else {
        var err = new Error('SSL/TLS Upgrade Required');
        err.status = 426;    // https가 들어와야하는데 http가 들어왔을 때
        next(err);
    }
});




//로그인(로컬)
router.post('/login', function (req, res, next) {
   if (req.secure) {
       passport.authenticate('local-login', function (err, user, info) {
           if (err) {
             next(err);
           } else if (!user) {
               var err = new Error('암호를 확인해주세요');
               err.status = 401;
               err.code = "E00002";
               next(err);
           } else {
               req.logIn(user, function (err) {
                   if (err) {
                       next(err);
                   } else {
                       console.log("req.user :"+req.user.id);
                       res.json({
                            "result":{"message": "로그인 되었습니다",
                                        "id": req.user.id}
                       });
                       //res.json(user);

                   }
               });
           }
       })(req, res, next);
   } else {
       var err = new Error('SSL/TLS Upgrade Required');
       err.status = 426;
       next(err);
   }
});

//로그인(페이스북)
router.post('/facebook/token', function (req, res, next) {
    if (req.secure) {
        passport.authenticate('facebook-token', function (err, user, info) {
            if (err) {
                var err = new Error("facebook 로그인 에러");
                next(err);
            } else {
                req.login(user, function (err) {
                    if (err) {
                        next(err);
                    } else {
                        res.json({
                            "result": {"message": "페이스북 로그인 되었습니다"}
                        });
                        // res.json(user);
                    }
                })
            }
        })(req, res, next);
    } else {
        var err = new Error('SSL/TLS Upgrade Required');
        err.status = 426;
        next(err);
    }
});

module.exports = router;