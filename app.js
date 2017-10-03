const express = require('express');
const app = express();
const path = require('path');
const Twitter = require('twitter');
const sentiment = require('sentiment');
const googleTrends = require('google-trends-api');

// Twitter API Credentials
const twitter_consumer_key = 'kV93DxhPzYVXsS9UotpOwwKC6';
const twitter_consumer_secret = 'DoOKg4EIE5sQ6m9wL6kxyMKvcPzW8rLVZHpLLzuB0EsysNKHyb';
const access_token = '846191975804141569-sLWEfs4JY0wYfFPZU7f2NAKCDIIRm6u';
const access_secret = 'gyacPUDpDVH8hgjhWc2RNaZ7Z5qyCfOYcceWISkPk4JJw';

// Connect to Twitter
var client = new Twitter({
    consumer_key: twitter_consumer_key,
    consumer_secret: twitter_consumer_secret,
    access_token_key: access_token,
    access_token_secret: access_secret
});

app.use('/public', express.static('public'));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/', function(req, res, next) {
    res.sendFile(path.join(__dirname + '/views/main.html'));
});

app.get('/twitter/:id([a-zA-Z0-9]*)', function(req, res) {
    var query = req.params.id;
    var analyze;
    var positives = [];
    var negatives = [];
    var total_positive = 0;
    var total_negative = 0;
    var total_neutral = 0;
    var total_score = 0;

    client.get('search/tweets', { q: query, count: 10000 }, function(error, tweets, response) {
        if (error) throw error;
        for (var i = 0; i < tweets.statuses.length; i++) {
            analyze = sentiment(tweets.statuses[i].text);
            if (analyze.score > 0) {
                positives.push(analyze.score);
                total_positive += analyze.score;
            } else if (analyze.score < 0) {
                negatives.push(analyze.score);
                total_negative += analyze.score;
            } else {
                total_neutral += 1;
            }
            total_score += analyze.score;
        }
        res.send({"total_score": total_score, "positives": positives, "negatives": negatives, "total_positive": total_positive, "total_negative": total_negative, "total_neutral": total_neutral});
    });
});


app.get('/google/:id([a-zA-Z0-9]*)', function(req, res) {
    var query = req.params.id;
    googleTrends.interestOverTime({keyword: query, startTime: new Date('2017-01-01')}, function(err, results) {
        if (err) res.send({"error": 'Not Found'});
        res.send(results);
    });
});

app.listen(3000);
