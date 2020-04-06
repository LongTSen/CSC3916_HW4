var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authJwtController = require('./auth_jwt');
var User = require('./Users');
var Movie = require('./movies');
var jwt = require('jsonwebtoken');
var cors = require('cors');


var app = express();
module.exports = app; // for testing
app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();

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

router.route('/movies')
    .get(authJwtController.isAuthenticated, function (req, res) {
        Movie.find(function (err, movies) {
            if (err) res.send(err);
            // return the users
            res.json(movies);
        });
    });

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

router.get('/Movies', function(req,res){
    Movie.find({},function(err, Movies){
        if(!Movie)
            return res.json({ success: false, message: 'There are no movies in the database'});
        res.json({ success: true, message: 'All Movies' });

    });
});

router.route('/movie')
    .get(authJwtController.isAuthenticated, function (req, res) {
        var movieTitle = req.query.title;
        console.log('Movie Title: ' + movieTitle);
        Movie.findOne({title : movieTitle}).exec(function (err, movie) {
                if (err) res.send(err);

                console.log('Movie ' + movie);
                if (movie == null) {
                    res.status(400);
                    res.send('No movie found');
                }
                else{
                    res.status(200).jsonp(movie);
                }
            }
        );

    });

router.post('/Movies',passport.authenticate('jwt',{session : false}),function(req,res){
    if (!req.body.title || !req.body.released || !req.body.genre) {
        res.json({success: false, message: 'Pass the title, year of release, and a specified genre'});
    }
    else {
        var movie = new Movie();
        movie.title = req.body.title;
        movie.released = req.body.released;
        movie.genre = req.body.genre;
        movie.actors = req.body.actors;
        // movie.actors.charName = req.body.actors;

        // save the movie
        movie.save(function(err) {
            if(err) return res.send(err);
            res.json({ success: true, message: 'Movie saved' });
        });
    }
});

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

router.put('/Movies',passport.authenticate('jwt',{session : false}),function(req,res) {
    var movieTitle = req.query.title;
    console.log('Movie Title: ' + movieTitle);
    Movie.findOne({title: movieTitle}).exec(function (err, movie) {
        if (err) res.send(err);
        movie.released = req.body.released;
        movie.genre = req.body.genre;
        movie.actors = req.body.actors;

        movie.save(function (err) {
            if (err) return res.send(err);
            // res.json({success: true, message: 'Movie updated'});
            res.status(200).json(movie);
        });
    });
});

router.delete('/Movies',passport.authenticate('jwt',{session : false}),function(req,res){
    Movie.findOne({title:req.body.title},function(err,movie) {
        if (err) res.send(err);

        movie.remove({title:req.body.title});
        res.json({success: true, message: 'Movie Deleted'});
    });
});

app.use('/', router);
app.listen(process.env.PORT || 8080);