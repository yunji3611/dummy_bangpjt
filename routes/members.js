var express = require('express');
var bcrypt = require('bcrypt');
var async = require('async');
var passport = require('passport');


var router = express.Router();


// 회원가입
router.post('/', function (req, res, next) {
    if (req.secure) {

        var username = req.body.username;
        var email = req.body.email;
        var password = req.body.password;

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
            var sql = "SELECT email "+
                      "FROM bangdb.user "+
                      "WHERE email = ?";
            connection.query(sql, [email], function (err, members) {
                connection.release();
                if (err) {
                    callback(err);
                } else {
                    if (members.length) {
                        var err = new Error('아이디 중복!!');
                        err.status = 409;
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
            var sql = "insert into bangdb.user(username, email, password) "+
                       "values (?, ?, ?)";
            connection.query(sql, [username, email, hashPassword], function (err, member) {
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
                result.message = "회원가입이 완료되었습니다."
                res.json(result);
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
               next(err);
           } else {
               req.logIn(user, function (err) {
                   if (err) {
                       next(err);
                   } else {
                       console.log("req.user :"+req.user.id);
                       res.json({
                           "message": "로그인 되었습니다"
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
                next(err);
            } else {
                req.login(user, function (err) {
                    if (err) {
                        next(err);
                    } else {
                        res.json({
                            "message": "페이스북 로그인 되었습니다"
                        });
                        // res.json(user);
                    }
                })
            }
        })
    } else {
        var err = new Error('SSL/TLS Upgrade Required');
        err.status = 426;
        next(err);
    }
});

module.exports = router;