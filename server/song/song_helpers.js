"use strict";

var Song = require('./song_model.js'),
    Q    = require('q'),
    echo = require('../main/echo.js'),
    fs = require('fs'),
    path = require('path');

module.exports = exports = {

  // need to accept posts from client
  // TODO: promisify, refactor -- callback hell... 
  uploadSongs: function() {

    var dirName = __dirname+'/lib';
    var responseArr = [];

    // read song directory on server
    fs.readdir(dirName, function(err, files) {
      if (err) throw(err);
      // for each song on the server
      for (var i = 0; i < files.length; i++) {
        (function(count) {
          // check the database to see if the file exists
          exports.checkSongFilenameDB(files[count], function(filename) {
            var location = dirName + '/' + filename;
            console.log('location', location);
            console.log('filename', filename);
            // read the file
            fs.readFile(location, function(err, buffer) {
              if (err) throw(err);
              // upload to echo nest
              echo('track/upload').post({
                filetype: path.extname(location).substr(1)
              }, 'application/octet-stream', buffer, function (err, json) {
                console.log('sending to echo');
                if (err) throw(err);
                console.log(json.response.track.md5);
                // once song has be acknowledged, start checking to see if the song's md5 exists in our DB -- probably can be
                // removed
                exports.checkSongMD5DB(json.response.track.md5, function(md5) {
                  console.log('md5 not found', md5);
                  // if the song is not found 
                  var scope = function(md5) {
                    console.log('executing scope');
                    // set to check echonest every 2 seconds to see if the song has been processed by echonest
                    var waittime = 2000;
                    var interval = setInterval(function(md5){
                      console.log('checking md5', md5)
                      var query = {bucket: 'audio_summary'};
                      query.md5 = md5;
                      // arguments : query with the desired md5, boolean to state whether there is a boolean
                      // filename to save, and the interval object which is needed to clearInterval
                      exports.fetchSongMD5(query, false, filename, interval);                    
                    }, waittime, md5);
                  };
                  scope(md5)
                });
              });
            });         
          })
        // scope for the for loop
        })(i);
      }
    });

  },

  fetchSongMD5: function(query, bool, filename, interval) {
    // query should be something like {
    //   md5: 'cfa55a902533b32e87473c2218b39da9',
    //   bucket: 'audio_summary'
    // }

    // queries echoapi for the md5 we are looking for
    console.log('query', query);
    echo('track/profile').get(query, function (err, json) {
      if (err) throw(err);
      // returns a response referenced here: http://developer.echonest.com/docs/v4/track.html#profile
      // console.log(json.response.track);
      // calls SaveSongMD5 if processing is complete
      if (json.response.track.status === "complete") {
        // TODO: test filename
        console.log('analysis complete');
        exports.saveSongMD5(json.response.track, filename);
        if (bool === false) {
          console.log('setting bool to true');
          bool = true;
        }
      }
      if (bool) {
        console.log('clearing interval');
        clearInterval(interval);
      }
    });
  },

  saveSongMD5: function(trackData, filename) {
    // create a song model
    // populate with echo nest data

    // initializes a new instance of song with the received trackData
    // TODO: test filename
    var song = new Song({
      echoData: {
        artist: trackData.artist,
        title: trackData.title,
        md5: trackData.md5,
        status: trackData.status,
        audio_summary: {
          danceability: trackData.audio_summary.danceability,
          duration: trackData.audio_summary.duration,
          energy: trackData.audio_summary.energy,
          key: trackData.audio_summary.key,
          loudness: trackData.audio_summary.loudness,
          speechiness: trackData.audio_summary.speechiness,
          acousticness: trackData.audio_summary.acousticness,
          liveness: trackData.audio_summary.liveness,
          tempo: trackData.audio_summary.tempo
        }
      }, 
      userData: {
        speechiness: null,
        acousticness: null        
      },
      filename: filename
    });

    // saves to our mongoose database if it doesn't exist
    var $promise = Q.nbind(song.save, song); // JH: apparently you can't do Q(song.save().exec())...
    $promise()
      .then(function(saved) {
        console.log('song saved: ', saved);
      });
  }, 

  checkSongMD5DB: function(md5, cb) {
    Q(Song.findOne({'echoData.md5': md5}).exec())
      .then(function(song) {
        if (!song) {
          cb(md5);
        } else {
          console.log('song found');
        }
      })
      .fail(function(reason) {
        console.log(reason);
      });
  },

  checkSongFilenameDB: function(filename, cb) {
    Q(Song.findOne({'filename': filename}).exec())
      .then(function(song) {
        if (!song) {
          cb(filename);
        } else {
          console.log('song found');
        }
      })
      .fail(function(reason) {
        console.log(reason);
      });    
  }

};
