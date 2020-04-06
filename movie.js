
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
//var bcrypt = require('bcrypt-nodejs');

mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);

// movies schema
// var MoviesSchema = new Schema({
//     title: String,
//     released: Number,
//     genre: {type: String, enum: ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Thriller', 'Western', 'Science Fiction']},
//     actors: {
//         type:
//             [{
//                 actorName: String,
//                 charName: String
//             }],
//         validate: {
//             validator:function(myarray) {
//                 return myarray.length >= 3;
//             }, success: false, message: "movie must have at least 3 actors"
//         }
//     }
// });
var movieSchema  =  new Schema({
    title        :	{
        type     : String,
        required : true,
        unique   : true
    },
    released :	{
        type     : Number,
        required : true
    },
    genre        :	{
        type     : String,
        enum     : [ "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Thriller", "Western" ],
        required : true
    },
    actors       :	{
        type     :	Array,
        required :	true,
        items    :	{
            actorName     : String,
            charName : String
        },
        minItems : 3
    },

});

module.exports = mongoose.model('Movie', movieSchema);