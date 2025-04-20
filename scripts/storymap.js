$(window).on('load', function() {
    var documentSettings = {};
    var chaptersData = [];
    var map;
    var player;
    var isPlayerReady = false;

    // Some constants, such as default settings
    const CHAPTER_ZOOM = 15;

    // Function to parse CSV data
    function parseCSV(data) {
        return $.csv.toObjects(data);
    }

    // Function to parse Google Sheets data$(window).on('load', function() {

  var documentSettings = {};



  // Some constants, such as default settings

  const CHAPTER_ZOOM = 15;



  // First, try reading Options.csv

  $.get('csv/Options.csv', function(options) {



    $.get('csv/Chapters.csv', function(chapters) {

      initMap(

        $.csv.toObjects(options),

        $.csv.toObjects(chapters)

      )

    }).fail(function(e) { alert('Found Options.csv, but could not read Chapters.csv') });



  // If not available, try from the Google Sheet

  }).fail(function(e) {



    var parse = function(res) {

      return Papa.parse(Papa.unparse(res[0].values), {header: true} ).data;

    }



    // First, try reading data from the Google Sheet

    if (typeof googleDocURL !== 'undefined' && googleDocURL) {



      if (typeof googleApiKey !== 'undefined' && googleApiKey) {



        var apiUrl = 'https://sheets.googleapis.com/v4/spreadsheets/'

        var spreadsheetId = googleDocURL.split('/d/')[1].split('/')[0];



        $.when(

          $.getJSON(apiUrl + spreadsheetId + '/values/Options?key=' + googleApiKey),

          $.getJSON(apiUrl + spreadsheetId + '/values/Chapters?key=' + googleApiKey),

        ).then(function(options, chapters) {

          initMap(parse(options), parse(chapters))

        })



      } else {

        alert('You load data from a Google Sheet, you need to add a free Google API key')

      }



    } else {

      alert('You need to specify a valid Google Sheet (googleDocURL)')

    }



  })







  /**

  * Reformulates documentSettings as a dictionary, e.g.

  * {"webpageTitle": "Leaflet Boilerplate", "infoPopupText": "Stuff"}

  */

  function createDocumentSettings(settings) {

    for (var i in settings) {

      var setting = settings[i];

      documentSettings[setting.Setting] = setting.Customize;

    }

  }



  /**

   * Returns the value of a setting s

   * getSetting(s) is equivalent to documentSettings[constants.s]

   */

  function getSetting(s) {

    return documentSettings[constants[s]];

  }



  /**

   * Returns the value of setting named s from constants.js

   * or def if setting is either not set or does not exist

   * Both arguments are strings

   * e.g. trySetting('_authorName', 'No Author')

   */

  function trySetting(s, def) {

    s = getSetting(s);

    if (!s || s.trim() === '') { return def; }

    return s;

  }



  /**

   * Loads the basemap and adds it to the map

   */

  function addBaseMap() {

    var basemap = trySetting('_tileProvider', 'Stamen.TonerLite');

    L.tileLayer.provider(basemap, {

      maxZoom: 18,

      

      // Pass the api key to most commonly used parameters

      apiKey: trySetting('_tileProviderApiKey', ''),

      apikey: trySetting('_tileProviderApiKey', ''),

      key: trySetting('_tileProviderApiKey', ''),

      accessToken: trySetting('_tileProviderApiKey', '')

    }).addTo(map);

  }



  function initMap(options, chapters) {

    createDocumentSettings(options);



    var chapterContainerMargin = 70;



    document.title = getSetting('_mapTitle');

    $('#header').append('<h1>' + (getSetting('_mapTitle') || '') + '</h1>');

    $('#header').append('<h2>' + (getSetting('_mapSubtitle') || '') + '</h2>');



    // Add logo

    if (getSetting('_mapLogo')) {

      $('#logo').append('<img src="' + getSetting('_mapLogo') + '" />');

      $('#top').css('height', '60px');

    } else {

      $('#logo').css('display', 'none');

      $('#header').css('padding-top', '25px');

    }



    // Load tiles

    addBaseMap();



    // Add zoom controls if needed

    if (getSetting('_zoomControls') !== 'off') {

      L.control.zoom({

        position: getSetting('_zoomControls')

      }).addTo(map);

    }



    var markers = [];



    var markActiveColor = function(k) {

      /* Removes marker-active class from all markers */

      for (var i = 0; i < markers.length; i++) {

        if (markers[i] && markers[i]._icon) {

          markers[i]._icon.className = markers[i]._icon.className.replace(' marker-active', '');



          if (i == k) {

            /* Adds marker-active class, which is orange, to marker k */

            markers[k]._icon.className += ' marker-active';

          }

        }

      }

    }



    var pixelsAbove = [];

    var chapterCount = 0;



    var currentlyInFocus; // integer to specify each chapter is currently in focus

    var overlay;  // URL of the overlay for in-focus chapter

    var geoJsonOverlay;



    for (i in chapters) {

      var c = chapters[i];



      if ( !isNaN(parseFloat(c['Latitude'])) && !isNaN(parseFloat(c['Longitude']))) {

        var lat = parseFloat(c['Latitude']);

        var lon = parseFloat(c['Longitude']);



        chapterCount += 1;



        markers.push(

          L.marker([lat, lon], {

            icon: L.ExtraMarkers.icon({

              icon: 'fa-number',

              number: c['Marker'] === 'Numbered'

                ? chapterCount

                : (c['Marker'] === 'Plain'

                  ? ''

                  : c['Marker']), 

              markerColor: c['Marker Color'] || 'blue'

            }),

            opacity: c['Marker'] === 'Hidden' ? 0 : 0.9,

            interactive: c['Marker'] === 'Hidden' ? false : true,

          }

        ));



      } else {

        markers.push(null);

      }



      // Add chapter container

      var container = $('<div></div>', {

        id: 'container' + i,

        class: 'chapter-container'

      });





      // Add media and credits: YouTube, audio, or image

      var media = null;

      var mediaContainer = null;



      // Add media source

      var source = '';

      if (c['Media Credit Link']) {

        source = $('<a>', {

          text: c['Media Credit'],

          href: c['Media Credit Link'],

          target: "_blank",

          class: 'source'

        });

      } else {

        source = $('<span>', {

          text: c['Media Credit'],

          class: 'source'

        });

      }



      // YouTube

      if (c['Media Link'] && c['Media Link'].indexOf('youtube.com/') > -1) {

        media = $('<iframe></iframe>', {

          src: c['Media Link'],

          width: '100%',

          height: '100%',

          frameborder: '0',

          allow: 'autoplay; encrypted-media',

          allowfullscreen: 'allowfullscreen',

        });



        mediaContainer = $('<div></div>', {

          class: 'img-container'

        }).append(media).after(source);

      }



      // If not YouTube: either audio or image

      var mediaTypes = {

        'jpg': 'img',

        'jpeg': 'img',

        'png': 'img',

        'tiff': 'img',

        'gif': 'img',

        'mp3': 'audio',

        'ogg': 'audio',

        'wav': 'audio',

      }



      var mediaExt = c['Media Link'] ? c['Media Link'].split('.').pop().toLowerCase() : '';

      var mediaType = mediaTypes[mediaExt];



      if (mediaType) {

        media = $('<' + mediaType + '>', {

          src: c['Media Link'],

          controls: mediaType === 'audio' ? 'controls' : '',

          alt: c['Chapter']

        });



        var enableLightbox = getSetting('_enableLightbox') === 'yes' ? true : false;

        if (enableLightbox && mediaType === 'img') {

          var lightboxWrapper = $('<a></a>', {

            'data-lightbox': c['Media Link'],

            'href': c['Media Link'],

            'data-title': c['Chapter'],

            'data-alt': c['Chapter'],

          });

          media = lightboxWrapper.append(media);

        }



        mediaContainer = $('<div></div', {

          class: mediaType + '-container'

        }).append(media).after(source);

      }



      container

        .append('<p class="chapter-header">' + c['Chapter'] + '</p>')

        .append(media ? mediaContainer : '')

        .append(media ? source : '')

        .append('<p class="description">' + c['Description'] + '</p>');



      $('#contents').append(container);



    }



    changeAttribution();



    /* Change image container heights */

    imgContainerHeight = parseInt(getSetting('_imgContainerHeight'));

    if (imgContainerHeight > 0) {

      $('.img-container').css({

        'height': imgContainerHeight + 'px',

        'max-height': imgContainerHeight + 'px',

      });

    }



    // For each block (chapter), calculate how many pixels above it

    pixelsAbove[0] = -100;

    for (i = 1; i < chapters.length; i++) {

      pixelsAbove[i] = pixelsAbove[i-1] + $('div#container' + (i-1)).height() + chapterContainerMargin;

    }

    pixelsAbove.push(Number.MAX_VALUE);



    $('div#contents').scroll(function() {

      var currentPosition = $(this).scrollTop();



      // Make title disappear on scroll

      if (currentPosition < 200) {

        $('#title').css('opacity', 1 - Math.min(1, currentPosition / 100));

      }



      for (var i = 0; i < pixelsAbove.length - 1; i++) {



        if ( currentPosition >= pixelsAbove[i]

          && currentPosition < (pixelsAbove[i+1] - 2 * chapterContainerMargin)

          && currentlyInFocus != i

        ) {



          // Update URL hash

          location.hash = i + 1;



          // Remove styling for the old in-focus chapter and

          // add it to the new active chapter

          $('.chapter-container').removeClass("in-focus").addClass("out-focus");

          $('div#container' + i).addClass("in-focus").removeClass("out-focus");



          currentlyInFocus = i;

          markActiveColor(currentlyInFocus);



          // Remove overlay tile layer if needed

          if (overlay && map.hasLayer(overlay)) {

            map.removeLayer(overlay);

          }



          // Remove GeoJson Overlay tile layer if needed

          if (geoJsonOverlay && map.hasLayer(geoJsonOverlay)) {

            map.removeLayer(geoJsonOverlay);

          }



          var c = chapters[i];



          // Add chapter's overlay tiles if specified in options

          if (c['Overlay']) {



            var opacity = parseFloat(c['Overlay Transparency']) || 1;

            var url = c['Overlay'];



            if (url.split('.').pop() === 'geojson') {

              $.getJSON(url, function(geojson) {

                overlay = L.geoJson(geojson, {

                  style: function(feature) {

                    return {

                      fillColor: feature.properties.fillColor || '#ffffff',

                      weight: feature.properties.weight || 1,

                      opacity: feature.properties.opacity || opacity,

                      color: feature.properties.color || '#cccccc',

                      fillOpacity: feature.properties.fillOpacity || 0.5,

                    }

                  }

                }).addTo(map);

              });

            } else {

              overlay = L.tileLayer(c['Overlay'], { opacity: opacity }).addTo(map);

            }



          }



          if (c['GeoJSON Overlay']) {

            $.getJSON(c['GeoJSON Overlay'], function(geojson) {



              // Parse properties string into a JS object

              var props = {};



              if (c['GeoJSON Feature Properties']) {

                var propsArray = c['GeoJSON Feature Properties'].split(';');

                var props = {};

                for (var p in propsArray) {

                  if (propsArray[p].split(':').length === 2) {

                    props[ propsArray[p].split(':')[0].trim() ] = propsArray[p].split(':')[1].trim();

                  }

                }

              }



              geoJsonOverlay = L.geoJson(geojson, {

                style: function(feature) {

                  return {

                    fillColor: feature.properties.fillColor || props.fillColor || '#ffffff',

                    weight: feature.properties.weight || props.weight || 1,

                    opacity: feature.properties.opacity || props.opacity || 0.5,

                    color: feature.properties.color || props.color || '#cccccc',

                    fillOpacity: feature.properties.fillOpacity || props.fillOpacity || 0.5,

                  }

                }

              }).addTo(map);

            });

          }



          // Fly to the new marker destination if latitude and longitude exist

          if (c['Latitude'] && c['Longitude']) {

            var zoom = c['Zoom'] ? c['Zoom'] : CHAPTER_ZOOM;

            map.flyTo([c['Latitude'], c['Longitude']], zoom, {

              animate: true,

              duration: 2, // default is 2 seconds

            });

          }



          // No need to iterate through the following chapters

          break;

        }

      }

    });





    $('#contents').append(" \

      <div id='space-at-the-bottom'> \

        <a href='#top'>  \

          <i class='fa fa-chevron-up'></i></br> \

          <small>Top</small>  \

        </a> \

      </div> \

    ");



    /* Generate a CSS sheet with cosmetic changes */

    $("<style>")

      .prop("type", "text/css")

      .html("\

      #narration, #title {\

        background-color: " + trySetting('_narrativeBackground', 'white') + "; \

        color: " + trySetting('_narrativeText', 'black') + "; \

      }\

      a, a:visited, a:hover {\

        color: " + trySetting('_narrativeLink', 'blue') + " \

      }\

      .in-focus {\

        background-color: " + trySetting('_narrativeActive', '#f0f0f0') + " \

      }")

      .appendTo("head");





    endPixels = parseInt(getSetting('_pixelsAfterFinalChapter'));

    if (endPixels > 100) {

      $('#space-at-the-bottom').css({

        'height': (endPixels / 2) + 'px',

        'padding-top': (endPixels / 2) + 'px',

      });

    }



    var bounds = [];

    for (i in markers) {

      if (markers[i]) {

        markers[i].addTo(map);

        markers[i]['_pixelsAbove'] = pixelsAbove[i];

        markers[i].on('click', function() {

          var pixels = parseInt($(this)[0]['_pixelsAbove']) + 5;

          $('div#contents').animate({

            scrollTop: pixels + 'px'});

        });

        bounds.push(markers[i].getLatLng());

      }

    }

    map.fitBounds(bounds);



    $('#map, #narration, #title').css('visibility', 'visible');

    $('div.loader').css('visibility', 'hidden');



    $('div#container0').addClass("in-focus");

    $('div#contents').animate({scrollTop: '1px'});



    // On first load, check hash and if it contains an number, scroll down

    if (parseInt(location.hash.substr(1))) {

      var containerId = parseInt( location.hash.substr(1) ) - 1;

      $('#contents').animate({

        scrollTop: $('#container' + containerId).offset().top

      }, 2000);

    }



    // Add Google Analytics if the ID exists

    var ga = getSetting('_googleAnalytics');

    if ( ga && ga.length >= 10 ) {

      var gaScript = document.createElement('script');

      gaScript.setAttribute('src','https://www.googletagmanager.com/gtag/js?id=' + ga);

      document.head.appendChild(gaScript);



      window.dataLayer = window.dataLayer || [];

      function gtag(){dataLayer.push(arguments);}

      gtag('js', new Date());

      gtag('config', ga);

    }





  }





  /**

   * Changes map attribution (author, GitHub repo, email etc.) in bottom-right

   */

  function changeAttribution() {

    var attributionHTML = $('.leaflet-control-attribution')[0].innerHTML;

    var credit = 'View <a href="'

      // Show Google Sheet URL if the variable exists and is not empty, otherwise link to Chapters.csv

      + (typeof googleDocURL !== 'undefined' && googleDocURL ? googleDocURL : './csv/Chapters.csv')

      + '" target="_blank">data</a>';



    var name = getSetting('_authorName');

    var url = getSetting('_authorURL');



    if (name && url) {

      if (url.indexOf('@') > 0) { url = 'mailto:' + url; }

      credit += ' by <a href="' + url + '">' + name + '</a> | ';

    } else if (name) {

      credit += ' by ' + name + ' | ';

    } else {

      credit += ' | ';

    }



    credit += 'View <a href="' + getSetting('_githubRepo') + '">code</a>';

    if (getSetting('_codeCredit')) credit += ' by ' + getSetting('_codeCredit');

    credit += ' with ';

    $('.leaflet-control-attribution')[0].innerHTML = credit + attributionHTML;

  }



});
    var parseGSheet = function(res) {
        return Papa.parse(Papa.unparse(res[0].values), { header: true }).data;
    };

    // Initialize the storymap
    function initStorymap(options, chapters) {
        createDocumentSettings(options);
        chaptersData = chapters;
        initMap();
        loadChapters();
        initYouTubePlayer();
        changeAttribution();
        applyCosmeticChanges();
        handleInitialHash();
        addGoogleAnalytics();
        hideLoader();
    }

    // Load data (try CSV first, then Google Sheet)
    $.get('csv/Options.csv', function(optionsCSV) {
        $.get('csv/Chapters.csv', function(chaptersCSV) {
            initStorymap(parseCSV(optionsCSV), parseCSV(chaptersCSV));
        }).fail(function() {
            loadFromGoogleSheet();
        });
    }).fail(function() {
        loadFromGoogleSheet();
    });

    function loadFromGoogleSheet() {
        if (typeof googleDocURL !== 'undefined' && googleDocURL) {
            if (typeof googleApiKey !== 'undefined' && googleApiKey) {
                var apiUrl = 'https://sheets.googleapis.com/v4/spreadsheets/';
                var spreadsheetId = googleDocURL.split('/d/')[1].split('/')[0];

                $.when(
                    $.getJSON(apiUrl + spreadsheetId + '/values/Options?key=' + googleApiKey),
                    $.getJSON(apiUrl + spreadsheetId + '/values/Chapters?key=' + googleApiKey)
                ).then(function(optionsRes, chaptersRes) {
                    initStorymap(parseGSheet(optionsRes), parseGSheet(chaptersRes));
                }).fail(function() {
                    alert('Failed to load data from Google Sheet.');
                });
            } else {
                alert('You need to add a free Google API key to load data from a Google Sheet.');
            }
        } else {
            alert('You need to specify a valid Google Sheet URL (googleDocURL).');
        }
    }

    /**
     * Reformulates documentSettings as a dictionary.
     */
    function createDocumentSettings(settings) {
        documentSettings = settings.reduce(function(acc, setting) {
            acc[setting.Setting] = setting.Customize;
            return acc;
        }, {});
    }

    function getSetting(s) {
        return documentSettings[constants[s]];
    }

    function trySetting(s, def) {
        var setting = getSetting(s);
        return (!setting || setting.trim() === '') ? def : setting;
    }

    function addBaseMap() {
        L.tileLayer.provider(trySetting('_tileProvider', 'Stamen.TonerLite'), {
            maxZoom: 18,
            apiKey: trySetting('_tileProviderApiKey', ''),
            apikey: trySetting('_tileProviderApiKey', ''),
            key: trySetting('_tileProviderApiKey', ''),
            accessToken: trySetting('_tileProviderApiKey', '')
        }).addTo(map);
    }

    function initMap() {
        map = L.map('map', {
            center: [0, 0],
            zoom: 1,
            scrollWheelZoom: false,
            zoomControl: trySetting('_zoomControls', 'topright') !== 'off',
            tap: false
        });
        if (trySetting('_zoomControls', 'topright') !== 'off') {
            map.zoomControl.setPosition(trySetting('_zoomControls', 'topright'));
        }
        addBaseMap();
    }

    function loadChapters() {
        var chapterContainerMargin = 70;
        var chapterCount = 0;
        var markers = [];
        var pixelsAbove = [];
        var currentlyInFocus = null;
        var overlay;
        var geoJsonOverlay;

        $('#header').append('<h1>' + (getSetting('_mapTitle') || '') + '</h1>');
        $('#header').append('<h2>' + (getSetting('_mapSubtitle') || '') + '</h2>');

        if (getSetting('_mapLogo')) {
            $('#logo').append('<img src="' + getSetting('_mapLogo') + '" />');
            $('#top').css('height', '60px');
        } else {
            $('#logo').css('display', 'none');
            $('#header').css('padding-top', '25px');
        }

        for (var i = 0; i < chaptersData.length; i++) {
            var c = chaptersData[i];

            if (!isNaN(parseFloat(c['Latitude'])) && !isNaN(parseFloat(c['Longitude']))) {
                var lat = parseFloat(c['Latitude']);
                var lon = parseFloat(c['Longitude']);

                chapterCount += 1;

                var marker = L.marker([lat, lon], {
                    icon: L.ExtraMarkers.icon({
                        icon: 'fa-number',
                        number: c['Marker'] === 'Numbered' ? chapterCount : (c['Marker'] === 'Plain' ? '' : c['Marker']),
                        markerColor: c['Marker Color'] || 'blue'
                    }),
                    opacity: c['Marker'] === 'Hidden' ? 0 : 0.9,
                    interactive: c['Marker'] === 'Hidden' ? false : true,
                });
                markers.push(marker);
                marker.addTo(map);
            } else {
                markers.push(null);
            }

            var container = $('<div></div>', {
                id: 'container' + i,
                class: 'chapter-container'
            });

            var mediaContainer = $('<div></div>', { class: 'media-container' });
            var source = '';
            if (c['Media Credit Link']) {
                source = $('<a>', { text: c['Media Credit'], href: c['Media Credit Link'], target: "_blank", class: 'source' });
            } else if (c['Media Credit']) {
                source = $('<span>', { text: c['Media Credit'], class: 'source' });
            }

            var media = null;
            if (c['Media Link'] && c['Media Link'].includes('youtube.com')) {
                // YouTube embed will be handled by the YouTube API
            } else if (c['Media Link']) {
                var mediaExt = c['Media Link'].split('.').pop().toLowerCase();
                var mediaType = { 'jpg': 'img', 'jpeg': 'img', 'png': 'img', 'tiff': 'img', 'gif': 'img', 'mp3': 'audio', 'ogg': 'audio', 'wav': 'audio' }[mediaExt];

                if (mediaType === 'img') {
                    media = $('<img />', { src: c['Media Link'], alt: c['Chapter'] });
                    if (getSetting('_enableLightbox') === 'yes') {
                        media = $('<a></a>', { 'data-lightbox': c['Media Link'], 'href': c['Media Link'], 'data-title': c['Chapter'], 'data-alt': c['Chapter'] }).append(media);
                    }
                } else if (mediaType === 'audio') {
                    media = <span class="math-inline">\('<audio controls\></audio\>'\)\.append\(</span>('<source>', { src: c['Media Link'], type: 'audio/' + mediaExt }));
                }
            }

            if (media) {
                mediaContainer.append(media).append(source);
            }

            container
                .append('<p class="chapter-header">' + c['Chapter'] + '</p>')
                .append(mediaContainer)
                .append('<p class="description">' + c['Description'] + '</p>');

            $('#contents').append(container);
        }

        pixelsAbove[0] = -100;
        for (var i = 1; i < chaptersData.length; i++) {
            pixelsAbove[i] = pixelsAbove[i - 1] + $('div#container' + (i - 1)).height() + chapterContainerMargin;
        }
        pixelsAbove.push(Number.MAX_VALUE);

        $('div#contents').scroll(function() {
            var currentPosition = $(this).scrollTop();
            if (currentPosition < 200) {
                $('#title').css('opacity', 1 - Math.min(1, currentPosition / 100));
            }

            for (var i = 0; i < pixelsAbove.length - 1; i++) {
                if (currentPosition >= pixelsAbove[i] && currentPosition < (pixelsAbove[i + 1] - 2 * chapterContainerMargin) && currentlyInFocus !== i) {
                    location.hash = i + 1;
                    $('.chapter-container').removeClass("in-focus").addClass("out-focus");
                    $('div#container' + i).addClass("in-focus").removeClass("out-focus");
                    currentlyInFocus = i;
                    markActiveMarker(currentlyInFocus, markers);
                    // No direct map update here, the video time will drive it
                    if (overlay && map.hasLayer(overlay)) map.removeLayer(overlay);
                    if (geoJsonOverlay && map.hasLayer(geoJsonOverlay)) map.removeLayer(geoJsonOverlay);

                    var c = chaptersData[i];
                    if (c['Overlay']) {
                        var opacity = parseFloat(c['Overlay Transparency']) || 1;
                        var url = c['Overlay'];
                        overlay = url.split('.').pop() === 'geojson' ? loadGeoJSONOverlay(url, opacity) : L.tileLayer(url, { opacity: opacity }).addTo(map);
                    }
                    if (c['GeoJSON Overlay']) {
                        geoJsonOverlay = loadGeoJSONOverlay(c['GeoJSON Overlay'], c['GeoJSON Feature Properties']);
                    }
                    break;
                }
            }
        });

        $('#contents').append("<div id='space-at-the-bottom'><a href='#top'><i class='fa fa-chevron-up'></i><br/><small>Top</small></a></div>");

        var bounds = [];
        markers.forEach(function(marker, index) {
            if (marker) {
                marker.on('click', function() {
                    $('div#contents').animate({ scrollTop: pixelsAbove[index] + 5 + 'px' });
                });
                bounds.push(marker.getLatLng());
            }
        });
        if (bounds.length > 0) {
            map.fitBounds(bounds);
        }

        $('div#container0').addClass("in-focus");
        $('div#contents').animate({ scrollTop: '1px' });
    }

    function markActiveMarker(index, markers) {
        markers.forEach(function(marker, i) {
            if (marker && marker._icon) {
                marker._icon.className = marker._icon.className.replace(' marker-active', '');
                if (i === index) {
                    marker._icon.className += ' marker-active';
                }
            }
        });
    }

    function updateMapForTime(currentTime) {
        if (!map || !chaptersData || chaptersData.length === 0 || !isPlayerReady) {
            return;
        }

        for (let i = 0; i < chaptersData.length; i++) {
            const chapter = chaptersData[i];
            const startTime = parseFloat(chapter['Video Timestamp Start']);
            const endTime = parseFloat(chapter['Video Timestamp End'] || Infinity);

            if (!isNaN(startTime) && currentTime >= startTime && currentTime < endTime) {
                const latitude = parseFloat(chapter['Latitude']);
                const longitude = parseFloat(chapter['Longitude']);
                const zoom = parseInt(chapter['Zoom']);

                if (!isNaN(latitude) && !isNaN(longitude) && !isNaN(zoom)) {
                    map.flyTo([latitude, longitude], zoom, {
                        animate: true,
                        duration: 1 // Adjust duration as needed
                    });
                    break; // Found the active chapter, no need to check further
                }
            }
        }
    }

    function loadGeoJSONOverlay(url, propertiesString) {
        $.getJSON(url, function(geojson) {
            var styleOptions = {};
            if (propertiesString) {
                var propsArray = propertiesString.split(';');
                styleOptions = propsArray.reduce(function(acc, prop) {
                    var parts = prop.split(':').map(function(p) { return p.trim(); });
                    if (parts.length === 2) {
                        acc[parts[0]] = parts[1];
                    }
                    return acc;
                }, {});
            }
            return L.geoJson(geojson, {
                style: function(feature) {
                    return {
                        fillColor: feature.properties.fillColor || styleOptions.fillColor || '#ffffff',
                        weight: feature.properties.weight || styleOptions.weight || 1,
                        opacity: feature.properties.opacity || styleOptions.opacity || 0.5,
                        color: feature.properties.color || styleOptions.color || '#cccccc',
                        fillOpacity: feature.properties.fillOpacity || styleOptions.fillOpacity || 0.5,
                    };
                }
            }).addTo(map);
        });
        return null; // Return null initially, the layer is added asynchronously
    }

    function applyCosmeticChanges() {
        $("<style>")
            .prop("type", "text/css")
            .html("\
            #narration, #title {\
                background-color: " + trySetting('_narrativeBackground', 'white') + "; \
                color: " + trySetting('_narrativeText', 'black') + "; \
            }\
            a, a:visited, a:hover {\
                color: " + trySetting('_narrativeLink', 'blue') + " \
            }\
            .in-focus {\
                background-color: " + trySetting('_narrativeActive', '#f0f0f0') + " \
            }")
            .appendTo("head");

        var endPixels = parseInt(getSetting('_pixelsAfterFinalChapter'));
        if (endPixels > 100) {
            $('#space-at-the-bottom').css({ 'height': (endPixels / 2) + 'px', 'padding-top': (endPixels / 2) + 'px' });
        }

        $('#map, #narration, #title').css('visibility', 'visible');
    }

    function hideLoader() {
        $('div.loader').css('visibility', 'hidden');
    }

    function handleInitialHash() {
        var hash = parseInt(location.hash.substr(1));
        if (!isNaN(hash) && hash > 0 && hash <= chaptersData.length) {
            $('div#contents').animate({ scrollTop: $('#container' + (hash - 1)).offset().top }, 2000);
        }
    }

    function addGoogleAnalytics() {
        var ga = getSetting('_googleAnalytics');
        if (ga && ga.length >= 10) {
            var gaScript = document.createElement('script');
            gaScript.async = true;
            gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + ga;
            document.head.appendChild(gaScript);
            window.dataLayer = window.dataLayer || [];
            function gtag() { dataLayer.push(arguments); }
            gtag('js', new Date());
            gtag('config', ga);
        }
    }

    function changeAttribution() {
        var attributionHTML = $('.leaflet-control-attribution')[0].innerHTML;
        var credit = 'View <a href="' + (typeof googleDocURL !== 'undefined' && googleDocURL ? googleDocURL : './csv/Chapters.csv') + '" target="_blank">data</a>';
        var name = getSetting('_authorName');
        var url = getSetting('_authorURL');

        if (name && url) {
            url = url.indexOf('@') > 0 ? 'mailto:' + url : url;
            credit += ' by <a href="' + url + '">' + name + '</a> | ';
        } else if (name) {
            credit += ' by ' + name + ' | ';
        } else {
            credit += ' | ';
        }

        credit += 'View <a href="' + getSetting('_githubRepo') + '">code</a>';
        if (getSetting('_codeCredit')) credit += ' by ' + getSetting('_codeCredit');
        credit += ' with ';
        $('.leaflet-control-attribution')[0].innerHTML = credit + attributionHTML;
    }

    // YouTube Player API Integration
    function initYouTubePlayer() {
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    // This function will be called when the YouTube API is ready
    window.onYouTubeIframeAPIReady = function() {
        player = new YT.Player('video-fixed', {
            height: '100%',
            width: '100%',
            videoId: '2', // <---------------------- YOUR YOUTUBE VIDEO ID HERE
            playerVars: {
                'playsinline': 1 // Important for mobile
