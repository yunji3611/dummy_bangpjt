var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcrypt');
var async = require('async');
var authConfig = require('./authconfig');
var FacebookTokenStrategy = require('passport-facebook-token');

module.exports = function (passport) {

    passport.serializeUser(function (user, done) {   // 사용자 정보를 session에 저장
        done(null, user.id);
    });

    passport.deserializeUser(function (id, done) {
        pool.getConnection(function (err, connection) {
            if (err) {
                done(err);
            } else {
                var sql = "SELECT id, username, email, facebook_id, facebook_token, facebook_name  "+
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
                            "email": members[0].email

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
            var sql = "SELECT id, email, password " +
                      "FROM bangdb.user " +
                      "WHERE email = ?";
            connection.query(sql, [username], function (err, members) {
                connection.release();
                if (err) {
                    callback(err);
                } else {
                    if (members.length === 0) {
                        var err = new Error('사용자가 존재하지 않습니다');
                        callback(err);
                    } else {
                        var user = {
                            "id": members[0].id,
                            "email": members[0].email,
                            "hashPassword": members[0].password
                        };
                        callback(null, user);
                    }
                }
            });
        }

        function compareUserInput(user, callback) {
            bcrypt.compare(password, user.hashPassword, function (err, member) {
                if (err) {
                    callback(err);
                } else {
                    if (member) {
                        callback(null, user);
                    } else {
                        callback(null, false);
                    }
                }
            });
        }

        async.waterfall([getConnection, selectUser, compareUserInput], function (err, user) {
            if (err) {
                done(err);
            } else {
                done(null, user);
            }
        });
    }))

    passport.use('facebook-token', new FacebookTokenStrategy({
        "clientID": authConfig.facebook.appId,
        "clientSecret": authConfig.facebook.appSecret,
        "profileFields": ["id", "displayName", "email"]
    }, function (accessToken, refreshToken, profile, done) {
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
            var sql = "SELECT id, facebook_id, facebook_email, facebook_name "+
                      "FROM bangdb.user "+
                      "WHERE facebook_id = ?";
            connection.query(sql, [profile.id], function (err, members) {
                if (err) {
                    connection.release();
                    callback(err);
                } else {
                    if (members[0].length === 0) {
                        var insert = "INSERT INTO bangdb.user (facebook_id, facebook_username, facebook_token, facebook_email, facebook_name) " +
                                     "VALUES (?, ?, ?, ?, ?) ";
                        connection.query(insert, [profile.id, profile.username, accessToken, profile.emails[0],
                                                   profile.displayName], function (err, member) {
                            if (err) {
                                callback(err);
                            } else {
                                connection.release();
                                var user = {
                                    "id": member.insertId,
                                    "facebookId": profile.id,
                                    "facebookUsername": profile.username,
                                    "facebookEmail": profile.emails[0],
                                    "facebookName": profile.name
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
                                "facebookEmail": members[0].facebook_email
                            };
                            callback(null, user);
                        } else {
                           var update ="UPDATE bangdb.user " +
                                       "SET facebook_token = ? " +
                                       "WHERE facebook_id = ?";
                            connection.query(update, [accessToken, profile.id], function (err, member) {
                                connection.release();
                                if (err) {
                                    callback(err);
                                } else {
                                    var user = {
                                        "id": results[0].id,
                                        "facebookId": results[0].facebook_id,
                                        "facebookUsername": results[0].facebook_name,
                                        "facebookEmail": results[0].facebook_email
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