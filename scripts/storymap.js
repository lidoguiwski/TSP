var player;
var videoTimeInterval = null;
var chaptersWithTime = [];
var lastSyncedChapterIndex = -1;
var map;
var markers = [];

function onYouTubeIframeAPIReady() {
  player = new YT.Player('ytplayer', {
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

function onPlayerReady() {
  console.log("YouTube player ready.");
  if (typeof googleDocURL !== 'undefined' && googleDocURL) {
    loadFromGoogleSheet(googleDocURL);
  } else {
    loadFromCSV("csv/chapters.csv");
  }
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    if (!videoTimeInterval) {
      videoTimeInterval = setInterval(syncMapToVideo, 500);
    }
  } else {
    clearInterval(videoTimeInterval);
    videoTimeInterval = null;
  }
}

function syncMapToVideo() {
  if (!player || typeof player.getCurrentTime !== 'function') return;
  const currentTime = player.getCurrentTime();

  for (let i = 0; i < chaptersWithTime.length; i++) {
    const chap = chaptersWithTime[i];
    const nextChap = chaptersWithTime[i + 1];
    if (currentTime >= chap.time && (!nextChap || currentTime < nextChap.time)) {
      if (lastSyncedChapterIndex !== i) {
        map.setView([chap.lat, chap.lng], chap.zoom || 15);
        highlightMarker(i);
        highlightInfoPanel(i);
        lastSyncedChapterIndex = i;
      }
      break;
    }
  }
}

function highlightMarker(index) {
  markers.forEach((m, i) => {
    const el = m._icon;
    if (el) el.classList.toggle("marker-active", i === index);
  });
}

function highlightInfoPanel(index) {
  document.querySelectorAll(".chapter-container").forEach((el, i) => {
    el.classList.toggle("in-focus", i === index);
  });
}

function loadFromCSV(path) {
  Papa.parse(path, {
    header: true,
    download: true,
    complete: function(results) {
      chaptersWithTime = results.data.map(row => ({
        time: parseTimestamp(row.timestamp),
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lng),
        zoom: parseInt(row.zoom) || 15,
        title: row.title || '',
        description: row.description || ''
      })).filter(d => !isNaN(d.time) && !isNaN(d.lat) && !isNaN(d.lng));

      initMap();
    }
  });
}

function loadFromGoogleSheet(sheetUrl) {
  const csvUrl = sheetUrl.replace('/edit#gid=', '/export?format=csv&gid=');
  loadFromCSV(csvUrl);
}

function parseTimestamp(ts) {
  if (!ts) return NaN;
  const parts = ts.split(":").map(Number).reverse();
  let seconds = 0;
  if (parts[0]) seconds += parts[0];
  if (parts[1]) seconds += parts[1] * 60;
  if (parts[2]) seconds += parts[2] * 3600;
  return seconds;
}

function initMap() {
  if (!chaptersWithTime.length) return;

  map = L.map("map").setView([chaptersWithTime[0].lat, chaptersWithTime[0].lng], chaptersWithTime[0].zoom);
  L.tileLayer.provider("CartoDB.Positron").addTo(map);

  chaptersWithTime.forEach((chap, index) => {
    const marker = L.marker([chap.lat, chap.lng], {
      icon: L.ExtraMarkers.icon({
        icon: "fa-number",
        number: index + 1,
        markerColor: "blue",
        shape: "circle",
        prefix: "fa"
      })
    }).addTo(map).on('click', () => {
      if (player && typeof player.seekTo === 'function') {
        player.seekTo(chap.time, true);
        player.playVideo();
      }
    });
    markers.push(marker);

    const panel = document.getElementById("info-panel");
    const div = document.createElement("div");
    div.className = "chapter-container";
    div.innerHTML = `<h3>${chap.title}</h3><p>${chap.description}</p>`;
    panel.appendChild(div);
  });
}
