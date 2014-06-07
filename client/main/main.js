(function (angular) {
  "use strict";

  angular.module('mojsart.main', [
    'ui.router',
    'fx.animations',
    'ngAnimate',
    'mm.foundation',
    'mojsart.main.home',
    'angular-carousel'
  ])
  
  .config(function ($stateProvider) {
    $stateProvider
    .state('mojsart.about', {
      url: '/',
      views:{
        'upload': {templateUrl: 'about/about.tpl.html', controller: "MainController"}
      }
    })
    .state('mojsart.home', {
      url: '/home',
      views:{
        'home': {templateUrl: 'home/home.tpl.html', controller: "MainController"},
          'sidebar@mojsart.home': {templateUrl: '/sidebar/sidebar.tpl.html', controller:'SideBarController'},
          'graph@mojsart.home':{templateUrl: '/graph/graph.tpl.html', controller:'GraphController'}
      }
    })
    .state('mojsart.upload', {
          url: '/upload',
          views:{
        'upload': {templateUrl: 'upload/upload.tpl.html', controller: "MainController"}
      }
    })
    .state('mojsart.blog', {
          url: '/blog',
          views:{
        'upload': {templateUrl: 'blog/blog.tpl.html', controller: "MainController"}
      }
    });
  })

  .controller('MainController', function ($state, $scope, $http) {
    $scope.title = 'Mojsart';

    //Fetches all songs from server, adds them to SharedState.
    //Note that this function is called without a callback when app bootstraps.
    //It takes a callback (fill Songs List)
     $scope.getSongs = function (func) {
      $http.get('/song')
      .success(function(json) {
        $scope.sharedState.data = json;
        if (func){
        func(json);
        }
      });
    };

    $scope.getStaticPhotos = function(){
      $http.get('/photo')
      .success(function(json) {
        $scope.siteImages = json;
      });
    };

    //Gets all songs, Populates sharedScope songs array with all songs in shared state.
    //Note that this function
      $scope.fillSongsList = function(data) {
        angular.forEach(data, function(song) {
          $scope.sharedState.songs.push({'track': song.echoData.artist, 'title': song.echoData.title, 'echoId': song.echoData.md5});
        });
    };

    // TODO: make it so that we don't need to "initialize" like this

    $scope.date = Date.now();
    $scope.sharedState = {};
    $scope.sharedState.comparing = false;
    $scope.sharedState.songs = [];
    $scope.getSongs($scope.fillSongsList);
    $scope.files = {};
    $scope.sent = false;
    $scope.siteImages = ['/about/running_demo.jpg', '/about/running_demo1.jpg','/about/running_demo2.jpg'];

    //recognizes when one or more files are selected, loads them to array
   
});

})(angular);
