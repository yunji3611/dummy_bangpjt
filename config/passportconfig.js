var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcrypt');
var async = require('async');
var authConfig = require('./authconfig');
var FacebookTokenStrategy = require('passport-facebook-token');
var hexkey =  process.env.HEX_KEY;

module.exports = function (passport) {

    passport.serializeUser(function (user, done) {   // 사용자 정보를 session에 저장
        done(null, user.id);
    });

    passport.deserializeUser(function (id, done) {
        pool.getConnection(function (err, connection) {
            if (err) {
                done(err);
            } else {
                var sql = "SELECT id, username, email, facebook_id, facebook_token, facebook_name, registration_token, push  "+
                          "FROM bangdb.user "+
                          "WHERE id = ?";
                connection.query(sql, [id], function (err, members) {
                    connection.release();
                    if (err) {
                        done(err);
                    } else {
                        var user = {
                            "id": members[0].id,
                            "username": members[0].username,
                            "email": members[0].email,
                            "facebook_id": members[0].facebook_id,
                            "push": members[0].push
                        };
                        done(null, user);
                    }
                })
            }
        })
    });

    passport.use('local-login', new LocalStrategy({
        usernameField: "email",
        passwordField: "password",
        passReqToCallback: true
    }, function (req, username, password, done) {  // usernameField, passwordField

        var registration_token = req.body.token;

        function getConnection(callback) {
            pool.getConnection(function (err, connection) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, connection);
                }
            });
        }


        function selectUser(connection, callback) {
            var sql = "SELECT convert(aes_decrypt(email, unhex(" + connection.escape(hexkey) + ")) using utf8) as email, password, registration_token, id, push "+
                "FROM bangdb.user "+
                "WHERE email = aes_encrypt(" + connection.escape(username) + ", unhex(" + connection.escape(hexkey) + ")); ";
            connection.query(sql, function (err, members) {
                if (err) {
                    callback(err);
                } else {
                    if (members.length === 0) {
                        var err = new Error('사용자가 존재하지 않습니다');
                        err.code = "E00002";
                        callback(err);
                    } else {
                        var user = {
                            "id": members[0].id,
                            "email": members[0].email,
                            "hashPassword": members[0].password,
                            "registration_token": members[0].registration_token,
                            "push": members[0].push
                        };
                        console.log("hashpassword===>"+ user.hashPassword);
                        callback(null, user, connection);
                    }
                }
            });
        }

        function tokenUpdate(user, connection, callback) {

            var sql = "UPDATE bangdb.user "+
                "SET registration_token =? "+
                "WHERE id=? ";
            connection.query(sql, [registration_token, user.id], function (err) {
                connection.release();
                if (err) {
                    callback(err);
                } else {
                    callback(null, user);
                }
            })
        }

        function compareUserInput(user, callback) {
            bcrypt.compare(password, user.hashPassword, function (err, result) {
                if (err) {
                    callback(err);
                } else {
                    console.log("result===>"+ result);
                    if (result === true) {
                        callback(null, user);
                    } else {
                        callback(null, false);
                    }
                }
            });
        }


        async.waterfall([getConnection, selectUser, tokenUpdate, compareUserInput], function (err, user) {
            if (err) {
                done(err);
            } else {
                done(null, user);
            }
        });
    }));

    passport.use('facebook-token', new FacebookTokenStrategy({
        "clientID": authConfig.facebook.appId,
        "clientSecret": authConfig.facebook.appSecret,
        "profileFields": ["id", "displayName", "email"],
        "passReqToCallback": true
    }, function (req, accessToken, refreshToken, profile, done) {
        console.log(accessToken);

        var registration_token = req.body.token;

        function getConnection(callback) {
            pool.getConnection(function (err, connection) {
               if (err) {
                   callback(err);
               } else {
                   callback(null, connection);
               }
            });
        }


        function selectOrCreateUser (connection, callback) {
            var sql = "SELECT id, facebook_id, facebook_email, facebook_name, registration_token, push "+
                      "FROM bangdb.user "+
                      "WHERE facebook_id = ?";
            connection.query(sql, [profile.id], function (err, members) {
                if (err) {
                    connection.release();
                    callback(err);
                } else {
                    if (members.length === 0) {
                        var insert = "INSERT INTO bangdb.user (username, facebook_id, facebook_token, facebook_email, facebook_name, registration_token) " +
                                     "VALUES (?, ?, ?, ?, ?, ?) ";
                        connection.query(insert, [profile.displayName, profile.id, accessToken, profile.emails[0].value,
                                                   profile.displayName, registration_token], function (err, member) {
                            if (err) {
                                connection.release();
                                callback(err);
                            } else {
                                connection.release();
                                var user = {
                                    "id": member.insertId,
                                    "facebookId": profile.id,
                                    "facebookEmail": profile.emails[0],
                                    "facebookName": profile.displayName,
                                    "registration_token": member.registration_token
                                };
                                callback(null, user);
                            }
                        });

                    } else {  // member존재하는 경우
                        if (accessToken === members[0].facebook_token) {
                            connection.release();
                            var user = {
                                "id": members[0].id,
                                "facebookId": members[0].facebook_id,
                                "facebookUsername": members[0].facebook_name,
                                "facebookEmail": members[0].facebook_email,
                                "registration_token": members[0].registration_token,
                                "push": members[0].push
                            };
                            callback(null, user);
                        } else {
                           var update ="UPDATE bangdb.user " +
                                       "SET facebook_token = ?, registration_token =?  " +
                                       "WHERE facebook_id = ?";
                            connection.query(update, [accessToken, registration_token, profile.id], function (err, member) {
                                connection.release();
                                if (err) {
                                    callback(err);
                                } else {
                                    var user = {
                                        "id": members[0].id,
                                        "facebookId": members[0].facebook_id,
                                        "facebookUsername": members[0].facebook_name,
                                        "facebookEmail": members[0].facebook_email,
                                        "registration_token": member.registration_token,
                                        "push": members[0].push
                                    };
                                    callback(null, user);
                                }
                            });
                        }

                    }
                }
            })
        }


        async.waterfall([getConnection, selectOrCreateUser], function (err, user) {
            if (err) {
                done(err);
            } else {
                done(null, user);
            }
        });
    }))



};