$(document).ready(function() {
    new TradingView.widget({
          "width": '100%',
          "height": '431px',
          "symbol": 'DJI',
          "interval": "D",
          "container_id": "tradingview",
          "timezone": "Etc/UTC",
          "theme": "Dark",
          "style": "1",
          "locale": "en",
          "toolbar_bg": "#f1f3f6",
          "enable_publishing": false,
          "hide_side_toolbar": true,
          "details": false,
          "allow_symbol_change": true,
          "hideideas": true,
          "show_popup_button": true,
          "popup_width": "1000",
          "popup_height": "650"
        });

    $('#submit_stock').click(function() {
        var stock_input = $('#input_stock').val();

        console.log(stock_input);

        // make sure we have user input
        if (stock_input) {
            // API Request to yahoo finance for stock info
            var api_url = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.quotes%20where%20symbol%3D%22INPUT%22&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=quote";
            var my_url = api_url.replace("INPUT", stock_input);

            // ajax request to yahoo finance using JSONP
            $.ajax({
                url: my_url,
                dataType: 'jsonp',
                jsonp: 'callback',
                jsonpCallback: 'quote'
            }).done(function(data) {
                var stock = data.query.results.quote;
                var p_change = parseFloat(stock.ChangeinPercent);

                console.log(stock);
                // use the queried data to fill in html
                $('.stock_name').html(stock.Name + " <span class='stock_symbol'>(" + stock.Symbol + ")</span>");
                $('.stock_price').html("$" + stock.LastTradePriceOnly + ' ' + stock.Currency + " <span class='p_change'>( " + p_change + "% )</span>");

                if (p_change < 0) {
                    $('.p_change').css('color', 'red');
                } else {
                    $('.p_change').css('color', 'green');
                }

                $('.stock_change').text(stock.Change);
                if (p_change < 0) {
                    $('.stock_change').css('color', 'red');
                } else {
                    $('.stock_change').css('color', 'green');
                }

                $('.stock_open').text('$' + stock.Open);
                $('.stock_range').text('$' + stock.DaysRange);
                $('.stock_cap').text(stock.MarketCapitalization);
                $('.stock_year_range').text('$' + stock.YearRange);
                $('.target_price').text('$' + stock.OneyrTargetPrice);

                if (stock.OneyrTargetPrice < stock.LastTradePriceOnly) {
                    $('.target_price').css('color', 'red');
                } else {
                    $('.target_price').css('color', 'green');
                }

                // Get the widget for the stock chart from tradingview
                new TradingView.widget({
                      "width": '100%',
                      "height": '431px',
                      "symbol": stock.Symbol,
                      "interval": "D",
                      "container_id": "tradingview",
                      "timezone": "Etc/UTC",
                      "theme": "Dark",
                      "style": "1",
                      "locale": "en",
                      "toolbar_bg": "#f1f3f6",
                      "enable_publishing": false,
                      "hide_side_toolbar": true,
                      "details": false,
                      "allow_symbol_change": true,
                      "hideideas": true,
                      "show_popup_button": true,
                      "popup_width": "1000",
                      "popup_height": "650"
                    });

                // Google Trends API
                var google_url = '/google/stock';

                $.ajax({
                    url: google_url.replace('stock', stock.Name),
                    dataType: 'json'
                }).done(function(data) {
                    // console.log(data.default.timelineData);
                    var chart_labels = [];
                    var chart_data = [];
                    for (var i = 0; i < data.default.timelineData.length; i++) {
                        chart_labels.push(data.default.timelineData[i].formattedTime);
                        chart_data.push(data.default.timelineData[i].value[0]);
                    }

                    var options = {
                        width: '100%',
                        height: '300px',
                        axis : {
                            x : {
                                type : 'timeseries',
                                tick: {
                                    fit: true, format: "%e %b %y"
                                }
                            }
                        }
                    }

                    new Chartist.Line('.gtrends-chart', {
                        labels: chart_labels,
                        series: [
                            chart_data,
                        ]
                    }, options);
                });

                // Use Twitter API to perform sentiment analysis
                var twitter_url = '/twitter/stock';

                $.ajax({
                    url: twitter_url.replace('stock', stock.Name),
                    dataType: 'json'
                }).done(function(data) {
                    // console.log(data);
                    var chart = new Chartist.Pie('.twitter-chart', {
                      series: [data.total_negative*-1, data.total_positive, data.total_neutral],
                      labels: [1, 2]
                    }, {
                      donut: true,
                      showLabel: false
                    });

                    chart.on('draw', function(data) {
                      if(data.type === 'slice') {
                        // Get the total path length in order to use for dash array animation
                        var pathLength = data.element._node.getTotalLength();

                        // Set a dasharray that matches the path length as prerequisite to animate dashoffset
                        data.element.attr({
                          'stroke-dasharray': pathLength + 'px ' + pathLength + 'px'
                        });

                        // Create animation definition while also assigning an ID to the animation for later sync usage
                        var animationDefinition = {
                          'stroke-dashoffset': {
                            id: 'anim' + data.index,
                            dur: 1000,
                            from: -pathLength + 'px',
                            to:  '0px',
                            easing: Chartist.Svg.Easing.easeOutQuint,
                            // We need to use `fill: 'freeze'` otherwise our animation will fall back to initial (not visible)
                            fill: 'freeze'
                          }
                        };

                        // If this was not the first slice, we need to time the animation so that it uses the end sync event of the previous animation
                        if(data.index !== 0) {
                          animationDefinition['stroke-dashoffset'].begin = 'anim' + (data.index - 1) + '.end';
                        }

                        // We need to set an initial value before the animation starts as we are not in guided mode which would do that for us
                        data.element.attr({
                          'stroke-dashoffset': -pathLength + 'px'
                        });

                        // We can't use guided mode as the animations need to rely on setting begin manually
                        // See http://gionkunz.github.io/chartist-js/api-documentation.html#chartistsvg-function-animate
                        data.element.animate(animationDefinition, false);
                      }
                    });

                    var score = data.total_positive + (data.total_negative * -1) + data.total_neutral;
                    $(".twitter_positive").text(Math.ceil((data.total_positive / score)*100) + '%');
                    $(".twitter_negative").text(Math.ceil((data.total_negative*-1 / score)*100) + '%');
                    $(".twitter_neutral").text(Math.ceil((data.total_neutral / score)*100) + '%');
                });
            });
        }
    });
});
