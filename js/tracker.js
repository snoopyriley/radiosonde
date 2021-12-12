var mission_id = 0;
var position_id = 0;
var newdata_url = "https://api.v2.sondehub.org/sondes/telemetry";
var receivers_url = "https://api.v2.sondehub.org/listeners/telemetry";
var predictions_url = "https://api.v2.sondehub.org/predictions?vehicles=";
var launch_predictions_url = "https://api.v2.sondehub.org/predictions/reverse";
var recovered_sondes_url = "https://api.v2.sondehub.org/recovered";
var launches_url = "https://api.v2.sondehub.org/sites";

var livedata = "wss://ws-reader.v2.sondehub.org/";
var clientID = "SondeHub-Tracker-" + Math.floor(Math.random() * 10000000000);
var client = new Paho.Client(livedata, clientID);
var clientConnected = false;
var clientActive = false;
var clientTopic;
var messageRate = 0;
var messageRateAverage = 10;

var pledges = {};
var pledges_loaded = false

var host_url = "";
var markers_url = "img/markers/";
var vehicles = {};
var elm_uuid = 0;

var receiver_names = [];
var receivers = [];
var recovery_names = [];
var recoveries = [];

var launchPredictions = {};

var sites = null;
var launches = new L.LayerGroup();
var showLaunches = false;
var focusID = 0;

var receiverCanvas = null;

var sondePrefix = ["RS92", "RS92-SGP", "RS92-NGP", "RS41", "RS41-SG", "RS41-SGP", "RS41-SGM", "DFM", "DFM06", "DFM09", "DFM17", "M10", "M20", "iMet-4", "iMet-54", "LMS6", "LMS6-400", "LMS6-1680", "iMS-100", "MRZ", "chase"];
var sondeCodes = {
    "07":"iMet-1", "11":"LMS6-403", "13":"RS92", "14":"RS92", "17":"DFM-09", "18":"DFM-06", "19":"MRZ-N1", "22":"RS-11G", "23":"RS41", "24":"RS41", "34":"iMet-4", "35":"iMS-100", "41":"RS41", "42":"RS41", "52":"RS92-NGP", 
    "54":"DFM-17", "62":"MRZ-3MK", "63":"M20", "77":"M10", "82":"LMS6-1680", "84":"iMet-54"
};
var unsupportedSondeCodes = {
    "15":"PAZA-12M", "16":"PAZA-22", "20":"MK3", "21":"1524LA LORAN-C/GL5000", "26":"SRS-C34", "27":"AVK-MRZ", "28":"AVK–AK2-02", "29":"MARZ2-2", "30":"RS2-80", "33":"GTS1-2/GFE(L)", "45":"CF-06", "58":"AVK-BAR", 
    "59":"M2K2-R", "68":"AVK-RZM-2", "69":"MARL-A/Vektor-M-RZM-2", "73":"MARL-A", "78":"RS90", "80":"RS92", "88":"MARL-A/Vektor-M-MRZ", "89":"MARL-A/Vektor-M-BAR", "97":"iMet-2", "99":"iMet-2"
};

var got_positions = false;
var zoomed_in = false;
var max_positions = 0; // maximum number of positions that ajax request should return (0 means no maximum)
var follow_vehicle = null;
var graph_vehicle = null;
var manual_pan = false;

var car_index = 0;
var car_colors = ["blue", "red", "green", "yellow"];
var balloon_index = 0;
var balloon_colors_name = ["red", "blue", "green", "yellow", "purple", "orange", "cyan"];
var balloon_colors = ["#f00", "blue", "green", "#FDFC30", "#c700e6", "#ff8a0f", "#0fffca"];

var nyan_color_index = 0;
var nyan_colors = ['nyan', 'nyan-coin', 'nyan-mon', 'nyan-pirate', 'nyan-cool', 'nyan-tothemax', 'nyan-pumpkin', 'nyan-afro', 'nyan-coin', 'nyan-mummy'];
var rainbow = ["#ff0000", "#fc9a00", "#f6ff00", "#38ff01", "#009aff","#0000ff"];

var map = null;
var overlay = null;
var layer_clouds = null;

var notamOverlay = null;

var svgRenderer = L.svg();

var modeList = [
//    "Position",
    "0",
    "15s",
    "1m",
    "30m",
    "1h",
    "3h",
    "6h",
    "12h",
    "1d",
    "3d"
];
var modeDefault = "3h";
var modeDefaultMobile = "1h";

// order of map elements
var Z_RANGE = 1;
var Z_STATION = 2;
var Z_PATH = 10;
var Z_ME = 11;
var Z_SHADOW = 1000000;
var Z_CAR = 1000001;
var Z_PAYLOAD = 1000002;
var Z_RECOVERY = 1000003;

// localStorage vars
var ls_receivers = false;
var ls_pred = false;

var plot = null;
var plot_open = false;
var plot_holder = "#telemetry_graph .holder";
var plot_options = {
    crosshair: {
        mode: "x"
    },
    legend: {
        show: true,
        sorted: false,
        position: 'nw',
        noColumns: 1,
        backgroundColor: null,
        backgroundOpacity: 0
    },
    grid: {
        show: true,
        hoverable: true,
        aboveData: true,
        borderWidth: 0,
    },
    selection: {
        mode: "x"
    },
    yaxes: [
        {show: false, min: 0, max: 0},
        {show: false, min: 0, max: 0},
        {show: false, min: 0 },
        {show: false, min: 0 },
        {show: false, min: 0 },
        {show: false, min: 0 },
        {show: false, min: 0 },
        {show: false, min: 0 },
        {show: false, min: 0 },
    ],
    xaxes: [
        {
            show: true,
            mode: "time",
            timeformat: "%m/%d %H:%M"
        }
    ]
};

// aprs overlay (not used)
var overlayARPS = new L.tileLayer('http://{s}.tiles.tracker.habhub.org/aprs/tile_{z}_{x}_{y}.png', {
	subdomains: 'abc',
    maxZoom: 6,
    attribution: '&copy; <a href="https://tracker.habhub.org/">HabHub</a>'
});

//Global Precipitation Weather
var RainRadar = new L.tileLayer('https://tilecache.rainviewer.com/v2/radar/' + (Math.floor(new Date().getTime() / 600000) * 600) + '/512/{z}/{x}/{y}/1/1_0.png', {
    opacity: 0.6,
    attribution: '&copy; <a href="https://www.rainviewer.com/sources.html">RainViewer</a> sources'
});

var RainRadarCoverage = new L.tileLayer('https://tilecache.rainviewer.com/v2/coverage/0/512/{z}/{x}/{y}/0/0_0.png', {
    opacity: 0.6,
    attribution: '&copy; <a href="https://www.rainviewer.com/sources.html">RainViewer</a>'
});

var offline = {
    get: function(key) {
        if(typeof localStorage == 'undefined') return null;

        return JSON.parse(localStorage.getItem(key));
    },
    set: function(key, object) {
        if(typeof localStorage == 'undefined') return null;

        return localStorage.setItem(key, JSON.stringify(object));
    },
};

var DEG_TO_RAD = Math.PI / 180.0;
var EARTH_RADIUS = 6371000.0;

// calculates look angles between two points
// format of a and b should be {lon: 0, lat: 0, alt: 0}
// returns {elevention: 0, azimut: 0, bearing: "", range: 0}
//
// based on earthmath.py
// Copyright 2012 (C) Daniel Richman; GNU GPL 3
function calculate_lookangles(a, b) {
    // degrees to radii
    a.lat = a.lat * DEG_TO_RAD;
    a.lon = a.lon * DEG_TO_RAD;
    b.lat = b.lat * DEG_TO_RAD;
    b.lon = b.lon * DEG_TO_RAD;

    var d_lon = b.lon - a.lon;
    var sa = Math.cos(b.lat) * Math.sin(d_lon);
    var sb = (Math.cos(a.lat) * Math.sin(b.lat)) - (Math.sin(a.lat) * Math.cos(b.lat) * Math.cos(d_lon));
    var bearing = Math.atan2(sa, sb);
    var aa = Math.sqrt(Math.pow(sa, 2) + Math.pow(sb, 2));
    var ab = (Math.sin(a.lat) * Math.sin(b.lat)) + (Math.cos(a.lat) * Math.cos(b.lat) * Math.cos(d_lon));
    var angle_at_centre = Math.atan2(aa, ab);
    var great_circle_distance = angle_at_centre * EARTH_RADIUS;

    ta = EARTH_RADIUS + a.alt;
    tb = EARTH_RADIUS + b.alt;
    ea = (Math.cos(angle_at_centre) * tb) - ta;
    eb = Math.sin(angle_at_centre) * tb;
    var elevation = Math.atan2(ea, eb) / DEG_TO_RAD;

    // Use Math.coMath.sine rule to find unknown side.
    var distance = Math.sqrt(Math.pow(ta, 2) + Math.pow(tb, 2) - 2 * tb * ta * Math.cos(angle_at_centre));

    // Give a bearing in range 0 <= b < 2pi
    bearing += (bearing < 0) ? 2 * Math.PI : 0;
    bearing /= DEG_TO_RAD;

    var value = Math.round(bearing % 90);
    value = ((bearing > 90 && bearing < 180) || (bearing > 270 && bearing < 360)) ? 90 - value : value;

    var str_bearing = "" + ((bearing < 90 || bearing > 270) ? 'N' : 'S')+ " " + value + '° ' + ((bearing < 180) ? 'E' : 'W');

    return {
        'elevation': elevation,
        'azimuth': bearing,
        'range': distance,
        'bearing': str_bearing
    };
}

function update_lookangles(vcallsign) {
    if(GPS_ts === null) { return; }
    else if($("#lookanglesbox span").first().is(":hidden")) {
        $("#lookanglesbox div").hide().parent().find("span").show();
    }

    var a = {lat: GPS_lat, lon: GPS_lon, alt: GPS_alt};

    var xref = vehicles[vcallsign].curr_position;
    var b = {lat: parseFloat(xref.gps_lat), lon: parseFloat(xref.gps_lon), alt: parseFloat(xref.gps_alt)};

    var look = calculate_lookangles(a,b);

    $("#lookanglesbox .azimuth").text("Azimuth: " + roundNumber(look.azimuth, 2) + "°");
    $("#lookanglesbox .bearing").text(look.bearing);
    $("#lookanglesbox .elevation").text("Elevation: " + roundNumber(look.elevation, 2) + "°");

    var range_string = "";
    if(offline.get('opt_imperial')) {
        range_string =  Math.round(look.range * 0.000621371192) + " miles";
    } else {
        range_string = (look.range < 10000) ? Math.round(look.range) + "m" : (Math.round(look.range/100)/10) + " km";
    }
    $("#lookanglesbox .range").text(range_string);
}

function makeQuad(x, y, zoom) {
    var quad = "";
    for (var i = zoom; i > 0; i--) {
      var mask = 1 << (i - 1);
      var cell = 0;
      if ((x & mask) !== 0) cell++;
      if ((y & mask) !== 0) cell += 2;
      quad += cell;
    }
    return quad;
}

// map type list

var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});
osm.id="Mapnik";

var dark_matter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    minZoom: 1,
    maxZoom: 19,
});
dark_matter.id="DarkMatter";

var worldimagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});
worldimagery.id="WorldImagery";

var stamen_terrain = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png', {
	attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	subdomains: 'abcd',
	minZoom: 0,
	maxZoom: 18,
});
stamen_terrain.id="Terrain";

var cartodb_voyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
	maxZoom: 19
});
cartodb_voyager.id="Voyager";

var opentopomap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
	maxZoom: 17,
	attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
});
opentopomap.id = "OpenTopoMap";

//not used
var getlost = L.tileLayer('https://live.getlost.com.au/{z}/{x}/{y}.jpg', {
	attribution: '&copy; <a href="https://www.getlost.com.au/current-map-information/">Getlost Maps</a>',
	minZoom: 4,
	maxZoom: 16,
});
getlost.id = "GetLost";

var baseMaps = {
    "Mapnik": osm,
    "DarkMatter": dark_matter,
    "WorldImagery": worldimagery,
    "Terrain": stamen_terrain,
    "Voyager": cartodb_voyager,
    "OpenTopoMap": opentopomap,
}

var selectedLayer = "Mapnik";

// set map if in memory
var maplayer = offline.get("map")
if (maplayer !== null) {
    if( baseMaps.hasOwnProperty(maplayer) ) {
        selectedLayer = maplayer;
    }
}

// mousemove event throttle hack for smoother maps pan on firefox and IE
// taken from: http://stackoverflow.com/questions/22306130/how-to-limit-google-maps-api-lag-when-panning-the-map-with-lots-of-markers-and-p

var mthrottle_last = {
                        time : 0,     // last time we let an event pass.
                        x    : -100,  // last x position af the event that passed.
                        y    : -100   // last y position af the event that passed.
                     };
var mthrottle_period = 16;   // ms - don't let pass more than one event every 100ms.
var mthrottle_space  = 40;    // px - let event pass if distance between the last and
                              //      current position is greater than 2 px.

function throttle_events(event) {
    var now = window.performance.now();
    var distance = Math.sqrt(Math.pow(event.clientX - mthrottle_last.x, 2) + Math.pow(event.clientY - mthrottle_last.y, 2));
    var time = now - mthrottle_last.time;
    if (distance * time < mthrottle_space * mthrottle_period) {    //event arrived too soon or mouse moved too little or both
        if (event.stopPropagation) { // W3C/addEventListener()
            event.stopPropagation();
        } else { // Older IE.
            event.cancelBubble = true;
        }
    } else {
        mthrottle_last.time = now;
        mthrottle_last.x    = event.clientX;
        mthrottle_last.y    = event.clientY;
    }
}


function clean_refresh(text, force, history_step) {
    force = !!force;
    history_step = !!history_step;

    if(text == wvar.mode && !force) return false;
    stopAjax();

    live_data_buffer.positions.position=[];

    if (clientActive) {
        clientActive = false;
        if (!document.getElementById("stTimer").classList.contains('friendly-dtime') ) {
            document.getElementById("stTimer").classList.add('friendly-dtime');
            $("#updatedText").text(" Updated: ");
        }
        $("#stText").text("");
    }

    try {
        client.unsubscribe(clientTopic);
        if (wvar.query && sondePrefix.indexOf(wvar.query) == -1) {
            var topic = "sondes/" + wvar.query;
            client.subscribe(topic);
            clientTopic = topic;
        } else {
            client.subscribe("batch");
            clientTopic = "batch";
        }
    } catch (err) {}

    // reset mode if, invalid mode is specified
    if(modeList.indexOf(text) == -1) text = (is_mobile) ? modeDefaultMobile : modeDefault;

    wvar.mode = text;
    document.getElementById("timeperiod").value = text;
    document.getElementById("timeperiod").disabled = true;

    position_id = 0;

    map.removeLayer(mapInfoBox);

    // clear vehicles
    var callsign;
    for(callsign in vehicles) {
        vehicles[callsign].kill();
    }

    car_index = 0;
    balloon_index = 0;
    nyan_color_index = 0;
    stopFollow(force);

    // add loading spinner in the vehicle list
    $('#main .empty').parent().remove();
    $("#main .portrait,#main .landscape").append(
        '<div class="row vehicle'+elm_uuid+'"><div class="header empty">' +
        '<img style="width:90px;height:30px" src="img/hab-spinner.gif"/></div></div>'
    );
    listScroll.refresh();

    lhash_update(history_step);

    clearTimeout(periodical);
    clearTimeout(periodical_focus);
    clearTimeout(periodical_focus_new);
    clearTimeout(periodical_receivers);
    clearTimeout(periodical_listeners);

    refresh();
    if (!offline.get("opt_hide_chase")) {
        refreshNewReceivers(true);
    }

    return true;
}

function load() {
    //initialize map object
    map = new L.map(document.getElementById('map'), {
        zoom: 5,
        zoomControl: false,
        zoomAnimationThreshold: 0,
        center: [53.467511,-2.233894],
        layers: baseMaps[selectedLayer],
        preferCanvas: true,
    });

    map.setView([53.467511,-2.233894], 5, {animate: false});

    // fullscreen button
    map.addControl(new L.Control.Fullscreen({ position: 'bottomleft' }));

    // update time div
    L.Control.Status = L.Control.extend({
        onAdd: function(map) {
            var div = L.DomUtil.create('div');
    
            div.innerHTML = "<span id='stText'></span><span id='updatedText'> Updated: </span><i class='friendly-dtime' id='stTimer'>never</i>";
            div.style = "opacity: 0.7; background-color: rgb(245, 245, 245); padding-right: 6px; padding-left: 6px; font-family: Roboto, Arial, sans-serif; color: rgb(68, 68, 68);";
    
            return div;
        },
    
        onRemove: function(map) {
            // Nothing to do here
        }
    });
    
    L.control.status = function(opts) {
        return new L.Control.Status(opts);
    }
    
    L.control.status({ position: 'bottomright' }).addTo(map);

    // scale (would be better if integrated into attirbution bar)
    L.control.scale({position:'bottomright', imperial:false}).addTo(map);

    // zoom controls
    new L.Control.Zoom({ position: 'bottomright' }).addTo(map);

    // map selector
    layers = L.control.layers(baseMaps, null, {position: "topleft"}).addTo(map);

    L.Control.PeriodControl = L.Control.extend({
        onAdd: function(map) {
            var div = L.DomUtil.create('div');
    
            div.innerHTML = '<select name="timeperiod" id="timeperiod" style="width:auto !important;height:30px;" onchange="clean_refresh(this.value)"><option value="0">Live Only</option><option value="1h">1 hour</option><option value="3h" selected="selected">3 hours</option><option value="6h">6 hours</option><option value="12h">12 hours</option></select>';
            div.innerHTML.onload = setTimeValue();

            return div;
        },
    
        onRemove: function(map) {
            // Nothing to do here
        }
    });

    L.control.periodcontrol = function(opts) {
        return new L.Control.PeriodControl(opts);
    }
    
    L.control.periodcontrol({ position: 'topleft' }).addTo(map);

    // update current position if we geolocation is available
    if(currentPosition) updateCurrentPosition(currentPosition.lat, currentPosition.lon);

    //Receiver canvas
    receiverCanvas = new L.LayerGroup();
    receiverCanvas.addTo(map);
    
    // initalize nite overlay
    nite = new L.terminator({ 
        renderer: svgRenderer,
        interactive: false,
    });

    if (offline.get("opt_daylight")) {
        map.addLayer(nite);
    }

    getLaunchSites();

    if (!offline.get("opt_layers_launches")) {
        map.addLayer(launches);
    }

    map.on('moveend', function (e) {
        lhash_update();
    });

    map.on('baselayerchange', function (e) {
        selectedLayer = e.layer.id;
        offline.set('map', selectedLayer);
    });

    map.on('zoomend', function() {
        //do check for horizon labels
        if (!offline.get("opt_hide_horizon")) {
            for (key in vehicles) {
                if (vehicles[key]["vehicle_type"] == "balloon") {
                    if (vehicles[key]["horizon_circle"]["_map"]) 
                    {
                        try {
                            var zoom = map.getZoom();
                            var horizonzoom = (Math.abs(Math.log(vehicles[key]["horizon_circle"].getRadius()/2000000)/0.75));
                            var subhorizonzoom = (Math.abs(Math.log(vehicles[key]["subhorizon_circle"].getRadius()/2000000)/0.75));
                            if (horizonzoom > zoom) {
                                map.removeLayer(vehicles[key]["horizon_circle_title"]);
                            } else {
                                map.addLayer(vehicles[key]["horizon_circle_title"]);
                            }
                            if (subhorizonzoom > zoom) {
                                map.removeLayer(vehicles[key]["subhorizon_circle_title"]);
                            } else {
                                map.addLayer(vehicles[key]["subhorizon_circle_title"]);
                            }
                        } catch(e){};
                    }
                }
            }
        }
        updateZoom();
    });

    map.on('movestart', function() {
        if(!wvar.embeded) manual_pan = true;
    });

    // only start population the map, once its completely loaded
    var callBack = function() {

        load_hash(null);
        map.options.zoomAnimationThreshold = 4;

        map.on('moveend', function() {
            lhash_update();
        });
        map.on('baselayerchange', function() {
            lhash_update();
        });

        startAjax();
        liveData();
    };

    L.NumberedDivIcon = L.Icon.extend({
        options: {
        iconUrl: host_url + markers_url + "marker_hole.png",
        number: '',
        shadowUrl: null,
        iconSize: new L.Point(25, 41),
            iconAnchor: new L.Point(13, 41),
            popupAnchor: new L.Point(0, -33),
            className: 'leaflet-div-icon'
        },
    
        createIcon: function () {
            var div = document.createElement('div');
            var img = this._createImg(this.options['iconUrl']);
            var numdiv = document.createElement('div');
            numdiv.setAttribute ( "class", "number" );
            numdiv.innerHTML = this.options['number'] || '';
            div.appendChild ( img );
            div.appendChild ( numdiv );
            this._setIconStyles(div, 'icon');
            return div;
        },
    
        createShadow: function () {
            return null;
        }
    });

    map.whenReady(callBack);

    // animate-in the timebox,
    setTimeout(function() {
        var elm = $("#timebox");

        //if(is_mobile) $(".slickbox").css({left:'5px'});
        var origW = elm.width();
        var iconW = elm.find("svg").width();

        if(offline.get('opt_hide_timebox')) {
            elm.removeClass('animate').hide();
            $("#lookanglesbox").css({top:'7px'});
        }

        // prep for animation
        $(".slickbox.animate").css({width:iconW}).find("span").hide();

        if(!offline.get('opt_hide_timebox')) {
            // animate timebox
            elm.fadeIn(500,"easeOut").animate({width:origW},400,"easeOut", function() {
              $("#timebox span").fadeIn(500, "easeOut");
            });
        }

        // animate lookanglesbox, delayed start by 300ms
        $("#lookanglesbox").delay(200).fadeIn(500,"easeOut").animate({width:origW},400,"easeOut", function() {
          if(GPS_ts === null) {
              $("#lookanglesbox .nopos").fadeIn(500, "easeOut");
          } else if($("#lookanglesbox span:first").is(":hidden")) {
              $("#lookanglesbox .nofollow").fadeIn(500, "easeOut");
          }
        });

        // if we there is enough screen space open aboutbox on startup
        if(!is_mobile && !offline.get('opt_nowelcome') && $(window).width() > 900) $('.nav li.about').click();

    }, 500);
}

function setTimeValue() {   
    setTimeout(function() {
        document.getElementById("timeperiod").value = wvar.mode;
      }, 100);
}

function launchSitePredictions(times, station, properties, marker) {
    var popup = launches.getLayer(marker).getPopup();
    var popupContent = popup.getContent();
    var popupContentSplit = popupContent.split("<button onclick='launchSitePredictions(")[0];
    popupContentSplit += "<img style='width:60px;height:20px' src='img/hab-spinner.gif' />";
    popup.setContent(popupContentSplit);
    if (popupContent.includes("Delete</button>")) {
        deletePredictions(marker);
        popupContent = popupContent.split("<button onclick='deletePredictions(")[0];
    }
    position = station.split(",");
    properties = properties.split(":");
    var now = new Date();
    if (times.length > 0) {
        times = times.split(",");
        var maxCount = 24
        var count = 0;
        var day = 0;
        var dates = [];
        while (day < 8) {
            for (var i = 0; i < times.length; i++) {
                var date = new Date();
                var time = times[i].split(":");
                if (time[0] != 0) {
                    date.setDate(date.getDate() + (7 + time[0] - date.getDay()) % 7);
                }
                date.setUTCHours(time[1]);
                date.setUTCMinutes(time[2]);
                date.setSeconds(0);
                date.setMilliseconds(0);
                // launch time 45 minutes before target time
                date.setMinutes( date.getMinutes() - 45 );
                while (date < now) {
                    if (time[0] == 0) {
                        date.setDate(date.getDate() + 1);
                    } else {
                        date.setDate(date.getDate() + 7);
                    }
                }
                if (day > 0) {
                    if (time[0] == 0) {
                        date.setDate(date.getDate() + day);
                    } else {
                        date.setDate(date.getDate() + (7*day));
                    }
                }
                if (count < maxCount) {
                    if (((date - now) / 36e5) < 170) {
                        dates.push(date.toISOString().split('.')[0]+"Z");
                        count += 1;
                    }
                }
            }
            day += 1;
        }
        dates.sort();
    } else {
        var date = new Date();
        var dates = [];
        dates.push(date.toISOString().split('.')[0]+"Z");
    }
    var completed = 0;
    for (var i = 0; i < dates.length; i++) {
        var lon = ((360 + (position[1] % 360)) % 360);
        //var url = "https://predict.cusf.co.uk/api/v1/?launch_latitude=" + position[0] + "&launch_longitude=" + lon + "&launch_datetime=" + dates[i] + "&ascent_rate=" + properties[0] + "&burst_altitude=" + properties[2] + "&descent_rate=" + properties[1];
        var url = "https://api.v2.sondehub.org/tawhiri?launch_latitude=" + position[0] + "&launch_longitude=" + lon + "&launch_datetime=" + dates[i] + "&ascent_rate=" + properties[0] + "&burst_altitude=" + properties[2] + "&descent_rate=" + properties[1];
        showPrediction(url).done(handleData).fail(handleError);
    }
    function handleData(data) {
        completed += 1;
        plotPrediction(data, dates, marker, properties);
        if (completed == dates.length) {
            popupContent += "<button onclick='deletePredictions(" + marker + ")' style='margin-bottom:0;'>Delete</button>";
            popup.setContent(popupContent);
        }
    }
    function handleError(error) {
        completed += 1;
        if (completed == dates.length) {
            popupContent += "<button onclick='deletePredictions(" + marker + ")' style='margin-bottom:0;'>Delete</button>";
            popup.setContent(popupContent);
        }
    }
}

function plotPrediction (data, dates, marker, properties) {
    if (!launchPredictions.hasOwnProperty(marker)) {
        launchPredictions[marker] = {};
    }
    launchPredictions[marker][dates.indexOf(data.request.launch_datetime)+1] = {};
    plot = launchPredictions[marker][dates.indexOf(data.request.launch_datetime)+1];

    ascent = data.prediction[0].trajectory;
    descent = data.prediction[1].trajectory;
    var predictionPath = [];
    for (var i = 0; i < ascent.length; i++) {
        if (ascent[i].longitude > 180.0) {
            var longitude = ascent[i].longitude - 360.0;
        } else {
            var longitude = ascent[i].longitude;
        }
        predictionPath.push([ascent[i].latitude, longitude]);
    };
    for (var x = 0; x < descent.length; x++) {
        if (descent[x].longitude > 180.0) {
            var longitude = descent[x].longitude - 360.0;
        } else {
            var longitude = descent[x].longitude;
        }
        predictionPath.push([descent[x].latitude, longitude]);
    };
    var burstPoint = ascent[ascent.length-1];
    var landingPoint = descent[descent.length-1];

    plot.predictionPath = new L.polyline(predictionPath, {color: 'red'}).addTo(map);

    burstIconImage = host_url + markers_url + "balloon-pop.png";

    burstIcon = new L.icon({
        iconUrl: burstIconImage,
        iconSize: [20,20],
        iconAnchor: [10, 10],
    });

    if (burstPoint.longitude > 180.0) {
        var burstLongitude = burstPoint.longitude - 360.0;
    } else {
        var burstLongitude = burstPoint.longitude;
    }

    plot.burstMarker = new L.marker([burstPoint.latitude, burstLongitude], {
        icon: burstIcon
    }).addTo(map);

    var burstTime = new Date(burstPoint.datetime);
    var burstTooltip = "<b>Time: </b>" + burstTime.toLocaleString() + "<br><b>Altitude: </b>" + Math.round(burstPoint.altitude) + "m";
    plot.burstMarker.bindTooltip(burstTooltip, {offset: [5,0]});

    if (landingPoint.longitude > 180.0) {
        var landingLongitude = landingPoint.longitude - 360.0;
    } else {
        var landingLongitude = landingPoint.longitude;
    }

    plot.landingMarker = new L.marker([landingPoint.latitude, landingLongitude], {
        icon: new L.NumberedDivIcon({number: dates.indexOf(data.request.launch_datetime)+1})
    }).addTo(map);

    var landingTime = new Date(landingPoint.datetime);
    if (properties[3] != "" && properties[4] != "") {
        var landingTooltip = "<b>Time:</b> " + landingTime.toLocaleString() + "<br><b>Model Dataset:</b> " + data.request.dataset + 
        "<br><b>Model Assumptions:</b><br>- " + data.request.ascent_rate + "m/s ascent<br>- " + data.request.burst_altitude + "m burst altitude (" + properties[3] + " samples)<br>- " + data.request.descent_rate + "m/s descent (" + properties[4] + " samples)";
    } else {
        var landingTooltip = "<b>Time:</b> " + landingTime.toLocaleString() + "<br><b>Model Dataset:</b> " + data.request.dataset + 
        "<br><b>Model Assumptions:</b><br>- " + data.request.ascent_rate + "m/s ascent<br>- " + data.request.burst_altitude + "m burst altitude<br>- " + data.request.descent_rate + "m/s descent";
    }
    plot.landingMarker.bindTooltip(landingTooltip, {offset: [13,-28]});
}

function showPrediction(url) {
    return $.ajax({
        type: "GET",
        url: url,
        dataType: "json",
    });
}

function deletePredictions(marker) {
    if (launchPredictions.hasOwnProperty(marker)) {
        for (var prediction in launchPredictions[marker]) {
            if (launchPredictions[marker].hasOwnProperty(prediction)) {
                for (var object in launchPredictions[marker][prediction]) {
                    if (launchPredictions[marker][prediction].hasOwnProperty(object)) {
                        map.removeLayer(launchPredictions[marker][prediction][object]);
                    }
                }
            }
        }
    }
    var popup = launches.getLayer(marker).getPopup();
    var popupContent = popup.getContent();
    if (popupContent.includes("Delete</button>")) {
        popupContent = popupContent.split("<button onclick='deletePredictions(")[0];
        popup.setContent(popupContent);
    }
}

function getLaunchSites() {
    $.ajax({
        type: "GET",
        url: launches_url,
        dataType: "json",
        success: function(json) {
            sites = json;
            generateLaunchSites();
        }
    });
}

function generateLaunchSites() {
    for (var key in sites) {
        if (sites.hasOwnProperty(key)) {
            var latlon = [sites[key].position[1], sites[key].position[0]];
            var sondesList = "";
            var popupContent = "";
            var ascent_rate = 5;
            var descent_rate = 6;
            var burst_altitude = 26000;
            var burst_samples = "";
            var descent_samples = "";
            var marker = new L.circleMarker(latlon, {color: '#696969', fillColor: "white", radius: 8});
            var popup = new L.popup({ autoClose: false, closeOnClick: false });
            marker.title = key;
            marker.bindPopup(popup);
            launches.addLayer(marker);

            // Match sonde codes
            if (sites[key].hasOwnProperty('rs_types')) {
                var sondes = sites[key].rs_types;
                for (var y = 0; y < sondes.length; y++) {
                    if (Array.isArray(sondes[y]) == false) {
                        sondes[y] = [sondes[y]];
                    }
                    if (sondeCodes.hasOwnProperty(sondes[y][0])) {
                        sondesList += sondeCodes[sondes[y][0]]
                        if (sondes[y].length > 1) {
                            sondesList += " (" + sondes[y][1] + " MHz)";
                        }
                    } else if (unsupportedSondeCodes.hasOwnProperty(sondes[y][0])) {
                        sondesList += unsupportedSondeCodes[sondes[y][0]];
                        sondesList += " (cannot track)";
                    } else {
                        sondesList += sondes[y][0] + " (unknown WMO code)";
                    }
                    if (y < sondes.length-1) {
                        sondesList += ", ";
                    }
                }
                if (sondes.includes("11") || sondes.includes("82")) { //LMS6
                    ascent_rate = 5;
                    descent_rate = 2.5;
                    burst_altitude = 33500;
                }
                popupContent += "<font style='font-size: 13px'>" + sites[key].station_name + "</font><br><br><b>Sondes launched:</b> " + sondesList;
            }
        
            // Generate prefilled suggestion form
            var popupLink = "https://docs.google.com/forms/d/e/1FAIpQLSfIbBSQMZOXpNE4VpK4BqUbKDPCWCDgU9QxYgmhh-JD-JGSsQ/viewform?usp=pp_url&entry.796606853=Modify+Existing+Site";
            popupLink += "&entry.749833526=" + key;
            if (sites[key].hasOwnProperty('station_name')) {
                popupLink += "&entry.675505431=" + sites[key].station_name.replace(/\s/g, '+');
            }
            if (sites[key].hasOwnProperty('position')) {
                popupLink += "&entry.1613779787=" + sites[key].position.reverse().toString();
            }
            if (sites[key].hasOwnProperty('alt')) {
                popupLink += "&entry.753148337=" + sites[key].alt;
            }
            if (sites[key].hasOwnProperty('ascent_rate')) {
                popupLink += "&entry.509146334=" + sites[key]["ascent_rate"];
            }
            if (sites[key].hasOwnProperty('burst_altitude')) {
                popupLink += "&entry.1897602989=" + sites[key]["burst_altitude"];
            }
            if (sites[key].hasOwnProperty('descent_rate')) {
                popupLink += "&entry.267462486=" + sites[key]["descent_rate"];
            }
            if (sites[key].hasOwnProperty('notes')) {
                popupLink += "&entry.197384117=" + sites[key]["notes"].replace(/\s/g, '+');
            }

            // Update prediction data if provided
            if (sites[key].hasOwnProperty('ascent_rate')) {
                ascent_rate = sites[key]["ascent_rate"];
            }
            if (sites[key].hasOwnProperty('descent_rate')) {
                descent_rate = sites[key]["descent_rate"];
            }
            if (sites[key].hasOwnProperty('burst_altitude')) {
                burst_altitude = sites[key]["burst_altitude"];
            }
            if (sites[key].hasOwnProperty('burst_samples')) {
                burst_samples = sites[key]["burst_samples"];
            }
            if (sites[key].hasOwnProperty('descent_samples')) {
                descent_samples = sites[key]["descent_samples"];
            }

            // Process launch schedule if provided
            if (sites[key].hasOwnProperty('times')) {
                popupContent += "<br><b>Launch schedule:</b>";
                for (var x = 0; x < sites[key]['times'].length; x++) {
                    popupContent += "<br>- ";
                    var day = sites[key]['times'][x].split(":")[0];
                    if (day == 0) {
                        popupContent += "Everyday at ";
                    } else if (day == 1) {
                        popupContent += "Monday at ";
                    } else if (day == 2) {
                        popupContent += "Tuesday at ";
                    } else if (day == 3) {
                        popupContent += "Wednesday at ";
                    } else if (day == 4) {
                        popupContent += "Thursday at ";
                    } else if (day == 5) {
                        popupContent += "Friday at ";
                    } else if (day == 6) {
                        popupContent += "Saturday at ";
                    } else if (day == 7) {
                        popupContent += "Sunday at ";
                    }
                    popupContent += sites[key]['times'][x].split(":")[1] + ":" + sites[key]['times'][x].split(":")[2] + " UTC";
                }
            }
                
            // Show notes if provided
            if (sites[key].hasOwnProperty('notes')) {
                popupContent += "<br><b>Notes:</b> " + sites[key]["notes"];
            }
                
            popupContent += "<br><b>Know when this site launches?</b> Contribute <a href='" + popupLink + "' target='_blank'>here</a>";

            // Create prediction button
            if (sites[key].hasOwnProperty('times')) {
                popupContent += "<br><button onclick='launchSitePredictions(\"" + sites[key]['times'].toString() + "\", \"" + latlon.toString() + "\", \"" + ascent_rate + ":" + descent_rate + ":" + burst_altitude + ":" + burst_samples + ":" + descent_samples + "\", \"" + launches.getLayerId(marker) + "\")' style='margin-bottom:0;'>Generate Predictions</button>";
            } else {
                popupContent += "<br><button onclick='launchSitePredictions(\"" + "\", \"" + latlon.toString() + "\", \"" + ascent_rate + ":" + descent_rate + ":" + burst_altitude + ":" + burst_samples + ":" + descent_samples + "\", \"" + launches.getLayerId(marker) + "\")' style='margin-bottom:0;'>Instant Prediction</button>";
            }
            popup.setContent(popupContent);
        }
    }
    if (focusID != 0) {
        gotoSite();
    }
}

function gotoSite() {
    if (sites != null) {
        if (sites.hasOwnProperty(focusID)) {
            var site = sites[focusID];
            var latlng = new L.LatLng(site["position"][0], site["position"][1]);
            map.setView(latlng, 5);
            for (var i in launches._layers) {
                marker = launches._layers
                if (marker[i].title == focusID) {
                    marker[i].openPopup();
                }
            }
        }
    }
}

function shareVehicle(callsign) {
    const shareData = {
        title: 'SondeHub: ' + vehicles[callsign].marker.options.title + ' Flight Information',
        text: 'You can view the flight path and sensor data for ' + vehicles[callsign].marker.options.title + ' on the SondeHub tracker!',
        url: window.location.origin + '/' + callsign,
    }
    try {
        navigator.share(shareData);
    } catch (e) {
        console.log("Error sharing: " + e);
    }
    
}

function panTo(vcallsign) {
    if(!vcallsign || vehicles[vcallsign] === undefined) return;

    // update lookangles
    update_lookangles(vcallsign);

    // pan map
    if (map.getZoom() > 10) {
        map.setView(vehicles[vcallsign].marker.getLatLng());
    } else {
        map.setView(vehicles[vcallsign].marker.getLatLng(), 10);
    }
}

function panToRecovery(rcallsign) {
    if(offline.get('opt_hide_recoveries')) alert("Recovered Sonde Hidden, enable in settings");
    //if mobile close panel
    if (is_mobile) {
        $('.flatpage, #homebox').hide();
    }
    for (let i = 0; i < recoveries.length; i++) {
        if (recoveries[i].hasOwnProperty('serial')) {
            if (recoveries[i]['serial'] == rcallsign) {
                //pan map
                map.setView(recoveries[i]['marker'].getLatLng(), 10);
            }
        }
    }
}

function title_case(s) {
  return s.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

function guess_name(key) {
  return title_case(key.replace(/_/g, " "));
}

function habitat_data(jsondata, alternative) {
  var keys = {
    "ascentrate": "Ascent Rate",
    "battery_percent": "Battery",
    "temperature_external": "Temperature, External",
    "pressure_internal": "Pressure, Internal",
    "voltage_solar_1": "Voltage, Solar 1",
    "voltage_solar_2": "Voltage, Solar 2",
    "light_red": "Light (Red)",
    "light_green": "Light (Green)",
    "light_blue": "Light (Blue)",
    "gas_a": "Gas (A)",
    "gas_b": "Gas (B)",
    "gas_co2": "Gas (CO)",
    "gas_combustible": "Gas (Combustible)",
    "radiation": "Radiation (CPM)",
    "temperature_radio": "Temperature, Radio",
    "uplink_rssi": "Uplink RSSI",
    "light_intensity": "Light Intensity",
    "pred_lat": "Onboard Prediction (Lat)",
    "pred_lon": "Onboard Prediction (Lon)",
    "batt": "Battery Voltage",
    "sats": "GNSS SVs Used",
    "humidity": "Relative Humidity",
    "subtype": "Sonde Sub-type",
    "frequency": "Frequency",
    "frequency_tx": "TX Frequency",
    "manufacturer": "Manufacturer",
    "type": "Sonde Type",
    "burst_timer": "Burst Timer",
    "xdata": "XDATA"
  };

  var tooltips = {
    "burst_timer": "If active, this indicates the time (HH:MM:SS) until the radiosonde will automatically power-off.",
    "xdata": "Raw auxiliary data (as hexadecimal) from an external sensor package (often an Ozone sensor)."
  }

  var hide_keys = {
    "spam": true,
    "battery_millivolts": true,
    "temperature_internal_x10": true,
    "uplink_rssi_raw": true
  };

  var suffixes = {
    "current": " A",
    "battery": " V",
    "batt": " V",
    "solar_panel": " V",
    "temperature": "&deg;C",
    "temperature_internal": "&deg;C",
    "temperature_external": "&deg;C",
    "temperature_radio": "&deg;C",
    "pressure": " hPa",
    "voltage_solar_1": " V",
    "voltage_solar_2": " V",
    "battery_percent": "%",
    "uplink_rssi": " dBm",
    "rssi_last_message": " dBm",
    "rssi_floor": " dBm",
    "bearing": "&deg;",
    "iss_azimuth": "&deg;",
    "iss_elevation": "&deg;",
    "light_intensity": " lx",
    "humidity": " %",
    "frequency": " MHz",
    "frequency_tx": " MHz",
    "spam": ""
  };

  try
  {
    if (jsondata === undefined || jsondata === null) return "";

    var data = (typeof jsondata === "string") ? $.parseJSON(jsondata) : jsondata;
    var array = [];
    var output = "";
    var txFreq = false

    if(Object.keys(data).length === 0) return "";

    if ("frequency_tx" in data) {
        txFreq = true
    }

    for(var key in data) {
        if (key === "frequency" && txFreq) {} else {
            array.push([key, data[key]]);
        }
    }

    array.sort(function(a, b) {
        return a[0].localeCompare(b[0]);
    });

    for(var i = 0, ii = array.length; i < ii; i++) {
      var k = array[i][0]; // key
      var v = array[i][1]; // value
      if (hide_keys[k] === true)
        continue;

        var name = "", suffix = "", tooltip = "";
      if (keys[k] !== undefined)
        name = keys[k];
      else
        name = guess_name(k);
    
      if (tooltips[k] !== undefined)
        tooltip = tooltips[k];

      if (suffixes[k] !== undefined)
        suffix = suffixes[k];

      if (typeof v === "string") {
        v = v.replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
      }

      // Handle Burst timer data.
      if(k === "burst_timer"){
          if(typeof v === "number"){
            if(v === 65535){
                v = "Inactive";
            } else {
                // Convert value to countdown.
                burst_temp = new Date(0);
                burst_temp.setSeconds(v);
                v = burst_temp.toISOString().substr(11,8);
            }
          } else {
              v = "Unknown";
          }
      }

      if(typeof alternative == 'boolean' && alternative) {
          output += "<div><b>" + name + ":&nbsp;</b>" + v + suffix + "</div>";
      } else {
          if (tooltip != "") {
            output += "<dt>" + v + suffix + "</dt><dd>" + name + ' <div class="tooltip">🛈<span class="tooltiptext">' + tooltip + '</span></div></dd>';
          } else {
            output += "<dt>" + v + suffix + "</dt><dd>" + name + "</dd>";
          }
      }
    }
    return output;
  }
  catch (error)
  {
    //if (jsondata && jsondata != '')
    // return "<b>Data:</b> " + jsondata + "<br /> ";
    //else
      return "";
  }
}

function updateAltitude(vcallsign) {
  var pixel_altitude = 0;
  var zoom = map.getZoom();
  var vehicle = vehicles[vcallsign];
  var position = vehicle.curr_position;

  if(vehicle.marker.mode == 'landed') {
      vehicle.marker.setLatLng(vehicle.marker.getLatLng());
      return;
  }

  if(zoom > 18) zoom = 18;
  if(position.gps_alt > 0) {
    pixel_altitude = Math.round(position.gps_alt/(1000/3)*(zoom/18.0));
  }
  if(position.vehicle.toLowerCase().indexOf("iss") != -1) {
    pixel_altitude = Math.round(40000/(1000/3)*(zoom/18.0));
  } else if(position.gps_alt > 55000) {
    position.gps_alt = 55000;
  }
}

function updateZoom() {
    for(var vcallsign in vehicles) {
        var vehicle = vehicles[vcallsign];

        if(vehicle.vehicle_type == "balloon") {
          updateAltitude(vcallsign);
        } else {
            vehicle.marker.setLatLng(vehicle.marker.getLatLng());
        }

        if(vehicle.marker_shadow)
            vehicle.marker_shadow.setLatLng(vehicle.marker_shadow.getLatLng());
    }
}

var los_polylines = [];

function drawLOSPaths(vcallsign) {
    los_polylines.forEach(function(polyline) {
        polyline.remove(map);
    });
    los_polylines = [];

    if(offline.get('opt_hide_receivers')) return;

    var vehicle = vehicles[vcallsign];

    if(vehicle === undefined || vehicle.vehicle_type !== "balloon") return;

    var callsigns = [];
    for (var rxcall in vehicle.curr_position.callsign){
        if (vehicle.curr_position.callsign.hasOwnProperty(rxcall)){
            callsigns.push(rxcall);
        }
    }

    callsigns.forEach(function(callsign) {
        callsign = callsign.trim(' ');

        var r_index = receiver_names.indexOf(callsign);

        if(r_index === -1) return;

        var path = [
            vehicle.marker_shadow.getLatLng(),
            receivers[r_index].marker.getLatLng(),
        ];

        var p = new L.Polyline(path, {
            color: '#0F0',
            opacity: 0.8,
            weight: 3,
        }).addTo(map);
        p.path_length = path[0].distanceTo(path[1]);
        los_polylines.push(p);
        p.on('click', function (e) {
            mapInfoBox_handle_prediction_path(e);
        });
    });
}

function focusVehicle(vcallsign, ignoreOpt) {
    if(!offline.get('opt_hilight_vehicle') && ignoreOpt === undefined) return;

    var opacityFocused = 1;
    var opacityOther = 0.1;

    for(var i in vehicles) {
        var vehicle = vehicles[i], j;

        if (vehicle.vehicle_type == "balloon") {
            if(i == vcallsign || vcallsign === null) {
                if(vehicle.horizon_circle) vehicle.horizon_circle.setStyle({opacity:opacityFocused * 0.6});
                if(vehicle.horizon_circle_title) vehicle.horizon_circle_title.setOpacity(opacityFocused * 0.8);
                if(vehicle.subhorizon_circle) vehicle.subhorizon_circle.setStyle({opacity:opacityFocused * 0.8});
                if(vehicle.subhorizon_circle_title) vehicle.subhorizon_circle_title.setOpacity(opacityFocused * 0.8);
                for(j in vehicle.polyline) vehicle.polyline[j].setStyle({opacity:opacityFocused});
            }
            else {
                if(vehicle.horizon_circle) vehicle.horizon_circle.setStyle({opacity:opacityOther * 0.6});
                if(vehicle.horizon_circle_title) vehicle.horizon_circle_title.setOpacity(opacityOther * 0.6);
                if(vehicle.subhorizon_circle) vehicle.subhorizon_circle.setStyle({opacity:opacityOther * 0.8});
                if(vehicle.subhorizon_circle_title) vehicle.subhorizon_circle_title.setOpacity(opacityOther * 0.8);
                for(j in vehicle.polyline) vehicle.polyline[j].setStyle({opacity:opacityOther});
            }
        }
    }
}

function stopFollow(no_data_reset) {
    no_data_reset = !!no_data_reset;

	if(follow_vehicle !== null) {
        if(!no_data_reset) {
            focusVehicle(null);

            // remove target mark
            $("#main .row.follow").removeClass("follow");

            if(follow_vehicle in vehicles) vehicles[follow_vehicle].follow = false;
            follow_vehicle = null;
            graph_vehicle = null;
            wvar.focus = "";
        }

        //stop detailed data
        clearTimeout(periodical_focus_new);

        // clear graph
        if(plot) plot = $.plot(plot_holder, {}, plot_options);
        updateGraph(null, true);

        // clear LOS lines
        drawLOSPaths(null);

        // update lookangles box
        if(GPS_ts !== null) $("#lookanglesbox span").hide().parent().find(".nofollow").show();

        lhash_update();
    }
}

function followVehicle(vcallsign, noPan, force) {
    var should_pan = !noPan;
    force = !!force;

    if(vcallsign === null) { stopFollow(); return; }

	if(vehicles.hasOwnProperty(follow_vehicle)) {
        vehicles[follow_vehicle].follow = false;
    }

	if(!vehicles.hasOwnProperty(vcallsign)) {
        return;
    }

    if(follow_vehicle != vcallsign || force) {
        clearTimeout(periodical_focus_new);
        refreshSingleNew(vcallsign);
        focusVehicle(vcallsign);

		follow_vehicle = vcallsign;
		vehicles[follow_vehicle].follow = true;

        // add target mark
        $("#main .row.follow").removeClass("follow");
        $("#main .vehicle"+vehicles[vcallsign].uuid).addClass("follow");

        updateGraph(vcallsign, true);
        drawLOSPaths(vcallsign);
	}

    if(should_pan) {
        manual_pan = false;
        panTo(vcallsign);
    }

    lhash_update();
}

function roundNumber(number, digits) {
  var multiple = Math.pow(10, digits);
  var rndedNum = Math.round(number * multiple) / multiple;
  return rndedNum;
}

function convert_time(text) {
    var b = text.split(/[^0-9]/);
    return Date.UTC(b[0],--b[1],b[2],b[3],b[4],b[5]);
}

function stringToDateUTC(text) {
    return new Date(convert_time(text));
}

function formatDate(date,utc) {
    var a,b,c,d,e,f,g,z;

    a = date.getFullYear();
    b = twoZeroPad(date.getMonth()+1); // months 0-11
    c = twoZeroPad(date.getDate());
    e = twoZeroPad(date.getHours());
    f = twoZeroPad(date.getMinutes());
    g = twoZeroPad(date.getSeconds());

    if(typeof utc != "undefined") {
        z = date.getTimezoneOffset() / -60;
        return a+'-'+b+'-'+c+'&nbsp;'+e+':'+f+':'+g+"&nbsp;UTC"+((z<0)?"-":"+")+z;
    } else {
        return a+'-'+b+'-'+c+'&nbsp;'+e+':'+f+':'+g;
    }
}

function updateVehicleInfo(vcallsign, newPosition) {
  var vehicle = vehicles[vcallsign];
  if (!isNaN(newPosition.gps_lat) && !isNaN(newPosition.gps_lon)){
    var latlng = new L.LatLng(newPosition.gps_lat, newPosition.gps_lon);
  }

  // update position
  if(vehicle.marker_shadow) {
      vehicle.marker_shadow.setLatLng(latlng);
  }
  vehicle.marker.setLatLng(latlng);

  if(!!vehicle.marker.setCourse) {
    if (vehicle.curr_position.gps_heading) {
        vehicle.marker.setCourse((vehicle.curr_position.gps_heading !== "") ? parseInt(vehicle.curr_position.gps_heading) : 90);
    }
  } 

  // update horizon circles and icon
  if(vehicle.vehicle_type == "balloon") {
    //updateAltitude(vcallsign);
    var horizon_km = Math.sqrt(12.756 * newPosition.gps_alt);
    if (!isNaN(horizon_km)) {
        vehicle.horizon_circle.setRadius(Math.round(horizon_km)*1000);
        vehicle.horizon_circle.setLatLng(latlng);

        horizon_circle_title_icon = new L.DivIcon({
            className: "horizon_circle_title",
            html: '<span style="position:relative;left:-50%;top:-5px;color:black;border:1px solid rgb(0, 0, 255);border-radius:5px;font-size:9px;padding:2px;background-color:white;">' + Math.round(horizon_km) + 'km</span>'
        });

        vehicle.horizon_circle_title.setIcon(horizon_circle_title_icon);
    }

    if(vehicle.subhorizon_circle) {
        // see: http://ukhas.org.uk/communication:lineofsight
        var el = 5.0; // elevation above horizon
        var h = parseFloat(newPosition.gps_alt); // height above ground

        var elva = el * DEG_TO_RAD;
        var slant = EARTH_RADIUS*(Math.cos(Math.PI/2+elva)+Math.sqrt(Math.pow(Math.cos(Math.PI/2+elva),2)+h*(2*EARTH_RADIUS+h)/Math.pow(EARTH_RADIUS,2)));
        var subhorizon_km = Math.acos((Math.pow(EARTH_RADIUS,2)+Math.pow(EARTH_RADIUS+h,2)-Math.pow(slant,2))/(2*EARTH_RADIUS*(EARTH_RADIUS+h)))*EARTH_RADIUS;

        vehicle.subhorizon_circle.setRadius(Math.round(subhorizon_km));
        vehicle.subhorizon_circle.setLatLng(latlng);

        subhorizon_circle_title_icon = new L.DivIcon({
            className: "subhorizon_circle_title",
            html: '<span style="position:relative;left:-50%;top:-5px;color:black;border:1px solid rgb(0, 255, 0);border-radius:5px;font-size:9px;padding:2px;background-color:white;">' + Math.round(subhorizon_km/1000) + 'km</span>'
        });

        vehicle.subhorizon_circle_title.setIcon(subhorizon_circle_title_icon);
    }

    // indicates whenever a payload has landed
    var landed = (
                     vehicle.max_alt > 1500 &&      // if it has gone up
                     vehicle.ascent_rate < 1.0 &&   // and has negative ascent_rate, aka is descending
                     newPosition.gps_alt < 350      // and is under 350 meters altitude
                 ) || (                             // or
                     newPosition.gps_alt < 600 &&   // under 600m and has no position update for more than 30 minutes
                     (new Date().getTime() - convert_time(newPosition.gps_time)) > 1800000
                 );

    if(landed) {
        vehicle.marker.setMode("landed");
    } else if(vehicle.ascent_rate > -3.0) {
        vehicle.marker.setMode("balloon");
    } else {
        vehicle.marker.setMode("parachute");
    }

    // Update landing marker if data is available
    if (newPosition.data.hasOwnProperty("pred_lat") && newPosition.data.hasOwnProperty("pred_lon")){
        // Landing prediction data exists..
        if (vehicle.landing_marker !== null){
            // We already have a marker initialized.
            if(newPosition.gps_alt > 350){
                // Balloon is still in flight, so update the marker.
                vehicle.landing_marker.setLatLng(new L.LatLng(newPosition.data.pred_lat, newPosition.data.pred_lon));
                // Re-add to map if it's been removed previously.
                if (vehicle.landing_marker.getMap() == null){
                    map.addLayer(vehicle.landing_marker);
                }
            }else{
                // Balloon has landed, so hide the marker.
                // Should we do this? Can we re-add it safely?
                map.removeLayer(vehicle.landing_marker);
            }
        } else{
            // Landing marker has not been initialised yet.
            if((newPosition.data.pred_lat !== 0.0) && (newPosition.data.pred_lon !== 0.0)){

                landing_image_src = host_url + markers_url + "balloon-xmark.png";
                landing_image_src_size = [48,38];
                landing_image_src_offset = [0,-38];

                latlngs = new L.latLng(position.data.pred_lat, position.data.pred_lon);

                landing_icon = new L.icon({
                    iconUrl: landing_image_src,
                    iconSize: landing_image_src_size,
                    iconAnchor: [24, 18],
                });

                landing_marker = new L.Marker(latlngs, {
                    zIndexOffset: Z_CAR,
                    icon: landing_icon,
                    title: vcallsign + " Onboard Landing Prediction",
                }).addTo(map);

                // Add the marker to the vehicle object.
                vehicle.landing_marker = landing_marker;
            }

        }
    }
  }

  var image = vehicle.image_src;
  var elm = $('.vehicle' + vehicle.uuid);

  // if the vehicle doesn't exist in the list
  // style="top:80px"
  // if (vehicle["vehicle_type"] == "car") {
  if (elm.length === 0) {
    if (vehicle.vehicle_type!="car") {
        $('.portrait').prepend('<div class="row vehicle'+vehicle.uuid+'" data-vcallsign="'+vcallsign+'"></div>');
        $('.landscape').prepend('<div class="row vehicle'+vehicle.uuid+'" data-vcallsign="'+vcallsign+'"></div>');
    } else {
        $('.portrait').append('<div class="row vehicle'+vehicle.uuid+'" data-vcallsign="'+vcallsign+'"></div>');
        $('.landscape').append('<div class="row vehicle'+vehicle.uuid+'" data-vcallsign="'+vcallsign+'"></div>');
    }

  } else if(elm.attr('data-vcallsign') === undefined) {
    elm.attr('data-vcallsign', vcallsign);
  }

  // decides how to dispaly the horizonal speed
  var imp = offline.get('opt_imperial'), hrate_text;
  var ascent_text = imp ? (vehicle.ascent_rate * 196.850394).toFixed(1) + ' ft/min' : vehicle.ascent_rate.toFixed(1) + ' m/s';
  if (offline.get('opt_haxis_hours')) {
          hrate_text = imp ? (vehicle.horizontal_rate * 2.23693629).toFixed(1) + ' mph' : (vehicle.horizontal_rate * 3.6).toFixed(1) + ' km/h';
  } else {
          hrate_text = imp ? (vehicle.horizontal_rate * 196.850394).toFixed(1) + ' ft/min' : vehicle.horizontal_rate.toFixed(1) + ' m/s';
  }

  var coords_text;
  var ua =  navigator.userAgent.toLowerCase();

  // determine how to link the vehicle coordinates to a native app, if on a mobile device
  if(ua.indexOf('iphone') > -1) {
      coords_text = '<a id="launch_mapapp" href="maps://?q='+newPosition.gps_lat+','+newPosition.gps_lon+'">' +
                    roundNumber(newPosition.gps_lat, 5) + ', ' + roundNumber(newPosition.gps_lon, 5) +'</a>' +
                    ' <i class="icon-location"></i>';
  } else if(ua.indexOf('android') > -1) {
      coords_text = '<a id="launch_mapapp" href="geo:'+newPosition.gps_lat+','+newPosition.gps_lon+'?q='+newPosition.gps_lat+','+newPosition.gps_lon+'('+vcallsign+')">' +
                    roundNumber(newPosition.gps_lat, 5) + ', ' + roundNumber(newPosition.gps_lon, 5) +'</a>' +
                    ' <i class="icon-location"></i>';
  } else {
      coords_text = roundNumber(newPosition.gps_lat, 5) + ', ' + roundNumber(newPosition.gps_lon, 5);
  }

  // format altitude strings
  var text_alt      = Number((imp) ? Math.floor(3.2808399 * parseInt(newPosition.gps_alt)) : parseInt(newPosition.gps_alt)).toLocaleString("us");
      text_alt     += " " + ((imp) ? 'ft':'m');
  var text_alt_max  = Number((imp) ? Math.floor(3.2808399 * parseInt(vehicle.max_alt)) : parseInt(vehicle.max_alt)).toLocaleString("us");
      text_alt_max += " " + ((imp) ? 'ft':'m');


  // start
  // TABLE STUFF HERE

  if (newPosition.hasOwnProperty("type")){
      var sonde_type = newPosition.type + " ";
  } else {
      var sonde_type = "";
  }

  var callsign_list = [];

  if($.type(newPosition.callsign) === "string"){
      // Single callsign entry, as a string (chase cars)
      callsign_list = newPosition.callsign;
  } else {
    // Multiple callsigns, as an object
    for(var rxcall in newPosition.callsign){
        if(newPosition.callsign.hasOwnProperty(rxcall)) {
            _new_call = rxcall;
            tempFields = [];
            if(newPosition.callsign[rxcall].hasOwnProperty('snr')){
                if(newPosition.callsign[rxcall].snr){
                    tempFields.push(newPosition.callsign[rxcall].snr.toFixed(0) + " dB");
                }
            }
            if(newPosition.callsign[rxcall].hasOwnProperty('rssi')){
                if(newPosition.callsign[rxcall].rssi){
                    tempFields.push(newPosition.callsign[rxcall].rssi.toFixed(0) + " dBm");
                }
            }
            if(newPosition.callsign[rxcall].hasOwnProperty('frequency')){
                if(newPosition.callsign[rxcall].frequency){
                    tempFields.push(newPosition.callsign[rxcall].frequency + " MHz");
                }
            }
            if(tempFields.length > 0) {
                _new_call += " (" + tempFields.join(", ") + ")";
            }
            callsign_list.push(_new_call); // catch cases where there are no fields
        }
    }
    callsign_list = callsign_list.join(", ");
  }

  var timeNow = new Date();
  var timeSent = convert_time(newPosition.server_time);
  var timeChosen = null;

  if (timeSent > timeNow) {
      timeChosen = timeNow.getTime();
  } else {
      timeChosen = timeSent;
  }

  //desktop
  var a    = '<div class="header">' +
           '<span>' + sonde_type + vcallsign + ' <i class="icon-target"></i></span>' +
           '<canvas class="graph"></canvas>' +
           '<i class="arrow"></i></div>' +
           '<div class="data">' +
           '<img class="'+((vehicle.vehicle_type=="car")?'car':'')+'" src="'+image+'" />' +
           '<span class="vbutton path '+((vehicle.polyline_visible) ? 'active' : '')+'" data-vcallsign="'+vcallsign+'"' + ' style="top:'+(vehicle.image_src_size[1]+55)+'px">Path</span>' +
           ((vehicle.vehicle_type!="car") ? '<span class="sbutton" onclick="shareVehicle(\'' + vcallsign + '\')" style="top:'+(vehicle.image_src_size[1]+85)+'px">Share</span>' : '') +
           ((vehicle.vehicle_type!="car") ? '<span class="sbutton" onclick="window.open(\'https://sondehub.org/card/' + vcallsign + '\')" style="top:'+(vehicle.image_src_size[1]+115)+'px">Plot</span>' : '') +
           '<div class="left">' +
           '<dl>';
  //mobile
  var aa    = '<div class="header">' +
           '<span>' + sonde_type + vcallsign + ' <i class="icon-target"></i></span>' +
           '<canvas class="graph"></canvas>' +
           '<i class="arrow"></i></div>' +
           '<div class="data">' +
           '<img class="'+((vehicle.vehicle_type=="car")?'car':'')+'" src="'+image+'" />' +
           '<span class="vbutton path '+((vehicle.polyline_visible) ? 'active' : '')+'" data-vcallsign="'+vcallsign+'"' + ' style="top:55px">Path</span>' +
           ((vehicle.vehicle_type!="car") ? '<span class="sbutton" onclick="shareVehicle(\'' + vcallsign + '\')" style="top:85px">Share</span>' : '') +
           ((vehicle.vehicle_type!="car") ? '<span class="sbutton" onclick="window.open(\'https://sondehub.org/card/' + vcallsign + '\')" style="top:115px">Plot</span>' : '') +
           '<div class="left">' +
           '<dl>';
  var b    = '</dl>' +
           '</div>' + // right
           '</div>' + // data
           '';
  var c    = '<dt class="receivers">Received <i class="friendly-dtime" data-timestamp='+timeChosen+'></i> via:</dt><dd class="receivers">' +
           callsign_list + '</dd>';

  if(!newPosition.callsign) c = '';


  // mid for portrait
  var p    = '<dt>'+formatDate(stringToDateUTC(newPosition.gps_time))+'</dt><dd>datetime (local)</dd>' +
           '<dt>'+coords_text+'</dt><dd>coordinates</dd>' +
           c +// receivers if any
           '</dl>' +
           '</div>' + // left
           '<div class="right">' +
           '<dl>' +
           ((vehicle.vehicle_type == "car") ? '' : '<dt>'+ascent_text+'<br/>'+hrate_text+'</dt><dd>rate v|h</dd>') +
           '<dt>'+text_alt+'</dt><dd>altitude</dd>' +
           '<dt>'+text_alt_max+'</dt><dd>max alt</dd>' +
           '';
  // mid for landscape
  var l    = ((vehicle.vehicle_type == "car") ? '' : '<dt>'+ascent_text+' '+hrate_text+'</dt><dd>rate v|h</dd>') +
           '<dt>'+text_alt+' ('+text_alt_max+')</dt><dd>altitude (max)</dd>' +
           '<dt>'+formatDate(stringToDateUTC(newPosition.gps_time))+'</dt><dd>datetime (local)</dd>' +
           '<dt>'+coords_text+'</dt><dd>coordinates</dd>' +
           habitat_data(newPosition.data) +
           c + // receivers if any
           '';

  // update html
  $('.portrait .vehicle'+vehicle.uuid).html(aa + p + b);
  $('.landscape .vehicle'+vehicle.uuid).html(a + l + b);

  // redraw canvas
  if(wvar.mode != "Position" && vehicle.graph_data.length) {
      var can = $('.vehicle'+vehicle.uuid+' .graph');
      if (vehicle.vehicle_type!="car") {
        drawAltitudeProfile(can.get(0), can.get(1), vehicle.graph_data[0], vehicle.max_alt, true);
      } else {
        drawAltitudeProfile(can.get(0), can.get(1), vehicle.graph_data[0], vehicle.max_alt, true);
      }
  }

  // mark vehicles as redrawn
  vehicle.updated = false;

  return true;
}

function set_polyline_visibility(vcallsign, val) {
    var vehicle = vehicles[vcallsign];
    vehicle.polyline_visible = val;

    for(var k in vehicle.polyline) {
        if (val) {
            map.addLayer(vehicle.polyline[k]);
            vehicle.polyline[k].bringToBack();
        } else {
            map.removeLayer(vehicle.polyline[k]);
        }
    }

    if(vehicle.prediction_polyline) {
        if (val) {
            map.addLayer(vehicle.prediction_polyline);
        } else {
            map.removeLayer(vehicle.prediction_polyline);
        }
    }
    if(vehicle.prediction_launch_polyline) {
        if (val) {
            map.addLayer(vehicle.prediction_launch_polyline);
        } else {
            map.removeLayer(vehicle.prediction_launch_polyline);
        }
    }
    if(vehicle.prediction_target) {
        if (val) {
            map.addLayer(vehicle.prediction_target);
        } else {
            map.removeLayer(vehicle.prediction_target);
        }
    }
    if(vehicle.prediction_burst) {
        if (val) {
            map.addLayer(vehicle.prediction_burst);
        } else {
            map.removeLayer(vehicle.prediction_burst);
        }
    }

    map.removeLayer(mapInfoBox);
}

function removePrediction(vcallsign) {
  if(vehicles[vcallsign].prediction_polyline) {
    map.removeLayer(vehicles[vcallsign].prediction_polyline);
    vehicles[vcallsign].prediction_polyline = null;
  }
  if(vehicles[vcallsign].prediction_target) {
    map.removeLayer(vehicles[vcallsign].prediction_target);
    vehicles[vcallsign].prediction_target = null;
  }
  if(vehicles[vcallsign].prediction_burst) {
    map.removeLayer(vehicles[vcallsign].prediction_burst);
    vehicles[vcallsign].prediction_burst = null;
  }
}

function drawLaunchPrediction(vcallsign) {
    var vehicle = vehicles[vcallsign];
	var data = vehicle.prediction_launch.data;

    var line = [];
    var latlng = null;
    var path_length = 0;

    for(var i = 0, ii = data.length; i < ii; i++) {
        latlng = new L.LatLng(data[i].lat, data[i].lon);
        line.push(latlng);
        if(i > 1) path_length += line[i-1].distanceTo(line[i]);
    }

    vehicle.prediction_launch_path = line;

    vehicle.prediction_launch_polyline = new L.Polyline(line, {
            color: balloon_colors[vehicle.color_index],
            opacity: 0.4,
            weight: 3,
    }).addTo(map);

    vehicle.prediction_launch_polyline.on('click', function (e) {
        mapInfoBox_handle_prediction_path(e);
    });

    vehicle.prediction_launch_polyline.path_length = path_length;
}

function redrawPrediction(vcallsign) {
    var vehicle = vehicles[vcallsign];
	var data = vehicle.prediction.data;
	if(data.warnings || data.errors) return;

    var line = [];
    var graph_data = [];
    var latlng = null;
    var max_alt = -99999;
    var latlng_burst = null;
    var	burst_index = 0;
    var path_length = 0;

    for(var i = 0, ii = data.length; i < ii; i++) {
        latlng = new L.LatLng(data[i].lat, data[i].lon);
        line.push(latlng);

        // pred.alt for graph
        var alt = parseInt(data[i].alt);
        graph_data.push([parseInt(data[i].time)*1000, alt]);
        // adjust y-range
        if(alt > vehicle.graph_yaxes[0].max) {
            vehicle.graph_yaxes[0].max = alt;
            vehicle.graph_yaxes[1].max = vehicle.graph_yaxes[0].max;
        }

        if(parseFloat(data[i].alt) > max_alt) {
            max_alt = parseFloat(data[i].alt);
            latlng_burst = latlng;
            burst_index = i;
        }
        if(i > 1) path_length += line[i-1].distanceTo(line[i]);
    }

    vehicle.graph_data[1].data = graph_data;
    if(follow_vehicle !== null && follow_vehicle === vcallsign) updateGraph(vcallsign, true);
    vehicle.prediction_path = line;

    if(vehicle.prediction_polyline !== null) {
        vehicle.prediction_polyline.setLatLngs(line);
    } else {
        vehicle.prediction_polyline = new L.Polyline(line, {
            color: balloon_colors[vehicle.color_index],
            opacity: 0.4,
            weight: 3,
        }).addTo(map);
        vehicle.prediction_polyline.on('click', function (e) {
            mapInfoBox_handle_prediction_path(e);
        });
    }

    vehicle.prediction_polyline.path_length = path_length;

    var image_src;
    if(vcallsign != "wb8elk2") { // WhiteStar
        var html = "";
        if(vehicle.prediction_target) {
            vehicle.prediction_target.setLatLng(latlng);
        } else {
            image_src = host_url + markers_url + "target-" + balloon_colors_name[vehicle.color_index] + ".png";
            predictionIcon = new L.icon({
                iconUrl: image_src,
                iconSize: [20,20],
                iconAnchor: [10, 10],
            });
            vehicle.prediction_target = new L.Marker(latlng, {
                zIndexOffset: Z_SHADOW,
                icon: predictionIcon,
            }).addTo(map);
            vehicle.prediction_target.on('click', function (e) {
                mapInfoBox_handle_prediction(e);
            });
        }
        vehicle.prediction_target.pdata = data[data.length-1];
    } else {
        if(vehicle.prediction_target) vehicle.prediction_target = null;
    }

    if(burst_index !== 0 && vcallsign != "wb8elk2") {
        if(vehicle.prediction_burst) {
            vehicle.prediction_burst.setLatLng(latlng_burst);
        } else {
            image_src = host_url + markers_url + "balloon-pop.png";
            burstIcon = new L.icon({
                iconUrl: image_src,
                iconSize: [20,20],
                iconAnchor: [10, 10],
            });
            vehicle.prediction_burst = new L.Marker(latlng_burst, {
                zIndexOffset: Z_SHADOW,
                icon: burstIcon,
            }).addTo(map);
            vehicle.prediction_burst.on('click', function (e) {
                mapInfoBox_handle_prediction(e);
            });
        }
        vehicle.prediction_burst.pdata = data[burst_index];
    } else {
        if(vehicle.prediction_burst) vehicle.prediction_burst = null;
    }
}

function updatePolyline(vcallsign) {
    for(var k in vehicles[vcallsign].polyline) {
        vehicles[vcallsign].polyline[k].setLatLngs(vehicles[vcallsign].positions);
    }
}

function drawAltitudeProfile(c1, c2, series, alt_max, chase) {
    alt_max = (alt_max < 2000) ? 2000 : alt_max;
    var alt_list = series.data;
    var len = alt_list.length;
    var real_len = len - series.nulls;

    var ctx1 = c1.getContext("2d");
    var ctx2 = c2.getContext("2d");

    c1 = $(c1);
    c2 = $(c2);

    var ratio = window.devicePixelRatio;
    var cw1 = 180 * ratio;
    var ch1 = 40 * ratio;
    var cw2 = 60 * ratio;
    var ch2 = 40 * ratio;

    c1.attr('width', cw1).attr('height', ch1);
    c2.attr('width', cw2).attr('height', ch2);

    if (chase) {
        ctx1.fillStyle = "#d6f0f9";
        ctx1.lineWidth = 2 * ratio;
        ctx1.strokeStyle= "#33B5F5";
        ctx2.fillStyle = "#d6f0f9";
        ctx2.lineWidth = 2 * ratio;
        ctx2.strokeStyle= "#33B5F5";
    } else {
        ctx1.fillStyle = "#f9d6d6";
        ctx1.lineWidth = 2 * ratio;
        ctx1.strokeStyle= "#f53333";
        ctx2.fillStyle = "#f9d6d6";
        ctx2.lineWidth = 2 * ratio;
        ctx2.strokeStyle= "#f53333";
    }

    var xt1 = (cw1 - (2 * ratio)) / real_len;
    var yt1 = (ch1 - (6 * ratio)) / alt_max;
    var xt2 = (cw2 - (2 * ratio)) / real_len;
    var yt2 = (ch2 - (6 * ratio)) / alt_max;

    xt1 = (xt1 > 1) ? 1 : xt1;
    yt1 = (yt1 > 1) ? 1 : yt1;
    xt2 = (xt2 > 1) ? 1 : xt2;
    yt2 = (yt2 > 1) ? 1 : yt2;

    ctx1.beginPath();
    ctx2.beginPath();

    // start line at the ground, depending in the first altitude datum
    if(alt_list[0][1] < 2000) {
        ctx1.lineTo(0,ch1);
        ctx2.lineTo(0,ch2);
    }


    var i, alt;
    // draw all altitude points, if they are not too many
    if(cw1*2 > real_len) {
        for(i = 0; i < real_len; i++) {
            alt = alt_list[i][1];

            ctx1.lineTo(1+((i+1)*xt1), ch1 - (alt * yt1));
            ctx2.lineTo(1+((i+1)*xt2), ch2 - (alt * yt2));

            if(i+2 < len && alt_list[i+2][1] === null) i += 2;
        }
    }
    // if they are too many, downsample to keep the loop short
    else {
        xt1 = 0.5;
        xt2 = 0.16;
        var max = cw1 * 2;
        var step = (1.0*len) / max;

        for(i = 0; i < max; i++) {
            alt = alt_list[Math.floor(i*step)][1];
            if(alt === null) continue;

            ctx1.lineTo(1+((i+1)*xt1), ch1 - (alt * yt1));
            ctx2.lineTo(1+((i+1)*xt2), ch2 - (alt * yt2));
        }

        // fix index for fill
        i = len - 1;
    }

    ctx1.stroke();
    ctx2.stroke();

    // close the path, so it can be filled
    ctx1.lineTo(1+((i+1)*xt1), ch1);
    ctx2.lineTo(1+((i+1)*xt2), ch2);
    ctx1.lineTo(0,ch1);
    ctx2.lineTo(0,ch2);

    ctx1.closePath();
    ctx2.closePath();
    ctx1.fill();
    ctx2.fill();
}

// infobox
var mapInfoBox = new L.popup({
    maxWidth: 260
});

function mapInfoBox_handle_prediction_path(event) {
    var value = event.target.path_length;

    if(offline.get('opt_imperial')) {
        value = Math.round(value*0.000621371192) + " miles";
    } else {
        value = Math.round(value/10)/100 + " km";
    }

    mapInfoBox.setContent("<pre><b>Length:</b> " + value  + "</pre>");
    mapInfoBox.setLatLng(event.latlng);
    mapInfoBox.openOn(map);
};

function mapInfoBox_handle_path(event) {
    var vehicle = event.target.vehicle || vehicles[follow_vehicle];
    var target = event.latlng;
    var p = vehicle.positions;

    var p1_dist = 0;
    var p2_dist = p[0].distanceTo(target);

    var mindiff = Number.MAX_VALUE;
    var minidx = 0;
    var dist, diff;

    // find the closest existing point to snap to
    for(var i = 1, ii = p.length; i < ii; i++ ) {
        p1_dist = p2_dist;
        p2_dist = p[i].distanceTo(target);
        dist = p[i].distanceTo(p[i-1]);
        diff = Math.abs(dist - (p1_dist + p2_dist));

        if(diff >= 0 && mindiff > diff) {
            mindiff = diff;
            minidx = i;
        }
    }

    p1_dist = p[minidx-1].distanceTo(target);
    p2_dist = p[minidx].distanceTo(target);

    var point = (p1_dist < p2_dist) ? p[minidx-1] : p[minidx];
    var id = (p1_dist < p2_dist) ? vehicle.positions_ts[minidx-1] : vehicle.positions_ts[minidx];

    mapInfoBox.setContent("<img style='width:60px;height:20px' src='img/hab-spinner.gif' />");
    mapInfoBox.setLatLng(point);
    mapInfoBox.openOn(map);

    mapInfoBox_handle_path_fetch(id, vehicle);
};

function mapInfoBox_handle_path_fetch(id,vehicle) {
    var date = new Date(parseInt(id)).toISOString()
    var url = newdata_url + "?duration=0&serial=" + vehicle.callsign + "&datetime=" + date;

    $.getJSON(url, function(data) {
        if (Object.keys(data).length === 0) {
            mapInfoBox.setContent("not&nbsp;found");
            mapInfoBox.openOn(map);
            return;
        }

        data = data[vehicle.callsign][date];

        div = document.createElement('div');

        html = "<div style='line-height:16px;position:relative;'>";
        html += "<div>"+data.serial+"<span style=''>("+date+")</span></div>";
        html += "<hr style='margin:5px 0px'>";
        html += "<div style='margin-bottom:5px;'><b><i class='icon-location'></i>&nbsp;</b>"+roundNumber(data.lat, 5) + ',&nbsp;' + roundNumber(data.lon, 5)+"</div>";

        var imp = offline.get('opt_imperial');
        var text_alt      = Number((imp) ? Math.floor(3.2808399 * parseInt(data.alt)) : parseInt(data.alt)).toLocaleString("us");
        text_alt     += "&nbsp;" + ((imp) ? 'ft':'m');

        html += "<div><b>Altitude:&nbsp;</b>"+text_alt+"</div>";
        html += "<div><b>Time:&nbsp;</b>"+formatDate(stringToDateUTC(date))+"</div>";

        var value = vehicle.path_length;

        html += "<div><b>Distance:&nbsp;</b>";

        if(offline.get('opt_imperial')) {
            html += Math.round(value*0.000621371192) + "mi";
        } else {
            html += Math.round(value/10)/100 + "&nbsp;km";
        }

        html += "</div>";
        html += "<div><b>Duration:&nbsp;</b>" + format_time_friendly(vehicle.start_time, convert_time(vehicle.curr_position.gps_time)) + "</div>";

        html += "<hr style='margin:5px 0px'>";

        if (data.hasOwnProperty("batt")) {
            html += "<div><b>Battery Voltage:&nbsp;</b>" + data.batt + " V</div>";
        };
        if (data.hasOwnProperty("tx_frequency")) {
            html += "<div><b>TX Frequency:&nbsp;</b>" + data.tx_frequency + " MHz</div>";
        } else if (data.hasOwnProperty("frequency")) {
            html += "<div><b>Frequency:&nbsp;</b>" + data.frequency + " MHz</div>";
        };
        if (data.hasOwnProperty("humidity")) {
            html += "<div><b>Relative Humidity:&nbsp;</b>" + data.humidity + " %</div>";
        };
        if (data.hasOwnProperty("manufacturer")) {
            html += "<div><b>Manufacturer:&nbsp;</b>" + data.manufacturer + "</div>";
        };
        if (data.hasOwnProperty("sats")) {
            html += "<div><b>Satellites:&nbsp;</b>" + data.sats + "</div>";
        };
        if (data.hasOwnProperty("temp")) {
            html += "<div><b>Temperature External:&nbsp;</b>" + data.temp + "°C</div>";
        };
        if (data.hasOwnProperty("subtype")) {
            html += "<div><b>Sonde Type:&nbsp;</b>" + data.subtype + "</div>";
        } else if (data.hasOwnProperty("type")) {
            html += "<div><b>Sonde Type:&nbsp;</b>" + data.type + "</div>";
        };
        if (data.hasOwnProperty("pressure")) {
            html += "<div><b>Pressure:&nbsp;</b>" + data.pressure + " Pa</div>";
        };
        if (data.hasOwnProperty("xdata")) {
            html += "<div><b>XDATA:&nbsp;</b>" + data.xdata + "</div>";
        };

        html += "<hr style='margin:0px;margin-top:5px'>";
        html += "<div style='font-size:11px;'>"

        var callsign_list = [];

        for (var i = 0; i < data.uploaders.length; i++) {
            _new_call = data.uploaders[i].uploader_callsign;
            tempFields = [];
            if(data.uploaders[i].hasOwnProperty('snr')) {
                tempFields.push(data.uploaders[i].snr.toFixed(0) + " dB");
            } 
            if(data.uploaders[i].hasOwnProperty('rssi')) {
                tempFields.push(data.uploaders[i].rssi.toFixed(0) + " dBm");
            }
            if(data.uploaders[i].hasOwnProperty('frequency')) {
                tempFields.push(data.uploaders[i].frequency + " MHz");
            }
            if(tempFields.length > 0) {
                _new_call += " (" + tempFields.join(", ") + ")";
            }
            callsign_list.push(_new_call); // catch cases where there are no fields
        }

        callsign_list = callsign_list.join("<br /> ");

        html += callsign_list + "</div>";

        div.innerHTML = html;

        mapInfoBox.setContent(div);
        mapInfoBox.openOn(map);

        setTimeout(function() {
            div.parentElement.style.overflow = "";
            div.parentElement.style.overflowWrap = "break-word";
        }, 16);
    });
};

function mapInfoBox_handle_prediction(event) {
    var data = event.target.pdata;
    var altitude;

    if(offline.get('opt_imperial')) {
        altitude = Math.round(alt*3.2808399) + " feet";
    } else {
        altitude = Math.round(data.alt) + " m";
    }

    mapInfoBox.setContent("<pre>" +
                        formatDate(new Date(parseInt(data.time) * 1000), true) + "\n\n" +
                        "<b>Altitude:</b> " + altitude + "\n" +
                        "<b>Latitude:</b> " + data.lat + "\n" +
                        "<b>Longitude:</b> " + data.lon + "\n" +
                        "</pre>"
                        );
    mapInfoBox.setLatLng(event.latlng);
    mapInfoBox.openOn(map);
};

function mapInfoBox_handle_horizons(event, obj,  title) {
    var value = "";
    
    if(offline.get('opt_imperial')) {
        value = Math.round(event.target.getRadius()*0.000621371192) + "miles";
    } else {
        value = Math.round(event.target.getRadius()/10)/100 + "km";
    }

    mapInfoBox.setContent("<pre>" + title + "\nr = "+ value + "</pre>");
    mapInfoBox.setLatLng(event.latlng);
    mapInfoBox.openOn(map);
};

var mapInfoBox_handle_truehorizon = function(event) { mapInfoBox_handle_horizons(event, this, "True Horizon"); };
var mapInfoBox_handle_horizon = function(event) { mapInfoBox_handle_horizons(event, this, "5° Horizon"); };

var icon_cache = {};
var marker_rotate_func = function(deg) {
    this.rotated = true;
    deg -= 90;
    deg += (deg < 0) ? 360 : 0;

    var radii = deg * DEG_TO_RAD;
    var img = this.iconImg;
    var len = Math.max(img.height, img.width)*1.2;
    var canvas = document.createElement('canvas');
    canvas.height = canvas.width = len;
    var ctx = canvas.getContext('2d');

    ctx.save();
    ctx.translate(len * 0.5, len * 0.5);
    ctx.rotate(radii);
    if(deg >= 90 && deg <= 270) ctx.scale(1,-1);
    ctx.drawImage(img, -img.width/2, -img.height*0.95);
    ctx.restore();

    var size = [canvas.width*0.5, canvas.height*0.5];
    newIcon = L.icon({
        iconUrl: canvas.toDataURL(),
        iconSize: size,
        iconAnchor: [canvas.width*0.25, canvas.height*0.25],
        tooltipAnchor: [0,-32],
    });
    this.setIcon(newIcon);
};

var marker_rotate_setup = function(marker, image_src) {
    marker.setCourse = marker_rotate_func;
    marker.rotated = false;
    if(image_src in icon_cache) {
        marker.iconImg = icon_cache[image_src];
        marker.setCourse(90);
        marker.setLatLng(marker.getLatLng());
    }
    else {
        marker.iconImg = new Image();
        icon_cache[image_src] = marker.iconImg;
        marker.iconImg.onload = function() {
            if(!marker.rotated) marker.setCourse(90);
            marker.setLatLng(marker.getLatLng());
        };
        marker.iconImg.src = image_src;
    }
};

var array_unique = function(inarr) {
    var seen = {};
    return inarr.filter(function(v) {
        return seen.hasOwnProperty(v) ? false : (seen[v] = true);
    });
};

function addPosition(position) {
    var vcallsign = position.vehicle;

    // check if the vehicle is already in the list, if not create a new item
    if(!vehicles.hasOwnProperty(vcallsign)) {
        var marker = null;
        var marker_shadow = null;
        var landing_marker = null;
        var vehicle_type = "";
        var horizon_circle = null;
        var subhorizon_circle = null;
        var point = new L.LatLng(position.gps_lat, position.gps_lon);
        var image_src = "", image_src_size, image_src_offset;
        var color_index = 0;
        var polyline = null;
        var polyline_visible = false;
        var horizon_circle_title = null;
        var subhorizon_circle_title = null;
        if(vcallsign.search(/(chase)/i) != -1) {
            vehicle_type = "car";
            color_index = car_index++ % car_colors.length;
            image_src = host_url + markers_url + "car-" + car_colors[color_index] + ".png";
            image_src_size = [55,25];
            image_src_offset = [0,-25];

            marker = new L.Marker(point, {
                title: vcallsign,
                zIndexOffset: Z_CAR,
            });

            if(!!!window.HTMLCanvasElement) {
                carIcon = L.icon({
                    iconUrl: image_src,
                    iconSize: image_src_size,
                    iconAnchor: [27.22],
                    tooltipAnchor: [0,-32],
                });
                marker.setIcon(new carIcon);
            } else {
                marker_rotate_setup(marker, image_src);
            }
            marker.addTo(map).on('click', onClick);

            // Scroll list stuff here.
            function onClick(e) {
                _vehicle_id = e.target.options.title;
                _vehicle_idname = ".vehicle"+vehicles[_vehicle_id].uuid;
                $(_vehicle_idname).addClass('active');
                listScroll.refresh();
                listScroll.scrollToElement(_vehicle_idname);
                panTo(vcallsign);
                clearTimeout(periodical_focus_new);
                refreshSingleNew(_vehicle_id);
            };

            polyline = [
                new L.Polyline(point, {
                    color: car_colors[color_index],
                    opacity: 1,
                    weight: 3,
                })
            ];
        }
        else if(vcallsign == "XX") {
            vehicle_type = "xmark";
            image_src = host_url + markers_url + "balloon-xmark.png";
            image_src_size = [48,38];
            image_src_offset = [0,-38];

            xmarkIcon = new L.icon({
                iconUrl: image_src,
                iconSize: image_src_size,
                iconAnchor: [24, 18],
            });

            marker = new L.Marker(point, {
                icon: xmarkIcon,
                title: vcallsign,
                zIndexOffset: Z_CAR,
            });

            marker.addTo(map);
        } else {
            vehicle_type = "balloon";
            color_index = balloon_index++ % balloon_colors.length;

            image_src = host_url + markers_url + "balloon-" +
                        ((vcallsign == "PIE") ? "rpi" : balloon_colors_name[color_index]) + ".png";
            image_src_size = [46,84];
            image_src_offset = [-35,-46];

            shadowIcon = new L.icon({
                iconUrl: host_url + markers_url + "shadow.png",
                iconSize: [24,16],
                iconAnchor: [12, 8],
            });

            marker_shadow = new L.Marker(point, {
                icon: shadowIcon,
                zIndexOffset: Z_SHADOW,
            }).addTo(map);

            balloonIcon = new L.icon({
                iconUrl: image_src,
                iconSize: image_src_size,
                tooltipAnchor: [0,-98],
                iconAnchor: [23,90],
            });

            marker = new L.Marker(point, {
                icon: balloonIcon,
                title: position.type + ' ' + vcallsign,
                zIndexOffset: Z_PAYLOAD,
            }).addTo(map).on('click', onClick);

            // Scroll list stuff here.
            function onClick(e) {
                $(".row.active").removeClass('active');
                _vehicle_id = e.target.options.title.split(' ')[1];
                _vehicle_idname = ".vehicle"+vehicles[_vehicle_id].uuid;
                $(_vehicle_idname).addClass('active');
                listScroll.refresh();
                listScroll.scrollToElement(_vehicle_idname);
                followVehicle($(_vehicle_idname).attr('data-vcallsign'));
            };

            marker.shadow = marker_shadow;
            marker.balloonColor = (vcallsign == "PIE") ? "rpi" : balloon_colors_name[color_index];
            marker.mode = 'balloon';
            marker.setMode = function(mode) {
                if(this.mode == mode) return;

                this.mode = mode;
                var img;
                if(mode == "landed") {
                    map.removeLayer(vehicle.marker.shadow);
                    map.removeLayer(vehicle.horizon_circle);
                    map.removeLayer(vehicle.subhorizon_circle);
                    map.removeLayer(vehicle.horizon_circle_title);
                    map.removeLayer(vehicle.subhorizon_circle_title);

                    img = new L.icon ({
                        iconUrl: host_url + markers_url + "payload-" + this.balloonColor + ".png",
                        iconSize: [17,18],
                        iconAnchor: [8,14],
                        tooltipAnchor: [0,-20],
                    });
                } else {
                    map.addLayer(vehicle.marker.shadow);

                    if(offline.get('opt_hide_horizon') == false){
                        map.addLayer(vehicle.horizon_circle);
                        map.addLayer(vehicle.subhorizon_circle);
                        map.addLayer(vehicle.horizon_circle_title);
                        map.addLayer(vehicle.subhorizon_circle_title);
                    }

                    if(mode == "parachute") {
                        img = new L.icon ({
                            iconUrl: host_url + markers_url + "parachute-" + this.balloonColor + ".png",
                            iconSize: [46,84],
                            tooltipAnchor: [0,-98],
                            iconAnchor: [23,90],
                        });
                    } else {
                        img = new L.icon ({
                            iconUrl: host_url + markers_url + "balloon-" + this.balloonColor + ".png",
                            iconSize: [46,84],
                            tooltipAnchor: [0,-98],
                            iconAnchor: [23,90],
                        });
                    }
                }
                if (!wvar.nyan) {this.setIcon(img);};
            };

            // Add landing marker if the payload provides a predicted landing position.
            if (position.data.hasOwnProperty('pred_lat') && position.data.hasOwnProperty('pred_lon')){
                // Only create the marker if the pred lat/lon are not zero (as will be the case during ascent).
                if ((position.data.pred_lat !== 0.0) && (position.data.pred_lon !== 0.0)){
                    landing_image_src = host_url + markers_url + "balloon-xmark.png";
                    landing_image_src_size = [48,38];
                    landing_image_src_offset = [0,-38];

                    landingIcon = new L.icon({
                        iconUrl: landing_image_src,
                        iconSize: landing_image_src_size,
                        iconAnchor: [24, 18],
                    });

                    var latlng = new L.LatLng(position.data.pred_lat, position.data.pred_lon);

                    landing_marker = new L.Marker(latlng, {
                        icon: landingIcon,
                        title: vcallsign + " Onboard Landing Prediction",
                        zIndexOffset: Z_CAR,
                      }).addTo(map);
                } else {
                    landing_marker = null;
                }
            } else {
                landing_marker = null;
            }

            horizon_circle = new L.Circle(point, {
                zIndexOffset: Z_RANGE,
                radius: 1,
                color: '#00F',
                fillColor: '#00F',
                fillOpacity: 0,
                opacity: 0.6,
                interactive: false,
            });

            horizon_circle_title_icon = new L.DivIcon({
                className: "horizon_circle_title",
                html: '<span style="position:relative;left:-50%;top:-5px;color:black;border:1px solid rgb(0, 0, 255);border-radius:5px;font-size:9px;padding:2px;background-color:white;">km</span>'
            });

            horizon_circle_title = new L.Marker(point, {
                icon: horizon_circle_title_icon,
                interactive: false,
            });

            if (!offline.get("opt_hide_horizon")) {
                horizon_circle.addTo(map);
                horizon_circle_title.addTo(map);
            }

            horizon_circle.on('move', function (e) {
                try { 
                    var latlng = L.latLng(e.target.getBounds()._southWest.lat, ((e.target.getBounds()._northEast.lng + e.target.getBounds()._southWest.lng)/2));
                    horizon_circle_title.setLatLng(latlng);
                } catch (err) {}
            });  

            subhorizon_circle = new L.Circle(point, {
                zIndexOffset: Z_RANGE,
                radius: 1,
                color: '#0F0',
                fillColor: '#0F0',
                fillOpacity: 0,
                opacity: 0.8,
                interactive: false,
            });

            subhorizon_circle_title_icon = new L.DivIcon({
                className: "subhorizon_circle_title",
                html: '<span style="position:relative;left:-50%;top:-5px;color:black;border:1px solid rgb(0, 255, 0);border-radius:5px;font-size:9px;padding:2px;background-color:white;">km</span>',
            });

            subhorizon_circle_title = new L.Marker(point, {
                icon: subhorizon_circle_title_icon,
                interactive: false,
            });

            if (!offline.get("opt_hide_horizon")) {
                subhorizon_circle.addTo(map);
                subhorizon_circle_title.addTo(map);
            }

            subhorizon_circle.on('move', function (e) {
                try { 
                    var latlng = L.latLng(e.target.getBounds()._southWest.lat, ((e.target.getBounds()._northEast.lng + e.target.getBounds()._southWest.lng)/2));
                    subhorizon_circle_title.setLatLng(latlng);
                } catch (err) {}
            });  
            
            polyline_visible = true;
            polyline = [
                new L.Polyline(point, {
                    color: balloon_colors[color_index],
                    opacity: 1,
                    weight: 3,
                }).addTo(map)
            ];
        }

        if (!offline.get("opt_hide_titles")) {
            if (vehicle_type == "car") {
                title = marker.bindTooltip(vcallsign, {direction: 'center', permanent: 'true', className: 'serialtooltip'});
            } else {
                title = marker.bindTooltip((position.type + ' ' + vcallsign), {direction: 'center', permanent: 'true', className: 'serialtooltip'});
            }
        } else {
            title = null;
        }

        var vehicle_info = {
                            callsign: vcallsign,
                            uuid: elm_uuid++,
                            vehicle_type: vehicle_type,
                            marker: marker,
                            title: title,
                            marker_shadow: marker_shadow,
                            landing_marker: landing_marker,
                            image_src: image_src,
                            image_src_size: image_src_size,
                            image_src_offset: image_src_offset,
                            horizon_circle: horizon_circle,
                            horizon_circle_title: horizon_circle_title,
                            subhorizon_circle: subhorizon_circle,
                            subhorizon_circle_title: subhorizon_circle_title,
                            num_positions: 0,
                            positions: [],
                            positions_ts: [],
                            positions_ids: [],
                            positions_alts: [],
                            path_length: 0,
                            curr_position: position,
                            line: [],
                            polyline_visible: polyline_visible,
                            polyline: polyline !== null ? polyline : [
                                new L.Polyline(point, {
                                    color: "#ffffff",
                                    opacity: 1,
                                    weight: 3,
                                }),
                            ],
                            prediction: null,
                            prediction_polyline: null,
                            prediction_target: null,
                            prediction_burst: null,
                            prediction_launch: null,
                            prediction_launch_polyline: null,
                            ascent_rate: 0.0,
                            horizontal_rate: 0.0,
                            max_alt: parseFloat(position.gps_alt),
                            follow: false,
                            color_index: color_index,
                            graph_data_updated: false,
                            graph_data_map: {},
                            graph_data: [],
                            graph_yaxes: [],
                            updated: false,
                            start_time: 2147483647000
                            };
                    
        // deep copy yaxes config for graph
        plot_options.yaxes.forEach(function(v) { vehicle_info.graph_yaxes.push($.extend({}, v)); });     

        //nyan cat (very important feature)
        if(wvar.nyan && vehicle_info.vehicle_type == "balloon") {
            var nyan = nyan_colors[nyan_color_index] + ".gif";
            nyan_color_index = (nyan_color_index + 1) % nyan_colors.length;
            var nyanw = (nyan_color_index == 4) ? 104 : 55;

            nyanIcon = new L.icon ({
                iconUrl: host_url + markers_url + nyan,
                iconSize: [nyanw,39],
                iconAnchor: [26,20],
                tooltipAnchor: [0,-29],
            });

            vehicle_info.marker.setIcon(nyanIcon);

            vehicle_info.image_src = host_url + markers_url + "hab_nyan.gif";
            vehicle_info.image_src_offset = [-34,-70];

            var k;
            for(k in vehicle_info.polyline) {
                map.removeLayer(vehicle_info.polyline[k]);
            }

            vehicle_info.polyline = [];

            for(k in rainbow) {
                vehicle_info.polyline.push(new L.Polyline(point, {
                    zIndexOffset: (Z_PATH - (k * 1)),
                    color: rainbow[k],
                    opacity: 1,
                    weight: (k*4) + 2,
                }).addTo(map));
                vehicle_info.polyline[k].bringToBack();
            }
        }
        
        vehicle_info.kill = function() {
            $(".vehicle"+vehicle_info.uuid).remove();
            potentialobjects = [marker, marker_shadow, landing_marker, horizon_circle, horizon_circle_title, subhorizon_circle, subhorizon_circle_title, polyline];
            if (map.hasLayer(vehicle_info["prediction_polyline"])) { 
                map.removeLayer(vehicle_info["prediction_polyline"]);
            }
            if (map.hasLayer(vehicle_info["prediction_launch_polyline"])) { 
                map.removeLayer(vehicle_info["prediction_launch_polyline"]);
            }
            if (map.hasLayer(vehicle_info["prediction_target"])) { 
                map.removeLayer(vehicle_info["prediction_target"]);
            }
            if (map.hasLayer(vehicle_info["prediction_burst"])) { 
                map.removeLayer(vehicle_info["prediction_burst"]);
            }
            try {
                for(var p in vehicle_info.polyline) {
                    map.removeLayer(vehicle_info.polyline[p]);
                }
            } catch (e) {};
            for (let i = 0; i < potentialobjects.length; i++) {
                if (map.hasLayer(potentialobjects[i])) { 
                    map.removeLayer(potentialobjects[i]);
                }
              }
            delete vehicles[vehicle_info.callsign];
        };

        // polyline
        for(var pkey in vehicle_info.polyline) {
            vehicle_info.polyline[pkey].vehicle = vehicle_info;
            vehicle_info.polyline[pkey].on('click', function (e) {
                mapInfoBox_handle_path(e);
            });
        }
        
        vehicles[vcallsign] = vehicle_info;    
    }

    var vehicle = vehicles[vcallsign];

    var new_latlng = new L.LatLng(position.gps_lat, position.gps_lon);
    var new_ts = convert_time(position.gps_time);
    var curr_ts = convert_time(vehicle.curr_position.gps_time);
    var new_alt = position.gps_alt;
    var dt = (new_ts - curr_ts) / 1000; // convert to seconds

    if (typeof position.type !== 'undefined' && typeof vehicle.curr_position.type !== 'undefined') {
        if (position.type.length < vehicle.curr_position.type.length) {
            position.type = vehicle.curr_position.type;
        }
    }
    
    if(dt >= 0) {
        if(vehicle.num_positions > 0) {

            //average over 5s if available
            var old_ts = vehicle.positions_ts[vehicle.positions_ts.length - 5];
            var dtt = (new_ts - old_ts) / 1000; // convert to seconds

            if (vehicle.positions_ts.length < 5) {
                dtt = 1000;
            }

            // calculate vertical rate
            if (dtt > 10) {
                var rate = (position.gps_alt - vehicle.curr_position.gps_alt) / dt;
                if (!isNaN(rate) && isFinite(rate) && dt != 0) {
                    vehicle.ascent_rate = 0.7 * rate + 0.3 * vehicle.ascent_rate;
                }
            } else {
                var rate = (position.gps_alt - vehicle.positions_alts[vehicle.positions_alts.length - 5]) / dtt;
                if (!isNaN(rate) && isFinite(rate)) {
                    vehicle.ascent_rate = 0.7 * rate + 0.3 * vehicle.ascent_rate;
                }
            }

            // calculate horizontal rate
            if (dtt > 10) {
                horizontal_rate_temp = new_latlng.distanceTo(new L.LatLng(vehicle.curr_position.gps_lat, vehicle.curr_position.gps_lon)) / dt;
                if (!isNaN(horizontal_rate_temp) && isFinite(horizontal_rate_temp) && dt != 0) {
                    vehicle.horizontal_rate = horizontal_rate_temp;
                }
            } else {
                horizontal_rate_temp = new_latlng.distanceTo(vehicle.positions[vehicle.positions.length - 5]) / dtt;
                if (!isNaN(horizontal_rate_temp)) {
                    vehicle.horizontal_rate = horizontal_rate_temp;
                }
            }
         }

        // add the new position
        if(wvar.mode == "Position") {
            vehicle.num_positions= 1;
            vehicle.positions[0] = new_latlng;
            vehicle.positions_ts[0] = new_ts;
        } else {
            vehicle.positions.push(new_latlng);
            vehicle.positions_ts.push(new_ts);
            vehicle.positions_ids.push(position.position_id);
            vehicle.positions_alts.push(new_alt)
            vehicle.num_positions++;
        }

        // increment length
        var poslen = vehicle.num_positions;
        if(poslen > 1) vehicle.path_length += vehicle.positions[poslen-2].distanceTo(vehicle.positions[poslen-1]);

        L.LatLng.prototype.bearingTo = function(other) {
            var d2r  = L.LatLng.DEG_TO_RAD;
            var r2d  = L.LatLng.RAD_TO_DEG;
            var lat1 = this.lat * d2r;
            var lat2 = other.lat * d2r;
            var dLon = (other.lng-this.lng) * d2r;
            var y    = Math.sin(dLon) * Math.cos(lat2);
            var x    = Math.cos(lat1)*Math.sin(lat2) - Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
            var brng = Math.atan2(y, x);
            brng = parseInt( brng * r2d );
            brng = (brng + 360) % 360;
            return brng;
        };

        function toDegrees(radians) {
            return radians * 180 / Math.PI;
        };

        function toRadians(degrees) {
            return degrees * Math.PI / 180;
        };

        // if car doesn't report heading, we calculate it from the last position
        if(vehicle.num_positions > 1 && vehicle.vehicle_type == 'car' && 'gps_heading' in position && position.gps_heading === "") {

            // Source
            var startLat = toRadians(vehicle.curr_position.gps_lat);
            var startLng = toRadians(vehicle.curr_position.gps_lon);

            // destination
            var destLat = toRadians(position.gps_lat);
            var destLng = toRadians(position.gps_lon);

            y = Math.sin(destLng - startLng) * Math.cos(destLat);
            x = Math.cos(startLat) * Math.sin(destLat) - Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
            brng = Math.atan2(y, x);
            brng = toDegrees(brng);
            if (brng != 0) { position.gps_heading = brng; };
        }

        vehicle.curr_position = position;
        graphAddPosition(vcallsign, position);
    }
    else if(wvar.mode == "Position") { // we don't splice old postions in latest position mode
        return;
    }
    else {
        if(vehicle.positions_ts.indexOf(new_ts) > -1) return; // duplicate packet

        // backlog packets, need to splice them into the array
        // find out the index at which we should insert the new point
        var xref = vehicle.positions_ts;
        var idx = -1, len = xref.length;
        while(++idx < len) {
            if(xref[idx] > new_ts) {
                break;
            }
        }

        // recalculate the distance in the section where we insert
        if(idx === 0) {
            vehicle.path_length += vehicle.positions[0].distanceTo(new_latlng);
        } else {
            // subtracked the distance between the two points where we gonna insert the new one
            vehicle.path_length -= vehicle.positions[idx-1].distanceTo(vehicle.positions[idx]);

            // calculate the distance with the new point in place
            vehicle.path_length += vehicle.positions[idx-1].distanceTo(new_latlng);
            vehicle.path_length += vehicle.positions[idx].distanceTo(new_latlng);
        }

        // insert the new position into our arrays
        vehicle.positions.splice(idx, 0, new_latlng);
        vehicle.positions_alts.splice(idx, 0, new_alt);
        vehicle.positions_ts.splice(idx, 0, new_ts);
        vehicle.positions_ids.splice(idx, 0, position.position_id);
        vehicle.num_positions++;

        graphAddPosition(vcallsign, position);
    }

    vehicle.updated = true;

    // record the start of flight
    if(new_ts < vehicle.start_time) {
        vehicle.start_time = new_ts;
    }

    // record the highest altitude
    if(parseFloat(position.gps_alt) > vehicle.max_alt) {
        vehicle.max_alt = parseFloat(position.gps_alt);
    }

    return;
}

// Graph Stuff

var graph_inhibited_fields = ['frequency', 'burst_timer'];

function updateGraph(vcallsign, reset_selection) {
    if(!plot || !plot_open) return;

    if(reset_selection) {
        if(vcallsign !== null) delete plot_options.xaxis;

        if(polyMarker) map.removeLayer(polyMarker);
        plot_crosshair_locked = false;

        $("#timebox").removeClass('past').addClass('present');
        updateTimebox(new Date());
    }

    if(vcallsign === null || !vehicles.hasOwnProperty(vcallsign)) return;

    var series = vehicles[vcallsign].graph_data;

    // replot graph, with this vehicle data, and this vehicles yaxes config
    plot = $.plot(plot_holder, series, $.extend(plot_options, {yaxes:vehicles[vcallsign].graph_yaxes}));
    graph_vehicle = follow_vehicle;

    vehicles[vcallsign].graph_data_updated = false;
}

var graph_gap_size_default = 18000000; // 3 mins in milis
var graph_gap_size_max = 31536000000;
var graph_gap_size = offline.get('opt_interpolate') ? graph_gap_size_max : graph_gap_size_default;
var graph_pad_size = 120000; // 2 min

function graphAddPosition(vcallsign, new_data) {

    var vehicle = vehicles[vcallsign];
    vehicle.graph_data_updated = true;

    var data = vehicle.graph_data;
    var ts = convert_time(new_data.gps_time);
    var splice = false;
    var splice_idx = 0;
    var splice_remove = 0;
    var splice_pad = false;
    var i;

    if(data.length) {
        var ts_last_idx = data[0].data.length - 1;
        var ts_last = data[0].data[ts_last_idx][0];

        if(data[0].data.length) {
            if(data[0].data[ts_last_idx][0] > ts) splice = true;
        }

        if(splice) {
            // Good luck figuring out the following code. -Rossen

            // find an insertion point for the new datum
            var xref = data[0].data;
            i = xref.length - 1;
            var max = i;
            for(; i >= 0; i--) {
                if(ts > xref[i][0]) break;
            }
            splice_idx = i+1;

            if(i > -1) {
                // this is if new datum hits padded area
                if((xref[i][1] === null && xref[i][0] - 1 + (graph_gap_size - graph_pad_size) >= ts)) {
                    splice_remove = 2;
                    splice_idx = i-1;
                }
                else if(i+1 <= max && xref[i+1][1] === null) {
                    splice_remove = 2;
                    splice_idx = i;
                }
                else if(i+2 <= max && xref[i+2][1] === null) {
                    splice_remove = 2;
                    splice_idx = i+1;

                }
                // should we pad before the new datum
                else if (xref[i][1] !== null && xref[i][0] + graph_gap_size < ts) {
                    // pad with previous datum
                    $.each(data, function(k,v) {
                        if(k==1) return; // skip prediction series

                        v.data.splice(i+1, 0, [xref[i][0]+graph_pad_size, v.data[i][1]], [xref[i][0]+graph_pad_size+1, null]);
                        v.nulls += 2;
                    });

                    splice_idx += 2;
                }

            }

            // should we pad after
            if(ts + graph_gap_size < xref[splice_idx+splice_remove][0]) {
                splice_pad = true;
            }

        }
        else {
            //insert gap when there are 3mins, or more, without telemetry
            if(ts_last + graph_gap_size < ts) {
                $.each(data, function(k,v) {
                    if(k==1) return; // skip prediction series

                    v.data.push([ts_last+graph_pad_size, v.data[ts_last_idx][1]]);
                    v.data.push([ts_last+graph_pad_size+1, null]);
                    v.nulls += 2;
                });
            }
        }
        // update the selection upper limit to the latest timestamp, only if the upper limit is equal to the last timestamp
        if(plot_options.xaxis && follow_vehicle == vcallsign && ts_last == plot_options.xaxis.max && ts > ts_last) plot_options.xaxis.max = ts;
    }

    i = 0;
    // altitude is always first in the series
    if(data[i] === undefined) {
        data[i] = {
                    label: "altitude = 0",
                    color: '#33B5E5',
                    yaxis: i+1,
                    lines: { show:true, fill: true, fillColor: "rgba(51, 181, 229, 0.1)" },
                    nulls: 0,
                    data: []
                  };

        vehicle.graph_yaxes[i].max = 0;
        i += 1;

        data[i] = {
                    label: "pred.alt. = 0",
                    color: '#999999',
                    yaxis: i+1,
                    lines: { show:true, fill: false, },
                    nulls: 0,
                    data: []
                  };

        vehicle.graph_yaxes[i].max = 0;
    }

    // set yrange for altitude and pred.alt, so they are aligned
    if(parseInt(new_data.gps_alt) < vehicle.graph_yaxes[0].min) {
        vehicle.graph_yaxes[0].min = parseInt(new_data.gps_alt);
        vehicle.graph_yaxes[1].min = vehicle.graph_yaxes[0].min;
    }

    if(parseInt(new_data.gps_alt) > vehicle.graph_yaxes[0].max) {
        vehicle.graph_yaxes[0].max = parseInt(new_data.gps_alt);
        vehicle.graph_yaxes[1].max = vehicle.graph_yaxes[0].max;
    }



    // we don't record extra data, if there is no telemetry graph loaded
    // altitude is used for altitude profile
    if(plot && new_data.data !== "") {

        // the rest of the series is from the data field
        var json = (typeof new_data.data === "string") ? $.parseJSON(new_data.data) : new_data.data;

        // init empty data matrix
        var data_matrix = [];
        var k;
        for(k in vehicle.graph_data_map) data_matrix[vehicle.graph_data_map[k]] = [ts, null];

        $.each(json, function(k, v) {
            if(isNaN(v) || v==="") return;        // only take data that is numerical

            i = (k in vehicle.graph_data_map) ? vehicle.graph_data_map[k] : data.length;

            // Disable plotting of a few fields.
            if (graph_inhibited_fields.includes(k)){
                return;
            }


            if(i >= 8) return;  // up to 7 seperate data plots only, 1 taken by alt, 1 by prediction

            if(data[i] === undefined) {
                // configure series
                data[i] = {
                            label: k + " = 0",
                            key: k,
                            yaxis: i + 1,
                            nulls: 0,
                            data: []
                          };

                // when a new data field comes in packet other than the first one
                if(data[0].data.length > 0) {
                    var xref = data[0].data;

                    data[i].data = new Array(xref.length);

                    // we intialize it's series entry with empty data
                    // all series need to be the same length for slicing to work
                    for(var kk in xref) {
                        data[i].data[kk] = [xref[kk][0], null];
                    }

                }

                vehicle.graph_data_map[k] = i;
                data_matrix[i] = [ts, null];

                // additinal series configuration
                if(isInt(v)) $.extend(true, data[i], { noInterpolate: true, lines: { steps: true }});
            }

            if(parseFloat(v) < 0) delete vehicle.graph_yaxes[i].min;

            data_matrix[i][1] = parseFloat(v);
        });

        for(k in data_matrix) {
            if(splice) {
                if(splice_pad) {
                    data[k].data.splice(splice_idx, splice_remove, data_matrix[k], [ts+graph_pad_size, data_matrix[k][1]], [ts+graph_pad_size+1, null]);
                    data[k].nulls += 2;
                } else {
                    data[k].data.splice(splice_idx, splice_remove, data_matrix[k]);
                }
                data[k].nulls -= splice_remove;
            } else {
                data[k].data.push(data_matrix[k]);
            }
        }
    }

    // push latest altitude
    if(splice) {
        if(splice_pad) {
            data[0].data.splice(splice_idx, splice_remove, [ts, parseInt(new_data.gps_alt)], [ts+graph_pad_size, parseInt(new_data.gps_alt)], [ts+graph_pad_size+1, null]);
            data[0].nulls += 2;
        } else {
            data[0].data.splice(splice_idx, splice_remove, [ts, parseInt(new_data.gps_alt)]);
        }
        data[0].nulls -= splice_remove;
    } else {
        data[0].data.push([ts, parseInt(new_data.gps_alt)]);
    }
}

function formatData(data, live) {
    var response = {};
    response.positions = {};
    var dataTemp = [];
    if (live) {
        if (data.length) {
            for (let entry in data) {
                var dataTempEntry = {};
                var station = data[entry].uploader_callsign;
                dataTempEntry.callsign = {};
                //check if other stations also received this packet
                if (vehicles.hasOwnProperty(data[entry].serial)) {
                    if (data[entry].datetime == vehicles[data[entry].serial].curr_position.gps_time) {
                        for (let key in vehicles[data[entry].serial].curr_position.callsign) {
                            if (vehicles[data[entry].serial].curr_position.callsign.hasOwnProperty(key)) {
                                if (key != station) {
                                    dataTempEntry.callsign[key] = {};
                                    if (vehicles[data[entry].serial].curr_position.callsign[key].hasOwnProperty("snr")) {
                                        dataTempEntry.callsign[key].snr = vehicles[data[entry].serial].curr_position.callsign[key].snr;
                                    }
                                    if (vehicles[data[entry].serial].curr_position.callsign[key].hasOwnProperty("rssi")) {
                                        dataTempEntry.callsign[key].rssi = vehicles[data[entry].serial].curr_position.callsign[key].rssi;
                                    }
                                    if (vehicles[data[entry].serial].curr_position.callsign[key].hasOwnProperty("frequency")) {
                                        dataTempEntry.callsign[key].frequency = vehicles[data[entry].serial].curr_position.callsign[key].frequency;
                                    }
                                }
                            }
                        }
                    }
                }
                dataTempEntry.callsign[station] = {};
                if (data[entry].snr) {
                    dataTempEntry.callsign[station].snr = data[entry].snr;
                }
                if (data[entry].rssi) {
                    dataTempEntry.callsign[station].rssi = data[entry].rssi;
                }
                if (data[entry].frequency) {
                    dataTempEntry.callsign[station].frequency = data[entry].frequency;
                }
                dataTempEntry.gps_alt = data[entry].alt;
                dataTempEntry.gps_lat = data[entry].lat;
                dataTempEntry.gps_lon = data[entry].lon;
                if (data[entry].heading) {
                    dataTempEntry.gps_heading = data[entry].heading;
                }
                dataTempEntry.gps_time = data[entry].datetime;
                dataTempEntry.server_time = data[entry].datetime;
                dataTempEntry.vehicle = data[entry].serial;
                dataTempEntry.position_id = data[entry].serial + "-" + data[entry].datetime;
                dataTempEntry.data = {};
                if (data[entry].batt) {
                    dataTempEntry.data.batt = data[entry].batt;
                }
                if (data[entry].burst_timer) {
                    dataTempEntry.data.burst_timer = data[entry].burst_timer;
                }
                if (data[entry].frequency) {
                    dataTempEntry.data.frequency = data[entry].frequency;
                }
                if (data[entry].tx_frequency) {
                    dataTempEntry.data.frequency_tx = data[entry].tx_frequency;
                }
                if (data[entry].humidity) {
                    dataTempEntry.data.humidity = data[entry].humidity;
                }
                if (data[entry].manufacturer) {
                    dataTempEntry.data.manufacturer = data[entry].manufacturer;
                }
                if (data[entry].sats) {
                    dataTempEntry.data.sats = data[entry].sats;
                }
                if (data[entry].temp) {
                    dataTempEntry.data.temperature_external = data[entry].temp;
                }
                if (data[entry].type) {
                    dataTempEntry.data.type = data[entry].type;
                    dataTempEntry.type = data[entry].type;
                }
                if (data[entry].subtype) {
                    dataTempEntry.data.type = data[entry].subtype;
                    dataTempEntry.type = data[entry].subtype;
                }
                if (data[entry].pressure) {
                    dataTempEntry.data.pressure = data[entry].pressure;
                }
                if (data[entry].xdata) {
                    dataTempEntry.data.xdata = data[entry].xdata;
                }
                if (data[entry].serial.toLowerCase() != "xxxxxxxx") {
                    dataTemp.push(dataTempEntry);
                }
            }
        } else {
            var dataTempEntry = {};
            var station = data.uploader_callsign;
            dataTempEntry.callsign = {};
            //check if other stations also received this packet
            if (vehicles.hasOwnProperty(data.serial)) {
                if (data.datetime == vehicles[data.serial].curr_position.gps_time) {
                    for (let key in vehicles[data.serial].curr_position.callsign) {
                        if (vehicles[data.serial].curr_position.callsign.hasOwnProperty(key)) {
                            if (key != station) {
                                dataTempEntry.callsign[key] = {};
                                if (vehicles[data.serial].curr_position.callsign[key].hasOwnProperty("snr")) {
                                    dataTempEntry.callsign[key].snr = vehicles[data.serial].curr_position.callsign[key].snr;
                                }
                                if (vehicles[data.serial].curr_position.callsign[key].hasOwnProperty("rssi")) {
                                    dataTempEntry.callsign[key].rssi = vehicles[data.serial].curr_position.callsign[key].rssi;
                                }
                                if (vehicles[data.serial].curr_position.callsign[key].hasOwnProperty("frequency")) {
                                    dataTempEntry.callsign[key].frequency = vehicles[data.serial].curr_position.callsign[key].frequency;
                                }
                            }
                        }
                    }
                }
            }
            dataTempEntry.callsign[station] = {};
            if (data.snr) {
                dataTempEntry.callsign[station].snr = data.snr;
            }
            if (data.rssi) {
                dataTempEntry.callsign[station].rssi = data.rssi;
            }
            if (data.frequency) {
                dataTempEntry.callsign[station].frequency = data.frequency;
            }
            dataTempEntry.gps_alt = data.alt;
            dataTempEntry.gps_lat = data.lat;
            dataTempEntry.gps_lon = data.lon;
            if (data.heading) {
                dataTempEntry.gps_heading = data.heading;
            }
            dataTempEntry.gps_time = data.datetime;
            dataTempEntry.server_time = data.datetime;
            dataTempEntry.vehicle = data.serial;
            dataTempEntry.position_id = data.serial + "-" + data.datetime;
            dataTempEntry.data = {};
            if (data.batt) {
                dataTempEntry.data.batt = data.batt;
            }
            if (data.burst_timer) {
                dataTempEntry.data.burst_timer = data.burst_timer;
            }
            if (data.frequency) {
                dataTempEntry.data.frequency = data.frequency;
            }
            if (data.tx_frequency) {
                dataTempEntry.data.frequency_tx = data.tx_frequency;
            }
            if (data.humidity) {
                dataTempEntry.data.humidity = data.humidity;
            }
            if (data.manufacturer) {
                dataTempEntry.data.manufacturer = data.manufacturer;
            }
            if (data.sats) {
                dataTempEntry.data.sats = data.sats;
            }
            if (data.temp) {
                dataTempEntry.data.temperature_external = data.temp;
            }
            if (data.type) {
                dataTempEntry.data.type = data.type;
                dataTempEntry.type = data.type;
            }
            if (data.subtype) {
                dataTempEntry.data.type = data.subtype;
                dataTempEntry.type = data.subtype;
            }
            if (data.pressure) {
                dataTempEntry.data.pressure = data.pressure;
            }
            if (data.xdata) {
                dataTempEntry.data.xdata = data.xdata;
            }
            if (data.serial.toLowerCase() != "xxxxxxxx") {
                dataTemp.push(dataTempEntry);
            }
        }
    } else if (data.length == null) {
        for (let key in data) {
            if (data.hasOwnProperty(key)) {
                if (typeof data[key] === 'object') {
                    for (let i in data[key]) {
                        var dataTempEntry = {};
                        var station = data[key][i].uploader_callsign;
                        dataTempEntry.callsign = {};
                        dataTempEntry.callsign[station] = {};
                        if (data[key][i].snr) {
                            dataTempEntry.callsign[station].snr = data[key][i].snr;
                        }
                        if (data[key][i].rssi) {
                            dataTempEntry.callsign[station].rssi = data[key][i].rssi;
                        }
                        if (data[key][i].frequency) {
                            dataTempEntry.callsign[station].frequency = data[key][i].frequency;
                        }
                        dataTempEntry.gps_alt = data[key][i].alt;
                        dataTempEntry.gps_lat = data[key][i].lat;
                        dataTempEntry.gps_lon = data[key][i].lon;
                        if (data[key][i].heading) {
                            dataTempEntry.gps_heading = data[key][i].heading;
                        }
                        dataTempEntry.gps_time = data[key][i].datetime;
                        dataTempEntry.server_time = data[key][i].datetime;
                        dataTempEntry.vehicle = data[key][i].serial;
                        dataTempEntry.position_id = data[key][i].serial + "-" + data[key][i].datetime;
                        dataTempEntry.data = {};
                        if (data[key][i].batt) {
                            dataTempEntry.data.batt = data[key][i].batt;
                        }
                        if (data[key][i].burst_timer) {
                            dataTempEntry.data.burst_timer = data[key][i].burst_timer;
                        }
                        if (data[key][i].frequency) {
                            dataTempEntry.data.frequency = data[key][i].frequency;
                        }
                        if (data[key][i].tx_frequency) {
                            dataTempEntry.data.frequency_tx = data[key][i].tx_frequency;
                        }
                        if (data[key][i].humidity) {
                            dataTempEntry.data.humidity = data[key][i].humidity;
                        }
                        if (data[key][i].manufacturer) {
                            dataTempEntry.data.manufacturer = data[key][i].manufacturer;
                        }
                        if (data[key][i].sats) {
                            dataTempEntry.data.sats = data[key][i].sats;
                        }
                        if (data[key][i].temp) {
                            dataTempEntry.data.temperature_external = data[key][i].temp;
                        }
                        if (data[key][i].type) {
                            dataTempEntry.data.type = data[key][i].type;
                            dataTempEntry.type = data[key][i].type;
                        }
                        if (data[key][i].subtype) {
                            dataTempEntry.data.type = data[key][i].subtype;
                            dataTempEntry.type = data[key][i].subtype;
                        }
                        if (data[key][i].pressure) {
                            dataTempEntry.data.pressure = data[key][i].pressure;
                        }
                        if (data[key][i].xdata) {
                            dataTempEntry.data.xdata = data[key][i].xdata;
                        }
                        if (data[key][i].serial.toLowerCase() != "xxxxxxxx") {
                            dataTemp.push(dataTempEntry);
                        }
                    }
                }
            }
        }
    } else {
        for (var i = data.length - 1; i >= 0; i--) {
            if (data[i].hasOwnProperty('subtype') && data[i].subtype == "SondehubV1") {
                var dataTempEntry = {};
                var station = data[i].uploader_callsign;
                dataTempEntry.callsign = {};
                dataTempEntry.callsign[station] = {};
                dataTempEntry.gps_alt = parseFloat(data[i].alt);
                dataTempEntry.gps_lat = parseFloat(data[i].lat);
                dataTempEntry.gps_lon = parseFloat(data[i].lon);
                dataTempEntry.gps_time = data[i].time_received;
                dataTempEntry.server_time = data[i].time_received;
                dataTempEntry.vehicle = data[i].serial;
                dataTempEntry.position_id = data[i].serial + "-" + data[i].time_received;
                dataTempEntry.data = {};
                if (data[i].humidity) {
                    dataTempEntry.data.humidity = parseFloat(data[i].humidity);
                }
                if (data[i].temp) {
                    dataTempEntry.data.temperature_external = parseFloat(data[i].temp);
                }
                dataTemp.push(dataTempEntry);
            } else {
                var dataTempEntry = {};
                var station = data[i].uploader_callsign;
                dataTempEntry.callsign = {};
                dataTempEntry.callsign[station] = {};
                if (data[i].snr) {
                    dataTempEntry.callsign[station].snr = data[i].snr;
                }
                if (data[i].rssi) {
                    dataTempEntry.callsign[station].rssi = data[i].rssi;
                }
                if (data[i].frequency) {
                    dataTempEntry.callsign[station].frequency = data[i].frequency;
                }
                dataTempEntry.gps_alt = data[i].alt;
                dataTempEntry.gps_lat = data[i].lat;
                dataTempEntry.gps_lon = data[i].lon;
                if (data[i].heading) {
                    dataTempEntry.gps_heading = data[i].heading;
                }
                dataTempEntry.gps_time = data[i].datetime;
                dataTempEntry.server_time = data[i].datetime;
                dataTempEntry.vehicle = data[i].serial;
                dataTempEntry.position_id = data[i].serial + "-" + data[i].datetime;
                dataTempEntry.data = {};
                if (data[i].batt) {
                    dataTempEntry.data.batt = data[i].batt;
                }
                if (data[i].burst_timer) {
                    dataTempEntry.data.burst_timer = data[i].burst_timer;
                }
                if (data[i].frequency) {
                    dataTempEntry.data.frequency = data[i].frequency;
                }
                if (data[i].tx_frequency) {
                    dataTempEntry.data.frequency_tx = data[i].tx_frequency;
                }
                if (data[i].humidity) {
                    dataTempEntry.data.humidity = data[i].humidity;
                }
                if (data[i].manufacturer) {
                    dataTempEntry.data.manufacturer = data[i].manufacturer;
                }
                if (data[i].sats) {
                    dataTempEntry.data.sats = data[i].sats;
                }
                if (data[i].temp) {
                    dataTempEntry.data.temperature_external = data[i].temp;
                }
                if (data[i].type) {
                    dataTempEntry.data.type = data[i].type;
                    dataTempEntry.type = data[i].type;
                }
                if (data[i].subtype) {
                    dataTempEntry.data.type = data[i].subtype;
                    dataTempEntry.type = data[i].subtype;
                }
                if (data[i].pressure) {
                    dataTempEntry.data.pressure = data[i].pressure;
                }
                if (data[i].xdata) {
                    dataTempEntry.data.xdata = data[i].xdata;
                }
                dataTemp.push(dataTempEntry);
            }
        }
    }
    response.positions.position = dataTemp;
    response.fetch_timestamp = Date.now();
    return response;
}

var ajax_positions = null;
var ajax_positions_single = null;
var ajax_positions_single_new = null;
var ajax_inprogress = false;
var ajax_inprogress_single = false;
var ajax_inprogress_single_new = false;

function refresh() {
  if(ajax_inprogress) {
    clearTimeout(periodical);
    periodical = setTimeout(refresh, 2000);
    return;
  }

  ajax_inprogress = true;

  $("#stText").text("loading |");

  var mode = wvar.mode.toLowerCase();
  mode = (mode == "position") ? "latest" : mode.replace(/ /g,"");

  if (wvar.query && sondePrefix.indexOf(wvar.query) == -1) {
    var data_str = "duration=3d&serial=" + encodeURIComponent(wvar.query);
  } else {
    var data_str = "duration=" + mode;
  }

  ajax_positions = $.ajax({
    type: "GET",
    url: newdata_url,
    data: data_str,
    dataType: "json",
    success: function(data, textStatus) {
        if (wvar.query != null && JSON.stringify(data).indexOf(wvar.query) == -1) {
            refreshSingle(wvar.query);
        } else {
            response = formatData(data, false);
            update(response);   
            $("#stTimer").attr("data-timestamp", response.fetch_timestamp);
        }
        $("#stText").text("");
    },
    error: function() {
        $("#stText").text("error |");
        document.getElementById("timeperiod").disabled = false;
        ajax_inprogress = false;
    },
    complete: function(request, textStatus) {
        if (!ajax_inprogress_single) {
            document.getElementById("timeperiod").disabled = false;
        }
        clientActive = true;
        clearTimeout(periodical);
        ajax_inprogress = false;
    }
  });
}

live_data_buffer = {positions:{position:[]}}
function liveData() {
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    client.connect({onSuccess:onConnect,onFailure:connectionError,reconnect:true});

    function onConnect() {
        if (wvar.query && sondePrefix.indexOf(wvar.query) == -1) {
            var topic = "sondes/" + wvar.query;
            client.subscribe(topic);
            clientTopic = topic;
        } else {
            client.subscribe("batch");
            clientTopic = "batch";
        }
        clientConnected = true;
        $("#stText").text("websocket |");
    };

    function connectionError(error) {
        $("#stText").text("error |");
        clientConnected = false;
        clientActive = false;
        if (!document.getElementById("stTimer").classList.contains('friendly-dtime') ) {
            document.getElementById("stTimer").classList.add('friendly-dtime');
            $("#updatedText").text(" Updated: ");
        }
        refresh();
    };

    function onConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
            clientConnected = false;
            clientActive = false;
            if (!document.getElementById("stTimer").classList.contains('friendly-dtime') ) {
                document.getElementById("stTimer").classList.add('friendly-dtime');
                $("#updatedText").text(" Updated: ");
            }
            refresh();
        }
    };

    function onMessageArrived(message) {
        messageRate += 1;
        setTimeout(function(){
            messageRate -= 1;
          }, (1000 * messageRateAverage));
        if ( document.getElementById("stTimer").classList.contains('friendly-dtime') ) {
            document.getElementById("stTimer").classList.remove('friendly-dtime');
        }
        $("#stTimer").text(Math.round(messageRate/10) + " msg/s");
        $("#updatedText").text(" ");
        var dateNow = new Date().getTime();
        try {
            if (clientActive) {
                var frame = JSON.parse(message.payloadString.toString());
                if (wvar.query == "" || sondePrefix.indexOf(wvar.query) > -1 || wvar.query == frame.serial) {
                    if (frame.length == null) {
                        var tempDate = new Date(frame.time_received).getTime();
                    } else {
                        var tempDate = new Date(frame[frame.length - 1].time_received).getTime()
                    }
                    if ((dateNow - tempDate) < 30000) {
                        var test = formatData(frame, true);
                        if (clientActive) {
                            live_data_buffer.positions.position.push.apply(live_data_buffer.positions.position,test.positions.position)
                        }
                        $("#stTimer").attr("data-timestamp", dateNow);
                        $("#stText").text("websocket |");
                    } else if ((dateNow - new Date(frame.time_received).getTime()) > 150000) {
                        $("#stText").text("error |");
                        refresh();
                    } else {
                        $("#stText").text("error |");
                    }
                }
            }
        }
        catch(err) {}
    };
}

setInterval(function(){
    update(live_data_buffer);
    live_data_buffer.positions.position=[];
}, 200)

function refreshSingle(serial) {
    if(ajax_inprogress_single) {
        clearTimeout(periodical_focus);
        periodical_focus = setTimeout(refreshSingle, 2000, serial);
        return;
    }
  
    ajax_inprogress_single = true;

    $("#stText").text("loading |");
  
    var data_url = "https://api.v2.sondehub.org/sonde/" + encodeURIComponent(serial);
  
    ajax_positions_single = $.ajax({
      type: "GET",
      url: data_url,
      dataType: "json",
      success: function(data, textStatus) {
        response = formatData(data, false);
        update(response);
        $("#stText").text("");
      },
      error: function() {
        $("#stText").text("error |");
        ajax_inprogress_single = false;
        document.getElementById("timeperiod").disabled = false;
      },
      complete: function(request, textStatus) {
          clearTimeout(periodical_focus);
          ajax_inprogress_single = false;
          document.getElementById("timeperiod").disabled = false;
      }
    });
}

function refreshSingleNew(serial) {
    if(ajax_inprogress_single_new) {
        clearTimeout(periodical_focus_new);
        periodical_focus_new = setTimeout(refreshSingle, 2000, serial);
        return;
    }

    if (serial.includes("_chase")) {
        if (!offline.get("opt_hide_chase")) {
            refreshNewReceivers(false, serial.replace("_chase", ""));
        }
        return;
    }
  
    ajax_inprogress_single_new = true;
  
    var data_str = "duration=3d&serial=" + serial;
  
    ajax_positions_single_new = $.ajax({
      type: "GET",
      url: newdata_url,
      data: data_str,
      dataType: "json",
      success: function(data, textStatus) {
        response = formatData(data, false);
        update(response);
      },
      error: function() {
        ajax_inprogress_single_new = false;
      },
      complete: function(request, textStatus) {
          clearTimeout(periodical_focus_new);
          ajax_inprogress_single_new = false;
      }
    });
}

function refreshPatreons() {

    patreon_url = "https://api.v2.sondehub.org/pledges";

    $.ajax({
        type: "GET",
        url: patreon_url,
        dataType: "json",
        success: function(response, textStatus) {
            pledges = response;
            pledges_loaded = true;
        },
        error: function() {
            pledges_loaded = true;
        },
        complete: function(request, textStatus) {
            refreshReceivers();
        }
    });
}

function refreshReceivers() {
    if(offline.get('opt_hide_receivers')) {
        if (!offline.get("opt_hide_chase")) {
            refreshNewReceivers(true);
        }
    } else {
        data_str = "duration=1d";

        $.ajax({
            type: "GET",
            url: receivers_url,
            data: data_str,
            dataType: "json",
            success: function(response, textStatus) {
                updateReceivers(response);
            },
            complete: function(request, textStatus) {
                if (!offline.get("opt_hide_chase")) {
                    refreshNewReceivers(true);
                }
            }
        });
    }
}

function refreshNewReceivers(initial, serial) {
    if (typeof serial !== 'undefined') {
        data_str = "duration=3d&uploader_callsign=" + serial;
    }
    else if (initial == true) {
        var mode = wvar.mode.toLowerCase();
        mode = (mode == "position") ? "latest" : mode.replace(/ /g,"");
        data_str = "duration=" + mode;
    } else {
        data_str = "duration=1m";
    }


    $.ajax({
        type: "GET",
        url: receivers_url,
        data: data_str,
        dataType: "json",
        success: function(response, textStatus) {
            if (!offline.get("opt_hide_chase")) {
                updateChase(response);
            }
        },
        complete: function(request, textStatus) {
            if (typeof serial === 'undefined') {
                periodical_listeners = setTimeout(function() {refreshNewReceivers(false)}, 30 * 1000);
            }
        }
    });
}

function refreshRecoveries() {

    $.ajax({
        type: "GET",
        url: recovered_sondes_url,
        //data: "last=0",
        dataType: "json",
        success: function(response, textStatus) {
            if(offline.get('opt_hide_recoveries')) {
                updateRecoveryPane(response);
                updateLeaderboardPane(response);
            } else {
                updateRecoveryPane(response);
                updateLeaderboardPane(response);
                updateRecoveries(response);
            }
        },
        error: function() {
            updateRecoveryPane([]);
            updateLeaderboardPane([]);
        }
    });

}

var ajax_predictions = null;

function refreshPredictions() {
    if(ajax_inprogress) {
      clearTimeout(periodical_predictions);
      periodical_predictions = setTimeout(refreshPredictions, 1000);
      return;
    }

    ajax_predictions = $.ajax({
        type: "GET",
        url: predictions_url + encodeURIComponent(wvar.query),
        data: "",
        dataType: "json",
        success: function(response, textStatus) {
            updatePredictions(response);
        },
        error: function() {
        },
        complete: function(request, textStatus) {
            clearTimeout(periodical_predictions);
            periodical_predictions = setTimeout(refreshPredictions, 60 * 1000);
        }
    });

    var data_str = "duration=" + wvar.mode;

    ajax_predictions = $.ajax({
        type: "GET",
        url: launch_predictions_url,
        data: data_str,
        dataType: "json",
        success: function(response, textStatus) {
            updateLaunchPredictions(response);
        },
        error: function() {
        },
        complete: function(request, textStatus) {
        }
    });
}

var periodical, periodical_focus, periodical_focus_new, periodical_receivers, periodical_listeners;
var periodical_predictions = null;
var timer_seconds = 5;

function startAjax() {

    document.getElementById("timeperiod").disabled = true;

    // prevent insane clicks to start numerous requests
    clearTimeout(periodical);
    clearTimeout(periodical_focus);
    clearTimeout(periodical_focus_new);
    clearTimeout(periodical_receivers);
    clearTimeout(periodical_predictions);

    //periodical = setInterval(refresh, timer_seconds * 1000);
    refresh();

    refreshPatreons();
    refreshRecoveries();
}

function stopAjax() {
    // stop our timed ajax
    clearTimeout(periodical);
    periodical = null;
    ajax_inprogress = false;
    if(ajax_positions) ajax_positions.abort();

    clearTimeout(periodical_focus);
    periodical_focus = null;
    ajax_inprogress_single = false;
    if(ajax_positions_single) ajax_positions_single.abort();

    clearTimeout(periodical_focus_new);
    periodical_focus_new = null;
    ajax_inprogress_single_new = false;
    if(ajax_positions_single_new) ajax_positions_single_new.abort();

    clearTimeout(periodical_predictions);
    periodical_predictions = null;
    if(ajax_predictions) ajax_predictions.abort();
}

var currentPosition = null;

function updateCurrentPosition(lat, lon) {
    var latlng = new L.LatLng(lat, lon);

    if(!currentPosition) {
        currentPosition = {marker: null, lat: lat, lon: lon};
        youIcon = new L.icon({
            iconUrl: "img/marker-you.png",
            iconSize: [21, 50],
            iconAnchor: [10, 50]
        });
        currentPosition.marker = new L.Marker(latlng, {
            icon: youIcon,
            title: "Your current position",
            zIndexOffset: Z_ME, 
        });
    } else {
      currentPosition.lat = lat;
      currentPosition.lon = lon;
      currentPosition.marker.addTo(map);
      currentPosition.marker.setLatLng(latlng);
    }
}

function updateReceiverMarker(receiver) {
  var latlng = new L.LatLng(receiver.lat, receiver.lon);

  // init a marker if the receiver doesn't already have one
  if(!receiver.marker) {

    if (pledges.hasOwnProperty(receiver.name)) {
        if (pledges[receiver.name].icon == "bronze") {
            receiver.marker = new L.CircleMarker(latlng, {
                radius: 8,
                fillOpacity: 0.6,
                color: "#CD7F32",
            });
            receiver.infobox = new L.popup({ autoClose: false, closeOnClick: false, className: "bronze" }).setContent(receiver.description);
        } else if (pledges[receiver.name].icon == "silver") {
            receiver.marker = new L.CircleMarker(latlng, {
                radius: 8,
                fillOpacity: 0.6,
                color: "#C0C0C0",
            });
            receiver.infobox = new L.popup({ autoClose: false, closeOnClick: false, className: "silver" }).setContent(receiver.description);
        } else {
            receiver.marker = new L.CircleMarker(latlng, {
                radius: 8,
                fillOpacity: 0.6,
                color: "#FFD700",
            });
            receiver.infobox = new L.popup({ autoClose: false, closeOnClick: false, className: "gold" }).setContent(receiver.description);
        };
    } else {
        receiver.marker = new L.CircleMarker(latlng, {
            radius: 6,
            fillOpacity: 0.6,
            color: "#008000",
        });
        receiver.infobox = new L.popup({ autoClose: false, closeOnClick: false }).setContent(receiver.description);
    }
    
    receiver.marker.bindPopup(receiver.infobox);

    receiverCanvas.addLayer(receiver.marker);
  } else {
    receiver.marker.setLatLng(latlng);
    receiver.infobox = new L.popup({ autoClose: false, closeOnClick: false }).setContent(receiver.description);
    receiver.marker.bindPopup(receiver.infobox);
  }
}

function deleteChase(r) {
    var callsign;
    for(callsign in vehicles) {
        if (vehicles[callsign].vehicle_type == "car") {
            vehicles[callsign].kill();
        }
    }
    car_index = 0;
}

function updateChase(r) {
    if(!r) return;

    var response = {};
    response.positions = {};
    var dataTemp = [];

    for (var i in r) {
        if (r.hasOwnProperty(i)) {
            for (var s in r[i]) {
                if (r[i].hasOwnProperty(s)) {
                    last = r[i][s]
                    if(last.mobile == true) {
                        var dataTempEntry = {};
                        dataTempEntry.callsign = last.software_name + "-" + last.software_version;
                        dataTempEntry.gps_alt = last.uploader_position[2];
                        dataTempEntry.gps_lat = last.uploader_position[0];
                        dataTempEntry.gps_lon = last.uploader_position[1];
                        var date = new Date(last.ts)
                        var userTimezoneOffset = date.getTimezoneOffset() * 60000;
                        var time = new Date(date.getTime() - userTimezoneOffset).toISOString();
                        dataTempEntry.gps_time = time;
                        dataTempEntry.server_time = time;
                        dataTempEntry.vehicle = last.uploader_callsign + "_chase";
                        dataTempEntry.position_id = last.uploader_callsign + "-" + time;
                        dataTemp.push(dataTempEntry);
                    }
                }
            }
        }
    }
    response.positions.position = dataTemp;
    response.fetch_timestamp = Date.now();
    if (response.positions.position.length > 0) {
        update(response);
    }
}

function showRecoveredMap(serial) {

    $("header .search input[type='text']").val(serial);

    wvar.query = serial;
    stopFollow();
    zoomed_in = false;
    wvar.zoom = true;

    clean_refresh(wvar.mode, true, true);
};

function updateReceivers(r) {
    if(!r) return;
    ls_receivers = true;

    for (var i in r) {
        if (r.hasOwnProperty(i)) {
            var last = r[i][Object.keys(r[i])[Object.keys(r[i]).length - 1]];
            if(last.mobile === undefined || last.mobile == false) {
                var lat = parseFloat(last.uploader_position[0]);
                var lon = parseFloat(last.uploader_position[1]);
                var alt = parseFloat(last.uploader_position[2]);

                if(lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;

                var age = new Date(last.ts);

                var r_index = $.inArray(last.uploader_callsign, receiver_names);

                if(r_index == -1) {
                    receiver_names.push(last.uploader_callsign);
                    r_index = receiver_names.length - 1;
                    receivers[r_index] = {marker: null, infobox: null};
                }

                var receiver = receivers[r_index];
                receiver.name = last.uploader_callsign;
                receiver.software = last.software_name;
                receiver.version = last.software_version;
                receiver.lat = lat;
                receiver.lon = lon;
                receiver.alt = alt;
                receiver.age = age.toISOString();
                receiver.description = "<font style='font-size: 13px'>"+receiver.name+"</font><br/><font size='-2'><BR><B>Radio: </B>" + last.software_name + "-" + last.software_version
                + "<BR><B>Antenna: </B>" + last.uploader_antenna + "<BR><B>Last Contact: </B>" + age.toISOString() + "<BR></font>";
                receiver.fresh = true;

                updateReceiverMarker(receiver);
            }
        }
    }

    // clear old receivers
    i = 0;
    for(; i < receivers.length;) {
        var e = receivers[i];
        if(e.fresh) {
            e.fresh = false;
            i++;
        }
        else {
            map.removeLayer(e.infobox);
            receiverCanvas.removeLayer(e.marker);

            // remove from arrays
            receivers.splice(i,1);
            receiver_names.splice(i,1);
        }
    }

    if(follow_vehicle !== null) drawLOSPaths(follow_vehicle);
}

function updateRecoveryMarker(recovery) {
    var latlng = new L.LatLng(recovery.lat, recovery.lon);
  
    // init a marker if the recovered payload doesn't already have one
    if(!recovery.marker) {
      if(recovery.recovered == true){
        _recovery_icon = host_url + markers_url + "payload-recovered.png";
      }else{
        _recovery_icon = host_url + markers_url + "payload-not-recovered.png";
      }

      recoveryIcon = new L.icon({
        iconUrl: _recovery_icon,
        iconSize: [17, 19],
        iconAnchor: [8, 14],
        popupAnchor: [0, -19]
      });

      recovery.marker = new L.Marker(latlng, {
        icon: recoveryIcon,
        title: recovery.serial,
        zIndexOffset: Z_RECOVERY, 
      }).addTo(map);

      recovery.infobox = new L.popup({ autoClose: false, closeOnClick: false }).setContent(recovery.description);

      recovery.marker.bindPopup(recovery.infobox);

      div = document.createElement('div');

      html = "<div style='line-height:16px;position:relative;'>";
      html += "<div><b>"+recovery.serial+(recovery.recovered ? " Recovered" : " Not Recovered")+"</b></div>";
      html += "<hr style='margin:5px 0px'>";
      html += "<div style='margin-bottom:5px;'><b><i class='icon-location'></i>&nbsp;</b>"+roundNumber(recovery.lat, 5) + ',&nbsp;' + roundNumber(recovery.lon, 5)+"</div>";

      var imp = offline.get('opt_imperial');
      var text_alt      = Number((imp) ? Math.floor(3.2808399 * parseInt(recovery.alt)) : parseInt(recovery.alt)).toLocaleString("us");
      text_alt     += "&nbsp;" + ((imp) ? 'ft':'m');

      html += "<div><b>Time:&nbsp;</b>"+formatDate(stringToDateUTC(recovery.datetime))+"</div>";
      html += "<div><b>Reported by:&nbsp;</b>"+recovery.recovered_by+"</div>";
      html += "<div><b>Notes:&nbsp;</b>"+$('<div>').text(recovery.description).html()+"</div>";
      html += "<div><b>Flight Path:&nbsp;</b><a href=\"javascript:showRecoveredMap('" + recovery.serial + "')\">"+recovery.serial+"</a></div>";

      html += "</div>";

      div.innerHTML = html;

      recovery.infobox.setContent(div);

    } else {
      recovery.marker.setLatLng(latlng);
    }
  }
  
  function updateRecoveries(r) {

      if(!r) return;
      ls_recoveries = true;

      var dateNow = Date.now();
        
  
      var i = 0, ii = r.length;
      for(; i < ii; i++) {
          var date = Date.parse(r[i].datetime);
          if (((dateNow - date) / 86400000) < 3) {
            var lat = parseFloat(r[i].lat);
            var lon = parseFloat(r[i].lon);
    
            if(lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;
    
            var r_index = $.inArray(r[i].serial, recovery_names);
    
            if(r_index == -1) {
                recovery_names.push(r[i].serial);
                r_index = recovery_names.length - 1;
                recoveries[r_index] = {marker: null, infobox: null};
            }
    
            var recovery = recoveries[r_index];
            recovery.serial = r[i].serial;
            recovery.lat = lat;
            recovery.lon = lon;
            recovery.recovered_by = r[i].recovered_by;
            recovery.alt = parseFloat(r[i].alt);
            recovery.recovered = r[i].recovered;
            recovery.description = r[i].description;
            recovery.datetime = r[i].datetime;
            recovery.fresh = true;
    
            updateRecoveryMarker(recovery);
        }
      }
  
      // clear old recovery markers
      i = 0;
      for(; i < recoveries.length;) {
          var e = recoveries[i];
          if(e.fresh) {
              e.fresh = false;
              i++;
          }
          else {
              // close box, remove event handle, and remove marker
              //e.infobox.close();
              //e.infobox_handle.remove();
              map.removeLayer(e.marker);
  
              // remove from arrays
              recoveries.splice(i,1);
              recovery_names.splice(i,1);
          }
      }
  
  }

function updateRecoveryPane(r){
    if(!r) return;
    ls_recoveries = true;

    html = "";

    var dateNow = Date.now();

    var i = 0, ii = r.length;
    for(; i < ii; i++) {
        var date = Date.parse(r[i].datetime);
        if (((dateNow - date) / 86400000) < 3) {
            var lat = parseFloat(r[i].lat);
            var lon = parseFloat(r[i].lon);
            var alt = parseFloat(r[i].alt);

            if(lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;

            var r_index = $.inArray(r[i].serial, recovery_names);

            if(r_index == -1) {
                recovery_names.push(r[i].serial);
                r_index = recovery_names.length - 1;
                recoveries[r_index] = {marker: null, infobox: null};
            }

            html += "<div style='line-height:16px;position:relative;'>";
            html += "<div><b><u>"+r[i].serial+(r[i].recovered ? " Recovered by " : " Not Recovered by ")+r[i].recovered_by+"</u></b></div>";
            html += "<div style='margin-bottom:5px;'><b><button style='margin-bottom:0px;' onclick='panToRecovery(\"" + r[i].serial + "\")'><i class='icon-location'></i></button>&nbsp;</b>"+roundNumber(lat, 5) + ',&nbsp;' + roundNumber(lon, 5)+"</div>";
    
            var imp = offline.get('opt_imperial');
            var text_alt      = Number((imp) ? Math.floor(3.2808399 * parseInt(alt)) : parseInt(alt)).toLocaleString("us");
            text_alt     += "&nbsp;" + ((imp) ? 'ft':'m');
    
            html += "<div><b>Time:&nbsp;</b>"+formatDate(stringToDateUTC(r[i].datetime))+"</div>";
            html += "<div><b>Reported by:&nbsp;</b>"+r[i].recovered_by+"</div>";
            html += "<div><b>Notes:&nbsp;</b>"+$('<div>').text(r[i].description).html()+"</div>";
            html += "<div><b>Flight Path:&nbsp;</b><a href=\"javascript:showRecoveredMap('" + r[i].serial + "')\">"+r[i].serial+"</a></div>";
            html += "<hr style='margin:5px 0px'>";
            html += "</div>";
        }
    }

    if (html == "") {
        html = "<div>No recent recoveries :-(</div>"
    }

    $("#recovery-list").html(html);

}

function updateLeaderboardPane(r){
    if(!r) return;

    html = "";
    var leaderboard = {};
    var recovered = 0;

    var i = 0, ii = r.length;
    for(; i < ii; i++) {
        if (r[i].recovered) {
            recovered+=1;
            if (leaderboard.hasOwnProperty(r[i].recovered_by)) {
                leaderboard[r[i].recovered_by] = leaderboard[r[i].recovered_by] + 1;
            } else {
                leaderboard[r[i].recovered_by] = 1
            }
        }
    }

    var sortable = [];
    for (var score in leaderboard) {
        sortable.push([score, leaderboard[score]]);
    }

    sortable.sort(function(a, b) {
        return b[1] - a[1];
    });

    var list = sortable.slice(0,5);

    html += "<div><b>Total sondes recovered: " + recovered + "/" + r.length + "</b></div>";
    html += "<div><b>Total hunters: " + sortable.length + "</b></div><br>";
    html += "<div><b>Leaderboard: </b></div>";

    for (var i = 0; i < list.length; i++) {
        html += "<div><b>" + (parseInt(i)+1) + ". </b>" + list[i][0] + " - " + list[i][1] + "</div>";
    }

    if (r.length == 0) {
        html = "<div>No recent recoveries :-(</div>"
    }

    $("#leaderboard-list").html(html);

}

function updateLaunchPredictions(r) {
    for (serial in r) {
        prediction = r[serial];
        if(vehicles.hasOwnProperty(serial)) {
            vehicle = vehicles[serial];
            if (vehicle.prediction_launch == null) {
                vehicle.prediction_launch = prediction;
                drawLaunchPrediction(serial);
            }
        }
    }
}

function updatePredictions(r) {
    if(!r) return;
    ls_pred = true;

    var i = 0, ii = r.length;
    for(; i < ii; i++) {
        var vcallsign = r[i].vehicle;

        if(vcallsign == "XX") continue;

		if(vehicles.hasOwnProperty(vcallsign)) {
            var vehicle = vehicles[vcallsign];

            if(vehicle.marker.mode == "landed") {
                removePrediction(vcallsign);
                continue;
            }

			if(vehicle.prediction && vehicle.prediction.time == r[i].time) {
				continue;
			}
            vehicle.prediction = r[i];
            if(parseInt(vehicle.prediction.landed) === 0) {
                vehicle.prediction.data = $.parseJSON(r[i].data);
                redrawPrediction(vcallsign);
            } else {
                removePrediction(vcallsign);
            }
	    }
	}
}

function refreshUI() {
    for(var vcallsign in vehicles) {
        updateVehicleInfo(vcallsign, vehicles[vcallsign].curr_position);
    }

    if(follow_vehicle !== null) update_lookangles(follow_vehicle);
}


function hideHorizonRings(){
    for(var vcallsign in vehicles) {
        if(vehicles[vcallsign].vehicle_type == "balloon"){
            map.removeLayer(vehicles[vcallsign].horizon_circle);
            map.removeLayer(vehicles[vcallsign].subhorizon_circle);
            map.removeLayer(vehicles[vcallsign].horizon_circle_title);
            map.removeLayer(vehicles[vcallsign].subhorizon_circle_title);
        }
    }
}
function showHorizonRings(){
    for(var vcallsign in vehicles) {
        if(vehicles[vcallsign].vehicle_type == "balloon"){
            map.addLayer(vehicles[vcallsign].horizon_circle);
            map.addLayer(vehicles[vcallsign].subhorizon_circle);
            map.addLayer(vehicles[vcallsign].horizon_circle_title);
            map.addLayer(vehicles[vcallsign].subhorizon_circle_title);
        }
    }
}

function hideTitles(){
    for(var vcallsign in vehicles) {
        if(vehicles[vcallsign].vehicle_type == "balloon" || vehicles[vcallsign].vehicle_type == "car"){
            vehicles[vcallsign].title.unbindTooltip();
        }
    }
}
function showTitles(){
    for(var vcallsign in vehicles) {
        if(vehicles[vcallsign].vehicle_type == "balloon" || vehicles[vcallsign].vehicle_type == "car"){
            vehicles[vcallsign].title = vehicles[vcallsign].marker.bindTooltip(vehicles[vcallsign]["marker"]["options"]["title"], {direction: 'center', permanent: 'true', className: 'serialtooltip'});
        }
    }
}

var ssdv = {};
var status = "";
var bs_idx = 0;

function update(response) {
    if (response === null ||
        !response.positions ||
        !response.positions.position ||
        !response.positions.position.length) {

        // if no vehicles are found, this will remove the spinner and put a friendly message
        $("#main .empty").html("<span>No vehicles :(</span>");

        return;
    }

    if (sondePrefix.indexOf(wvar.query) > -1) {
        for (var i = response.positions.position.length - 1; i >= 0; i--) {
            try {
                if (!response.positions.position[i].type.includes(wvar.query)) {
                    response.positions.position.splice(i, 1)
                }
            } catch (e) {}
        }
    }

    ssdv = (!response.ssdv) ? {} : response.ssdv;

    // create a dummy response object for postions
    var lastPositions = { positions: { position: [] } };
    var ctx_init = {
        positions: response.positions.position,
        lastPositions: lastPositions,
        lastPPointer: lastPositions.positions.position,
        idx: 0,
        max: response.positions.position.length,
        step: function(ctx) {
            var draw_idx = -1;

            var i = ctx.idx;
            var max = i + 5000;
            max = (max >= ctx.max) ? ctx.max : max;

            for (; i < max ; i++) {
                var row = ctx.positions[i];

                // set the position based on the last record (oldest) returned from the server. Only provide minute accuracy to allow better hit rate with cloudfront
                this_position_id = new Date(row.gps_time);

                if (new Date(position_id) < this_position_id || position_id == 0){
                    if (new Date() > this_position_id) {
                        this_position_id.setSeconds(0)
                        this_position_id.setMilliseconds(0)
                        position_id = this_position_id.toISOString()
                    }
                }

                if (!row.picture) {
                    addPosition(row);
                    got_positions = true;
                }
            }

            ctx.idx = max;

            if(ctx.idx < ctx.max) {
              ctx.step(ctx); 
            } else {
              ctx.list = Object.keys(vehicles);
              ctx.draw(ctx);
            }
        },
        draw: function(ctx) {
            if(ctx.list.length < 1) {
                ctx.end(ctx); 
              return;
            }

            // pop a callsign from the top
            var vcallsign = ctx.list.shift();
            var vehicle = vehicles[vcallsign];

            if(vehicle === undefined) return;

            if(vehicle.updated) {
                updatePolyline(vcallsign);
                
                updateVehicleInfo(vcallsign, vehicle.curr_position);

                // remember last position for each vehicle
                ctx.lastPPointer.push(vehicle.curr_position);

                if(listScroll) listScroll.refresh();
                if(zoomed_in && follow_vehicle == vcallsign && !manual_pan) panTo(follow_vehicle);
                if (follow_vehicle == vcallsign) {
                    update_lookangles(follow_vehicle);
                    drawLOSPaths(vcallsign);
                }
            }

            // step to the next callsign
            ctx.draw(ctx);
        },
        end: function(ctx) {

          // update graph is current vehicles is followed
          if(follow_vehicle !== null &&
             vehicles.hasOwnProperty(follow_vehicle) &&
             vehicles[follow_vehicle].graph_data_updated) updateGraph(follow_vehicle, false);

          if (got_positions && !zoomed_in && Object.keys(vehicles).length) {
            if (vehicles.hasOwnProperty(wvar.query) && wvar.query !== "") {
                zoom_on_payload();
            }
            // TODO: Zoom to geolocation position

          }

          if(periodical_predictions === null) refreshPredictions();
        }
    };

    ctx_init.step(ctx_init);
}

function zoom_on_payload() {

    // find a the first balloon
    var target = null, vcallsign = null, fallback = false;

    if(wvar.focus !== "" && vehicles.hasOwnProperty(wvar.focus)) {
        target = vehicles[wvar.focus];
        vcallsign = wvar.focus;
    } else if(wvar.focus === "" && wvar.zoom) {
        fallback = true;
        for(var k in vehicles) {
            if(vehicles[k].vehicle_type == "balloon") {
                vcallsign = k;
                target = vehicles[k];
                break;
            }
        }
    } else {
        zoomed_in = true;
        return;
    }

    if(fallback) {
        if(target) {
            // find the bounds of the ballons first and last positions
            var bounds = new L.LatLngBounds();
            bounds.extend(target.positions[0]);
            bounds.extend(target.positions[target.positions.length - 1]);

            // fit the map to those bounds
            map.fitBounds(bounds);

            // limit the zoom level to 11
            if(map.getZoom() > 11) map.setZoom(11);
        }

        // this condition is true, when we there is no focus vehicle specified, or balloon in list
        // we then fallback to zooming in onto the first vehicle, if there is one
        if(target === null) {
            var list = Object.keys(vehicles);

            // if there are no vehicles, return, else zoom in on the first one
            if(list.length === 0) return;
            else {
                vcallsign = list[0];
                target = vehicles[vcallsign];
            }
        }
    }

    // pan and follow the vehicle
    followVehicle(vcallsign, !wvar.zoom, true);

    // expand list element
    $('.vehicle'+target.uuid).addClass('active');

    // scroll list to the expanded element
    listScroll.refresh();
    listScroll.scrollToElement('.portrait .vehicle'+target.uuid);

    zoomed_in = true;
}

function isInt(n) {
   return n % 1 === 0;
}
