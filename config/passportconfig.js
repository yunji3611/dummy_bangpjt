var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcrypt');
var async = require('async');

module.exports = function (passport) {

    passport.serializeUser(function (user, done) {   // 사용자 정보를 session에 저장
        done(null, user.id);
    });

    passport.deserializeUser(function (id, done) {
        pool.getConnection(function (err, connection) {
            if (err) {
                done(err);
            } else {
                var sql = "SELECT id, username "+
                          "FROM bangdb.user "+
                          "WHERE id = ?";

                connection.query(sql, [id], function (err, members) {
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
        usernameField: "email",  //
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
            var sql = "SELECT email, password " +
                      "FROM bangdb.user " +
                      "WHERE email = ?";
            connection.query(sql, [email], function (err, members) {
                connection.release();
                if (err) {
                    callback(err);
                } else {
                    if (members.length === 0) {
                        var err = new Error('사용자가 존재하지 않습니다');
                        callback(err);
                    } else {
                        var user = {
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
                callback(err);
            } else {
                callback(null, connection);
            }
        });

    }))

};