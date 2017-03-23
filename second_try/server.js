const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient
const crypto = require("crypto");

// var the_port = 3000;
var the_port = 80;

var db
var db_link = "mongodb://nms_crud_user:nms_crud@ds133340.mlab.com:33340/nms_crud_db"
MongoClient.connect(db_link, (err, database) => {
  if (err) return console.log(err)
  db = database
  app.listen(process.env.PORT || the_port, () => {
    console.log('listening on '+the_port)
  })
})

// function htmlEntities(str) {
//     return String(str).replace(/;/g, '&#59;').replace(/:/g, '&#58;').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// }

app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
app.use(express.static('public'))

app.get('/', (req, res) => {
  db.collection('quotes').find().toArray((err, result) => {
    if (err) return console.log(err)
    res.render('index.ejs', {quotes: result})
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