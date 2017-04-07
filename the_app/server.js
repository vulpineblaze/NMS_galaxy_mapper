const express = require('express')
const app = express()
const session = require('express-session');
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient
const crypto = require("crypto");
const passport = require("passport");

var the_port = 3000;
// var the_port = 80;

var db
var db_link = "mongodb://nms_crud_user:nms_crud@ds133340.mlab.com:33340/nms_crud_db"
MongoClient.connect(db_link, (err, database) => {
  if (err) return console.log(err)
  db = database
  app.listen(process.env.PORT || the_port, "127.0.0.1", () => {
    console.log('listening on '+the_port)
  })
})

app.use(session({secret: "-- ENTER CUSTOM SESSION SECRET --"}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
  // placeholder for custom user serialization
  // null is for errors
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  // placeholder for custom user deserialization.
  // maybe you are going to get the user from mongo by id?
  // null is for errors
  done(null, user);
});


var GithubStrategy = require('passport-github').Strategy;
passport.use(new GithubStrategy({
    clientID: "0568f25c433e2663824c",
    clientSecret: "2c9d269dde3f692463442f432c7483d5de5f09c0",
    callbackURL: "http://nomans.skygin.net/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    return done(null, profile);
  }
));


var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

passport.use(new GoogleStrategy({
    clientID: "895194748840-0obsr8rrlogq3k5l89j5s4437865vtgh.apps.googleusercontent.com",
    clientSecret: "WpPWnCeFNiZFxuQM36r66pCx",
    callbackURL: "http://nomans.skygin.net/auth/google/callback",
    returnURL: 'http://nomans.skygin.net/auth/google/return',
    realm: 'http://nomans.skygin.net'
  },
  function(accessToken, refreshToken, profile, done) {
    return done(null, profile);
  }
));

// function htmlEntities(str) {
//     return String(str).replace(/;/g, '&#59;').replace(/:/g, '&#58;').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// }

app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
app.use(express.static('public'))

app.get('/', (req, res, next) => {
  if (req.isAuthenticated()) {
    var auth = true;
  }
  db.collection('quotes').find().toArray((err, result) => {
    if (err) return console.log(err)
    res.render('index.ejs', {quotes: result, auth:auth})
  })
})

app.get('/detail-:guid', (req, res) => {
  // var id = htmlEntities(req.params.id);
  db.collection('quotes').find({guid:req.params.guid}).toArray((err, result) => {
    if (err) return console.log(err)
    res.render('detail.ejs', {quotes: result})
  })
})

app.post('/quotes', (req, res) => {
  const id = crypto.randomBytes(16).toString("hex");
  req.body.guid = id.substring(0,7);
  db.collection('quotes').save(req.body, (err, result) => {
    if (err) return console.log(err)
    console.log('saved to database')
    res.redirect('/')
  })
})

app.post('/update-:guid', (req, res) => {
  db.collection('quotes')
  .findOneAndUpdate({guid: req.params.guid}, {
    $set: {
      user: req.body.user,
      id: req.body.id,
      name: req.body.name,
      class: req.body.class,
      race: req.body.race,
      tags: req.body.tags,
      guid: req.params.guid
    }
  }, {
    sort: {_id: -1}
  }, (err, result) => {
    if (err) return res.send(err)
    // res.send(result)
    res.redirect('/')
  })
})

// app.put('/quotes', (req, res) => {
//   db.collection('quotes')
//   .findOneAndUpdate({name: 'Yoda'}, {
//     $set: {
//       name: req.body.name,
//       quote: req.body.quote
//     }
//   }, {
//     sort: {_id: -1},
//     upsert: true
//   }, (err, result) => {
//     if (err) return res.send(err)
//     res.send(result)
//   })
// })

// app.delete('/quotes', (req, res) => {
//   db.collection('quotes').findOneAndDelete({guid: req.body.guid}, (err, result) => {
//     if (err) return res.send(500, err)
//     res.send('A darth vadar quote got deleted')
//   })
// })

app.get('/delete-:guid', (req, res) => {
  db.collection('quotes').findOneAndDelete({guid: req.params.guid}, (err, result) => {
    if (err) return res.send(500, err)
    res.redirect('/')
  })
})


app.get('/logout', function(req, res){
  console.log('logging out');
  req.logout();
  res.redirect('/');
})

// we will call this to start the GitHub Login process
app.get('/auth/github', passport.authenticate('github'));

// app.get('/auth/github', function(req, res, next){
//     req.passport.authenticate('github')(req, res, next);
// });

// GitHub will call this URL
app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/' }),
  function(req, res, next) {
    res.redirect('/protected');
  }
);



app.get('/auth/google', passport.authenticate('google',{ scope : ['profile', 'email'] }));
// app.get('/auth/google', passport.authenticate('google',{scope: 'https://www.googleapis.com/auth/plus.me https://www.google.com/m8/feeds https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'}));

app.get('/auth/google/callback', passport.authenticate('google', { 
          failureRedirect: '/',
          successRedirect : '/protected' })
);


// Simple middleware to ensure user is authenticated.
// Use this middleware on any resource that needs to be protected.
// If the request is authenticated (typically via a persistent login session),
// the request will proceed.  Otherwise, the user will be redirected to the
// login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    // req.user is available for use here
    return next(); }

  // denied. redirect to login
  res.redirect('/')
}

app.get('/protected', ensureAuthenticated, function(req, res) {
  res.redirect('/')
});

