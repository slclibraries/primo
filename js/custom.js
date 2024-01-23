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
        hover_text : false,
        display_in_note : true,
        title_text: '<b>Usage rights:</b>',
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
    return domToJSON(xml);
}

// Main CLEAR display module

angular
    .module('oclsClearDisplay', [])
    .factory('oclsClearDisplayConfig', oclsClearDisplayConfig)
    .factory('oclsClearService', ['$http', '$sce',function($http, $sce){
        function fetchOurData(baseUrl,resourceName,locationIndex){
            let url = baseUrl + 'api/?tag=' + resourceName;

            $sce.trustAsResourceUrl(url);

            return $http.get(url)
                .then(
                    function(response){
                        return xml2json(response.data);
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
                                var clearLinks = services[i].publicNote.match(/(https?:\/\/(clear|ocul)\.scholarsportal\.info\/[^"]+)/g);

                                if (clearLinks){

                                    // Remove public note
                                    services[i].publicNote = '';

                                    clearLinks.forEach(function(foundLink){
                                        //console.log('Found CLEAR link');
                                        let clearLink = foundLink.match(/(https?:\/\/(clear|ocul)\.scholarsportal\.info\/[^"]+\/)(.+)/);
                                        //console.log(clearLink);
                                        let clearBaseUrl = clearLink[1];

                                        let clearResourceName = clearLink[3];

                                        oclsClearService.fetchOurData(clearBaseUrl,clearResourceName,i)
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
                                                    usageTerms.push('<a href="' + clearBaseUrl + clearResourceName + '" target="_blank">' + config.footer_text + '</a>');
                                                }


                                                // If desired by the college, display the license terms inside the public note field
                                                // wrapped in a link to the CLEAR record (to suppress the existing click behaviour)
                                                if (config.display_in_note){
                                                    services[i].publicNote = '<a href="' + clearBaseUrl + clearResourceName + '" target="_blank">' + usageTerms.join('') + '</a>';

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

})();
