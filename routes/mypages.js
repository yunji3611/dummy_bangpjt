var express = require('express');
var router = express.Router();
var async = require('async');
var formidable = require('formidable');
var AWS = require('aws-sdk');
var s3Config = require('../config/s3_config');
var fs = require('fs');
var mime = require('mime');
var path = require('path');

function isLoggedIn(req, res, next) {
    if (!req.isAuthenticated()) {
        var err = new Error('로그인이 필요합니다');
        err.status = 401;
        next(err);
    } else {
        next();
    }
}

// 마이페이지 조회
router.get('/', isLoggedIn, function (req, res, next) {
    if (req.secure) {
        var user = req.user;

        function getConnection(callback) {
            pool.getConnection(function (err, connection) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, connection);
                }
            })
        }

        function selectUser(connection, callback) {
            var sql = "SELECT username, photo_path " +
                "FROM bangdb.user " +
                "WHERE id = ?";
            connection.query(sql, [user.id], function (err, info) {
                connection.release();
                if (err) {
                    callback(err);
                } else {
                    callback(null, info)
                }
            })
        }

        function resultJSON(info, callback) {
            var result = {
                "username": info[0].username,
                "photo_url": info[0].photo_path
            };
            callback(null, result);
        }

        async.waterfall([getConnection, selectUser, resultJSON], function (err, result) {
            if (err) {
                next(err);
            } else {
                res.json({
                    "result": {
                        "message": "프로필이 조회되었습니다",
                        "mypageData": result
                    }
                });
            }
        })
    } else {
        var err = new Error('SSL/TLS Upgrade Required');
        err.status = 426;
        next(err);
    }
});


// 마이페이지 프로필 사진 수정 (사진 하나)
router.put('/', isLoggedIn, function (req, res, next) {
    if (req.secure) {
        var form = new formidable.IncomingForm();
        form.uploadDir = path.join(__dirname, '../uploads');
        form.keepExtensions = true;
        form.multiples = false;
        form.maxFieldsSize = 2 * 1024 * 1024;

        form.parse(req, function (err, fields, files) {
            var user = req.user;
            var file = files['photo'];
            var location = "";
            var originalFileName = "";
            var modifiedFileName = "";
            var photoType = "";
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

            function deletePhoto(connection, callback) {
                var sql = "SELECT mf_photo_name " +
                          "FROM bangdb.user " +
                          "WHERE id = ?";
                connection.query(sql, [user.id], function (err, photo_exit) {
                    if (err) {
                        callback(err);
                    } else {
                        console.log('====photo_exit[0].mf_photo_name :' + photo_exit[0].mf_photo_name);
                        if (photo_exit[0].mf_photo_name === null) {  // 파일이 없을 때
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
                                    "Key": s3Config.mypages.imageDir + "/" + photo_exit[0].mf_photo_name,
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
                                    callback(null, connection);
                                }
                            })
                        }
                    }
                })
            } // deletePhoto

            function upDatePhoto(connection, callback) {
                var s3 = new AWS.S3({
                    "accessKeyId": s3Config.key,
                    "secretAccessKey": s3Config.secret,
                    "region": s3Config.region,
                    "params": {
                        "Bucket": s3Config.bucket,
                        "Key": s3Config.mypages.imageDir + "/" + path.basename(file.path),
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
                            var sql = "UPDATE bangdb.user " +
                                      "SET photo_path= ?, ori_photo_name=?, mf_photo_name=? " +
                                      "WHERE id=?";
                            connection.query(sql, [location, originalFileName, modifiedFileName, user.id], function (err, result) {
                                connection.release();
                                if (err) {
                                    callback(err);
                                } else {
                                    callback(null, result);
                                }
                            })   // connection.query
                        }
                    })  //  .send

            } // upDatePhoto

            async.waterfall([getConnection, deletePhoto, upDatePhoto], function (err, result) {
                if (err) {
                    next(err);
                } else {
                    res.json('프로필 사진 변경이 완료되었습니다');
                }
            }); // async.waterfall
        });

    } else {
        var err = new Error('SSL/TLS Upgrade Required');
        err.status = 426;
        next(err);
    }
});

module.exports = router;