$(function() {

	$.getJSON(baseURL + '/queueing?method=queueGet&pos=current', function (data) {
		if (data.error_code !== 200) {
			alert(data.error_msg);
			return ;
		}
		var tid = data.params.tid;

		$.getJSON(baseURL + '/tradeQuery?tid=' + tid, function (data) {
			if (data.error_code !== 200) {
				alert(data.error_msg);
				return ;
			}
			var d = data.param;

			// data format
			$.each(d.trades, function (i, n) {
				n.ctid = n.tid.substr(n.tid.length - 4);
				var orderStr = [];
				$.each(n.orders, function (j, order) {
					orderStr.push(order.title + '(' + order.sku_id + ') * ' + order.num);
				});
				n.order_info = orderStr.join(' ;');
			});

			var t = $('[tpl=paidui_list]').text();
			var c = Mustache.render(t, d);
			$('#paidui_list').html(c);
		});

	});


	$('#paidui_list').on('click', '[tid]', function () {
		var tid = $(this).attr('tid');

		$.post(baseURL + '/queueing', {method:  'queuePop', tid: tid}, function(data){
			if (data.error_code !== 200) {
				alert(data.error_msg);
				return ;
			}

			$.post(baseURL + '/tradeUpdate', {method:  'updateFetchStatus', tid:  tid, fetchStatus: 1}, function(data){
				if (data.error_code !== 200) {
					alert(data.error_msg);
					return ;
				}
				alert('订单号：' + data.params.tid + ' 已成功发货！');
			});
		});
	});

});