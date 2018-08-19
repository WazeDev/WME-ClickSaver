// ==UserScript==
// @name            WME ClickSaver (beta)
// @namespace       https://greasyfork.org/users/45389
// @version         2018.08.18.002
// @description     Various UI changes to make editing faster and easier.
// @author          MapOMatic
// @include         /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/?.*$/
// @license         GNU GPLv3
// @connect         google.com
// @contributionURL https://github.com/WazeDev/Thank-The-Authors
// @grant           GM_xmlhttpRequest
// ==/UserScript==

/* global GM_info */
/* global W */
/* global Node */
/* global I18n */
/* global OL */
/* global $ */

(function() {
    const TRANSLATIONS_URL = 'https://docs.google.com/spreadsheets/d/1ZlE9yhNncP9iZrPzFFa-FCtYuK58wNOEcmKqng4sH1M/pub?gid=0&single=true&output=tsv';

    // This function is injected into the page.
    function main(argsObject) {
        //'use strict';
        let _debugLevel = 0;
        let _roadTypeDropDownSelector = 'select[name="roadType"]';
        let _elevationDropDownSelector = 'select[name="level"]';
        let _routingTypeDropDownSelector = 'select[name="routingRoadType"]';
        let _parkingSpacesDropDownSelector = 'select[name="estimatedNumberOfSpots"]';
        let _parkingCostDropDownSelector = 'select[name="costType"]';
        let _alertUpdate = false;
        let _settings = {};
        let _settingsStoreName = 'clicksaver_settings';
        let _lastScriptVersion;
        let _trans;  // Translation object
        let _scriptVersionChanges = [
            argsObject.scriptName,
            'v' + argsObject.scriptVersion,
            '',
            'What\'s New',
            '------------------------------',
            '' // Add important changes here and set _alertUpdate=true
        ].join('\n');
        let _roadTypes = {
            St:{val:1, wmeColor:'#ffffeb', svColor:'#ffffff', category:'streets', visible:true},
            PS:{val:2, wmeColor:'#f0ea58', svColor:'#cba12e', category:'streets', visible:true},
            Pw:{val:22, wmeColor:'#beba6c', svColor:'#beba6c', category:'streets', visible:false},
            mH:{val:7, wmeColor:'#69bf88', svColor:'#ece589', category:'highways', visible:true},
            MH:{val:6, wmeColor:'#45b8d1', svColor:'#c13040', category:'highways', visible:true},
            Fw:{val:3, wmeColor:'#c577d2', svColor:'#387fb8', category:'highways', visible:false},
            Rmp:{val:4, wmeColor:'#b3bfb3', svColor:'#58c53b', category:'highways', visible:false},
            OR:{val:8, wmeColor:'#867342', svColor:'#82614a', category:'otherDrivable', visible:false},
            PLR:{val:20, wmeColor:'#ababab', svColor:'#2282ab', category:'otherDrivable', visible:true},
            PR:{val:17, wmeColor:'#beba6c', svColor:'#00ffb3', category:'otherDrivable', visible:true},
            Fer:{val:15, wmeColor:'#d7d8f8', svColor:'#ff8000', category:'otherDrivable', visible:false},
            RR:{val:18, wmeColor:'#c62925', svColor:'#ffffff', category:'nonDrivable', visible:false},
            RT:{val:19, wmeColor:'#ffffff', svColor:'#00ff00', category:'nonDrivable', visible:false},
            WT:{val:5, wmeColor:'#b0a790', svColor:'#00ff00', category:'pedestrian', visible:false},
            PB:{val:10, wmeColor:'#9a9a9a', svColor:'#0000ff', category:'pedestrian', visible:false},
            Sw:{val:16, wmeColor:'#999999', svColor:'#b700ff', category:'pedestrian', visible:false}
        };
        let _directions = { twoWay: {val:3}, oneWayAB: {val:1}, oneWayBA: {val:2}, unknown: {val:0} };

        let UpdateObject,
            AddOrGetCity,
            AddOrGetStreet,
            MultiAction,
            AddSeg,
            reqSegment,
            DelSeg;

        function log(message, level) {
            if (message && level <= _debugLevel) {
                console.log('ClickSaver: ' + message);
            }
        }

        function isChecked(checkboxId) {
            return $('#' + checkboxId).is(':checked');
        }

        function setChecked(checkboxId, checked) {
            $('#' + checkboxId).prop('checked', checked);
        }
        function loadSettingsFromStorage() {
            let loadedSettings = $.parseJSON(localStorage.getItem(_settingsStoreName));
            let defaultSettings = {
                lastVersion: null,
                roadButtons: true,
                roadTypeButtons: ['St','PS','mH','MH','Fw','Rmp','PLR','PR'],
                lockButtons: true,
                elevationButtons: true,
                directionButtons: true,
                routingTypeButtons: true,
                parkingCostButtons: true,
                parkingSpacesButtons: true,
                setNewPLRStreetToNone: true,
                setNewPLRCity: true,
                addAltCityButton: true,
                addSwapPedestrianButton: false,
                useOldRoadColors: false,
                warnOnPedestrianTypeSwap: true
            };
            _settings = loadedSettings ? loadedSettings : defaultSettings;
            for (let prop in defaultSettings) {
                if (!_settings.hasOwnProperty(prop)) {
                    _settings[prop] = defaultSettings[prop];
                }
            }

            setChecked('csRoadTypeButtonsCheckBox', _settings.roadButtons);
            if (_settings.roadTypeButtons) {
                for (let roadTypeAbbr1 in _roadTypes) {
                    setChecked('cs' + roadTypeAbbr1 + 'CheckBox', _settings.roadTypeButtons.indexOf(roadTypeAbbr1) !== -1);
                }
            }
            if (_settings.roadButtons) {
                $('.csRoadTypeButtonsCheckBoxContainer').show();
            } else {
                $('.csRoadTypeButtonsCheckBoxContainer').hide();
            }
            setChecked('csLockButtonsCheckBox', _settings.lockButtons);
            setChecked('csElevationButtonsCheckBox', _settings.elevationButtons);
            setChecked('csDirectionButtonsCheckBox', _settings.directionButtons);
            setChecked('csParkingSpacesButtonsCheckBox', _settings.parkingSpacesButtons);
            setChecked('csParkingCostButtonsCheckBox', _settings.parkingCostButtons);
            setChecked('csRoutingTypeCheckBox', _settings.routingTypeButtons);
            setChecked('csClearNewPLRCheckBox', _settings.setNewPLRStreetToNone);
            setChecked('csUseOldRoadColorsCheckBox', _settings.useOldRoadColors);
            setChecked('csSetNewPLRCityCheckBox', _settings.setNewPLRCity);
            setChecked('csAddAltCityButtonCheckBox', _settings.addAltCityButton);
            setChecked('csAddSwapPedestrianButtonCheckBox', _settings.addSwapPedestrianButton);
        }

        function saveSettingsToStorage() {
            if (localStorage) {
                let settings = {
                    lastVersion: argsObject.scriptVersion,
                    roadButtons: _settings.roadButtons,
                    lockButtons: _settings.lockButtons,
                    elevationButtons: _settings.elevationButtons,
                    directionButtons: _settings.directionButtons,
                    parkingCostButtons: _settings.parkingCostButtons,
                    parkingSpacesButtons: _settings.parkingSpacesButtons,
                    setNewPLRStreetToNone: _settings.setNewPLRStreetToNone,
                    useOldRoadColors: _settings.useOldRoadColors,
                    setNewPLRCity: _settings.setNewPLRCity,
                    addAltCityButton: _settings.addAltCityButton,
                    addSwapPedestrianButton: _settings.addSwapPedestrianButton,
                    warnOnPedestrianTypeSwap: _settings.warnOnPedestrianTypeSwap
                };
                settings.roadTypeButtons = [];
                for (let roadTypeAbbr in _roadTypes) {
                    if(_settings.roadTypeButtons.indexOf(roadTypeAbbr) !== -1) { settings.roadTypeButtons.push(roadTypeAbbr); }
                }
                localStorage.setItem(_settingsStoreName, JSON.stringify(settings));
                log('Settings saved', 1);
            }
        }

        function isPedestrianTypeSegment(segment) {
            return [5, 10, 16].indexOf(segment.attributes.roadType) > -1;
        }

        function getConnectedSegmentIDs(segmentID) {
            let IDs = [];
            let segment = W.model.segments.getObjectById(segmentID);
            [W.model.nodes.getObjectById(segment.attributes.fromNodeID), W.model.nodes.getObjectById(segment.attributes.toNodeID)].forEach(function(node) {
                if (node) {
                    node.attributes.segIDs.forEach(function(segID) {
                        if (segID !== segmentID) { IDs.push(segID); }
                    });
                }
            });
            return IDs;
        }

        function getFirstConnectedStateID(startSegment) {
            let stateID = null;
            let nonMatches = [];
            let segmentIDsToSearch = [startSegment.attributes.id];
            while (stateID === null && segmentIDsToSearch.length > 0) {
                let startSegmentID = segmentIDsToSearch.pop();
                startSegment = W.model.segments.getObjectById(startSegmentID);
                let connectedSegmentIDs = getConnectedSegmentIDs(startSegmentID);
                for (let i=0;i<connectedSegmentIDs.length;i++) {
                    let streetID = W.model.segments.getObjectById(connectedSegmentIDs[i]).attributes.primaryStreetID;
                    if (streetID !== null && typeof(streetID) !== 'undefined') {
                        let cityID = W.model.streets.getObjectById(streetID).cityID;
                        stateID = W.model.cities.getObjectById(cityID).attributes.stateID;
                        break;
                    }
                }

                if (stateID === null) {
                    nonMatches.push(startSegmentID);
                    connectedSegmentIDs.forEach(function(segmentID) {
                        if (nonMatches.indexOf(segmentID) === -1 && segmentIDsToSearch.indexOf(segmentID) === -1) {
                            segmentIDsToSearch.push(segmentID);
                        }
                    });
                } else {
                    return stateID;
                }
            }
            return null;
        }

        function getFirstConnectedCityID(startSegment) {
            let cityID = null;
            let nonMatches = [];
            let segmentIDsToSearch = [startSegment.attributes.id];
            while (cityID === null && segmentIDsToSearch.length > 0) {
                let startSegmentID = segmentIDsToSearch.pop();
                startSegment = W.model.segments.getObjectById(startSegmentID);
                let connectedSegmentIDs = getConnectedSegmentIDs(startSegmentID);
                for (let i=0;i<connectedSegmentIDs.length;i++) {
                    let streetID = W.model.segments.getObjectById(connectedSegmentIDs[i]).attributes.primaryStreetID;
                    if (streetID !== null && typeof(streetID) !== 'undefined') {
                        cityID = W.model.streets.getObjectById(streetID).cityID;
                        break;
                    }
                }

                if (cityID === null) {
                    nonMatches.push(startSegmentID);
                    connectedSegmentIDs.forEach(function(segmentID) {
                        if (nonMatches.indexOf(segmentID) === -1 && segmentIDsToSearch.indexOf(segmentID) === -1) {
                            segmentIDsToSearch.push(segmentID);
                        }
                    });
                } else {
                    return cityID;
                }
            }
            return null;
        }

        function getEmptyCity(stateID) {
            let emptyCity = null;
            W.model.cities.getObjectArray().forEach(function(city) {
                if (city.attributes.stateID === stateID && city.attributes.isEmpty) {
                    emptyCity = city;
                }
            });
            return emptyCity;
        }
        function getCity(cityID) {
            let cities = W.model.cities.getByIds([cityID]);
            return cities.length ? cities[0] : null;
        }

        function setStreetAndCity () {
            let segments = W.selectionManager.getSelectedFeatures();
            let setCity = isChecked('csSetNewPLRCityCheckBox');
            if (segments.length === 0 || segments[0].model.type !== 'segment') {
                return;
            }

            segments.forEach(function(segment) {
                let segModel = segment.model;
                if (segModel.attributes.primaryStreetID === null) {
                    let stateID = getFirstConnectedStateID(segment.model);
                    if (stateID) {
                        let state = W.model.states.getObjectById(stateID);
                        let country = W.model.countries.getObjectById(state.countryID);

                        let m_action = new MultiAction();
                        let cityToSet;
                        m_action.setModel(W.model);
                        if (setCity) cityToSet = getCity(getFirstConnectedCityID(segment.model));
                        if (!cityToSet) cityToSet = getEmptyCity(state.id);
                        if (!cityToSet) {
                            let addCityAction = new AddOrGetCity(state, country, '', true);
                            m_action.doSubAction(addCityAction);
                            cityToSet = getEmptyCity(state.id);
                        }
                        let newStreet = {isEmpty:true, cityID:cityToSet.attributes.id};
                        let emptyStreet = W.model.streets.getByAttributes(newStreet)[0];
                        if (!emptyStreet) {
                            let addStreetAction = new AddOrGetStreet('', cityToSet, true);
                            m_action.doSubAction(addStreetAction);
                            emptyStreet = W.model.streets.getByAttributes(newStreet)[0];
                        }
                        let action3 = new UpdateObject(segModel, {primaryStreetID: emptyStreet.id});
                        m_action.doSubAction(action3);
                        W.model.actionManager.add(m_action);
                    }
                }
            });
        }

        function onAddAltCityButtonClick() {
            $('.full-address').click();
            $('.add-alt-street-btn').click();
            $('.alt-street-block input.street-name').val($('input.street-name').first().val()).blur().change();
            if ($('input.alt-address.empty-city').is(':checked')) $('input.alt-address.empty-city').click();
            $('.alt-street-block input.city-name').last().val('').focus();
        }

        function onRoadTypeButtonClick(roadTypeAbbr) {
            $(_roadTypeDropDownSelector).val(_roadTypes[roadTypeAbbr].val).change();
            if (roadTypeAbbr === 'PLR' && isChecked('csClearNewPLRCheckBox') && require) {
                setStreetAndCity();
            }
        }

        function addRoadTypeButtons() {
            let seg = W.selectionManager.getSelectedFeatures()[0].model;
            if (seg.type !== 'segment') return;
            let isPed = isPedestrianTypeSegment(seg);
            let $dropDown = $(_roadTypeDropDownSelector);
            $('#csRoadTypeButtonsContainer').remove();
            let $container = $('<div>',{id:'csRoadTypeButtonsContainer',class:'rth-btn-container'});
            let $street = $('<div>', {id:'csStreetButtonContainer',class:'cs-rt-btn-container'});
            let $highway = $('<div>', {id:'csHighwayButtonContainer',class:'cs-rt-btn-container'});
            let $otherDrivable = $('<div>', {id:'csOtherDrivableButtonContainer',class:'cs-rt-btn-container'});
            let $nonDrivable = $('<div>', {id:'csNonDrivableButtonContainer',class:'cs-rt-btn-container'});
            let $pedestrian = $('<div>', {id:'csPedestrianButtonContainer', class:'cs-rt-btn-container'});
            let divs = {streets:$street, highways:$highway, otherDrivable:$otherDrivable, nonDrivable:$nonDrivable, pedestrian:$pedestrian};
            for (let roadTypeKey in _roadTypes) {
                if (_settings.roadTypeButtons.indexOf(roadTypeKey) !== -1) {
                    let roadType = _roadTypes[roadTypeKey];
                    if ((roadType.category === 'pedestrian' && isPed) || (roadType.category !== 'pedestrian' && !isPed)) {
                        let $div = divs[roadType.category];
                        $div.append(
                            $('<div>', {class:'btn btn-rth btn-rth-' + roadTypeKey + ($dropDown.attr('disabled') ? ' disabled' : '') + ' btn-positive',title:_trans.roadTypeButtons[roadTypeKey].title})
                            .text(_trans.roadTypeButtons[roadTypeKey].text)
                            .prop('checked', roadType.visible)
                            .data('key', roadTypeKey)
                            .click(function() { onRoadTypeButtonClick($(this).data('key')); })
                        );
                    }
                }
            }
            if (isPed) {
                $container.append($pedestrian);
            } else {
                $container.append($street).append($highway).append($otherDrivable).append($nonDrivable);
            }
            $dropDown.before($container);
        }

        function addRoutingTypeButtons() {
            let $dropDown = $(_routingTypeDropDownSelector);
            if ($dropDown.length > 0) {
                let options = $dropDown.children();
                if (options.length === 3) {
                    let buttonInfos = [
                        ['-1', options[0].value, options[0].text],
                        [options[1].text, options[1].value, ''],
                        ['+1', options[2].value, options[2].text]
                    ];
                    $('#csRoutingTypeContainer').remove();
                    let $form = $('<div>', {id:'csRoutingTypeContainer',style:'height:16px;padding-top:0px'});
                    for (let i=0; i<buttonInfos.length; i++) {
                        let btnInfo = buttonInfos[i];
                        let $input = $('<input>', {type:'radio', name:'routingRoadType', id:'routingRoadType' + i, value:btnInfo[1]})
                        .click(function() {
                            $(_routingTypeDropDownSelector).val($(this).attr('value')).change();
                        });
                        if (String(btnInfo[1]) === String($dropDown.val())) $input.prop('checked', 'true');
                        $form.append(
                            $('<div class="controls-container" style="float: left; margin-right: 10px;margin-left: 0px;padding-top: 0px;">').append(
                                $input,
                                $('<label>', {for:'routingRoadType' + i, style:'padding-left: 20px;', title:btnInfo[2]}).text(btnInfo[0])
                            )
                        );

                    }

                    $dropDown.before($form);
                    $dropDown.hide();
                }
            }
        }

        function isPLA(item) {
            return (item.model.type === 'venue') &&  item.model.attributes.categories.indexOf('PARKING_LOT') > -1;
        }

        function addParkingSpacesButtons() {
            let $dropDown = $(_parkingSpacesDropDownSelector);
            let selItems = W.selectionManager.getSelectedFeatures();
            let item = selItems[0];

            // If it's not a PLA, exit.
            if (!isPLA(item)) return;

            $('#csParkingSpacesContainer').remove();
            let $div = $('<div>',{id:'csParkingSpacesContainer'});
            let dropdownDisabled = $dropDown.attr('disabled') === 'disabled';
            let optionNodes = $(_parkingSpacesDropDownSelector + ' option');

            for (i=0; i<optionNodes.length; i++) {
                let $option = $(optionNodes[i]);
                let text = $option.text();
                let selected = $option.val() === $dropDown.val();
                $div.append(
                    $('<div>', {
                        class:'btn waze-btn waze-btn-white' + (selected ? ' waze-btn-blue':'') + (dropdownDisabled ? ' disabled' : ''),
                        style: 'margin-bottom: 5px; height: 22px; padding: 2px 8px 0px 8px; margin-right: 3px;'
                    })
                    .text(text)
                    .data('val',$option.val())
                    .hover(function() {})
                    .click(function() {
                        if(!dropdownDisabled) {
                            $(_parkingSpacesDropDownSelector).val($(this).data('val')).change();
                            addParkingSpacesButtons();
                        }
                    })
                );
            }

            $dropDown.before($div);
            $dropDown.hide();
        }

        function addParkingCostButtons() {
            let $dropDown = $(_parkingCostDropDownSelector);
            let selItems = W.selectionManager.getSelectedFeatures();
            let item = selItems[0];

            // If it's not a PLA, exit.
            if (!isPLA(item)) return;

            $('#csParkingCostContainer').remove();
            let $div = $('<div>',{id:'csParkingCostContainer'});
            let dropdownDisabled = $dropDown.attr('disabled') === 'disabled';
            let optionNodes = $(_parkingCostDropDownSelector + ' option');
            for (i=0; i<optionNodes.length; i++) {
                let $option = $(optionNodes[i]);
                let text = $option.text();
                let selected = $option.val() === $dropDown.val();
                $div.append(
                    $('<div>', {
                        class:'btn waze-btn waze-btn-white' + (selected ? ' waze-btn-blue':'') + (dropdownDisabled ? ' disabled' : ''),
                        style: 'margin-bottom: 5px; height: 22px; padding: 2px 8px 0px 8px; margin-right: 4px;'
                    })
                    .text(text !== '' ? text : '?')
                    .data('val',$option.val())
                    .hover(function() {})
                    .click(function() {
                        if(!dropdownDisabled) {
                            $(_parkingCostDropDownSelector).val($(this).data('val')).change();
                            addParkingCostButtons();
                        }
                    })
                );
            }

            $dropDown.before($div);
            $dropDown.hide();
        }

        function addElevationButtons() {
            let id = 'csElevationButtonsContainer';
            if ($('#' + id).length===0) {
                let $dropDown = $(_elevationDropDownSelector);
                let baseClass = 'btn waze-btn waze-btn-white' + ($dropDown.attr('disabled') ? ' disabled' : '');
                let style = 'height: 20px;padding-left: 8px;padding-right: 8px;margin-right: 4px;padding-top: 1px;';
                let $div = $('<div>', {id:id, style:'margin-bottom: 5px;'}).append(
                    $('<div>',{class:baseClass, style:style}).text('-').click(function() {
                        let level = parseInt($(_elevationDropDownSelector).val());
                        if (level > -5) { $(_elevationDropDownSelector).val(level - 1).change(); }
                    })
                ).append(
                    $('<div>',{class:baseClass, style:style}).text(_trans.groundButtonText)
                    .click(function() {
                        let level = parseInt($(_elevationDropDownSelector).val());
                        if (level !== 0) { $(_elevationDropDownSelector).val(0).change(); }
                    })
                ).append(
                    $('<div>',{class:baseClass, style:style}).text('+').click(function() {
                        let level = parseInt($(_elevationDropDownSelector).val());
                        if (level < 9) { $(_elevationDropDownSelector).val(level + 1).change(); }
                    })
                );
                $dropDown.css({display:'inline-block',width:'120px',marginRight:'10px'});
                $dropDown.before($div);
                $dropDown.detach();
                $div.prepend($dropDown);
            }
        }

        function addAddAltCityButton() {
            let id = 'csAddAltCityButton';
            if (W.selectionManager.getSelectedFeatures()[0].model.type === 'segment' && $('#' + id).length === 0) {
                $('label.control-label').filter(function() { return $(this).text() === 'Address'; }).append(
                    $('<a>', {href:'#',style:'float: right;text-transform: none;font-family: "Helvetica Neue", Helvetica, "Open Sans", sans-serif;color: #26bae8;font-weight: normal;'}).text('Add alt city').click(onAddAltCityButtonClick)
                );
            }
        }

        function addSwapPedestrianButton(){
            let id = 'csSwapPedestrianContainer';
            $('#'+id).remove();
            if(W.selectionManager.getSelectedFeatures().length === 1){
                if(W.selectionManager.getSelectedFeatures()[0].model.type === 'segment'){
                    var $container = $('<div>',{id:id, style:'white-space: nowrap;float: right;display: inline;'});
                    var $button = $('<div>',{id:'csBtnSwapPedestrianRoadType', title:'', style:'display:inline-block;cursor:pointer;'});
                    $button.append('<span class="fa fa-arrows-h" style="font-size:20px; color:#e84545;"></span>').attr({title: 'Swap between driving-type and walking-type segments.\nWARNING! This will DELETE and recreate the segment.  Nodes may need to be reconnected.'});
                    $container.append($button);
                    let $label = $('#edit-panel .contents').find('label').filter(function() { return $(this).text() === 'Road type'; });
                    $label.css({display: 'inline'}).after($container);

                    $('#csBtnSwapPedestrianRoadType').click(function(){
                        if (_settings.warnOnPedestrianTypeSwap) {
                            _settings.warnOnPedestrianTypeSwap = false;
                            saveSettingsToStorage();
                            if (!confirm('This will DELETE the segment and recreate it.  Any speed data will be lost, and nodes will need to be reconnected (if applicable).  This message will only be displayed once.  Continue?')) {
                                return;
                            }
                        }

                        var multiaction = new MultiAction();
                        multiaction.setModel(W.model);

                        //delete the selected segment
                        let segment = W.selectionManager.getSelectedFeatures()[0];
                        let oldGeom = segment.geometry.clone();
                        multiaction.doSubAction(new DelSeg(segment.model));

                        //create the replacement segment in the other segment type (pedestrian -> road & vice versa)
                        let newRoadType = isPedestrianTypeSegment(segment.model) ? 1 : 5;
                        segment = new reqSegment({geometry: oldGeom, roadType: newRoadType});
                        segment.state = OL.State.INSERT;
                        multiaction.doSubAction(new AddSeg(segment,{
                            createNodes: !0,
                            openAllTurns: W.prefs.get('enableTurnsByDefault'),
                            createTwoWay: W.prefs.get('twoWaySegmentsByDefault'),
                            snappedFeatures: [null, null]
                        }));
                        W.model.actionManager.add(multiaction);
                        let newId = W.model.repos.segments.idGenerator.lastValue;
                        let newSegment = W.model.segments.getObjectById(newId);
                        W.selectionManager.setSelectedModels([newSegment]);
                    });
                }
            }
        }

        function showScriptInfoAlert() {
            /* Check version and alert on update */
            if (_alertUpdate && argsObject.scriptVersion !== _lastScriptVersion) {
                alert(_scriptVersionChanges);
            }
        }

        function shadeColor2(color, percent) {
            let f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
            return '#'+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
        }

        function buildRoadTypeButtonCss() {
            let lines = [];
            let useOldColors = _settings.useOldRoadColors;
            for (let roadTypeAbbr in _roadTypes) {
                let roadType = _roadTypes[roadTypeAbbr];
                let bgColor = useOldColors ? roadType.svColor : roadType.wmeColor;
                let output = '.rth-btn-container .btn-rth-' + roadTypeAbbr + ' {background-color:' + bgColor + ';box-shadow:0 2px ' + shadeColor2(bgColor, -0.5) + ';border-color:' + shadeColor2(bgColor,-0.15) + ';}';
                output += ' .rth-btn-container .btn-rth-' + roadTypeAbbr + ':hover {background-color:' + shadeColor2(bgColor,0.2) + '}';
                lines.push(output);
            }
            return lines.join(' ');
        }

        function injectCss() {
            let css =  [
                // Road type button formatting
                '.csRoadTypeButtonsCheckBoxContainer {margin-left:15px;}',
                '.rth-btn-container {margin-bottom:5px;}',
                '.rth-btn-container .btn-rth {font-size:11px;line-height:20px;color:black;padding:0px 4px;height:20px;margin-right:2px;border-style:solid;border-width:1px;}',
                buildRoadTypeButtonCss(),
                '.btn.btn-rth:active {box-shadow:none;transform:translateY(2px)}',
                'div .cs-rt-btn-container {float:left; margin: 0px 5px 5px 0px;}',
                '#sidepanel-clicksaver .controls-container {padding:0px;}',
                '#sidepanel-clicksaver .controls-container label {white-space: normal;}',

                // Lock button formatting
                '.btn-lh {cursor:pointer;padding:1px 6px;height:22px;border:solid 1px #c1c1c1;margin-right:3px;}',
                '.btn.btn-lh.btn-lh-selected {background-color:#6999ae;color:white}',
                '.btn.btn-lh.btn-lh-selected:hover {color:white}',
                '.btn.btn-lh.disabled {color:#909090;background-color:#f7f7f7;}',
                '.btn.btn-lh.btn-lh-selected.disabled {color:white;background-color:#6999ae;}',
                '.cs-group-label {font-size: 11px; width: 100%; font-family: Poppins, sans-serif; text-transform: uppercase; font-weight: 700; color: #354148; margin-bottom: 6px;}'
            ].join(' ');
            $('<style type="text/css">' + css + '</style>').appendTo('head');
        }

        function onModeChanged(model, modeId) {
            if(!modeId || modeId === 1) {
                initUserPanel();
                loadSettingsFromStorage();
            }
        }

        function createSettingsCheckbox(id, settingName, labelText, titleText, divCss, labelCss, optionalAttributes) {
            let $container = $('<div>',{class:'controls-container'});
            let $input = $('<input>', {type:'checkbox',class:'csSettingsCheckBox',name:id, id:id, 'data-setting-name':settingName}).appendTo($container);
            let $label = $('<label>', {for:id}).text(labelText).appendTo($container);
            if (divCss) $container.css(divCss);
            if (labelCss) $label.css(labelCss);
            if (titleText) $container.attr({title:titleText});
            if (optionalAttributes) $input.attr(optionalAttributes);
            return $container;
        }

        function initUserPanel() {
            let $roadTypesDiv = $('<div>', {class:'csRoadTypeButtonsCheckBoxContainer'});
            $roadTypesDiv.append( createSettingsCheckbox('csUseOldRoadColorsCheckBox', 'useOldRoadColors', _trans.prefs.useOldRoadColors) );
            for (let roadTypeAbbr in _roadTypes) {
                let roadType = _roadTypes[roadTypeAbbr];
                let id = 'cs' + roadTypeAbbr + 'CheckBox';
                $roadTypesDiv.append( createSettingsCheckbox(id, 'roadType', roadType.title, null, null, null, {'data-road-type':roadTypeAbbr}) );
                if (roadTypeAbbr === 'PLR') {
                    $roadTypesDiv.append(
                        createSettingsCheckbox('csClearNewPLRCheckBox', 'setNewPLRStreetToNone', _trans.prefs.setStreetCityToNone,
                                               _trans.prefs.setStreetCityToNone_Title,
                                               {paddingLeft:'20px', display:'inline', marginRight:'4px'}, {fontStyle:'italic'}),
                        createSettingsCheckbox('csSetNewPLRCityCheckBox', 'setNewPLRCity', _trans.prefs.setCityToConnectedSegCity,
                                               '', {paddingLeft:'30px', marginRight:'4px'}, {fontStyle:'italic'})
                        //$('<select style="height:24px;" disabled><option>None</option><option>Closest Segmet</option></select>')
                    );
                }
            }

            let $tab = $('<li>',{title:argsObject.scriptName}).append(
                $('<a>', {'data-toggle':'tab', href:'#sidepanel-clicksaver'}).append($('<span>').text('CS'))
            );

            let $panel = $('<div>', {class:'tab-pane', id:'sidepanel-clicksaver'}).append(
                $('<div>',  {class:'side-panel-section>'}).append(
                    $('<div>', {style: 'margin-bottom:8px;'}).append(
                        $('<div>', {class:'form-group'}).append(
                            $('<label>', {class:'cs-group-label'}).text(_trans.prefs.dropdownHelperGroup),
                            $('<div>').append( createSettingsCheckbox('csRoadTypeButtonsCheckBox', 'roadButtons', _trans.prefs.roadTypeButtons) ).append( $roadTypesDiv ),
                            createSettingsCheckbox('csRoutingTypeCheckBox', 'routingTypeButtons', _trans.prefs.routingTypeButtons),
                            createSettingsCheckbox('csElevationButtonsCheckBox', 'elevationButtons', _trans.prefs.elevationButtons),
                            createSettingsCheckbox('csParkingCostButtonsCheckBox', 'parkingCostButtons', _trans.prefs.parkingCostButtons),
                            createSettingsCheckbox('csParkingSpacesButtonsCheckBox', 'parkingSpacesButtons', _trans.prefs.parkingSpacesButtons)
                        ),
                        $('<label>', {class:'cs-group-label'}).text('Time Savers'),
                        $('<div>', {style:'margin-bottom:8px;'}).append(
                            createSettingsCheckbox('csAddAltCityButtonCheckBox', 'addAltCityButton', 'Show "Add alt city" button'),
                            W.loginManager.user.rank >= 3 ? createSettingsCheckbox('csAddSwapPedestrianButtonCheckBox', 'addSwapPedestrianButton', 'Show "Swap driving<->walking segment type" button') : ''
                        )
                    )
                )
            );

            $panel.append(
                $('<div>',{style:'margin-top:20px;font-size:10px;color:#999999;'}).append(
                    $('<div>').text('version ' + argsObject.scriptVersion + (argsObject.scriptName.toLowerCase().indexOf('beta') > -1 ? ' beta' : '')),
                    $('<div>').append(
                        $('<a>',{href:'https://www.waze.com/forum/viewtopic.php?f=819&t=199894', target:'__blank'}).text(_trans.prefs.discussionForumLinkText)
                    )
                )
            );

            $('#user-tabs > .nav-tabs').append($tab);
            $('#user-info > .flex-parent > .tab-content').append($panel);

            // Add change events
            $('#csRoadTypeButtonsCheckBox').change(function() {
                if(this.checked) {
                    $('.csRoadTypeButtonsCheckBoxContainer').show();
                } else {
                    $('.csRoadTypeButtonsCheckBoxContainer').hide();
                }
                saveSettingsToStorage();
            });
            $('.csSettingsCheckBox').change(function() {
                let checked = this.checked;
                let settingName = $(this).data('setting-name');
                if (settingName === 'roadType') {
                    let roadType = $(this).data('road-type');
                    let array = _settings.roadTypeButtons;
                    let index = array.indexOf(roadType);
                    if(checked && index === -1) {
                        array.push(roadType);
                    } else if (!checked && index !== -1) {
                        array.splice(index, 1);
                    }
                } else {
                    _settings[settingName] = checked;
                }
                saveSettingsToStorage();
            });
        }

        function updateControls() {
            if($(_roadTypeDropDownSelector).length>0) {
                if(isChecked('csRoadTypeButtonsCheckBox')) addRoadTypeButtons();
            }
            if($(_routingTypeDropDownSelector && isChecked('csRoutingTypeCheckBox')).length>0) {
                addRoutingTypeButtons();
            }
            if ($(_elevationDropDownSelector).length>0 && isChecked('csElevationButtonsCheckBox')) {
                addElevationButtons();
            }
            if ($(_parkingSpacesDropDownSelector).length>0 && isChecked('csParkingSpacesButtonsCheckBox')) {
                addParkingSpacesButtons();  // TODO - add option setting
            }
            if ($(_parkingCostDropDownSelector).length>0 && isChecked('csParkingCostButtonsCheckBox')) {
                addParkingCostButtons();  // TODO - add option setting
            }
        }

        function replaceWord(target, searchWord, replaceWithWord) {
            return target.replace(new RegExp('\\b' + searchWord + '\\b','g'), replaceWithWord);
        }

        function titleCase(word) {
            return word.charAt(0).toUpperCase() + word.substring(1).toLowerCase();
        }
        function mcCase(word) {
            return word.charAt(0).toUpperCase() + word.charAt(1).toLowerCase() + word.charAt(2).toUpperCase() + word.substring(3).toLowerCase();
        }
        function upperCase(word) {
            return word.toUpperCase();
        }

        function processSubstring(target, substringRegex, processFunction) {
            let substrings = target.match(substringRegex);
            if (substrings) {
                for (let idx=0; idx<substrings.length; idx++) {
                    let substring = substrings[idx];
                    let newSubstring = processFunction(substring);
                    target = replaceWord(target, substring, newSubstring);
                }
            }
            return target;
        }

        function onPaste(e) {
            let targetNode = e.target;
            if (targetNode.name === 'streetName' ||
                targetNode.className.indexOf('street-name') > -1) {

                // Get the text that's being pasted.
                let pastedText = e.clipboardData.getData('text/plain');

                // If pasting text in ALL CAPS...
                if (/^[^a-z]*$/.test(pastedText)) {
                    [
                        // Title case all words first.
                        [/\b[a-zA-Z]+(?:'S)?\b/g, titleCase],

                        // Then process special cases.
                        [/\bMC\w+\b/ig, mcCase],  // e.g. McCaulley
                        [/\b(?:I|US|SH|SR|CH|CR|CS|PR|PS)\s*-?\s*\d+\w*\b/ig, upperCase], // e.g. US-25, US25
                        [/\b(?:AL|AK|AS|AZ|AR|CA|CO|CT|DE|DC|FM|FL|GA|GU|HI|ID|IL|IN|IA|KS|KY|LA|ME|MH|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|MP|OH|OK|OR|PW|PA|PR|RI|SC|SD|TN|TX|UT|VT|VI|VA|WA|WV|WI|WY)\s*-?\s*\d+\w*\b/ig, upperCase], // e.g. WV-52
                        [/\b(?:NE|NW|SE|SW)\b/ig, upperCase]
                    ].forEach(function(item) {
                        pastedText = processSubstring(pastedText,item[0],item[1]);
                    });

                    // Insert new text in the focused node.
                    document.execCommand('insertText', false, pastedText);

                    // Prevent the default paste behavior.
                    e.preventDefault();
                    return false;
                }
            }
            return true;
        }

        function getTranslationObject() {
            if (argsObject.useDefaultTranslation) {
                return DEFAULT_TRANSLATION;
            } else {
                let locale = I18n.currentLocale().toLowerCase();
                if (!argsObject.translations.hasOwnProperty(locale)) {
                    locale = 'en-us';
                }
                return argsObject.translations[locale];
            }
        }

        function errorHandler(callback) {
            try {
                callback();
            } catch (ex) {
                console.error(argsObject.scriptName + ':', ex);
            }
        }

        function init() {
            _trans = getTranslationObject();
            for (let rtName in _roadTypes) {
                _roadTypes[rtName].title = _trans.roadTypeButtons[rtName].title;
                _roadTypes[rtName].text = _trans.roadTypeButtons[rtName].text;
            }
            for (let d in _directions) {
                _directions[d].text = _trans.directionButtons[d].text;
                _directions[d].title = _trans.directionButtons[d].title;
            }

            document.addEventListener('paste', onPaste);
            _lastScriptVersion = localStorage.getItem('wmeClickSaver_lastVersion');
            localStorage.setItem('wmeClickSaver_lastVersion', argsObject.scriptVersion);
            showScriptInfoAlert();
            // check for changes in the edit-panel
            let observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        let addedNode = mutation.addedNodes[i];

                        if (addedNode.nodeType === Node.ELEMENT_NODE) {
                            if(addedNode.querySelector(_roadTypeDropDownSelector)) {
                                if(isChecked('csRoadTypeButtonsCheckBox')) addRoadTypeButtons();
                            }
                            if(addedNode.querySelector(_routingTypeDropDownSelector) && isChecked('csRoutingTypeCheckBox')) {
                                addRoutingTypeButtons();
                            }
                            if (addedNode.querySelector(_elevationDropDownSelector) && isChecked('csElevationButtonsCheckBox')) {
                                addElevationButtons();
                            }
                            if (addedNode.querySelector(_parkingSpacesDropDownSelector) && isChecked('csParkingSpacesButtonsCheckBox')) {
                                addParkingSpacesButtons();  // TODO - add option setting
                            }
                            if (addedNode.querySelector(_parkingCostDropDownSelector) && isChecked('csParkingCostButtonsCheckBox')) {
                                addParkingCostButtons();  // TODO - add option setting
                            }
                            if ($(addedNode).find('label').filter(function() { return $(this).text() === 'Address'; }).length && isChecked('csAddAltCityButtonCheckBox')) {
                                addAddAltCityButton();
                            }
                            if (W.loginManager.user.rank >= 3 && $(addedNode).find('label').filter(function() { return $(this).text() === 'Road type'; }).length && isChecked('csAddSwapPedestrianButtonCheckBox')) {
                                addSwapPedestrianButton();
                            }
                        }
                    }
                });
            });

            observer.observe(document.getElementById('edit-panel'), { childList: true, subtree: true });
            initUserPanel();
            loadSettingsFromStorage();
            injectCss();
            W.app.modeController.model.bind('change:mode', () => errorHandler(onModeChanged));
            W.prefs.on('change:isImperial', () => errorHandler(function() {initUserPanel();loadSettingsFromStorage();}));
            updateControls();   // In case of PL w/ segments selected.
            W.selectionManager.events.register('selectionchanged', null, () => errorHandler(updateControls));

            if (typeof(require) !== 'undefined') {
                UpdateObject = require('Waze/Action/UpdateObject');
                AddOrGetCity = require('Waze/Action/AddOrGetCity');
                AddOrGetStreet = require('Waze/Action/AddOrGetStreet');
                MultiAction = require('Waze/Action/MultiAction');
                AddSeg = require('Waze/Action/AddSegment');
                reqSegment = require('Waze/Feature/Vector/Segment');
                DelSeg = require('Waze/Action/DeleteSegment');
            }
            log('Initialized', 1);
        }

        function bootstrap() {
            if (window.require && W && W.loginManager &&
                W.loginManager.events.register &&
                W.map && W.loginManager.user) {
                log('Initializing...', 1);
                init();
            } else {
                log('Bootstrap failed. Trying again...', 1);
                setTimeout(function () {
                    bootstrap();
                }, 250);
            }
        }

        let DEFAULT_TRANSLATION = {
            'roadTypeButtons':{
                'St':{'title':'Street','text':'St'},
                'PS':{'title':'Primary Street','text':'PS'},
                'mH':{'title':'Minor Highway','text':'mH'},
                'MH':{'title':'Major Highway','text':'MH'},
                'Fw':{'title':'Freeway','text':'Fw'},
                'Rmp':{'title':'Ramp','text':'Rmp'},
                'OR':{'title':'Off-road / Not Maintained','text':'OR'},
                'PLR':{'title':'Parking Lot Road','text':'PLR'},
                'PR':{'title':'Private Road','text':'PR'},
                'Fer':{'title':'Ferry','text':'Fer'},
                'WT':{'title':'Walking Trail','text':'WT'},
                'PB':{'title':'Pedestrian Boardwalk','text':'PB'},
                'Sw':{'title':'Stairway','text':'Sw'},
                'RR':{'title':'Railroad (non-drivable)','text':'RR'},
                'RT':{'title':'Runway/Taxiway (non-drivable)','text':'RT'},
                'Pw':{'title':'Passageway','text':'Pw'}
            },
            'directionButtons':{
                'twoWay':{'title':'Two way','text':'Two way'},
                'oneWayAB':{'title':'One way (A → B)','text':'A → B'},
                'oneWayBA':{'title':'One way (B → A)','text':'B → A'},
                'unknown':{'title':'Unknown','text':'?'}
            },
            'groundButtonText':'Ground',
            'autoLockButtonText':'Auto',
            'multiLockLevelWarning':'Multiple lock levels selected!',
            'prefs':{
                'dropdownHelperGroup':'DROPDOWN HELPERS',
                'roadTypeButtons':'Add road type buttons',
                'useOldRoadColors':'Use old road colors (requires refresh)',
                'setStreetCityToNone':'Set Street/City to None (new PLR only)',
                'setStreetCityToNone_Title':'NOTE: Only works if connected directly or indirectly to a segment with State/Country already set.',
                'setCityToConnectedSegCity':'Set City to connected segment\'s City',
                'routingTypeButtons':'Add routing type buttons',
                'elevationButtons':'Add elevation buttons',
                'parkingCostButtons':'Add PLA cost buttons',
                'parkingSpacesButtons':'Add PLA estimated spaces buttons',
                'spaceSaversGroup':'SPACE SAVERS',
                'inlineRoadType':'Inline road type checkboxes',
                'avgSpeedCameras':'Hide Avg Speed Cameras',
                'inlineParkingStuff':'Inline parking/payment type checkboxes',
                'discussionForumLinkText':'Discussion Forum'
            }
        };

        log('Bootstrap...', 1);
        bootstrap();

        //---------------------------------------------------------------------------------------------
        // ==UserScript==
        // @name         WMEQuickAltDel
        // @namespace    http://tampermonkey.net/
        // @version      0.0.2
        // @description  try to take over the world!
        // @author       Jonathan Angliss (modifications by MapOMatic)
        // @include      /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/.*$/
        // @grant        none
        // ==/UserScript==

        (function() {
            'use strict';

            let UpdateObject;

            function WMEaltStreet_Remove( elemClicked ) {
                let altID = parseInt($(elemClicked.currentTarget).data('id'));
                let selectedObjs = W.selectionManager.getSelectedFeatures();
                selectedObjs.forEach(function(element) {
                    if (element.model.type === 'segment') {
                        let segment = element.model;
                        if (segment.attributes.streetIDs.indexOf(altID) !== -1) {
                            let newStreets = [];
                            segment.attributes.streetIDs.forEach(function(sID) {
                                if (altID !== sID) {
                                    newStreets.push(sID);
                                }
                            });
                            let sUpdate = new UpdateObject(segment, {streetIDs: newStreets});
                            W.model.actionManager.add(sUpdate);
                            updateAltStreetCtrls();
                        }
                    }
                });
            }

            function bootstrap_WMEQuickAltDel() {
                if (window.require && W && W.loginManager &&
                    W.loginManager.events.register &&
                    W.map && W.loginManager.isLoggedIn()) {
                    init_WMEQuickAltDel();
                } else {
                    setTimeout(function () {
                        bootstrap_WMEQuickAltDel();
                    }, 250);
                }
            }

            function init_WMEQuickAltDel() {
                W.selectionManager.events.register('selectionchanged', null, () => errorHandler(updateAltStreetCtrls));
                W.model.actionManager.events.register('afterundoaction',null, () => errorHandler(updateAltStreetCtrls));
                W.model.actionManager.events.register('hasActions',null, () => errorHandler(()=>setTimeout(updateAltStreetCtrls, 250)));
                W.model.actionManager.events.register('noActions',null, () => errorHandler(()=>setTimeout(updateAltStreetCtrls, 250)));
                W.model.actionManager.events.register('afteraction',null, () => errorHandler(updateAltStreetCtrls));

                if (typeof(require) !== 'undefined') {
                    UpdateObject = require('Waze/Action/UpdateObject');
                }

                let observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        if ($(mutation.target).hasClass('preview')) updateAltStreetCtrls();
                    });
                });
                observer.observe(document.getElementById('edit-panel'), { childList: true, subtree: true });
            }

            function updateAltStreetCtrls() {
                if (W.selectionManager.getSelectedFeatures().length > 0) {
                    let selItems = W.selectionManager.getSelectedFeatures();
                    if (selItems.length > 0 && selItems[0].model.type === 'segment') {
                        let $idElements = $('.add-alt-street-form .alt-street');
                        let $liElements = $('li.alt-street');
                        for (let i = 0; i < $idElements.length; i++) {
                            let $idElem = $idElements.eq(i);
                            let $liElem = $liElements.eq(i);
                            if($liElem.find('i').length === 0){//prevent duplicate entries
                                $liElem.append(
                                    $('<i>', {class:'fa fa-times-circle'}).css({cursor:'pointer'}).data('id', $idElem.data('id')).click(WMEaltStreet_Remove)
                                );
                            }
                        }
                    }
                }
            }

            bootstrap_WMEQuickAltDel();
        })();
    }

    function injectMain(argsObject) {
        let scriptElem = document.createElement('script');
        scriptElem.textContent = '(function(){' + main.toString() + '\n main(' + JSON.stringify(argsObject).replace('\'','\\\'') + ')})();';
        scriptElem.setAttribute('type', 'application/javascript');
        document.body.appendChild(scriptElem);
    }

    function setValue(object, path, value) {
        let pathParts = path.split('.');
        for (let i = 0; i < pathParts.length - 1; i++) {
            let pathPart = pathParts[i];
            if (pathPart in object) {
                object = object[pathPart];
            } else {
                object[pathPart] = {};
                object = object[pathPart];
            }
        }
        object[pathParts[pathParts.length - 1]] = value;
    }

    function convertTranslationsArrayToObject(arrayIn) {
        let translations = {};
        let iRow, iCol;
        let languages = arrayIn[0].map(function(lang) { return lang.toLowerCase(); });
        for (iCol=1; iCol<languages.length; iCol++) {
            translations[languages[iCol]] = {};
        }
        for (iRow=1; iRow<arrayIn.length; iRow++) {
            let row = arrayIn[iRow];
            let propertyPath = row[0];
            for (iCol=1; iCol<row.length; iCol++) {
                setValue(translations[languages[iCol]], propertyPath, row[iCol]);
            }
        }
        return translations;
    }

    GM_xmlhttpRequest({
        url: TRANSLATIONS_URL,
        method: 'GET',
        overrideMimeType: 'text/csv',
        onload: function(res) {
            let args;
            if (res.status === 200) {
                let translationsArray = res.responseText.split(/\r?\n/).map(function(t) { return t.split(/\t/); });
                args = { scriptName: GM_info.script.name, scriptVersion: GM_info.script.version, translations: convertTranslationsArrayToObject(translationsArray) };
            } else {
                args = { scriptName: GM_info.script.name, scriptVersion: GM_info.script.version, useDefaultTranslation: true };
            }
            injectMain(args);
        },
        onerror: function() {
            injectMain({ scriptName: GM_info.script.name, scriptVersion: GM_info.script.version, useDefaultTranslation: true });
        }
    });

})();
