var s3 = {
    "key" : process.env.BANG_S3_KEY,
    "secret" : process.env.BANG_S3_SECRET,
    "region" :"ap-northeast-2",
    "bucket" :"bangpjt",
    "imageACL": "public-read",
    "mypages": {"imageDir": "mypages"},
    "posts": {"imageDir": "posts"}
};

module.exports = s3;