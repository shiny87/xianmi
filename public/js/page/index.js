$(function() {
	var phoneNumber = window.util.getUrlRequest()['phoneNumber'];

	if (phoneNumber) {
		$.getJSON(baseURL + '/tradeQuery?phoneNumber=' + phoneNumber, function () {
			if (data.error_code !== 200) {
				alert(data.error_msg);
				return ;
			}
			var d = data.param;

			// data format
			$.each(d.trades, function (i, n) {
				n.ctid = n.tid.substr(n.tid.length - 4);
			});

			var t = $('[tpl=index_list]').text();
			var c = Mustache.render(t, d);
			$('#index_list').html(c);
		});
	}
	
	$('#userPhone').val(phoneNumber);

	var reg = /^0?1[3|4|5|8][0-9]\d{8}$/;
	$('#search_btn').click(function () {
		var pNum = $('#userPhone').val();

		if (!reg.test(pNum)) {
			alert('手机号格式错误');
		}

		location.href = location.origin + location.pathname + '?phoneNumber=' + pNum; 
		return false;
	})

	$('#index_list').on('click', '[tid]', function () {
		var tid = $(this).attr('tid');

		$.post(baseURL + '/queueing', {method:  'queuePush', tid: tid}, function(data){
			if (data.error_code !== 200) {
				alert(data.error_msg);
				return ;
			}
			alert('已加入排队，订单号：' + data.params.tid);
		});
	});

});