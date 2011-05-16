// P6 Beat Scrobbler user script
// version 0.1
// 2011-05-05
// Copyright (c) 2011, Anders Hellerup Madsen
// Released under the MIT license
// http://www.opensource.org/licenses/mit-license.php
//
// --------------------------------------------------------------------
//
// This is a Greasemonkey user script.
//
// To install, you need Greasemonkey: https://addons.mozilla.org/en-US/firefox/addon/748
// Then restart Firefox and revisit this script.
// Under Tools, there will be a new menu item to "Install User Script".
// Accept the default configuration and install.
//
// To uninstall, go to Tools/Manage User Scripts,
// select "P6 Beat Scrobbler", and click Uninstall.
//
// --------------------------------------------------------------------
//
//
// ==UserScript==
// @name          P6 Beat Scrobbler
// @namespace     http://github.com/ahem/p6beat-scrobbler
// @description   A greasemonkey script to scrobble DR P6 Beat, a danish radiostation
// @include       http://www.dr.dk/P6Beat/*
// ==/UserScript==

(function () {

    var main_timer;
    var currentSong;
    var lastScrobbled;
    var scrobble_timer;


    var api_key = "310767913594812c7d47801681c6bd7e";
    var api_secret = "4e196e6b051978efe9564fa66699a66d";

    /**
    *
    *  MD5 (Message-Digest Algorithm)
    *  http://www.webtoolkit.info/
    *
    **/
    var MD5 = function (string) {
    
        function RotateLeft(lValue, iShiftBits) {
            return (lValue<<iShiftBits) | (lValue>>>(32-iShiftBits));
        }
    
        function AddUnsigned(lX,lY) {
            var lX4,lY4,lX8,lY8,lResult;
            lX8 = (lX & 0x80000000);
            lY8 = (lY & 0x80000000);
            lX4 = (lX & 0x40000000);
            lY4 = (lY & 0x40000000);
            lResult = (lX & 0x3FFFFFFF)+(lY & 0x3FFFFFFF);
            if (lX4 & lY4) {
                return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
            }
            if (lX4 | lY4) {
                if (lResult & 0x40000000) {
                    return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
                } else {
                    return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
                }
            } else {
                return (lResult ^ lX8 ^ lY8);
            }
        }
    
        function F(x,y,z) { return (x & y) | ((~x) & z); }
        function G(x,y,z) { return (x & z) | (y & (~z)); }
        function H(x,y,z) { return (x ^ y ^ z); }
        function I(x,y,z) { return (y ^ (x | (~z))); }
    
        function FF(a,b,c,d,x,s,ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        };
    
        function GG(a,b,c,d,x,s,ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        };
    
        function HH(a,b,c,d,x,s,ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        };
    
        function II(a,b,c,d,x,s,ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        };
    
        function ConvertToWordArray(string) {
            var lWordCount;
            var lMessageLength = string.length;
            var lNumberOfWords_temp1=lMessageLength + 8;
            var lNumberOfWords_temp2=(lNumberOfWords_temp1-(lNumberOfWords_temp1 % 64))/64;
            var lNumberOfWords = (lNumberOfWords_temp2+1)*16;
            var lWordArray=Array(lNumberOfWords-1);
            var lBytePosition = 0;
            var lByteCount = 0;
            while ( lByteCount < lMessageLength ) {
                lWordCount = (lByteCount-(lByteCount % 4))/4;
                lBytePosition = (lByteCount % 4)*8;
                lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount)<<lBytePosition));
                lByteCount++;
            }
            lWordCount = (lByteCount-(lByteCount % 4))/4;
            lBytePosition = (lByteCount % 4)*8;
            lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80<<lBytePosition);
            lWordArray[lNumberOfWords-2] = lMessageLength<<3;
            lWordArray[lNumberOfWords-1] = lMessageLength>>>29;
            return lWordArray;
        };
    
        function WordToHex(lValue) {
            var WordToHexValue="",WordToHexValue_temp="",lByte,lCount;
            for (lCount = 0;lCount<=3;lCount++) {
                lByte = (lValue>>>(lCount*8)) & 255;
                WordToHexValue_temp = "0" + lByte.toString(16);
                WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length-2,2);
            }
            return WordToHexValue;
        };
    
        function Utf8Encode(string) {
            string = string.replace(/\r\n/g,"\n");
            var utftext = "";
    
            for (var n = 0; n < string.length; n++) {
    
                var c = string.charCodeAt(n);
    
                if (c < 128) {
                    utftext += String.fromCharCode(c);
                }
                else if((c > 127) && (c < 2048)) {
                    utftext += String.fromCharCode((c >> 6) | 192);
                    utftext += String.fromCharCode((c & 63) | 128);
                }
                else {
                    utftext += String.fromCharCode((c >> 12) | 224);
                    utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                    utftext += String.fromCharCode((c & 63) | 128);
                }
    
            }
    
            return utftext;
        };
    
        var x=Array();
        var k,AA,BB,CC,DD,a,b,c,d;
        var S11=7, S12=12, S13=17, S14=22;
        var S21=5, S22=9 , S23=14, S24=20;
        var S31=4, S32=11, S33=16, S34=23;
        var S41=6, S42=10, S43=15, S44=21;
    
        string = Utf8Encode(string);
    
        x = ConvertToWordArray(string);
    
        a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;
    
        for (k=0;k<x.length;k+=16) {
            AA=a; BB=b; CC=c; DD=d;
            a=FF(a,b,c,d,x[k+0], S11,0xD76AA478);
            d=FF(d,a,b,c,x[k+1], S12,0xE8C7B756);
            c=FF(c,d,a,b,x[k+2], S13,0x242070DB);
            b=FF(b,c,d,a,x[k+3], S14,0xC1BDCEEE);
            a=FF(a,b,c,d,x[k+4], S11,0xF57C0FAF);
            d=FF(d,a,b,c,x[k+5], S12,0x4787C62A);
            c=FF(c,d,a,b,x[k+6], S13,0xA8304613);
            b=FF(b,c,d,a,x[k+7], S14,0xFD469501);
            a=FF(a,b,c,d,x[k+8], S11,0x698098D8);
            d=FF(d,a,b,c,x[k+9], S12,0x8B44F7AF);
            c=FF(c,d,a,b,x[k+10],S13,0xFFFF5BB1);
            b=FF(b,c,d,a,x[k+11],S14,0x895CD7BE);
            a=FF(a,b,c,d,x[k+12],S11,0x6B901122);
            d=FF(d,a,b,c,x[k+13],S12,0xFD987193);
            c=FF(c,d,a,b,x[k+14],S13,0xA679438E);
            b=FF(b,c,d,a,x[k+15],S14,0x49B40821);
            a=GG(a,b,c,d,x[k+1], S21,0xF61E2562);
            d=GG(d,a,b,c,x[k+6], S22,0xC040B340);
            c=GG(c,d,a,b,x[k+11],S23,0x265E5A51);
            b=GG(b,c,d,a,x[k+0], S24,0xE9B6C7AA);
            a=GG(a,b,c,d,x[k+5], S21,0xD62F105D);
            d=GG(d,a,b,c,x[k+10],S22,0x2441453);
            c=GG(c,d,a,b,x[k+15],S23,0xD8A1E681);
            b=GG(b,c,d,a,x[k+4], S24,0xE7D3FBC8);
            a=GG(a,b,c,d,x[k+9], S21,0x21E1CDE6);
            d=GG(d,a,b,c,x[k+14],S22,0xC33707D6);
            c=GG(c,d,a,b,x[k+3], S23,0xF4D50D87);
            b=GG(b,c,d,a,x[k+8], S24,0x455A14ED);
            a=GG(a,b,c,d,x[k+13],S21,0xA9E3E905);
            d=GG(d,a,b,c,x[k+2], S22,0xFCEFA3F8);
            c=GG(c,d,a,b,x[k+7], S23,0x676F02D9);
            b=GG(b,c,d,a,x[k+12],S24,0x8D2A4C8A);
            a=HH(a,b,c,d,x[k+5], S31,0xFFFA3942);
            d=HH(d,a,b,c,x[k+8], S32,0x8771F681);
            c=HH(c,d,a,b,x[k+11],S33,0x6D9D6122);
            b=HH(b,c,d,a,x[k+14],S34,0xFDE5380C);
            a=HH(a,b,c,d,x[k+1], S31,0xA4BEEA44);
            d=HH(d,a,b,c,x[k+4], S32,0x4BDECFA9);
            c=HH(c,d,a,b,x[k+7], S33,0xF6BB4B60);
            b=HH(b,c,d,a,x[k+10],S34,0xBEBFBC70);
            a=HH(a,b,c,d,x[k+13],S31,0x289B7EC6);
            d=HH(d,a,b,c,x[k+0], S32,0xEAA127FA);
            c=HH(c,d,a,b,x[k+3], S33,0xD4EF3085);
            b=HH(b,c,d,a,x[k+6], S34,0x4881D05);
            a=HH(a,b,c,d,x[k+9], S31,0xD9D4D039);
            d=HH(d,a,b,c,x[k+12],S32,0xE6DB99E5);
            c=HH(c,d,a,b,x[k+15],S33,0x1FA27CF8);
            b=HH(b,c,d,a,x[k+2], S34,0xC4AC5665);
            a=II(a,b,c,d,x[k+0], S41,0xF4292244);
            d=II(d,a,b,c,x[k+7], S42,0x432AFF97);
            c=II(c,d,a,b,x[k+14],S43,0xAB9423A7);
            b=II(b,c,d,a,x[k+5], S44,0xFC93A039);
            a=II(a,b,c,d,x[k+12],S41,0x655B59C3);
            d=II(d,a,b,c,x[k+3], S42,0x8F0CCC92);
            c=II(c,d,a,b,x[k+10],S43,0xFFEFF47D);
            b=II(b,c,d,a,x[k+1], S44,0x85845DD1);
            a=II(a,b,c,d,x[k+8], S41,0x6FA87E4F);
            d=II(d,a,b,c,x[k+15],S42,0xFE2CE6E0);
            c=II(c,d,a,b,x[k+6], S43,0xA3014314);
            b=II(b,c,d,a,x[k+13],S44,0x4E0811A1);
            a=II(a,b,c,d,x[k+4], S41,0xF7537E82);
            d=II(d,a,b,c,x[k+11],S42,0xBD3AF235);
            c=II(c,d,a,b,x[k+2], S43,0x2AD7D2BB);
            b=II(b,c,d,a,x[k+9], S44,0xEB86D391);
            a=AddUnsigned(a,AA);
            b=AddUnsigned(b,BB);
            c=AddUnsigned(c,CC);
            d=AddUnsigned(d,DD);
        }
    
        var temp = WordToHex(a)+WordToHex(b)+WordToHex(c)+WordToHex(d);
    
        return temp.toLowerCase();
    };

    function create_elements(session) {

        var container = document.createElement('aside');
        container.setAttribute('class', 'col medium spot');
        container.innerHTML = '<p><span id="gm-p6-lastfm-status" style="display:block;">Logget ind som ' + session.name + '</span></p>';

        var list = document.getElementsByClassName('aside-col');
        if (list.length) {
            list[0].insertBefore(container, list[0].children[0]);
        }

        return container;
    }

    function setStatus(msg) {
        document.getElementById('gm-p6-lastfm-status').textContent = msg;
    }

    function clearStatus() {
        setStatus('det sker ikke noget nu...');
    }

    function qstr(obj) {
        var str = [];
        for (var p in obj) {
            if (obj.hasOwnProperty(p)) {
                str.push(p + "=" + encodeURIComponent(obj[p]));
            }
        }
        return str.join("&");
    }

    function make_sig(data) {
        var keys = [];
        for (var k in data) {
            if (data.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        var s = keys.sort().map(function (k) { return k + data[k]; }).join('');
        return MD5(s + api_secret);
    }

    function lastfm_get(data, callback) {
        data.api_key = api_key;
        data.api_sig = make_sig(data);
        data.format = 'json';

        GM_xmlhttpRequest({
            method: 'GET',
            url: 'http://ws.audioscrobbler.com/2.0/?' + qstr(data),
            onload: function (res) {
                callback(JSON.parse(res.responseText));
            }
        });
    }

    function lastfm_post(data, callback) {

        data.api_key = api_key;
        data.api_sig = make_sig(data);
        data.format = 'json';

        GM_xmlhttpRequest({
            method: 'POST',
            url: 'http://ws.audioscrobbler.com/2.0/',
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            data: qstr(data),
            onload: function (res) {
                callback(JSON.parse(res.responseText));
            }
        });
            
    }

    function get_session(callback) {

        var session = GM_getValue('session');
        if (session) {
            callback(JSON.parse(session));
        } else {
            lastfm_get({method:'auth.gettoken'}, function (data) {
                var popup = window.open("http://www.last.fm/api/auth/?api_key=" + api_key + "&token=" + data.token);
                var t = setInterval(function () {
                    lastfm_get({method:'auth.getSession', token: data.token}, function (data) {
                        if (data.session) {
                            clearInterval(t);
                            GM_setValue("session", JSON.stringify(data.session));
                            callback(data.session);
                        }
                    });
                }, 1000);
            });
        }
    }

    function scrobble(session, artist, track) {
        setStatus('scrobbling ' + artist);

        lastfm_post({
            method: 'track.scrobble',
            artist: artist,
            track: track,
            timestamp: Math.floor(new Date() / 1000) - 60,
            sk: session.key
        }, function (data) {
            //{ scrobbles:{
            //        scrobble:{
            //            track:{"#text":"Winner's blues","corrected":"0"},
            //            artist:{"#text":"Sonic Youth","corrected":"0"},
            //            album:{"#text":"","corrected":"0"},
            //            albumArtist:{"#text":"","corrected":"0"},
            //            timestamp:"1305588986",
            //            ignoredMessage:{"#text":"","code":"0"}
            //        },
            //        "@attr":{"accepted":"1","ignored":"0"}
            //    }}
            if (data.error) {
                setStatus('error (' + data.error + ': ' + data.message);
            } else {
                setStatus('scrobbled: ' + data.scrobbles.scrobble.track['#text']);
            }
        });
    }

    function mainloop(session) {
        var elements = document.querySelectorAll('aside.playlist li.current h2 > a, aside.playlist li.current a.track-title');

        if (elements[0]) {
            var names = Array.map(elements, function (x) { return x.textContent; });
            var artist = names[0];
            var track = names[1] && names[1].slice(1,-1);
            var song = artist + '//' + track;

            if (song !== currentSong) {
                clearInterval(scrobble_timer);
                setStatus('playing ' + artist);
                if (song !== lastScrobbled) {
                    scrobble_timer = setTimeout(function () {
                        lastScrobbled = song;
                        scrobble(session, artist, track);
                    }, 60 * 1000);
                }
                currentSong = song;
            }
        } else {
            currentSong = '';
            clearInterval(scrobble_timer);
            clearStatus();
        }
    }


    window.addEventListener('load', function() {

        if (document.querySelector('aside.playlist div[id^=uplayer]')) {
            get_session(function (session) {
                create_elements(session);
                main_timer = setInterval(function () { mainloop(session); }, 1000);
            });

        }
    }, true);

})();

