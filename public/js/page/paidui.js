$(function() {

	$.getJSON(baseURL + '/queueing?method=queueGet&pos=current', function (data) {
		if (data.error_code !== 200) {
			alert(data.error_msg);
			return ;
		}
		var tid = data.param.tid;

		$.getJSON(baseURL + '/tradeQuery?tid=' + tid, function (data) {
			if (data.error_code !== 200) {
				alert(data.error_msg);
				return ;
			}
			var d = data.param;

			// data format
			$.each(d.trades, function (i, n) {
				n.ctid = n.tid.substr(n.tid.length - 4);
				n.fetch_time = n.fetch_detail.fetch_time;
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

		$.ajax({
			type: 'POST',
			url: baseURL + '/queueing',
			data: JSON.stringify({method:  'queuePop', tid: tid}),
			dataType:'json', 
			success: function(data){
				if (data.error_code !== 200) {
				alert(data.error_msg);
				return ;
			}

			$.ajax({
				type: 'POST',
				url: baseURL + '/tradeUpdate',
				data: JSON.stringify({method:  'updateFetchStatus', tid:  tid, fetchStatus: 1}),
				dataType:'json', 
				success: function(data){
					if (data.error_code !== 200) {
					alert(data.error_msg);
					return ;
				}
				alert('订单号：' + data.param.tid + ' 已成功发货！');
				}
			});

		});


	});

});