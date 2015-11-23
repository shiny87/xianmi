var https = require('https');

function OAuth(client_id, client_secret) {
    this.client_id = client_id;
    this.client_secret = client_secret;
}

OAuth.prototype.getAccessInfo = function(code, redirect_uri, callback) {
    var req_url = "https://openapi.baidu.com/oauth/2.0/token?grant_type=authorization_code&code=" + code
            + "&client_id=" + this.client_id
            + "&client_secret=" + this.client_secret
            + "&redirect_uri=" + redirect_uri;

    console.log("[oauth.js]req_url:" + req_url);

    https.get(req_url, function(https_res) {
        var res_ok = false;
        console.log("statusCode: " + https_res.statusCode);
        console.log("headers: " + JSON.stringify(https_res.headers));
        if(https_res.statusCode == 200) {
            res_ok = true;
        }
        https_res.on('data', function(d) {
            console.log("response:" + d);
            if(!res_ok) {
                var info = JSON.parse(d);
                callback({'error': info.error},  {'info': info});
                return;
            }

            /*
             {
             "access_token": "1.a6b7dbd428f731035f771b8d15063f61.86400.1292922000-2346678-124328",
             "expires_in": 86400,
             "refresh_token": "2.385d55f8615fdfd9edb7c4b5ebdc3e39.604800.1293440400-2346678-124328",
             "scope": "basic email",
             "session_key": "ANXxSNjwQDugf8615OnqeikRMu2bKaXCdlLxn",
             "session_secret": "248APxvxjCZ0VEC43EYrvxqaK4oZExMB",
             }
             */
            var auth_info = JSON.parse(d);
            var req_url1 = "https://openapi.baidu.com/rest/2.0/passport/users/getLoggedInUser?access_token=" + auth_info.access_token;
            console.log("[oauth.js]:" + req_url1);
            https.get(req_url1, function(https_res) {
                /*
                 {
                 "uid":2346677,
                 "uname":"liupc24"
                 "portrait":"e2c1776c31393837313031319605"
                 }
                 response错误:
                 {
                 "error_code": "110",
                 "error_msg": "Access token invalid or no longer valid",
                 }
                 */
                https_res.on('data', function(d) {
                    console.log(d);
                    var user_info = JSON.parse(d);
                    if(user_info.error_code) {
                        callback({'error': user_info.error_code},  {'info':  user_info});
                        return;
                    }

                    callback(null, {'access_token': auth_info.access_token, 'baidu_uid': user_info.uid, 'uname': escape(user_info.uname)});
                });

            }).on('error', function(e) {
                console.error(e);
                callback({'error': e},  null);

            });


        });

    }).on('error', function(e) {
        callback({'error': e},  null);

    });



};

module.exports = OAuth;
