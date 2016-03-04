var express = require('express');
var gcm = require('node-gcm');
var router = express.Router();

function isLoggedIn(req, res, next) {
    if (!req.isAuthenticated()) {
        var err = new Error('로그인이 필요합니다');
        err.status = 401;
        next(err);
    } else {
        next();
    }
}

// 임대 알림
router.post('/', isLoggedIn, function (req, res, next) {

    var message = new gcm.Message({
        collapseKey: 'demo',
        delayWhileIdle: true,
        timeToLive: 3,
        data: {
            lecture_id:"notice",
            title:"임대기간알림",
            desc: "임대기간이 일주일 남았습니다"
        }
    });

    var server_access_key = "안드로이드 개발자가 넘겨준 서버키";
    var sender = new gcm.Sender(server_access_key);
    var registrationIds = [];
    var registration_id = "안드로이드 registration_id 값";
    registrationIds.push(registration_id);

// Send to a topic, with no retry this time
    sender.sendNoRetry(message, { topic: '/topics/global' }, function (err, response) {
        if(err) {
            console.error(err);
        } else {
            console.log(response);
        }
    });

    sender.send(message, registrationIds, 4, function (err, response) {
        if(err) {
            console.error(err);
        } else {
            console.log(response);
        }
    });


});

module.exports = router;