"use strict"; // run code in ES5 strict mode
(function () {
    var _my_uname = null;
    var _rtc_token = null;
    var _my_uid = null;

    $("#TANGRAM__PSP_8__submit").click(function () {
        var uname = $("#TANGRAM__PSP_8__userName")[0];
        _my_uname = uname.value;
        var password = $("#TANGRAM__PSP_8__password")[0];
        if(uname.value!=null && password.value != null && password.value != "" && uname.value != "") {
            console.log("login.....");
            console.log("username:" + uname.value);
            console.log("password:" + password.value);
        } else {
            console.log("......");
        }
    });
})();
