const express = require('express');
const config = require('../config');
const keyword_extractor = require("keyword-extractor");
const stringSimilarity = require("string-similarity");
const router = express.Router();
const axios = require('axios');
const apiKey = "b98671be81854b8383c976ada71fc48f";
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
        if (rating.rating != 0) {
            articles.forEach(article => {
                if (article.name === rating.target) {
                    article["rating"] = rating.rating;
                    if (!article.url.includes(source)) {
                        rankedArticles.push(article)
                    }
                }
            })
        }
    })

    console.log(rankedArticles);
    return rankedArticles;

}

/* GET news articles. */
router.get('/articles/:query/:count/:source', function (req, res, next) {
    console.log(req.params.query);
    axios.get(host + path + "?q=" + encodeURIComponent(req.params.query) + "&count=" + req.params.count, {
        headers: {
            "Ocp-Apim-Subscription-Key": apiKey
        }
    })
        .then(response => {
            articles = processBingResponse(req.params.query, response.data.value, req.params.count, req.params.source);
            res.render('index', { title: "News", articles: articles, query: req.params.query });
        })
        .catch(error => {
            console.log(error);
        });

});








// function extractKeywords(query) {
//     const extraction_result =
//         keyword_extractor.extract(query, {
//             language: "english",
//             remove_digits: true,
//             return_changed_case: true,
//             remove_duplicates: false
//         });
//     let formattedQuery = "";
//     extraction_result.forEach(keyword => {
//         formattedQuery += " " + keyword;
//     })
//     console.log(formattedQuery);
//     return formattedQuery;

// }
// /* GET news articles. */
// router.get('/articles/:query/:language', function (req, res, next) {

//     let formattedQuery = extractKeywords(req.params.query);

//     axios.get('https://newsapi.org/v2/everything?q=' + formattedQuery + '&sortBy=relevancy&language=' + req.params.language + '&apiKey=' + apiKey)
//         .then(response => {
//             console.log(response.data.articles);
//             console.log(req.params.query);
//             res.render('index', { title: "News", articles: response.data.articles, query: req.params.query });
//         })
//         .catch(error => {
//             console.log(error);
//         });
// });



module.exports = router;
