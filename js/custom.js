(function(){
"use strict";
'use strict';

var app = angular.module('viewCustom', ['angularLoad']);

// START CHAT
var needsJs = document.createElement('span');
needsJs.setAttribute('class', 'needs-js', 'id', 'lib-chat-button');
document.body.appendChild(needsJs);

var s = document.createElement('script');
s.id = 'localScript';
s.src = 'https://ca.libraryh3lp.com/js/libraryh3lp.js?1347';
document.body.appendChild(s);

// END CHAT

// Begin Custom Footer ...
app.component('prmExploreFooterAfter', {
bindings: { parentCtrl: '<' },
    template: '<div id="footerWrapper"><ul><li><div class="ftext"><img class="cus-footer-logo" alt="logo" src="custom/01OCLS_STLAW-STLAW/img/footer-logo.png" /></div></li><li><div class="ftext"><p><span class="headline">Connect with Us </span></p><abbr title="Email Us"><a href="mailto:libraries@sl.on.ca"><i class="bi bi-envelope-fill" style="color:white; font-size: 2.5rem;" aria-hidden="true"></i></a></abbr><abbr title="Text Us"><a href="sms:+16137073542" target="_blank"><i class="bi bi-chat-dots-fill" style="color:white; font-size: 2.5rem;" aria-hidden="true"></i></a></abbr><abbr title="Instagram"><a href="https://instagram.com/SLCLibraries" target="_blank"><i class="bi bi-instagram" style="color:white; font-size: 2.5rem;" aria-hidden="true"></i></a></abbr><abbr title="Twitter"><a href="https://twitter.com/SLCLibraries" target="_blank"><i class="bi bi-twitter" style="color:white; font-size: 2.5rem;" aria-hidden="true"></i></a></abbr><abbr title="YouTube"><a href="https://www.youtube.com/channel/UC1CM5uWBrKZZXWhpBy26KOg" target="_blank"><i class="bi bi-youtube" style="color:white; font-size: 2.5rem;" aria-hidden="true"></i></a></abbr><p style="margin-top:10px;line-height:1.2rem;">Databases are provided by the SLC Libraries for use by current St. Lawrence College students, staff and faculty for non-commercial purposes.</p></div></li><li><div class="ftext"><p style="margin-top:10px;line-height:1.2rem;">SLC Libraries recognizes the controlled vocabulary of library classification systems is shaped within a settler-colonial, patriarchal, hetero-normative, ableist framework, and racist, Eurocentric ideology. SLC Libraries is actively working to acknowledge, amend and/or update unacceptable language with contemporary descriptions.</p></div></li></ul></div>'

});

// ... End Custom Footer

//START - Google Analytics

var googleAnalyticsUrl = document.createElement('script');
googleAnalyticsUrl.src = "https://www.googletagmanager.com/gtag/js?id=G-T0X3CP3XS4";
googleAnalyticsUrl.type = 'text/javascript';
googleAnalyticsUrl.async = true;
document.head.appendChild(googleAnalyticsUrl);

var googleAnalyticsCode = document.createElement('script');
googleAnalyticsCode.innerHTML = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-T0X3CP3XS4');`;
document.head.appendChild(googleAnalyticsCode);

//END - Google Analytics

})();
