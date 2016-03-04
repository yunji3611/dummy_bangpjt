var express = require('express');
var router = express.Router();
var async = require('async');
var formidable = require('formidable');
var AWS = require('aws-sdk');
var s3Config = require('../config/s3_config');
var fs = require('fs');

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
        //form.maxFieldsSize = 2* 1024*1024;

        form.parse(req, function (err, fields, files) {
            var results = [];
            if (files['photo'] instanceof Array) {

            } else if (!files['photo']) {    // 2 사진 안올렸을 때

            } else {                         // 3 하나올렸을때
                var file = files['photo'];
                var mimeType = mime.lookup(path.basename(file.path));

                var s3 = new AWS.S3({
                    "accessKeyId": s3Config.key,
                    "secretAccessKey": s3Config.secret,
                    "region": s3Config.region,
                    "params": {
                        "Bucket": s3Config.bucket,
                        "Key": s3Config.mypages.imageDir + "/" + path.basename(file.path),
                        "ACL": s3Config.imageACL,
                        "ContentType": "image/jpeg"
                    }
                });


                var body = fs.createReadStream(file.path);
                s3.upload({"Body": body})
                    .on('httpUploadProgress', function (event) {
                        console.log(event);
                    })
                    .send(function (err, data) {
                        if (err) {
                            console.log(err);
                            cb(err);
                        } else {
                            console.log(data);
                            fs.unlink(file.path, function () {
                                console.log(file.path + "파일이 삭제되었습니다...");
                                results.push({"s3URL": data.Location});   // db에는 data.location저게 들어가야해
                                res.json(results);
                                cb();
                            });
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

module.exports = router;