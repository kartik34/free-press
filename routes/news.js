const express = require('express');
const keyword_extractor = require("keyword-extractor");
const stringSimilarity = require("string-similarity");
const router = express.Router();
const axios = require('axios');
const apiKey = process.env.API_KEY;
const host = "https://api.bing.microsoft.com";
const path = "/v7.0/news/search";

function processBingResponse(query, articles, count, source) {

    let headlines = [];
    let rankedArticles = [];
    articles.forEach(article => {
        headlines.push(article.name);
    })
    let ratings = stringSimilarity.findBestMatch(query, headlines).ratings; //quantify similarity between query and all headlines

    ratings.sort(function (a, b) {
        return b.rating - a.rating;
    });
    /* Removes any duplicate ratings in the ratings array, so any articles that have the same headline
    will only be added once each. */
    const seen = new Set();
    ratings = ratings.filter(el => {
        const duplicate = seen.has(el.rating);
        seen.add(el.rating);
        return !duplicate;
    });
    ratings.forEach(rating => {
        if (rating.rating > 0.1) {
            articles.forEach(article => {
                if (article.name === rating.target) {
                    article["rating"] = rating.rating;
                    const myURL = new URL(article.url);
                    article["hostName"] = myURL.hostname;
                    if (!article.url.includes(source)) {
                        rankedArticles.push(article)
                    }
                }
            })
        }
    })

    return rankedArticles;

}

/* GET news articles. */
router.get('/articles/:query/:count/:source', function (req, res, next) {
    console.log(req.params.query);
    axios.get(host + path + "?q=" + encodeURIComponent(req.params.query) + "&count=" + encodeURIComponent(req.params.count), {
        headers: {
            "Ocp-Apim-Subscription-Key": apiKey
        }
    })
        .then(response => {
            if (response.data.value.length < 1 || response.data.value == undefined) {
                res.json([]);
            } else {
                articles = processBingResponse(req.params.query, response.data.value, req.params.count, req.params.source);
                res.json(articles);
            }
        })
        .catch(error => {
            console.log(error);
        });

});


module.exports = router;
