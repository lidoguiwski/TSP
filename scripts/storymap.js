// YT SYNC: Global variables for YouTube player and state
var player;
var videoTimeInterval = null; // Use null to indicate not active
var chaptersWithTime = [];
var lastSyncedChapterIndex = -1;
var map; // Make map accessible in wider scope if needed by YT functions
var markers = []; // Make markers accessible if needed for highlighting

// YT SYNC: YouTube API Ready function (MUST be global)
function onYouTubeIframeAPIReady() {
  console.log("YouTube API Ready - Initializing Player");
  try {
      player = new YT.Player('ytplayer', {
        events: {
          'onReady': onPlayerReady,
          'onStateChange': onPlayerStateChange,
          'onError': onPlayerError // YT SYNC: Add error handler
        }
      });
  } catch (e) {
      console.error("Error initializing YouTube player:", e);
      // Handle player initialization failure (e.g., show message)
      alert("Could not initialize the YouTube player. Please check API setup and network connection.");
  }
}

// YT SYNC: Player Ready Handler (global or accessible by onYouTubeIframeAPIReady)
function onPlayerReady(event) {
  console.log("YouTube Player Ready (onPlayerReady event fired)");
  // You could potentially enable player-dependent UI elements here
}

// YT SYNC: Player State Change Handler (global or accessible by onYouTubeIframeAPIReady)
function onPlayerStateChange(event) {
  console.log("Player State Changed:", event.data);
  if (event.data == YT.PlayerState.PLAYING) {
    console.log("Video Playing - Starting Sync");
    clearInterval(videoTimeInterval); // Clear any existing interval
    // Start checking time frequently
    videoTimeInterval = setInterval(syncMapToVideo, 500); // Check every 500ms
    // Sync immediately when play starts
    syncMapToVideo();
  } else {
    // Video is paused, buffered, ended, etc. Stop checking time.
    if (videoTimeInterval !== null) {
        console.log("Video Not Playing/Ended/Paused - Stopping Sync");
        clearInterval(videoTimeInterval);
        videoTimeInterval = null; // Indicate sync is off
    }
  }
}

// YT SYNC: Player Error Handler
function onPlayerError(event) {
    console.error("YouTube Player Error:", event.data);
    // Log common errors
    let errorMessage = "An error occurred with the YouTube player.";
    switch (event.data) {
        case 2: // Invalid parameter
             errorMessage = "YouTube Player Error: Invalid video ID or player parameters.";
             break;
        case 5: // HTML5 player error
             errorMessage = "YouTube Player Error: Problem with the HTML5 player.";
             break;
        case 100: // Video not found or private
             errorMessage = "YouTube Player Error: Video not found or marked as private.";
             break;
        case 101: // Embedding disallowed
        case 150: // Embedding disallowed
             errorMessage = "YouTube Player Error: The video owner does not allow embedding.";
             break;
         default:
              errorMessage = `YouTube Player Error: Code ${event.data}`;
    }
     // Optionally display error to user (e.g., in a specific div)
     // $('#player-error-message').text(errorMessage).show();
     console.error(errorMessage);
     // alert(errorMessage); // Use alert for immediate feedback during debugging
}


// YT SYNC: Timestamp Parsing Function (can be inside load handler or global)
function parseTimestamp(timestamp) {
    if (!timestamp || typeof timestamp !== 'string') {
      return null;
    }
    // Trim whitespace just in case
    timestamp = timestamp.trim();
    // Match H:MM:SS or MM:SS or M:SS
    const parts = timestamp.split(':').map(Number);
    let seconds = 0;
    if (parts.length === 3) { // H:MM:SS
      if (parts.some(isNaN)) return null; // Check for invalid numbers
      seconds += parts[0] * 3600;
      seconds += parts[1] * 60;
      seconds += parts[2];
    } else if (parts.length === 2) { // MM:SS
       if (parts.some(isNaN)) return null; // Check for invalid numbers
      seconds += parts[0] * 60;
      seconds += parts[1];
    } else if (parts.length === 1 && !isNaN(parts[0])) { // Allow seconds only?
        seconds = parts[0]; // Treat single number as seconds
    }
      else {
      return null; // Invalid format
    }
    return seconds;
}

// YT SYNC: Map Synchronization Function (needs access to map, player, chaptersWithTime)
function syncMapToVideo() {
    // Ensure player is ready and has the necessary methods, and map/data are ready
    if (!player || typeof player.getCurrentTime !== 'function' || !map || chaptersWithTime.length === 0) {
      // console.log("Sync prerequisites not met:", !player, typeof player.getCurrentTime, !map, chaptersWithTime.length === 0);
      return; // Silently return if prerequisites not met
    }

    const currentTime = player.getCurrentTime();
    let chapterToSync = null;
    let chapterIndexInTimedArray = -1; // Index within chaptersWithTime

    // Find the latest chapter whose timestamp is before or at the current video time
    for (let i = chaptersWithTime.length - 1; i >= 0; i--) {
      // Add a small buffer (e.g., 0.1s) maybe? To catch exact times better.
      if (currentTime >= chaptersWithTime[i].time - 0.1) {
        chapterToSync = chaptersWithTime[i];
        chapterIndexInTimedArray = i;
        break;
      }
    }

    // Check if this *timed* chapter index is different from the last one we synced via video
    if (chapterToSync && chapterIndexInTimedArray !== lastSyncedChapterIndex) {
      console.log(`Syncing map to chapter index ${chapterToSync.originalIndex} at ${chapterToSync.time}s (Video time: ${currentTime.toFixed(1)}s)`);

      // Update the map view
      map.flyTo([chapterToSync.lat, chapterToSync.lon], chapterToSync.zoom);

      // Also scroll the info panel to this chapter
      var containerElement = document.getElementById('container' + chapterToSync.originalIndex);
      if (containerElement) {
            var infoPanel = document.getElementById('info-panel');
            if (infoPanel) { // Check if panel exists
                // Check if the element is already (mostly) in view to avoid jerky scrolls
                var rect = containerElement.getBoundingClientRect();
                var infoPanelRect = infoPanel.getBoundingClientRect();
                // Check if top is below panel top OR bottom is above panel bottom (fully out of view)
                // Or partially out of view (e.g. top < panelTop + buffer or bottom > panelBottom - buffer)
                var buffer = 50; // Pixels buffer
                if (rect.top < infoPanelRect.top - buffer || rect.bottom > infoPanelRect.bottom + buffer) {
                    console.log(`Scrolling panel to chapter ${chapterToSync.originalIndex}`);
                    containerElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
             }
       }


      // Update focus styling in the panel
      $('.chapter-container').removeClass("in-focus").addClass("out-focus");
      $('#container' + chapterToSync.originalIndex).addClass("in-focus").removeClass("out-focus");

      // YT SYNC: Highlight the corresponding marker (Optional)
      markActiveColor(chapterToSync.originalIndex); // Ensure markActiveColor handles this index correctly

      lastSyncedChapterIndex = chapterIndexInTimedArray; // Remember this timed chapter index was synced
    }
    // If video time is before the first timestamp, reset sync status
    else if (!chapterToSync && lastSyncedChapterIndex !== -1) {
        console.log("Video time before first chapter timestamp.");
        lastSyncedChapterIndex = -1; // Reset sync status
        // Optional: Reset map view or focus styling if needed
        // $('.chapter-container').removeClass("in-focus").addClass("out-focus");
        // $('#container0').addClass("in-focus").removeClass("out-focus");
        // map.flyTo([initialLat, initialLon], initialZoom);
    }
}


$(window).on('load', function() {
  console.log("Window Load event fired.");
  var documentSettings = {};
  // Reset global states on load/reload
  chaptersWithTime = [];
  lastSyncedChapterIndex = -1;
  markers = []; // Reset markers array

  // Some constants, such as default settings
  const CHAPTER_ZOOM = 15;


  // --- Data Loading ---
  // Define function to handle data initialization AFTER data is loaded
  function processDataAndInitMap(optionsData, chaptersData) {
      if (!chaptersData || chaptersData.length === 0) {
         console.error("Chapters data is empty or invalid after loading.");
         alert("Error: Could not load or parse chapter data. Please check the CSV file format and path.");
         $('div.loader').text('Error loading chapter data.'); // Update loader text
         return;
      }
      // Check if map object exists (should be created in index.html)
       if (typeof map === 'undefined' || !map) {
           console.error("Leaflet map object 'map' not found during initMap call.");
           alert("Map initialization error. Check index.html.");
           $('div.loader').text('Error initializing map.');
           return;
       }
       console.log("Data loaded, proceeding with initMap.");
       initMap(optionsData || [], chaptersData); // Ensure optionsData is at least an empty array
   }

  // Try loading local CSV first
  // *** IMPORTANT: Verify this path is correct! ***
  // If TSP - Chapters (2).csv is in the SAME directory as index.html, use:
  const chaptersFilePath = 'TSP - Chapters (2).csv';
  // If it's inside a 'csv' subfolder, use:
  // const chaptersFilePath = 'csv/TSP - Chapters (2).csv';

  console.log("Attempting to load CSV files...");
  $.when(
      // Load Options (assuming it's in a 'csv' folder, adjust if not)
      $.get('csv/Options.csv').catch(function() {
          console.warn("Options.csv not found or failed to load. Using defaults.");
          return null; // Return null on failure
      }),
      // Load Chapters (using the path defined above)
      $.get(chaptersFilePath)
  )
  .done(function(optionsAjaxResult, chaptersAjaxResult) {
      // $.when returns arrays [data, statusText, jqXHR]
      const optionsCSV = optionsAjaxResult ? optionsAjaxResult[0] : ''; // Get data or empty string
      const chaptersCSV = chaptersAjaxResult[0]; // Chapters data is required

      console.log("Local CSV files loaded successfully.");

      // Parse CSV data using PapaParse
      const chaptersData = Papa.parse(chaptersCSV, { header: true, skipEmptyLines: true }).data;
      const optionsData = optionsCSV ? Papa.parse(optionsCSV, { header: true, skipEmptyLines: true }).data : [];

      processDataAndInitMap(optionsData, chaptersData);

  })
  .fail(function(jqXHR, textStatus, errorThrown) {
      console.error(`Failed to load local CSV file (${chaptersFilePath}):`, textStatus, errorThrown);
      console.log("Attempting fallback to Google Sheets...");

      // --- Google Sheets Fallback Logic ---
       var parseSheetData = function(res) {
           // Check response structure - varies based on API version/call
           // Assuming res[0] is the actual response object from $.getJSON
           if (res && res[0] && res[0].values) {
               return Papa.parse(Papa.unparse(res[0].values), { header: true, skipEmptyLines: true }).data;
           } else {
               console.error("Unexpected Google Sheets API response structure:", res);
               return []; // Return empty array on parsing failure
           }
       };

       if (typeof googleDocURL !== 'undefined' && googleDocURL) {
           if (typeof googleApiKey !== 'undefined' && googleApiKey) {
               var apiUrl = 'https://sheets.googleapis.com/v4/spreadsheets/';
               var spreadsheetId = googleDocURL.split('/d/')[1].split('/')[0];
               console.log("Fetching from Google Sheets ID:", spreadsheetId);

               $.when(
                   $.getJSON(apiUrl + spreadsheetId + '/values/Options?key=' + googleApiKey).catch(function(){ console.warn("Failed to load Options from Google Sheet."); return null; }),
                   $.getJSON(apiUrl + spreadsheetId + '/values/Chapters?key=' + googleApiKey)
               ).done(function(optionsResult, chaptersResult) {
                   // Check if chaptersResult is valid
                   if (!chaptersResult || !chaptersResult[0] || !chaptersResult[0].values) {
                        console.error("Failed to load required Chapters data from Google Sheets.");
                        alert("Error: Could not load Chapters data from Google Sheets. Check Sheet ID, API key, and sheet permissions.");
                        $('div.loader').text('Error loading data from Google Sheets.');
                        return;
                   }
                   const optionsData = optionsResult ? parseSheetData(optionsResult) : [];
                   const chaptersData = parseSheetData(chaptersResult);
                   console.log("Google Sheets data loaded.");
                   processDataAndInitMap(optionsData, chaptersData);

               }).fail(function() {
                   console.error('Error fetching data from Google Sheets.');
                   alert('Error fetching data from Google Sheets. Check API Key, Sheet ID, and permissions.');
                   $('div.loader').text('Error loading data from Google Sheets.');
               });
           } else {
               console.error('Google API key not found.');
               alert('To load data from a Google Sheet, you need to add a free Google API key to google-doc-url.js');
               $('div.loader').text('Missing Google API Key.');
           }
       } else {
           console.error('Google Sheet URL not specified.');
           alert('Local CSV failed and Google Sheet URL (googleDocURL) is not specified in google-doc-url.js');
           $('div.loader').text('Data source configuration error.');
       }
      // --- End Google Sheets Fallback ---
  });


  /**
   * Reformulates documentSettings as a dictionary, e.g.
   * {"webpageTitle": "Leaflet Boilerplate", "infoPopupText": "Stuff"}
   */
  function createDocumentSettings(settings) {
    documentSettings = {}; // Reset for potential reloads
    if (!settings) return; // Handle case where options might be null/undefined
    for (var i in settings) {
      var setting = settings[i];
      if(setting && setting.Setting) { // Check if setting and Setting property exist
        documentSettings[setting.Setting] = setting.Customize;
      }
    }
    console.log("Document Settings:", documentSettings);
  }

  /**
    * Returns the value of a setting s from constants.js lookup
    */
  function getSetting(s) {
    // Check if constants and the key exist
    if (typeof constants !== 'undefined' && constants[s]) {
        return documentSettings[constants[s]];
    }
    // console.warn(`Constant key '${s}' not found in constants.js`);
    return undefined;
  }


  /**
    * Returns the value of setting named s from constants.js
    * or def if setting is either not set or does not exist
    */
  function trySetting(s, def) {
    var settingValue = getSetting(s);
    // Check for undefined, null, or empty string after trimming
    if (settingValue === undefined || settingValue === null || String(settingValue).trim() === '') {
      // console.log(`Setting '${s}' not found or empty, using default: '${def}'`);
      return def;
    }
    return settingValue;
  }


  /**
    * Loads the basemap and adds it to the map
    */
   function addBaseMap() {
    if (!map) {
        console.error("Map object not initialized before adding basemap.");
        return;
    }
    // Clear existing tile layers first to prevent duplicates on reload
    map.eachLayer(function (layer) {
        if (layer instanceof L.TileLayer) {
            map.removeLayer(layer);
        }
    });

    var basemap = trySetting('_tileProvider', 'OpenStreetMap.Mapnik');
    console.log("Adding basemap:", basemap);
    try {
        L.tileLayer.provider(basemap, {
          maxZoom: parseInt(trySetting('_maxZoom', 18)), // Ensure number
          // Pass API key using common parameter names
          apiKey: trySetting('_tileProviderApiKey', undefined), // Use undefined if not set
          apikey: trySetting('_tileProviderApiKey', undefined),
          key: trySetting('_tileProviderApiKey', undefined),
          accessToken: trySetting('_tileProviderApiKey', undefined)
        }).addTo(map);
    } catch (e) {
        console.error(`Error adding basemap provider '${basemap}':`, e);
        console.log("Falling back to standard OpenStreetMap tiles.");
        // Fallback to standard OSM - Ensure this isn't removed by the clear layers above if it's the only one
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18,
        }).addTo(map);
    }
   }


  function initMap(options, chapters) {
    console.log("initMap started.");
    // Reset global states again just in case
    chaptersWithTime = [];
    lastSyncedChapterIndex = -1;
    markers = [];

    // Ensure Leaflet map object 'map' is available
    if (typeof map === 'undefined' || !map) {
        console.error("Leaflet map object not found during initMap. Aborting.");
        return; // Stop execution if map isn't ready
    }

    createDocumentSettings(options);

    var chapterContainerMargin = 10; // Margin used for scroll calculations (adjust as needed)

    // Clear existing dynamic content
    $('#info-panel').empty(); // Clear previous chapters/header
    // Note: Header/Logo are now added dynamically inside info-panel

    // Add Header/Title/Logo inside info-panel
    let headerHtml = '<div id="storymap-header" style="padding: 10px 15px; border-bottom: 1px solid #ccc;">';
    headerHtml += '<h1>' + trySetting('_mapTitle', 'Storymap') + '</h1>';
    const subTitle = trySetting('_mapSubtitle', '');
    if (subTitle) {
        headerHtml += '<h2>' + subTitle + '</h2>';
    }
    const logoUrl = trySetting('_mapLogo', '');
    if (logoUrl) {
        headerHtml += '<img src="' + logoUrl + '" alt="Logo" style="max-height: 50px; margin-top: 5px;" />';
    }
    headerHtml += '</div>';
    $('#info-panel').append(headerHtml);

    // Load Base Map Tiles
    addBaseMap();

    // Add Zoom Controls
    if (map.zoomControl) { map.zoomControl.remove(); } // Remove default/previous
    if (trySetting('_zoomControls', 'topright') !== 'off') {
      L.control.zoom({
        position: trySetting('_zoomControls', 'topright')
      }).addTo(map);
    }

    // Prepare chapter processing variables
    var chapterCount = 0;
    var pixelsAbove = []; // Stores scroll offsetTop for each chapter start
    var currentlyInFocus = -1; // Tracks chapter index focused by SCROLLING
    var overlay; // To hold overlay layer object
    var geoJsonOverlay; // To hold GeoJSON overlay layer object

    // Create a container for all chapters within the info-panel
    var $contentsDiv = $('<div>', { id: 'contents' }); // No extra padding needed if chapter-container has it
    $('#info-panel').append($contentsDiv); // Append chapters container AFTER the header

    // --- Loop through Chapters ---
    console.log(`Processing ${chapters.length} chapters...`);
    for (var i = 0; i < chapters.length; i++) {
        var c = chapters[i];
        // Skip empty rows or rows without essential data (e.g., Description)
        if (!c || (!c['Chapter'] && !c['Description'])) {
            console.log("Skipping empty/invalid chapter row:", i);
            continue;
        }

        // --- Marker Logic ---
        var lat = parseFloat(c['Latitude']);
        var lon = parseFloat(c['Longitude']);
        var marker = null; // Define marker variable for this chapter

        if (!isNaN(lat) && !isNaN(lon)) {
            chapterCount++; // Increment only for chapters with coordinates
            // Marker creation logic (using ExtraMarkers)
            var iconSettings = { /* ... icon settings based on Marker, Marker Color columns ... */
                 icon: 'fa-number',
                 number: '',
                 markerColor: String(c['Marker Color'] || 'blue').toLowerCase(),
                 shape: 'circle',
                 prefix: 'fa'
            };
             var markerType = String(c['Marker'] || 'Numbered').toLowerCase(); // Default to numbered

             if (markerType === 'numbered') { iconSettings.number = chapterCount; }
             else if (markerType === 'hidden') { iconSettings = null; } // Indicate no marker needed
             else if (markerType === 'plain') { iconSettings.icon = ''; iconSettings.number = ''; }
             else { iconSettings.icon = markerType; iconSettings.prefix = markerType.startsWith('fa-') ? 'fa' : 'fas'; iconSettings.number = ''; }

             if (iconSettings) {
                 marker = L.marker([lat, lon], {
                    icon: L.ExtraMarkers.icon(iconSettings),
                    opacity: 0.9,
                    interactive: true,
                    // Custom property to link marker back to chapter index
                    chapterIndex: i
                 });
                 // Add marker to map later, push to array now
                 markers.push(marker);
             } else {
                 markers.push(null); // Push null if hidden
             }

        } else {
            markers.push(null); // Push null if no coordinates
        }


        // --- YT SYNC: Process Timestamp ---
        const timeInSeconds = parseTimestamp(c['Timestamp']);
        if (timeInSeconds !== null && !isNaN(lat) && !isNaN(lon)) {
          chaptersWithTime.push({
            originalIndex: i, // Store original index from the chapters array
            time: timeInSeconds,
            lat: lat,
            lon: lon,
            zoom: parseInt(c['Zoom'], 10) || map.getZoom() // Use chapter zoom or current map zoom
          });
        }

        // --- Chapter Container and Content ---
        var container = $('<div></div>', {
          id: 'container' + i,
          class: 'chapter-container', // Apply styling class
          'data-chapter-index': i // Add index as data attribute
        });

        // Chapter Title (only if exists)
        if (c['Chapter']) { container.append('<p class="chapter-header">' + c['Chapter'] + '</p>'); }

        // Media (Image/Audio - YouTube handled by fixed player)
        // Media Logic (Image, Audio - Exclude YouTube iframe here)
        var mediaLink = c['Media Link'];
        var mediaCredit = c['Media Credit'];
        var mediaCreditLink = c['Media Credit Link'];
        var mediaContainer = null;

        if (mediaLink && !mediaLink.includes('youtube.com') && !mediaLink.includes('youtu.be')) {
            // Image or Audio Logic...
            var mediaExt = mediaLink.split('.').pop().toLowerCase();
            var mediaType = '';
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(mediaExt)) { mediaType = 'img'; }
            else if (['mp3', 'ogg', 'wav', 'm4a'].includes(mediaExt)) { mediaType = 'audio'; }

            if (mediaType) {
                var media = $('<' + mediaType + '>', { /* attributes */
                    src: mediaLink,
                    controls: mediaType === 'audio',
                    alt: c['Chapter'] || 'Chapter Media',
                    style: mediaType === 'img' ? 'max-width: 100%; height: auto; border-radius: 3px;' : ''
                 });

                 // Optional Lightbox for images
                 var enableLightbox = trySetting('_enableLightbox', 'yes') === 'yes';
                 if (enableLightbox && mediaType === 'img') {
                      var lightboxWrapper = $('<a></a>', { /* attributes */
                         'data-lightbox': 'storymap-gallery', // Use one gallery name
                         'href': mediaLink,
                         'data-title': (c['Chapter'] || '') + (mediaCredit ? ' | Credit: ' + mediaCredit : ''),
                         'data-alt': c['Chapter'] || 'Chapter Image'
                      });
                      media = lightboxWrapper.append(media);
                 }

                  mediaContainer = $('<div></div>', { class: 'media-container ' + mediaType + '-container' }).append(media);

                  // Add Source/Credit
                  if (mediaCredit) {
                      var sourceElement;
                      if (mediaCreditLink) { sourceElement = $('<a>', { text: mediaCredit, href: mediaCreditLink, target: "_blank", class: 'source' }); }
                      else { sourceElement = $('<span>', { text: mediaCredit, class: 'source' }); }
                      mediaContainer.append(sourceElement); // Append source within the media container
                  }
            }
        }
        if (mediaContainer) { container.append(mediaContainer); }


        // Description (only if exists)
        if (c['Description']) { container.append('<p class="description">' + c['Description'] + '</p>'); }

        // Append the fully constructed chapter container to the main contents div
        $contentsDiv.append(container);


        // --- YT SYNC: Make Info Panel Chapter Clickable (if it has time) ---
        if (timeInSeconds !== null) {
            container.css('cursor', 'pointer');
            container.addClass('timed-chapter'); // Add class for styling/selection
            container.attr('data-timestamp-seconds', timeInSeconds);

            container.off('click.timedChapter').on('click.timedChapter', function() { // Add namespace
                var seconds = parseFloat($(this).attr('data-timestamp-seconds'));
                var clickedChapterIndex = parseInt($(this).attr('data-chapter-index'));
                var chapterData = chapters[clickedChapterIndex]; // Get the chapter data

                // Ensure player is ready and seekable
                if (player && typeof player.seekTo === 'function' && !isNaN(seconds)) {
                    console.log(`Chapter Click: Seeking video to ${seconds}s`);
                    player.seekTo(seconds, true); // Seek and allow seek ahead
                     // Only play if not already playing? Optional.
                     if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
                          player.playVideo();
                     }


                    // --- Immediately update map and panel for responsiveness ---
                     if (chapterData && !isNaN(parseFloat(chapterData['Latitude'])) && !isNaN(parseFloat(chapterData['Longitude']))) {
                        var lat = parseFloat(chapterData['Latitude']);
                        var lon = parseFloat(chapterData['Longitude']);
                        var zoom = parseInt(chapterData['Zoom'], 10) || map.getZoom();
                         console.log(`Chapter Click: Flying map to [${lat}, ${lon}] zoom ${zoom}`);
                        map.flyTo([lat, lon], zoom);

                        // Update styling immediately
                        $('.chapter-container').removeClass("in-focus").addClass("out-focus");
                        $(this).addClass("in-focus").removeClass("out-focus");

                        // Find the index within the *timed* chapters array for sync tracking
                        const timedArrayIndex = chaptersWithTime.findIndex(chap => chap.originalIndex === clickedChapterIndex);
                        if (timedArrayIndex !== -1) {
                            lastSyncedChapterIndex = timedArrayIndex; // Update sync index
                        }
                         // Scroll panel into view if needed (optional, syncMapToVideo might handle it)
                         // this.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }

                } else if (chapterData && !isNaN(parseFloat(chapterData['Latitude'])) && !isNaN(parseFloat(chapterData['Longitude']))) { // Fallback if video fails: just move map
                     console.warn(`Chapter Click: Video player not ready or seek failed. Flying map only.`);
                     var lat = parseFloat(chapterData['Latitude']);
                     var lon = parseFloat(chapterData['Longitude']);
                     var zoom = parseInt(chapterData['Zoom'], 10) || map.getZoom();
                     map.flyTo([lat, lon], zoom);
                      // Update styling
                     $('.chapter-container').removeClass("in-focus").addClass("out-focus");
                     $(this).addClass("in-focus").removeClass("out-focus");
                     // Scroll panel
                     this.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else {
                    console.warn("Chapter Click: No coordinates or player not ready for chapter", clickedChapterIndex);
                }
            });
        } else {
            // Remove pointer cursor if chapter is not timed
            container.css('cursor', 'default');
        }

    } // --- End of Chapters Loop ---
    console.log("Finished processing chapters.");


    // --- Post-Loop Setup ---

    // YT SYNC: Sort timed chapters AFTER the loop
    chaptersWithTime.sort((a, b) => a.time - b.time);
    console.log("Chapters with timestamps sorted:", chaptersWithTime);

    // Calculate scroll positions (relative to the #info-panel scroll container)
    pixelsAbove = [];
    var cumulativeHeight = 0;
    // Ensure the header height is accounted for if it's inside the scroll container
    var headerHeight = $('#storymap-header').outerHeight(true) || 0;
    cumulativeHeight += headerHeight;

    $('#contents .chapter-container').each(function(index) {
        pixelsAbove[$(this).data('chapter-index')] = cumulativeHeight; // Use data-attr index
        cumulativeHeight += $(this).outerHeight(true); // Use outerHeight(true) to include margin
    });
    pixelsAbove.push(cumulativeHeight); // Add end boundary for last chapter
    console.log("Pixels Above calculated:", pixelsAbove);


    // --- Scroll Event Listener for #info-panel ---
    $('#info-panel').off('scroll.storymap').on('scroll.storymap', function() {
        var currentScrollTop = $(this).scrollTop();
        var infoPanelHeight = $(this).height();

        // --- YT SYNC: Check if video is currently driving navigation ---
        if (videoTimeInterval !== null) {
            // Video is playing and syncing, do not update map based on scroll
            return; // Exit scroll handler
        }
        // --- End YT SYNC Check ---

        // Find which chapter is in view based on scroll position
        var chapterIndexInView = -1;
        var chapterElements = $('#contents .chapter-container');

        for (var i = 0; i < chapterElements.length; i++) {
            var $chap = $(chapterElements[i]);
            var chapIndex = $chap.data('chapter-index');
            var chapTop = pixelsAbove[chapIndex];
            var chapBottom = chapTop + $chap.outerHeight(true);

             // Define the "active zone" in the viewport (e.g., middle 50%)
            var activeZoneTop = currentScrollTop + infoPanelHeight * 0.1; // 10% from top
            var activeZoneBottom = currentScrollTop + infoPanelHeight * 0.9; // 90% from top

            // Check if the chapter overlaps significantly with the active zone
            // Chapter top is above bottom of zone && Chapter bottom is below top of zone
            if (chapTop < activeZoneBottom && chapBottom > activeZoneTop) {
                 // More specific check: center of chapter within viewport?
                 var chapCenter = chapTop + $chap.outerHeight(true) / 2;
                 if (chapCenter >= currentScrollTop && chapCenter <= currentScrollTop + infoPanelHeight) {
                      chapterIndexInView = chapIndex;
                      break; // Found the most prominent chapter in view
                 }
                 // Fallback: if no center is found, take the first one overlapping
                 if (chapterIndexInView === -1) chapterIndexInView = chapIndex;
            }
        }

        // Update map and styling only if the chapter in view has changed
        if (chapterIndexInView !== -1 && chapterIndexInView !== currentlyInFocus) {
             console.log("Scroll focus change detected. New chapter:", chapterIndexInView);

            // Update focus styling
            $('.chapter-container').removeClass("in-focus"); //.addClass("out-focus"); // Keep out-focus? maybe not needed
            $('#container' + chapterIndexInView).addClass("in-focus"); //.removeClass("out-focus");

            currentlyInFocus = chapterIndexInView; // Update the currently focused chapter index (by scroll)
            markActiveColor(currentlyInFocus); // Update marker color

            // Update URL Hash (optional, can conflict with video sync)
            // location.hash = currentlyInFocus + 1;

            // --- Remove Overlays (if any) ---
            if (overlay && map.hasLayer(overlay)) { map.removeLayer(overlay); overlay = null; }
            if (geoJsonOverlay && map.hasLayer(geoJsonOverlay)) { map.removeLayer(geoJsonOverlay); geoJsonOverlay = null;}

            var c = chapters[currentlyInFocus]; // Get data for the focused chapter

            // --- Add New Overlays (if any) ---
            // Add overlay logic here... (using 'c')

            // --- Fly map to the location for this chapter ---
            if (c && !isNaN(parseFloat(c['Latitude'])) && !isNaN(parseFloat(c['Longitude']))) {
                var lat = parseFloat(c['Latitude']);
                var lon = parseFloat(c['Longitude']);
                var zoom = parseInt(c['Zoom'], 10) || CHAPTER_ZOOM;
                console.log(`Scroll: Flying map to [${lat}, ${lon}] zoom ${zoom}`);
                map.flyTo([lat, lon], zoom, { animate: true, duration: 1.5 });
            } else {
                 console.log("Scroll: Chapter in focus has no coordinates.");
                 // Optional: What to do if chapter has no coordinates? Stay put? Fly to default?
            }
        } else if (chapterIndexInView === -1 && currentlyInFocus !== -1) {
             // Scrolled out of all chapters (e.g., only header visible)
             console.log("Scroll: No chapter in focus.");
             $('.chapter-container').removeClass("in-focus");
             currentlyInFocus = -1;
             markActiveColor(-1); // Deactivate all markers
             // Optional: Reset map view?
        }
    }); // --- End of Scroll Event Listener ---


    // Add space at the bottom for scrolling last chapter fully
    var endPixels = parseInt(trySetting('_pixelsAfterFinalChapter', '300'));
    $contentsDiv.append(`
      <div id='space-at-the-bottom' style='height: ${endPixels}px; text-align: center; padding-top: 20px;'>
        <a href='#container0' onclick="$('#info-panel').animate({scrollTop: 0}); return false;" style="text-decoration: none;">
          <i class='fa fa-chevron-up'></i><br><small>Top</small>
        </a>
      </div>
    `);

    /* Generate CSS sheet with cosmetic changes */
    updateDynamicStyles();

    // Add markers to map and attach click listeners
    var bounds = L.latLngBounds(); // Use LatLngBounds for easier fitting
    markers.forEach(function(marker, index) {
        if (marker) {
            marker.addTo(map);
            marker.off('click').on('click', function() { // Namespace click? .off('click.marker')
                var chapterIndex = this.options.chapterIndex; // Retrieve index stored earlier
                console.log("Marker clicked for chapter:", chapterIndex);

                // YT SYNC: Check if this chapter has a timestamp
                const timedChapter = chaptersWithTime.find(chap => chap.originalIndex === chapterIndex);

                if (timedChapter && player && typeof player.seekTo === 'function') {
                    // If it has a timestamp, seek video which will trigger map/scroll/style
                    console.log(`Marker Click (timed): Seeking video to ${timedChapter.time}s`);
                    player.seekTo(timedChapter.time, true);
                    if (player.getPlayerState() !== YT.PlayerState.PLAYING) { player.playVideo(); }
                } else {
                     // No timestamp or video not ready, just scroll panel and fly map
                     console.log(`Marker Click (no time/video): Scrolling panel and flying map for chapter ${chapterIndex}`);
                     const targetElement = document.getElementById('container' + chapterIndex);
                     if (targetElement && pixelsAbove[chapterIndex] !== undefined) {
                          $('#info-panel').animate({ scrollTop: pixelsAbove[chapterIndex] }, 800); // Animate scroll
                     } else {
                          console.warn("Could not find target element or scroll position for chapter", chapterIndex);
                     }

                     // Manually flyTo and update style if not handled by scroll event
                     var c = chapters[chapterIndex];
                     if (c && !isNaN(parseFloat(c['Latitude'])) && !isNaN(parseFloat(c['Longitude']))) {
                        var lat = parseFloat(c['Latitude']);
                        var lon = parseFloat(c['Longitude']);
                        var zoom = parseInt(c['Zoom'], 10) || CHAPTER_ZOOM;
                        map.flyTo([lat, lon], zoom);
                        markActiveColor(chapterIndex); // Update marker color immediately
                        $('.chapter-container').removeClass("in-focus");
                        $('#container' + chapterIndex).addClass("in-focus");
                        currentlyInFocus = chapterIndex; // Update scroll focus tracker
                     }
                }
            });
            // Extend bounds if marker is interactive (i.e., not hidden)
            if (marker.options.interactive !== false) {
                 bounds.extend(marker.getLatLng());
            }
        }
    });
    console.log("Markers added to map.");

    // Fit map to marker bounds if bounds are valid
    if (bounds.isValid()) {
        console.log("Fitting map to marker bounds.");
        map.fitBounds(bounds, { padding: [50, 50] }); // Add padding
    } else {
        console.warn("No valid marker bounds found. Setting default view.");
        // Default view if no markers/bounds
        var firstChapterWithCoords = chapters.find(c => !isNaN(parseFloat(c['Latitude'])) && !isNaN(parseFloat(c['Longitude'])));
        if (firstChapterWithCoords) {
             map.setView([parseFloat(firstChapterWithCoords['Latitude']), parseFloat(firstChapterWithCoords['Longitude'])], parseInt(firstChapterWithCoords['Zoom'] || CHAPTER_ZOOM));
        } else {
            map.setView([0, 0], 2); // Absolute fallback
        }
    }


    // --- Final Visibility and Initial State ---
    // Make elements visible now that they are loaded/positioned
    $('#map, #info-panel, #video-fixed').css('visibility', 'visible');
    $('div.loader').hide(); // Hide loader
    console.log("Storymap loaded and visible.");

    // Set initial focus (chapter 0) visually
    currentlyInFocus = 0; // Set initial scroll focus
    $('#container0').addClass("in-focus");
    markActiveColor(0);
    $('#info-panel').scrollTop(0); // Ensure panel is scrolled to top

    // Handle initial hash for deep linking
    var initialHash = location.hash.substr(1);
    if (initialHash && !isNaN(parseInt(initialHash))) {
        var chapterIndex = parseInt(initialHash) - 1;
        console.log("Processing initial hash for chapter:", chapterIndex + 1);
        const targetElement = document.getElementById('container' + chapterIndex);
        const timedChapter = chaptersWithTime.find(chap => chap.originalIndex === chapterIndex);

        // Prioritize seeking video if the target chapter is timed
        if (timedChapter && player && typeof player.seekTo === 'function') {
            console.log(`Initial Hash: Seeking video to ${timedChapter.time}s`);
            // Delay slightly to ensure player might be ready if API loaded async
             setTimeout(function(){
                  if (player && typeof player.seekTo === 'function') { // Check again inside timeout
                       player.seekTo(timedChapter.time, true);
                       // Optionally play: player.playVideo();
                  } else {
                       console.warn("Initial Hash: Player not ready for seekTo within timeout.");
                        // Fallback to scrolling panel if seek fails
                        if (targetElement && pixelsAbove[chapterIndex] !== undefined) {
                             $('#info-panel').animate({ scrollTop: pixelsAbove[chapterIndex] }, 1); // Scroll immediately
                        }
                  }
             }, 500); // 500ms delay


        } else if (targetElement && pixelsAbove[chapterIndex] !== undefined) {
            // No timestamp or player not ready, just scroll
            console.log("Initial Hash: Scrolling panel to chapter", chapterIndex);
            $('#info-panel').animate({ scrollTop: pixelsAbove[chapterIndex] }, 1); // Scroll immediately
             // Also fly map immediately
             var c = chapters[chapterIndex];
             if (c && !isNaN(parseFloat(c['Latitude'])) && !isNaN(parseFloat(c['Longitude']))) {
                map.setView([parseFloat(c['Latitude']), parseFloat(c['Longitude'])], parseInt(c['Zoom'], 10) || CHAPTER_ZOOM); // Use setView for instant jump
                markActiveColor(chapterIndex);
                $('.chapter-container').removeClass("in-focus");
                $('#container' + chapterIndex).addClass("in-focus");
                currentlyInFocus = chapterIndex;
             }
        }
    } else {
         // Default view already set by fitBounds or fallback earlier if no hash
         console.log("No initial hash detected.");
          // Ensure map is flown to first chapter if bounds didn't work
          if (!bounds.isValid()) {
               var firstChapter = chapters[0];
               if (firstChapter && !isNaN(parseFloat(firstChapter['Latitude'])) && !isNaN(parseFloat(firstChapter['Longitude']))) {
                  map.setView([parseFloat(firstChapter['Latitude']), parseFloat(firstChapter['Longitude'])], parseInt(firstChapter['Zoom'] || map.getZoom()));
                  markActiveColor(0);
               }
          }
    }

    // Add Google Analytics if ID exists (GA logic remains the same)
    var ga = trySetting('_googleAnalytics', '');
    if (ga && ga.length >= 10) {
      // GA setup code...
      console.log("Google Analytics configured with ID:", ga);
    }


  } // --- End of initMap ---


  /**
    * Updates dynamic CSS styles based on settings
    */
  function updateDynamicStyles() {
      $('#storymap-style-override').remove(); // Remove old style tag if exists
      $("<style>", {id: 'storymap-style-override'})
        .prop("type", "text/css")
        .html(`
          #info-panel {
            background-color: ${trySetting('_narrativeBackground', 'white')};
            color: ${trySetting('_narrativeText', 'black')};
          }
          #info-panel a, #info-panel a:visited, #info-panel a:hover {
            color: ${trySetting('_narrativeLink', 'blue')}
          }
          .chapter-container.in-focus {
            background-color: ${trySetting('_narrativeActive', '#f0f0f0')}
          }
          /* Add other dynamic styles here */
        `)
        .appendTo("head");
        console.log("Dynamic styles updated.");
   }

  /**
    * Changes map attribution (author, GitHub repo, email etc.) in bottom-right
    */
  function changeAttribution() {
      if (!map || !map.attributionControl) {
           console.warn("Map or attribution control not ready for attribution change.");
           // Retry later?
           // setTimeout(changeAttribution, 500);
           return;
       }

      // Get base layer attribution (might need a more robust way)
      var baseAttribution = '';
      map.eachLayer(function (layer) {
          if (layer.getAttribution && layer instanceof L.TileLayer) {
              baseAttribution = layer.getAttribution();
          }
      });

      var dataCreditLink = (typeof googleDocURL !== 'undefined' && googleDocURL) ? googleDocURL : chaptersFilePath; // Use dynamic path
      let credit = `<a href="${dataCreditLink}" target="_blank">View data</a>`;

      const name = trySetting('_authorName', '');
      let url = trySetting('_authorURL', '');

      if (name) {
        credit += ' by ';
        if (url) {
          if (url.includes('@')) url = 'mailto:' + url;
          credit += `<a href="${url}" target="_blank">${name}</a>`;
        } else {
          credit += name;
        }
      }

      const repo = trySetting('_githubRepo', '');
      if (repo) {
          credit += ` | <a href="${repo}" target="_blank">View code</a>`;
          const codeCredit = trySetting('_codeCredit', '');
          if (codeCredit) credit += ' by ' + codeCredit;
      }

      // Combine custom credits and base layer attribution
      // Using setPrefix adds the text before the Leaflet logo/basemap attribution
      map.attributionControl.setPrefix(credit + (baseAttribution ? ' | ' : '')); // Add separator if base attribution exists
      console.log("Map attribution updated.");
   }


  // YT SYNC Helper Function: Update marker active state
  function markActiveColor(activeIndex) {
      // console.log("Setting active marker:", activeIndex);
      markers.forEach(function(marker, index) {
          if (marker && marker._icon) { // Check if marker and its icon exist
              var icon = marker._icon;
              icon.classList.remove('marker-active'); // Remove from all
              if (index === activeIndex) {
                  icon.classList.add('marker-active'); // Add to the active one
              }
          }
      });
  }

  // Add a listener for map clicks (optional, for debugging or other features)
  /*
  if (map) {
      map.on('click', function(e) {
          console.log("Map clicked at:", e.latlng);
      });
  }
  */

}); // --- End of $(window).on('load') ---
