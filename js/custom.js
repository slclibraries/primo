(function(){
"use strict";
'use strict';

// START CLEAR
// Display OUR/CLEAR permitted uses directly in Primo
// Requires an URL to the OUR/CLEAR resource inside the services' public note.
// If such an URL is found, use the OUR API to retrieve license information for each service
// and display a summary underneath each service.

// CLEAR display configuration
// Edit the following to customize how permitted uses should display
// Refer to https://github.com/oclservice/ocls-clear-display for details

const oclsClearDisplayConfig = {
    compact_display : false,
    hover_text : true,
    display_in_note : false,
    title_text: '<b>Usage rights (hover on answer for details):</b>',
    local_instance: '',
    footer_text: 'More information',
    terms: {
        cms: {
            short_text: 'CMS?'
        },
        course_pack: {
            short_text: 'Course Packs?'
        },
        distribute: {
            hide: true
        },
        durable_url: {
            short_text: 'Link?'
        },
        e_reserves: {
            short_text: 'E-Reserve?'
        },
        ill_print: {
            short_text: 'ILL?'
        },
        local_loading: {
            hide: true
        },
        print: {
            short_text: 'Print?'
        },
        research: {
            hide: true
        },
        text_mining: {
            hide: true
        }
    }
}

/* Helper functions for XML to JSON conversion
Inspired from https://observablehq.com/@visnup/xml-to-json

Copyright 2020 Visnu Pitiyanuvath
Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

*/

function childCounts(node){
const counts = {};
for (const {localName} of node.children)
counts[localName] = (counts[localName] || 0) + 1;
return counts;
}

function domToJSON(node) {
let obj = Object.create(null);
if (node.children.length === 0 && node.innerHTML) {
obj = node.innerHTML;
}

const counts = childCounts(node);

for (const child of node.children) {
const { localName } = child;
if (counts[localName] > 1) {
  (obj[localName] = obj[localName] || []).push(domToJSON(child));
} else {
  obj[localName] = domToJSON(child);
}
}

let attrs = node.attributes;
if (attrs) {
for (let i = attrs.length - 1; i >= 0; i--) {
  obj[attrs[i].name] = attrs[i].value;
}
}

return obj;
}

function xml2json(xml) {
const parser = new DOMParser();
xml = parser.parseFromString(xml, "application/xml");
const errorNode = xml.querySelector('parsererror');
if (errorNode) {
    // parsing failed
    return null;
} else {
    // parsing succeeded
    return domToJSON(xml);
}
}

// Main CLEAR display module

angular
.module('oclsClearDisplay', [])
.factory('oclsClearDisplayConfig', oclsClearDisplayConfig)
.factory('oclsClearService', ['$http', '$sce',function($http, $sce){
    function fetchOurData(baseUrl,resourceName,instanceOriginal,instanceOverride = ''){
        
        let instance = instanceOriginal;
        
        if (instanceOverride){
            instance = instanceOverride;
        }
   
        let url = baseUrl.replace('http://','https://') + '/' + instance + '/api/?tag=' + resourceName;
        let publicUrl = baseUrl.replace('http://','https://') + '/' + instance + '/' + resourceName;
        
        $sce.trustAsResourceUrl(url);

        return $http.get(url)
            .then(
                function(response){
                    let parsedResult = xml2json(response.data);
                    if (parsedResult){
                        // A valid result has been returned by the API, pass it on.
                        parsedResult.url = publicUrl;
                        return parsedResult;
                    }
                    else if (instanceOverride){
                        // No valid result has been returned for the overriden instance. Try with the original instance instead (recursion).
                        return fetchOurData(baseUrl,resourceName,instanceOriginal);
                    }
                    else {
                        // No valid result has been returned.
                        return null
                    }
                },
                function(httpError){
                    if (httpError.status === 404)return null;
                    let error = "an error occured: oclsClearService callback: " + httpError.status;
                    if (httpError.data && httpError.data.errorMessage) {
                        error += ' - ' + httpError.data.errorMessage;
                    }
                    console.error(error);
                    return null;
                }
            );
        }
        return {
            fetchOurData : fetchOurData
        };
    }])
.controller('oclsClearDisplayController', ['$scope', 'oclsClearService', function ($scope, oclsClearService) {
    
    var vm = this;
    this.$onInit = function() {
        $scope.$watch(
            function () {
                if (angular.isDefined(vm.parentCtrl.services)) {
                    // As soon as there are location details, watch for changes in the list of location items
                    return vm.parentCtrl.services;
                }
                return 0;
            },
            function () {
                // This listener function is called both during initial run and whenever the watched variable changes.
                if (angular.isDefined(vm.parentCtrl.services)){
                    //console.log('OCLS CLEAR display start');
                    
                    var services = vm.parentCtrl.services;
                    var config = oclsClearDisplayConfig;
                    
                    // Go through the list of available services and look for OUR/CLEAR URLs
                    for(let i = 0; i < services.length; i++){
                        
                        if (angular.isDefined(services[i].publicNote)){
                            var clearLinks = [...services[i].publicNote.matchAll(/<a +href="(https?:\/\/(clear|ocul)\.scholarsportal\.info)\/([^"]+)\/(.+?)".*?<\/a>/g)];
                            
                            if (clearLinks){
                                
                                // Wrap the original note content in HTML elements so DOM selectors can be used on it later.
                                let originalNote = '<div>' + services[i].publicNote + '</div>';

                                clearLinks.forEach(function(foundLink){
                                    
                                    // Remove the found link from the note
                                    originalNote = originalNote.replace(foundLink[0],'');
                                    
                                    let clearBaseUrl = foundLink[1];
                                    let clearInstanceName = foundLink[3];
                                    let clearResourceName = foundLink[4];
                            
                                    oclsClearService.fetchOurData(clearBaseUrl,clearResourceName,clearInstanceName,config.local_instance)
                                    .then((data) => {
                                        try{
                                            if (!data)return;
                                            // The data variable contains the license information as a JSON object.
                                            //console.log(data);
                                        
                                            // Build array of usage terms
                                            let usageTerms = [config.title_text];
                                        
                                            let lineCounter = 1;
                                            for(let permissionKey in data.license) {
                                                
                                                if ((permissionKey in oclsClearDisplayConfig.terms) && (!oclsClearDisplayConfig.terms[permissionKey].hide)) {
                                                    let permissionLine = '<div class="ocls-clear-display'
                                                        + (config.compact_display ? ' ocls-clear-compact' : '') 
                                                        +'"><div class="ocls-clear-term'
                                                        + (lineCounter % 2 == 0 ? ' ocls-clear-odd' : '')
                                                        + (config.compact_display ? ' ocls-clear-compact' : '') 
                                                        + '"' 
                                                        + ((config.hover_text && config.compact_display) ? ' title="'+ data.license[permissionKey].case + '"' : '')
                                                        + '>'
                                                        + (config.compact_display ? config.terms[permissionKey].short_text : data.license[permissionKey].case) 
                                                        + '</div><div class="ocls-clear-value ocls-clear-' 
                                                        + data.license[permissionKey].usage
                                                        + (config.compact_display ? ' ocls-clear-compact' : '')  
                                                        + '"'
                                                        + (config.hover_text ? ' title="'+ data.license[permissionKey]['definition-short'] + '"' : '')
                                                        + '>' 
                                                        + data.license[permissionKey].usage + '</div></div>';
                                                    usageTerms.push(permissionLine);
                                                    lineCounter++;
                                                }
                                            }
                                        
                                            if (angular.isDefined(config.footer_text)){
                                                usageTerms.push('<a href="' + data.url + '" target="_blank">' + config.footer_text + '</a>');
                                            }
                                            
                                            // Edit the public note field to display everything but processed permitted uses links,
                                            // unless it's only empty HTML tags.
                                            if (angular.element(originalNote).text()) {
                                                // Remove empty HTML tags using jQuery
                                                let cleanNote = angular.element('<span>' + originalNote + '</span>');
                                                cleanNote.find(':empty').remove();
                                                services[i].publicNote = cleanNote.html();
                                            }
                                            else {
                                                services[i].publicNote = '';
                                            }
                                            // If desired by the college, display the license terms inside the public note field
                                            // wrapped in a link to the CLEAR record (to suppress the existing click behaviour)
                                            if (config.display_in_note){
                                                services[i].publicNote = services[i].publicNote + '<a href="' + data.url + '" target="_blank">' + usageTerms.join('') + '</a>';
                                            }
                                            else {
                                                // Otherwise, hijack the built-in license terms display function to add CLEAR terms
                                                services[i].licenceExist = "true";
                                                services[i].licence = usageTerms;  
                                            }                                 
                                    
                                        }
                                        catch(e){
                                            console.error("an error occured: oclsClearDisplayController:\n\n");
                                            console.error(e.message);
                                        }
                                    })
                                    }
                                )
                            }
                        }
                    }
                }
            }
        );
    }
}])

.component('prmAlmaViewitItemsAfter', {
    bindings: { parentCtrl: '<' },
    controller: 'oclsClearDisplayController'
});
// END CLEAR

var app = angular.module('viewCustom', ['angularLoad', 'oclsClearDisplay']);

// START CHAT
var needsJs = document.createElement('span');
needsJs.setAttribute('class', 'needs-js', 'id', 'lib-chat-button');
document.body.appendChild(needsJs);

var s = document.createElement('script');
s.id = 'localScript';
s.src = 'https://ca.libraryh3lp.com/js/libraryh3lp.js?1347';
document.body.appendChild(s);
// END CHAT

// Begin Custom Footer
app.component('prmExploreFooterAfter', {
bindings: { parentCtrl: '<' },
    template: '<div id="footerWrapper"><ul><li><div class="ftext"><img class="cus-footer-logo" alt="logo" src="custom/01OCLS_STLAW-STLAW/img/footer-logo.png" /></div></li><li><div class="ftext"><p><span class="headline">Connect with Us </span></p><abbr title="Email Us"><a href="mailto:libraries@sl.on.ca"><i class="bi bi-envelope-fill" style="color:white; font-size: 2.5rem;" aria-hidden="true"></i></a></abbr><abbr title="Text Us"><a href="sms:+16137073542" target="_blank"><i class="bi bi-chat-dots-fill" style="color:white; font-size: 2.5rem;" aria-hidden="true"></i></a></abbr><abbr title="Instagram"><a href="https://instagram.com/SLCLibraries" target="_blank"><i class="bi bi-instagram" style="color:white; font-size: 2.5rem;" aria-hidden="true"></i></a></abbr><abbr title="YouTube"><a href="https://www.youtube.com/@slclibraries" target="_blank"><i class="bi bi-youtube" style="color:white; font-size: 2.5rem;" aria-hidden="true"></i></a></abbr><br><br><p class="headline"><b>SLC LIBRARIES STATEMENT:<br>HARMFUL LIBRARY DESCRIPTIONS</b><br>SLC Libraries recognizes the controlled vocabulary of library classification systems is shaped within a settler-colonial, patriarchal, hetero-normative, ableist framework, and racist, Eurocentric ideology. SLC Libraries is actively working to acknowledge, amend and/or update unacceptable language with contemporary descriptions.</p></div></li></ul></div>'

});
// End Custom Footer

// START OF AUTO ACTIVATE FILTER IN FULL DISPLAY
    app.component('prmLocationItemsAfter', {
        bindings: {parentCtrl: '<'},
        controller: function($scope) {
          this.$onInit = function(){
            {

                var myFilterIntervalVar = setInterval(activateFilter, 800);
                // loop via timer until filter expanded (handle UI delays)
                var filterCount = 0;
                var filterExpanded = false;

                function activateFilter() {
                    filterCount = filterCount + 1;
                    // once the filter is expanded, clear interval and stop trying
                    // may have multiple filters (one hidden) expand the one targeted at prm-location-items

                    if( document.querySelectorAll("[translate='nui.aria.locationItems.filters']").length > 0) {
                        clearInterval(myFilterIntervalVar);
                        return;
                    }

                    //failsafe if we have a record the target fails
                    if (filterCount > 5) {
                        clearInterval(myFilterIntervalVar);
                        return;
                    }

                    var filter_list = document.querySelectorAll("[id^='filter']");
                    for (var i = 0; i < filter_list.length; i++) {
                        filter_list[i].parentNode.click();
                        filterExpanded = true;
                    }
                }                                
            }
          };
        }
    });
// END OF AUTO ACTIVATE FILTER IN FULL DISPLAY


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

  /* ---------- Begin: "Request Accessibility Copy" link code based on University of Manitoba's example ----------*/

  app.component('prmAuthenticationAfter', {
    bindings: { parentCtrl: '<' },
    controller: 'prmAuthenticationAfterController'
  });

  app.controller('prmAuthenticationAfterController', function ($scope, $rootScope) {
    this.$onInit = function () {
      {
        // If the user is logged in, get their name
        // and assign it to a global variable ($rootScope)
        // so it can be shared with accessReqFormController
        var isLoggedIn = this.parentCtrl.isLoggedIn;
        $rootScope.isLoggedIn = isLoggedIn;
        if (isLoggedIn == true) {
          var selector = '.user-name';
          var user_name = '';
          get_element(selector, function (callback) {
            user_name = callback;
            $rootScope.user_name = user_name;
          });
        }
      }
    };
  });

  app.component('prmBriefResultAfter', {
    bindings: { parentCtrl: '<' },
    controller: 'accessReqFormController',
    template: `<div ng-if="$ctrl.ShowAccessibleLink()" class="displayAccessibleLink"><a tabindex="0" ng-click="$ctrl.showAccessibleCopyFormOnClick($event)" ng-keypress="showAccessibleCopyFormOnEnter($event)"  class="accessible_copy">Request Alternate Format for Disabled Users <span class="sr-only">Opens in a new window</span>&nbsp;<prm-icon icon-type="svg" svg-icon-set="primo-ui" icon-definition="open-in-new"></a></div>`
  });

  app.controller('accessReqFormController', function ($scope, $rootScope) {
    this.$onInit = function () {
      {
        var checkFacets = function checkFacets(checkFacet) {
          if (checkFacet.includes("online")) {
            sourceType = "Electronic";
          }
        };

        var addSource = function addSource(sourceProvider) {
          jSource += "&source[]=" + sourceProvider;
        };

        var checkSubLocation = function checkSubLocation() {
          // once item object contain delivery info, clear interval and stop trying
          if (document.querySelector(searchrecordId) !== null) {
            // get subLocation from tag
            subLocation = document.querySelector(searchrecordId).innerText;
            clearInterval(checkSubLocationIntervalVar);
            return;
          }
        };

        // only show the Request Accessible Copy if resource type is book or article or book_chapter and exclude Archives locations


        var link = [];

        /****************************************
          Get the "Resource Title"
        ****************************************/

        var resource_title = this.parentCtrl.item.pnx.display.title[0];

        /****************************************
          Build the "Resource Title" link
        ****************************************/

        var doc_id = '';

        // Get the doc_id from Angular
        var item_id = this.parentCtrl.item['@id'];

        if (item_id !== undefined) {
          if (item_id.indexOf('https') != -1) {
            var doc_id_array = this.parentCtrl.item['@id'].match(/pnxs.+/)[0].split('/');
            doc_id = doc_id_array[2];
            if (doc_id_array[3] !== undefined) {
              doc_id += '/';
              doc_id += doc_id_array[3];
            }
          }
        }

        // Primo VE bug fix - We need to prepend "alma" to the doc_id if it's purely numeric
        if (!isNaN(doc_id)) {
          doc_id = 'alma' + doc_id;
        }

        // ... or from the URL
        if (doc_id === null || doc_id === undefined) {
          doc_id = '';
        }

        // Get the context
        var context = this.parentCtrl.item.context;

        // Get vid, search_scope, tab URL parameters
        var url_params_array = window.location.search.split('&');
        var url_param_array = '';
        var vid = '';
        var search_scope = '';
        var tab = '';

        for (var i = 0; i < url_params_array.length; i++) {
          url_param_array = url_params_array[i].split('=');
          for (var index in url_param_array) {
            if (url_param_array[0].replace('?', '') == 'vid') {
              vid = url_param_array[1];
            } else if (url_param_array[0].replace('?', '') == 'search_scope') {
              search_scope = url_param_array[1];
            } else if (url_param_array[0].replace('?', '') == 'tab') {
              tab = url_param_array[1];
            }
          }
        }

        var resource_title_link = encodeURIComponent('https://' + window.location.hostname + '/discovery/fulldisplay?docid=' + doc_id + '&context=' + context + '&vid=' + vid + '&search_scope=' + search_scope + '&tab=' + tab);

        /****************************************
          Get the "Resource Author"
        ****************************************/

        var resource_author = '';

        if (this.parentCtrl.item.pnx.addata.addau !== undefined) {
          resource_author = this.parentCtrl.item.pnx.addata.addau[0];
        } else if (this.parentCtrl.item.pnx.addata.au !== undefined) {
          resource_author = this.parentCtrl.item.pnx.addata.au[0];
        }

        /************************************
        Get the isbn or issn
        **************************************/

        var resource_isbn = '';
        if (this.parentCtrl.item.pnx.addata.isbn !== undefined) {
          resource_isbn = this.parentCtrl.item.pnx.addata.isbn[0];
        } else if (this.parentCtrl.item.pnx.addata.issn !== undefined) {
          resource_isbn = this.parentCtrl.item.pnx.addata.issn[0];
        }

        var resourceType = '';
        if (this.parentCtrl.item.pnx.display.type !== undefined) {
          resourceType = this.parentCtrl.item.pnx.display.type[0];
        }

        var aTitle = '';
        if (resourceType == 'article') {
          aTitle = resource_title;
          resource_title = '';
        }

        var resourceType = '';
        if (this.parentCtrl.item.pnx.addata.format !== undefined) {
          resourceType = this.parentCtrl.item.pnx.addata.format[0];
        }

        var recordYear = '';
        if (this.parentCtrl.item.pnx.addata.risdate !== undefined) {
          recordYear = this.parentCtrl.item.pnx.addata.risdate[0];
        }

        var recordVolume = '';
        if (this.parentCtrl.item.pnx.addata.volume !== undefined) {
          recordVolume = this.parentCtrl.item.pnx.addata.volume[0];
        }

        var recordIssue = '';
        if (this.parentCtrl.item.pnx.addata.issue !== undefined) {
          recordIssue = this.parentCtrl.item.pnx.addata.issue[0];
        }

        var startPage = '';
        if (this.parentCtrl.item.pnx.addata.spage !== undefined) {
          startPage = this.parentCtrl.item.pnx.addata.spage[0];
        }

        var endPage = '';
        if (this.parentCtrl.item.pnx.addata.epage !== undefined) {
          endPage = this.parentCtrl.item.pnx.addata.epage[0];
        }

        var jTitle = '';
        if (this.parentCtrl.item.pnx.addata.jtitle !== undefined) {
          jTitle = this.parentCtrl.item.pnx.addata.jtitle[0];
        }

        var jSource = '';
        if (this.parentCtrl.item.pnx.display.source !== undefined) {
          this.parentCtrl.item.pnx.display.source.forEach(addSource);
        }

        //find source format if electronic or print
        var sourceType = '';
        if (this.parentCtrl.item.pnx.display.format !== undefined) {
          if (this.parentCtrl.item.pnx.display.format[0].includes("online")) {
            sourceType = "Electronic";
          } else {
            sourceType = "Print";
          }
        } else if (this.parentCtrl.item.pnx.facets.toplevel !== undefined) {
          this.parentCtrl.item.pnx.facets.toplevel.forEach(checkFacets);
        }

        var searchrecordId = '';
        if (doc_id !== '') {
          searchrecordId = '#SEARCH_RESULT_RECORDID_' + doc_id + ' .best-location-library-code';
        }

        var subLocation = '';
        // trying to get location from delivery
        if (this.parentCtrl.item.delivery !== undefined && this.parentCtrl.item.delivery.bestlocation !== undefined && this.parentCtrl.item.delivery.bestlocation !== null) {
          subLocation = this.parentCtrl.item.delivery.bestlocation.subLocation;
        }

        // get search result record div ID + best-location-sub-location class
        var searchrecordId = '';
        if (doc_id !== '') {
          searchrecordId = '#SEARCH_RESULT_RECORDID_' + doc_id + ' .best-location-sub-location';
        }

        // on the search results page item delivery locatuons not available, need to wait for best-locaton classes to load
        if (subLocation == '') {
          // check if span class best-location-sub-location has loaded
          var checkSubLocationIntervalVar = setInterval(checkSubLocation, 200);
        }

        this.ShowAccessibleLink = function () {
          if ((resourceType == 'book' || resourceType == 'article' || resourceType == 'book_chapter') && subLocation.toLowerCase().indexOf("archives") === -1) {
            return true;
          } else {
            return false;
          }
        };

        this.showAccessibleCopyFormOnClick = function ($event) {
          window.open('https://stlawrencecollege.libwizard.com/f/accessible-library-materials');
        };

        $scope.showAccessibleCopyFormOnEnter = function ($event) {
          if ($event.key == "Enter") {
            window.open('https://stlawrencecollege.libwizard.com/f/accessible-library-materials');
          }
        };
      }
    };
  });

  /********** END OF ACCESSIBLE COPY LINK ***************/

})();
