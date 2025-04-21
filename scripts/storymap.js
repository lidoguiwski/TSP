$(window).on('load', function () {
  var documentSettings = {};

  const CHAPTER_ZOOM = 15;

  $.get('csv/Options.csv', function (options) {
    $.get('csv/Chapters.csv', function (chapters) {
      initMap(
        $.csv.toObjects(options),
        $.csv.toObjects(chapters)
      );
    }).fail(function () {
      alert('Found Options.csv, but could not read Chapters.csv');
    });
  }).fail(function () {
    var parse = function (res) {
      return Papa.parse(Papa.unparse(res[0].values), { header: true }).data;
    };

    if (typeof googleDocURL !== 'undefined' && googleDocURL) {
      if (typeof googleApiKey !== 'undefined' && googleApiKey) {
        var apiUrl = 'https://sheets.googleapis.com/v4/spreadsheets/';
        var spreadsheetId = googleDocURL.split('/d/')[1].split('/')[0];

        $.when(
          $.getJSON(apiUrl + spreadsheetId + '/values/Options?key=' + googleApiKey),
          $.getJSON(apiUrl + spreadsheetId + '/values/Chapters?key=' + googleApiKey),
        ).then(function (options, chapters) {
          initMap(parse(options), parse(chapters));
        });
      } else {
        alert('You must add a Google API key to load the Sheet');
      }
    } else {
      alert('You need to specify a valid Google Sheet (googleDocURL)');
    }
  });

  function createDocumentSettings(settings) {
    for (var i in settings) {
      var setting = settings[i];
      documentSettings[setting.Setting] = setting.Customize;
    }
  }

  function getSetting(s) {
    return documentSettings[constants[s]];
  }

  function trySetting(s, def) {
    s = getSetting(s);
    if (!s || s.trim() === '') { return def; }
    return s;
  }

  function addBaseMap() {
    var basemap = trySetting('_tileProvider', 'Stamen.TonerLite');
    L.tileLayer.provider(basemap, {
      maxZoom: 18,
      apiKey: trySetting('_tileProviderApiKey', ''),
      apikey: trySetting('_tileProviderApiKey', ''),
      key: trySetting('_tileProviderApiKey', ''),
      accessToken: trySetting('_tileProviderApiKey', '')
    }).addTo(map);
  }

  function buildStoryMap(chapters) {
    // You can optionally add markers, popups, etc. here
    // This is where chapters are rendered in the scrolling interface if enabled
  }

  function initMap(options, chapters) {
    createDocumentSettings(options);

    map = L.map('map', {
      scrollWheelZoom: false,
      zoomControl: false,
      tap: false
    });

    addBaseMap();

    const center = [
      parseFloat(trySetting('_mapLat', '38.89')),
      parseFloat(trySetting('_mapLng', '-77.03'))
    ];
    const zoom = parseInt(trySetting('_mapZoom', '14'));
    map.setView(center, zoom);

    new L.Control.Zoom({ position: 'topright' }).addTo(map);

    // Build chapter-based timestamp sync list
    chapterTimestamps = chapters
      .filter(c => c.Timestamp && c.Latitude && c.Longitude)
      .map(c => ({
        time: convertTimeToSeconds(c.Timestamp),
        lat: parseFloat(c.Latitude),
        lng: parseFloat(c.Longitude),
        zoom: parseInt(c.Zoom || 15)
      }));

    buildStoryMap(chapters);
  }

  // YouTube timestamp-to-map sync logic
  let player;
  let chapterTimestamps = [];

  function convertTimeToSeconds(t) {
    if (!t || typeof t !== 'string') return null;
    const parts = t.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  function onYouTubeIframeAPIReady() {
    player = new YT.Player('ytplayer', {
      events: {
        'onReady': () => {
          console.log('YouTube player ready');
          setInterval(syncMapToVideo, 1000);
        }
      }
    });
  }

  let lastTimeMarker = null;

  function syncMapToVideo() {
    if (!player || !player.getCurrentTime) return;
    const currentTime = Math.floor(player.getCurrentTime());

    if (currentTime === lastTimeMarker) return;
    lastTimeMarker = currentTime;

    for (let i = chapterTimestamps.length - 1; i >= 0; i--) {
      const c = chapterTimestamps[i];
      if (c.time <= currentTime) {
        map.flyTo([c.lat, c.lng], c.zoom);
        break;
      }
    }
  }
});
