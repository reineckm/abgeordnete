var express = require('express');
var router = express.Router();
var request = require('request');
var cheerio = require('cheerio');

/* GET Abgeordnete importieren */
router.get('/updateAbgeordnete', function(req, res) {
  var db = req.db;
  var collection = db.get('abgeordnete');

  // URL mit Liste aller abgeordneter
  baseurl = 'http://www.bundestag.de'
  listurl = '/bundestag/abgeordnete18/alphabet';

  // Datenbank leeren
  collection.remove( { } );

  // Lade die Liste aller Abgeordneten
  request(baseurl + listurl, function(error, response, indexHtml){
    if(!error){
      // Erstelle ein Cheerio Objekt mit dem Inhalt der
      // Gerade geladenen Seite.
      var $list = cheerio.load(indexHtml);
      // Nimm alle Ancker Elemente, die innerhalb der Klasse .inhalt sind
      $list('.inhalt a').filter(function(){
        // ancker ist ein einzelner Link auf die Biografie eines Abgeordneten
        var ancker = $list(this);
        // Lade eine Biografie
        request(baseurl + ancker.attr("href"), function(error, response, aBioHtml){
          if(!error){
            // Erstelle ein Cherio Element mit dem Inhalt einer Biografie Seite
            var $bio = cheerio.load(aBioHtml);
            // Wir speichern jedes verwertbare HTML Element als Wert in diesem Array
            var biotext = [];
            // Überschrift der Biografie hinzufügen
            biotext.push($bio('.biografie h1').text());
            // Alle paragrafen und anckertexte in das Array
            $bio('.biografie p, .biografie a').filter(function(){
              if ($bio(this).text().length > 0) {
                biotext.push($bio(this).text());
              }
            });
            // Jetzt haben wir alle Daten zusammen, die wir in die DB speichern möchten
            collection.insert({
              "name" : ancker.text(),
              "biourl" : baseurl + ancker.attr("href"),
              "biotext" : biotext
            }, function (err, doc) {
              if (err) {
                console.log(err);
              }
            });
          }
        })
      })
      res.redirect('/');
    }});
})

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Abgeordnetensuche' });
});

router.get('/abgeordnete', function(req, res) {
  var db = req.db;
  var collection = db.get('abgeordnete');
  collection.find({},{},function(e,docs){
    res.render('abgeordnete', {
      "abgeordnete" : docs
    });
  });
});

router.get('/abgeordnete/keyword', function(req, res) {
  var db = req.db;
  var collection = db.get('abgeordnete');
  var search = new RegExp(escapeRegExp(req.query.keyword));
  collection.find({}, {},function(e,docs){
    var size = docs.length;
    collection.find({"biotext": search}, {},function(e,docs){
      console.log(size);
      res.render('abgeordnete', {
        "abgeordnete" : docs,
        "prozent" : ((docs.length / size) * 100).toFixed(2)
      });
    });
  });
});

function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

module.exports = router;
