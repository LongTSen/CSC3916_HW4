var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authJwtController = require('./auth_jwt');
var User = require('./Users');
var Movie = require('./movie');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var Review = require( './review' );
var movieController =  require( './moviecontroller' );
var reviewController =  require( './reviewController' );
const crypto = require("crypto");
const rp = require('request-promise');



var app = express();
module.exports = app; // for testing
app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());
const GA_TRACKING_ID = process.env.GA_KEY;

var router = express.Router();
// === CUSTOM FUNCTION TO GENERATE RETURN MESSAGE FOR BAD ROUTES === //
function getBadRouteJSON( req , res , route )
{
    res.json(	{
        success:  false,
        msg:      req.method + " requests are not supported by " + route
    });
}
function trackDimension(category, action, label, value, dimension, metric) {

    var options = { method: 'GET',
        url: 'https://www.google-analytics.com/collect',
        qs:
            {   // API Version.
                v: '1',
                // Tracking ID / Property ID.
                tid: GA_TRACKING_ID,
                // Random Client Identifier. Ideally, this should be a UUID that
                // is associated with particular user, device, or browser instance.
                cid: crypto.randomBytes(16).toString("hex"),
                // Event hit type.
                t: 'event',
                // Event category.
                ec: category,
                // Event action.
                ea: action,
                // Event label.
                el: label,
                // Event value.
                ev: value,
                // Custom Dimension
                cd1: dimension,
                // Custom Metric
                cm1: metric,
                cd3: dimension,
                cm3: metric

            },
        headers:
            {  'Cache-Control': 'no-cache' } };

    return rp(options);
};

router.route('/ATriggerVerify.txt')
    .get(function (req, res) {
        // Event value must be numeric.
        console.log(express.static(__dirname + '/ATriggerverify.txt'))
        res.sendfile('./ATriggerVerify.txt');
        // res.sendfile('./ATriggerVerify.txt', {root: express.static(__dirname + '/ATriggerverify.txt')});
    });
router.route('/test')
    .get(function (req, res) {
        // Event value must be numeric.
        trackDimension('Feedback', 'Rating', 'Feedback for Movie', '3', 'MOVIE NAME', '1')
            .then(function (response) {
                console.log(JSON.stringify(response.body));
                res.status(200).send('Event tracked.').end();
            })
    });

router.route('/postjwt')
    .post(authJwtController.isAuthenticated, function (req, res) {
            console.log(req.body);
            res = res.status(200);
            if (req.get('Content-Type')) {
                console.log("Content-Type: " + req.get('Content-Type'));
                res = res.type(req.get('Content-Type'));
            }
            res.send(req.body);
        }
    );

router.route('/users/:userId')
    .get(authJwtController.isAuthenticated, function (req, res) {
        var id = req.params.userId;
        User.findById(id, function(err, user) {
            if (err) res.send(err);

            var userJson = JSON.stringify(user);
            // return that user
            res.json(user);
        });
    });

router.route('/users')
    .get(authJwtController.isAuthenticated, function (req, res) {
        User.find(function (err, users) {
            if (err) res.send(err);
            // return the users
            res.json(users);
        });
    });

// router.route('/movies')
//     .get(authJwtController.isAuthenticated, function (req, res) {
//         Movie.find(function (err, movies) {
//             if (err) res.send(err);
//             // return the users
//             res.json(movies);
//         });
//     });

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, message: 'Please pass username and password.'});
    }
    else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;
        // save the user
        user.save(function(err) {
            if (err) {
                // duplicate entry
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists. '});
                else
                    return res.send(err);
            }

            res.json({ success: true, message: 'User created!' });
        });
    }
});

router.post('/signin', function(req, res) {
    var userNew = new User();
    userNew.name = req.body.name;
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) res.send(err);

        user.comparePassword(userNew.password, function(isMatch){
            if (isMatch) {
                var userToken = {id: user._id, username: user.username};
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json({success: true,username:user.username, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, message: 'Authentication failed.'});
            }
        });


    });
});

// router.get('/Movies', function(req,res){
//     Movie.find({},function(err, Movies){
//         if(!Movie)
//             return res.json({ success: false, message: 'There are no movies in the database'});
//         res.json({ success: true, message: 'All Movies' });
//
//     });
// });

// router.route('/movie')
//     .get(authJwtController.isAuthenticated, function (req, res) {
//         var movieTitle = req.query.title;
//         console.log('Movie Title: ' + movieTitle);
//         Movie.findOne({title : movieTitle}).exec(function (err, movie) {
//                 if (err) res.send(err);
//
//                 console.log('Movie ' + movie);
//                 if (movie == null) {
//                     res.status(400);
//                     res.send('No movie found');
//                 }
//                 else{
//                     res.status(200).jsonp(movie);
//                 }
//             }
//         );
//
//     });

// router.post('/Movies',passport.authenticate('jwt',{session : false}),function(req,res){
//     if (!req.body.title || !req.body.released || !req.body.genre) {
//         res.json({success: false, message: 'Pass the title, year of release, and a specified genre'});
//     }
//     else {
//         var movie = new Movie();
//         movie.title = req.body.title;
//         movie.released = req.body.released;
//         movie.genre = req.body.genre;
//         movie.actors = req.body.actors;
//         // movie.actors.charName = req.body.actors;
//
//         // save the movie
//         movie.save(function(err) {
//             if(err) return res.send(err);
//             res.json({ success: true, message: 'Movie saved' });
//         });
//     }
// });

// router.put('/Movies',passport.authenticate('jwt',{session : false}),function(req,res){
//     //var movie = new Movie();
//     // movie.title = req.body.title;
//
//     Movie.findOne({title:req.body.title},function(err,movie){
//         if(err) res.send(err);
//
//         movie.released = req.body.released;
//         movie.genre = req.body.genre;
//         movie.actors = req.body.actors;
//
//         movie.save(function (err) {
//             if (err) return res.send(err);
//             res.json({success: true, message: 'Movie updated'});
//         });
//     });
// });

// router.put('/Movies',passport.authenticate('jwt',{session : false}),function(req,res) {
//     var movieTitle = req.query.title;
//     console.log('Movie Title: ' + movieTitle);
//     Movie.findOne({title: movieTitle}).exec(function (err, movie) {
//         if (err) res.send(err);
//         movie.released = req.body.released;
//         movie.genre = req.body.genre;
//         movie.actors = req.body.actors;
//
//         movie.save(function (err) {
//             if (err) return res.send(err);
//             // res.json({success: true, message: 'Movie updated'});
//             res.status(200).json(movie);
//         });
//     });
// });
//
// router.delete('/Movies',passport.authenticate('jwt',{session : false}),function(req,res){
//     Movie.findOne({title:req.body.title},function(err,movie) {
//         if (err) res.send(err);
//
//         movie.remove({title:req.body.title});
//         res.json({success: true, message: 'Movie Deleted'});
//     });
// });
// === ROUTES TO /MOVIES === //
router.route( '/movies' )
    // === HANDLE GET REQUESTS === //
    .get(
        authJwtController.isAuthenticated,
        movieController.getMovies
    )
    // === HANDLE POST REQUESTS === //
    .post(
        authJwtController.isAuthenticated,
        movieController.postMovie
    )
    // === HANDLE PUT REQUESTS === //
    .put(
        authJwtController.isAuthenticated,
        movieController.putMovie
    )
    // === HANDLE DELETE REQUESTS === //
    .delete(
        authJwtController.isAuthenticated,
        movieController.deleteMovie
    )
    // === REJECT ALL OTHER REQUESTS TO /MOVIES === //
    .all(
        function( req , res )
        {
            getBadRouteJSON( req , res , "/movies" );
        });

// === ROUTES TO /REVIEWS === //
router.route( '/reviews' )
    // === HANDLE GET REQUESTS === //
    .get( reviewController.getReviews )

    // === HANDLE POST REQUESTS === //
    .post(
        authJwtController.isAuthenticated,
        reviewController.postReview
    )
    // === REJECT ALL OTHER REQUESTS TO /MOVIES === //
    .all(
        function( req , res )
        {
            getBadRouteJSON( req , res , "/movies" );
        });


// === ATTEMPT TO ROUTE REQUEST === //
app.use( '/' , router );

// === IF UNEXPEDTED ROUTE IS SENT, REJECT IT HERE === //
app.use(
    function( req , res )
    {
        getBadRouteJSON( req , res , "this URL path" );
    });


app.use('/', router);
app.listen(process.env.PORT || 8080);