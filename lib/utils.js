function Utils() {

}

Utils.prototype.checkAuth = function(req, res, next) {
    if(req.query.baidu_uid && req.query.access_token) {
        req.session.authinfo = {'baidu_uid': req.query.baidu_uid, 'access_token': req.query.access_token,  'uname': req.query.uname, 'account_type': 'baidu_oauth'};
    }else  if(req.query.baidu_uid && req.query.dbuss) {
        req.session.authinfo = {'baidu_uid': req.query.baidu_uid, 'bduss': req.query.bduss,  'uname': req.query.uname, 'account_type': 'passport'};
    }else if(req.query.rtc_uid) {
        req.session.authinfo = {'rtc_uid': req.query.rtc_uid, 'rtc_token': req.query.rtc_token,  'uname': req.query.uname, 'account_type': 'rtc'};
    }

    if(!req.session.authinfo) {
        res.redirect("/login");
        return false;
    }

    if(next)
        next();

    return true;
};
Utils.prototype.makeAuthGetStr = function(req, res) {
    var str = "";
    var authinfo = req.session.authinfo;

    if(authinfo) {
        if(authinfo.rtc_uid)
            str += "rtc_uid=" + authinfo.rtc_uid + "&";
        if(authinfo.baidu_uid)
            str += "baidu_uid=" + authinfo.baidu_uid + "&";
        if(authinfo.access_token)
            str += "access_token=" + authinfo.access_token + "&";
        if(authinfo.bduss)
            str += "bduss=" + authinfo.bduss + "&";
        if(authinfo.rtc_token)
            str += "rtc_token=" + authinfo.rtc_token + "&";
        if(authinfo.uname)
            str += "uname=" + authinfo.uname + "&";
    }
    if(req.session.session_id)
        str += "ssn_id=" + req.session.session_id + "&";

    return str;
};
module.exports = Utils;
