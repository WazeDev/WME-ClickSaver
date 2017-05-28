// ==UserScript==
// @name         WME ClickSaver (beta)
// @namespace    https://greasyfork.org/users/45389
// @version      0.7.1
// @description  Various UI changes to make editing faster and easier.
// @author       MapOMatic
// @include      https://beta.waze.com/*editor/*
// @include      https://www.waze.com/*editor/*
// @exclude      https://www.waze.com/*user/editor/*
// @license      GNU GPLv3
// @grant        none
// ==/UserScript==

/* global GM_info */
/* global W */
/* global Node */

(function() {
    //'use strict';

    var _debugLevel = 0;
    var _roadTypeDropDownSelector = 'select[name="roadType"]';
    var _lockDropDownSelector = 'select[name="lockRank"]';
    var _directionDropDownSelector = 'select[name="direction"]';
    var _elevationDropDownSelector = 'select[name="level"]';
    var _routingTypeDropDownSelector = 'select[name="routingRoadType"]';
    var _alertUpdate = true;
    var _settings = {};
    var _settingsStoreName = 'clicksaver_settings';
    var _lastScriptVersion;
    var _scriptVersion = GM_info.script.version;
    var _scriptVersionChanges = [
        GM_info.script.name,
        'v' + _scriptVersion,
        '',
        'What\'s New',
        '------------------------------',
        '0.7.1: NEW - Added option to replace Routing Road Type drop down with radio buttons.',
        '0.7.0: NEW - Option to set City to closest attached segment City, for new PLR road segments.',
        '0.6.7: FIXED - Lock buttons don\'t always match available options in the original dropdown.'
    ].join('\n');
    var _roadTypes = {
        St:{val:1, title:'Street', wmeColor:'#ffffeb', svColor:'#ffffff', category:'streets', visible:true},
        PS:{val:2, title:'Primary Street', wmeColor:'#f0ea58', svColor:'#cba12e', category:'streets', visible:true},
        mH:{val:7, title:'Minor Highway', wmeColor:'#69bf88', svColor:'#ece589', category:'highways', visible:true},
        MH:{val:6, title:'Major Highway', wmeColor:'#45b8d1', svColor:'#c13040', category:'highways', visible:true},
        Fw:{val:3, title:'Freeway', wmeColor:'#c577d2', svColor:'#387fb8', category:'highways', visible:false},
        Rmp:{val:4, title:'Ramp', wmeColor:'#b3bfb3', svColor:'#58c53b', category:'highways', visible:false},
        OR:{val:8, title:'Off-road / Not maintained', wmeColor:'#867342', svColor:'#82614a', category:'otherDrivable', visible:false},
        PLR:{val:20, title:'Parking Lot Road', wmeColor:'#ababab', svColor:'#2282ab', category:'otherDrivable', visible:true},
        PR:{val:17, title:'Private Road', wmeColor:'#beba6c', svColor:'#00ffb3', category:'otherDrivable', visible:true},
        Fer:{val:15, title:'Ferry', wmeColor:'#d7d8f8', svColor:'#ff8000', category:'otherDrivable', visible:false},
        WT:{val:5, title:'Walking Trail (non-drivable)', wmeColor:'#b0a790', svColor:'#00ff00', category:'nonDrivable', visible:false},
        PB:{val:10, title:'Pedestrian Boardwalk (non-drivable)', wmeColor:'#9a9a9a', svColor:'#0000ff', category:'nonDrivable', visible:false},
        Sw:{val:16, title:'Stairway (non-drivable)', wmeColor:'#999999', svColor:'#b700ff', category:'nonDrivable', visible:false},
        RR:{val:18, title:'Railroad (non-drivable)', wmeColor:'#c62925', svColor:'#ffffff', category:'nonDrivable', visible:false},
        RT:{val:19, title:'Runway/Taxiway (non-drivable)', wmeColor:'#ffffff', svColor:'#00ff00', category:'nonDrivable', visible:false}
    };
    var _directions = {
        twoWay:{val:3, text:'Two way', title:'Two way'},
        oneWayAB:{val:1, text:'A → B', title:'One way (A → B)' },
        oneWayBA:{val:2, text:'B → A', title:'One way (B → A)' },
        unknown:{val:0, text:'?', title:'Unknown'}
    };

    var UpdateObject,
        AddOrGetCity,
        AddOrGetStreet,
        MultiAction;

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
        var loadedSettings = $.parseJSON(localStorage.getItem(_settingsStoreName));
        var defaultSettings = {
            lastVersion: null,
            roadButtons: true,
            roadTypeButtons: ['St','PS','mH','MH','OR','PLR','PR'],
            lockButtons: true,
            elevationButtons: true,
            directionButtons: true,
            routingTypeButtons: true,
            inlineRoadTypeCheckboxes: true,
            hideAvgSpeedCameras: true,
            setNewPLRStreetToNone: true,
            setNewPLRCity: true,
            useOldRoadColors: false
        };
        _settings = loadedSettings ? loadedSettings : defaultSettings;
        for (var prop in defaultSettings) {
            if (!_settings.hasOwnProperty(prop)) {
                _settings[prop] = defaultSettings[prop];
            }
        }

        setChecked('csRoadTypeButtonsCheckBox', _settings.roadButtons);
        if (_settings.roadTypeButtons) {
            for (var roadTypeAbbr1 in _roadTypes) {
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
        setChecked('csRoutingTypeCheckBox', _settings.routingTypeButtons);
        setChecked('csInlineRoadTypesCheckBox', _settings.inlineRoadTypeCheckboxes);
        setChecked('csHideAvgSpeedCamerasCheckBox', _settings.hideAvgSpeedCameras);
        setChecked('csClearNewPLRCheckBox', _settings.setNewPLRStreetToNone);
        setChecked('csUseOldRoadColorsCheckBox', _settings.useOldRoadColors);
        setChecked('csSetNewPLRCityCheckBox', _settings.setNewPLRCity);
    }

    function saveSettingsToStorage() {
        if (localStorage) {
            var settings = {
                lastVersion: _scriptVersion,
                roadButtons: _settings.roadButtons,
                lockButtons: _settings.lockButtons,
                elevationButtons: _settings.elevationButtons,
                directionButtons: _settings.directionButtons,
                inlineRoadTypeCheckboxes: _settings.inlineRoadTypeCheckboxes,
                hideAvgSpeedCameras: _settings.hideAvgSpeedCameras,
                setNewPLRStreetToNone: _settings.setNewPLRStreetToNone,
                useOldRoadColors: _settings.useOldRoadColors,
                setNewPLRCity: _settings.setNewPLRCity
            };
            settings.roadTypeButtons = [];
            for (var roadTypeAbbr in _roadTypes) {
                if(_settings.roadTypeButtons.indexOf(roadTypeAbbr) !== -1) { settings.roadTypeButtons.push(roadTypeAbbr); }
            }
            localStorage.setItem(_settingsStoreName, JSON.stringify(settings));
            log('Settings saved', 1);
        }
    }

    function getConnectedSegmentIDs(segmentID) {
        var IDs = [];
        var segment = W.model.segments.get(segmentID);
        [W.model.nodes.get(segment.attributes.fromNodeID), W.model.nodes.get(segment.attributes.toNodeID)].forEach(function(node) {
            if (node) {
                node.attributes.segIDs.forEach(function(segID) {
                    if (segID !== segmentID) { IDs.push(segID); }
                });
            }
        });
        return IDs;
    }

    function getFirstConnectedStateID(startSegment) {
        var stateID = null;
        var nonMatches = [];
        var segmentIDsToSearch = [startSegment.attributes.id];
        while (stateID === null && segmentIDsToSearch.length > 0) {
            var startSegmentID = segmentIDsToSearch.pop();
            startSegment = W.model.segments.get(startSegmentID);
            var connectedSegmentIDs = getConnectedSegmentIDs(startSegmentID);
            for (var i=0;i<connectedSegmentIDs.length;i++) {
                var streetID = W.model.segments.get(connectedSegmentIDs[i]).attributes.primaryStreetID;
                if (streetID !== null && typeof(streetID) !== 'undefined') {
                    var cityID = W.model.streets.get(streetID).cityID;
                    stateID = W.model.cities.get(cityID).attributes.stateID;
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
        var cityID = null;
        var nonMatches = [];
        var segmentIDsToSearch = [startSegment.attributes.id];
        while (cityID === null && segmentIDsToSearch.length > 0) {
            var startSegmentID = segmentIDsToSearch.pop();
            startSegment = W.model.segments.get(startSegmentID);
            var connectedSegmentIDs = getConnectedSegmentIDs(startSegmentID);
            for (var i=0;i<connectedSegmentIDs.length;i++) {
                var streetID = W.model.segments.get(connectedSegmentIDs[i]).attributes.primaryStreetID;
                if (streetID !== null && typeof(streetID) !== 'undefined') {
                    cityID = W.model.streets.get(streetID).cityID;
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
        var emptyCity = null;
        W.model.cities.getObjectArray().forEach(function(city) {
            if (city.attributes.stateID === stateID && city.attributes.isEmpty) {
                emptyCity = city;
            }
        });
        return emptyCity;
    }
    function getCity(cityID) {
        var cities = W.model.cities.getByIds([cityID]);
        if (cities.length > 0) {
            return cities[0];
        } else {
            return null;
        }
    }

    function setStreetAndCity () {
        var segments = W.selectionManager.selectedItems;
        var setCity = isChecked('csSetNewPLRCityCheckBox');
        if (segments.length === 0 || segments[0].model.type !== 'segment') {
            return;
        }

        segments.forEach(function(segment) {
            var segModel = segment.model;
            if (segModel.attributes.primaryStreetID === null) {
                var stateID = getFirstConnectedStateID(segment.model);
                if (stateID) {
                    var state = W.model.states.get(stateID);
                    var country = W.model.countries.get(state.countryID);

                    var m_action = new MultiAction();
                    var cityToSet;
                    m_action.setModel(W.model);
                    if (setCity) cityToSet = getCity(getFirstConnectedCityID(segment.model));
                    if (!cityToSet) cityToSet = getEmptyCity(state.id);
                    if (!cityToSet) {
                        var addCityAction = new AddOrGetCity(state, country, "", true);
                        m_action.doSubAction(addCityAction);
                        cityToSet = getEmptyCity(state.id);
                    }
                    var newStreet = {isEmpty:true, cityID:cityToSet.attributes.id};
                    var emptyStreet = W.model.streets.getByAttributes(newStreet)[0];
                    if (!emptyStreet) {
                        var addStreetAction = new AddOrGetStreet("", cityToSet, true);
                        m_action.doSubAction(addStreetAction);
                        emptyStreet = W.model.streets.getByAttributes(newStreet)[0];
                    }
                    var action3 = new UpdateObject(segModel, {primaryStreetID: emptyStreet.id});
                    m_action.doSubAction(action3);
                    W.model.actionManager.add(m_action);
                }
            }
        });
    }

    function onRoadTypeButtonClick(roadTypeAbbr) {
        $(_roadTypeDropDownSelector).val(_roadTypes[roadTypeAbbr].val).change();
        if (roadTypeAbbr === 'PLR' && isChecked('csClearNewPLRCheckBox') && require) {
            setStreetAndCity();
        }
    }

    function addRoadTypeButtons() {
        var $dropDown = $(_roadTypeDropDownSelector);
        $('#csRoadTypeButtonsContainer').remove();
        var $container = $('<div>',{id:'csRoadTypeButtonsContainer',class:'rth-btn-container'});
        var $street = $('<div>', {id:'csStreetButtonContainer',class:'cs-rt-btn-container'});
        var $highway = $('<div>', {id:'csHighwayButtonContainer',class:'cs-rt-btn-container'});
        var $otherDrivable = $('<div>', {id:'csOtherDrivableButtonContainer',class:'cs-rt-btn-container'});
        var $nonDrivable = $('<div>', {id:'csNonDrivableButtonContainer',class:'cs-rt-btn-container'});
        var divs = {streets:$street, highways:$highway, otherDrivable:$otherDrivable, nonDrivable:$nonDrivable};
        for (var roadTypeAbbr in _roadTypes) {
            if (_settings.roadTypeButtons.indexOf(roadTypeAbbr) !== -1) {
                var roadType = _roadTypes[roadTypeAbbr];
                var $div = divs[roadType.category];
                $div.append(
                    $('<div>', {class:'btn btn-rth btn-rth-' + roadTypeAbbr + ($dropDown.attr('disabled') ? ' disabled' : '') + ' btn-positive',title:roadType.title})
                    .text(roadTypeAbbr)
                    .prop('checked', roadType.visible)
                    .click(function() { onRoadTypeButtonClick(this.innerHTML); })
                );
            }
        }
        $container.append($street).append($highway).append($otherDrivable).append($nonDrivable);
        $dropDown.before($container);
    }

    function addDirectionButtons() {
        var $dropDown = $(_directionDropDownSelector);
        $('#csDirectionButtonsContainer').remove();
        var $form = $('<div>', {id:"csDirectionButtonsContainer",style:"height:30px;padding-top:0px"});
        for (var prop in _directions) {
            if (prop !== 'unknown' || $('select[name="direction"]').has('option[value="0"]').length > 0) {
                var $input = $('<input>', {type:"radio", name:"direction", title:_directions[prop].title, id:prop, value:_directions[prop].val})
                .click(function() {
                    $(_directionDropDownSelector).val($(this).attr('value')).change();
                    hideAvgSpeedCameras();
                });
                if (String(_directions[prop].val) === String($dropDown.val())) $input.prop('checked', 'true');
                $form.append(
                    $('<div class="controls-container" style="float: left; margin-right: 10px;margin-left:0px">').append(
                        $input,
                        $('<label for="' + prop + '" style="padding-left: 20px;">').text(_directions[prop].text)
                    )
                );
            }
        }
        $dropDown.before($form);
        $dropDown.hide();
    }

    function addRoutingTypeButtons() {
        var $dropDown = $(_routingTypeDropDownSelector);
        if ($dropDown.length > 0) {
            var options = $dropDown.children();
            if (options.length === 3) {
                var buttonInfos = [
                    ['-1', options[0].value, options[0].text],
                    [options[1].text, options[1].value, ''],
                    ['+1', options[2].value, options[2].text]
                ];
                $('#csRoutingTypeContainer').remove();
                var $form = $('<div>', {id:"csRoutingTypeContainer",style:"height:30px;padding-top:0px"});
                for (var i=0; i<buttonInfos.length; i++) {
                    var btnInfo = buttonInfos[i];
                    var $input = $('<input>', {type:"radio", name:"routingRoadType", id:"routingRoadType" + i, value:btnInfo[1]})
                    .click(function() {
                        $(_routingTypeDropDownSelector).val($(this).attr('value')).change();
                        //hideAvgSpeedCameras();
                    });
                    if (String(btnInfo[1]) === String($dropDown.val())) $input.prop('checked', 'true');
                    $form.append(
                        $('<div class="controls-container" style="float: left; margin-right: 10px;margin-left:0px">').append(
                            $input,
                            $('<label>', {for:'routingRoadType' + i, style:"padding-left: 20px;", title:btnInfo[2]}).text(btnInfo[0])
                        )
                    );

                }

                $dropDown.before($form);
                $dropDown.hide();
            }
        }
    }

    function addLockButtons() {
        var $lockDropDown = $(_lockDropDownSelector);
        var selItems = W.selectionManager.selectedItems;
        var item = selItems[0];
        var isSegments = (item.model.type === "segment");
        var isJunctionBox = (item.model.type === "bigJunction");
        var attr = item.model.attributes;
        var autoRank = attr.rank;
        var manualRank = attr.lockRank;
        var firstManualRank = manualRank;
        var userRank = W.loginManager.getUserRank();
        var maxAutoRank = autoRank;
        var multiRanks = false;
        var isOutranked =( manualRank > userRank || (manualRank === null && autoRank > userRank));

        // If it's a junction box, don't change the lock stuff.
        if (isJunctionBox) return;

        for (var i=1; i<selItems.length; i++) {
            item = selItems[i];
            attr = item.model.attributes;
            autoRank = attr.rank;
            manualRank = attr.lockRank;
            multiRanks |= (manualRank !== firstManualRank);
            isOutranked |= (manualRank > userRank || (manualRank === null && autoRank > userRank));
            maxAutoRank = autoRank > maxAutoRank ? autoRank : maxAutoRank;
        }
        $('#csLockButtonsContainer').remove();
        var $div = $('<div>',{id:'csLockButtonsContainer',style:'margin-bottom:5px;'});
        var btnInfos = [];
        var dropdownDisabled = $lockDropDown.attr('disabled') === 'disabled';
        if (isSegments) {btnInfos.push({r:maxAutoRank,title:'Auto (' + (maxAutoRank + 1) + ')',val:"null"});}
        for(var iBtn=0;iBtn<6;iBtn++){btnInfos.push({r:iBtn,val:iBtn.toString()});}
        var optionNodes = $('select[name="lockRank"] option');
        var optionValues = [];
        for (i=0; i<optionNodes.length; i++) {
            optionValues.push($(optionNodes[i]).val());
        }
        btnInfos.forEach(function(btnInfo){
            var selected = !multiRanks && btnInfo.val === String(manualRank);
            var isDisabled = dropdownDisabled || optionValues.indexOf(btnInfo.val) === -1;
            $div.append(
                $('<div>', {
                    class:'btn btn-lh' + (selected ? ' btn-lh-selected':'') + (isDisabled ? ' disabled' : '')
                })
                .text(btnInfo.hasOwnProperty('title') ? btnInfo.title : btnInfo.r + 1)
                .data('val',btnInfo.hasOwnProperty('val') ? btnInfo.val : btnInfo.r + 1)
                .hover(function() {})
                .click(function() {
                    if(!isDisabled) {
                        $(_lockDropDownSelector).val($(this).data('val')).change();
                        addLockButtons($(_lockDropDownSelector));
                    }
                })
            );
        });
        if (optionValues.indexOf('6') > -1) {
            var selected = !multiRanks && '6' === String(manualRank);
            $div.append(
                $('<div>', {class:'btn btn-lh' + (selected ? ' btn-lh-selected':'') + ' disabled'})
                .text('7')
                .data('val',7)
                .hover(function() {})
                .click(function() {
                    var a = new Audio('https://c6.rbxcdn.com/6db610c9a3bf131f1db6c785f465406d');
                    a.play();
                })
            );
        }

        if (multiRanks) {
            $div.append($('<div>').text('Multiple lock levels selected!').css({color:'red',fontSize:'smaller',fontWeight:'bold',marginLeft:'20px'}));
        }

        $lockDropDown.before($div);
        $lockDropDown.hide();
    }

    function addElevationButtons() {
        var id = 'csElevationButtonsContainer';
        if ($('#' + id).length===0) {
            var $dropDown = $(_elevationDropDownSelector);
            var baseClass = 'btn btn-default' + ($dropDown.attr('disabled') ? ' disabled' : '');
            var style = 'height: 20px;line-height: 20px;padding-left: 8px;padding-right: 8px;margin-right: 4px;padding-top: 1px;';
            var $div = $('<div>', {id:id, style:'margin-bottom: 5px;'}).append(
                $('<div>',{class:baseClass, style:style}).text('-').click(function() {
                    var level = parseInt($(_elevationDropDownSelector).val());
                    if (level > -5) { $(_elevationDropDownSelector).val(level - 1).change(); }
                })
            ).append(
                $('<div>',{class:baseClass, style:style}).text('Ground')
                .click(function() {
                    var level = parseInt($(_elevationDropDownSelector).val());
                    if (level !== 0) { $(_elevationDropDownSelector).val(0).change(); }
                })
            ).append(
                $('<div>',{class:baseClass, style:style}).text('+').click(function() {
                    var level = parseInt($(_elevationDropDownSelector).val());
                    if (level < 9) { $(_elevationDropDownSelector).val(level + 1).change(); }
                })
            );
            $dropDown.css({display:'inline-block',width:'120px',marginRight:'10px'});
            $dropDown.before($div);
            $dropDown.detach();
            $div.prepend($dropDown);
        }
    }

    function showScriptInfoAlert() {
        /* Check version and alert on update */
        if (_alertUpdate && _scriptVersion !== _lastScriptVersion) {
            alert(_scriptVersionChanges);
        }
    }

    function shadeColor2(color, percent) {
        var f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
        return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
    }

    function buildRoadTypeButtonCss() {
        var lines = [];
        var useOldColors = _settings.useOldRoadColors;
        for (var roadTypeAbbr in _roadTypes) {
            var roadType = _roadTypes[roadTypeAbbr];
            var bgColor = useOldColors ? roadType.svColor : roadType.wmeColor;
            var output = '.rth-btn-container .btn-rth-' + roadTypeAbbr + ' {background-color:' + bgColor + ';box-shadow:0 2px ' + shadeColor2(bgColor, -0.5) + ';border-color:' + shadeColor2(bgColor,-0.15) + ';}';
            output += ' .rth-btn-container .btn-rth-' + roadTypeAbbr + ':hover {background-color:' + shadeColor2(bgColor,0.2) + '}';
            lines.push(output);
        }
        return lines.join(' ');
    }

    function injectCss() {
        var css =  [
            // Road type button formatting
            '.csRoadTypeButtonsCheckBoxContainer {margin-left:15px;}',
            '.rth-btn-container {margin-bottom:5px;}',
            '.rth-btn-container .btn-rth {font-size:11px;line-height:20px;color:black;padding:0px 4px;height:20px;margin-right:2px;border-style:solid;border-width:1px;}',
            buildRoadTypeButtonCss(),
            '.btn.btn-rth:active {box-shadow:none;transform:translateY(2px)}',
            'div .cs-rt-btn-container {float:left; margin: 0px 5px 5px 0px;}',
            '#sidepanel-clicksaver .controls-container {padding:0px;}',

            // Lock button formatting
            '.btn-lh {cursor:pointer;padding:1px 6px;height:22px;border:solid 1px #c1c1c1;margin-right:3px;}',
            '.btn.btn-lh.btn-lh-selected {background-color:#6999ae;color:white}',
            '.btn.btn-lh.btn-lh-selected:hover {color:white}',
            '.btn.btn-lh.disabled {color:#909090;background-color:#f7f7f7;}',
            '.btn.btn-lh.btn-lh-selected.disabled {color:white;background-color:#6999ae;}'
        ].join(' ');
        $('<style type="text/css">' + css + '</style>').appendTo('head');
    }

    function inlineRoadTypeCheckboxes() {
        // TODO - move styling to css.
        var $div = $('<div>',{style:'font-size:11px;display:inline-block;'});
        ['tollRoadCheck','unpavedCheckbox','tunnelCheckbox'].forEach(function(id) {
            $('label[for="' + id + '"]').css({paddingLeft:'20px'});
            $('#' + id).parent().css({float:'left',marginRight:'4px'}).detach().appendTo($div);
        });
        $(_roadTypeDropDownSelector).after($div);
    }

    function hideAvgSpeedCameras() {
        $('#fwdSpeedCameraCheckbox').closest('.form-group').hide();
        $('#revSpeedCameraCheckbox').closest('.form-group').hide();
    }

    function onModeChanged(model, modeId, context) {
        if(!modeId || modeId === 1) {
            initUserPanel();
            loadSettingsFromStorage();
        }
    }

    function createSettingRadio(settingName, groupName, groupLabel, buttonMetas) {
        var $container = $('<div>',{class:'controls-container'});
        $('<input>', {type:'checkbox', class:'csSettingsCheckBox', id:groupName, 'data-setting-name':groupName}).appendTo($container);
        $('<label>', {for:groupName}).text(groupLabel).css({marginRight:'10px'}).appendTo($container);
        buttonMetas.forEach(function(meta) {
            var $input = $('<input>', {type:'radio', class:'csSettingsCheckBox', name:groupName, id:meta.id, 'data-setting-name':groupName}).css({marginLeft:'5px'}).appendTo($container);
            var $label = $('<label>', {for:meta.id}).text(meta.labelText).appendTo($container);
        });
        return $container;
    }

    function createSettingsCheckbox(id, settingName, labelText, titleText, divCss, labelCss, optionalAttributes) {
        var $container = $('<div>',{class:'controls-container'});
        var $input = $('<input>', {type:'checkbox',class:'csSettingsCheckBox',name:id, id:id, 'data-setting-name':settingName}).appendTo($container);
        var $label = $('<label>', {for:id}).text(labelText).appendTo($container);
        if (divCss) $container.css(divCss);
        if (labelCss) $label.css(labelCss);
        if (titleText) $container.attr({title:titleText});
        if (optionalAttributes) $input.attr(optionalAttributes);
        return $container;
    }

    function initUserPanel() {
        var $roadTypesDiv = $('<div>', {class:'csRoadTypeButtonsCheckBoxContainer'});
        $roadTypesDiv.append( createSettingsCheckbox('csUseOldRoadColorsCheckBox', 'useOldRoadColors', 'Use old road colors (requires refresh)') );
        for (var roadTypeAbbr in _roadTypes) {
            var roadType = _roadTypes[roadTypeAbbr];
            var id = 'cs' + roadTypeAbbr + 'CheckBox';
            $roadTypesDiv.append( createSettingsCheckbox(id, 'roadType', roadType.title, null, null, null, {'data-road-type':roadTypeAbbr}) );
            if (roadTypeAbbr === 'PLR') {
                $roadTypesDiv.append(
                    createSettingsCheckbox('csClearNewPLRCheckBox', 'setNewPLRStreetToNone','Set Street/City to None (new PLR only)',
                                           'NOTE: Only works if connected directly or indirectly to a segment with State/Country already set.',
                                           {paddingLeft:'20px', display:'inline', marginRight:'4px'}, {fontStyle:'italic'}),
                    createSettingsCheckbox('csSetNewPLRCityCheckBox', 'setNewPLRCity','Set City to connected segment\'s City',
                                           '', {paddingLeft:'30px', marginRight:'4px'}, {fontStyle:'italic'})
                    //$('<select style="height:24px;" disabled><option>None</option><option>Closest Segmet</option></select>')
                );
            }
        }

        var $tab = $('<li>',{title:'ClickSaver'}).append(
            $('<a>', {'data-toggle':'tab', href:'#sidepanel-clicksaver'}).append($('<span>').text('CS'))
        );

        var $panel = $('<div>', {class:'tab-pane', id:'sidepanel-clicksaver'})
        .append(
            $('<div>',  {class:'side-panel-section>'})
            .append(
                $('<div>', {style: 'margin-bottom:8px;'})
                .append(
                    $('<div>', {class:'form-group'}).append(
                        $('<label>', {class:"control-label"}).text('DROPDOWN HELPERS'),
                        $('<div>').append( createSettingsCheckbox('csRoadTypeButtonsCheckBox', 'roadButtons', 'Add road type buttons') ).append( $roadTypesDiv ),
                        createSettingsCheckbox('csRoutingTypeCheckBox', 'routingTypeButtons', 'Add routing type buttons'),
                        createSettingsCheckbox('csDirectionButtonsCheckBox', 'directionButtons', 'Add road direction buttons'),
                        createSettingsCheckbox('csElevationButtonsCheckBox', 'elevationButtons', 'Add elevation buttons'),
                        createSettingsCheckbox('csLockButtonsCheckBox', 'lockButtons', 'Add lock buttons')
                    )
                    .append( $('<label>', {class:"control-label"}).text('SPACE SAVERS') )
                    .append(
                        $('<div>', {style:'margin-bottom:8px;'})
                        .append( createSettingsCheckbox('csInlineRoadTypesCheckBox', 'inlineRoadTypeCheckboxes', 'Inline road type checkboxes') )
                        .append( createSettingsCheckbox('csHideAvgSpeedCamerasCheckBox', 'hideAvgSpeedCameras', 'Avg Speed Cameras') )
                    )
                    // .append( $('<label>', {class:"control-label"}).text('BEHAVIOR MODIFIERS') )
                    // .append(
                    //     $('<div>', {style:'margin-bottom:20px;'})
                    //     .append(
                    //         createRadioGroup('cs-plr-default-address', 'PLR:', [{id:'cs-plr-default-address-none', labelText: 'None'}, {id:'cs-plr-default-address-closest', labelText: 'Closest Segment'}])
                    //     )
                    // )
                )
            )
        );

        $panel.append(
            $('<div>',{style:'margin-top:20px;font-size:10px;color:#999999;'})
            .append($('<div>').text('version ' + _scriptVersion + (GM_info.script.name.toLowerCase().indexOf('beta') > -1 ? ' beta' : '')))
            .append( $('<div>').append( $('<a>',{href:'https://www.waze.com/forum/viewtopic.php?f=819&t=199894', target:'__blank'}).text('Discussion Forum') ) )
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
            var checked = this.checked;
            var settingName = $(this).data('setting-name');
            if (settingName === 'roadType') {
                var roadType = $(this).data('road-type');
                var array = _settings.roadTypeButtons;
                var index = array.indexOf(roadType);
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
            if(isChecked('csHideAvgSpeedCamerasCheckBox')) hideAvgSpeedCameras();
            if(isChecked('csInlineRoadTypesCheckBox')) inlineRoadTypeCheckboxes();
        }
        if($(_lockDropDownSelector).length>0) {
            if(isChecked('csLockButtonsCheckBox')) addLockButtons();
        }
        if($(_directionDropDownSelector).length>0) {
            if(isChecked('csDirectionButtonsCheckBox')) addDirectionButtons();
        }
        if($(_routingTypeDropDownSelector).length>0) {
            if(isChecked('csRoutingTypeCheckBox')) addRoutingTypeButtons();
        }
        if ($(_elevationDropDownSelector).length>0) {
            if(isChecked('csElevationButtonsCheckBox')) addElevationButtons();
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
        var substrings = target.match(substringRegex);
        if (substrings) {
            for (var idx=0; idx<substrings.length; idx++) {
                var substring = substrings[idx];
                var newSubstring = processFunction(substring);
                target = replaceWord(target, substring, newSubstring);
            }
        }
        return target;
    }

    function onPaste(e) {
        var targetNode = e.target;
        if (targetNode.name === 'streetName' ||
            targetNode.className.indexOf('street-name') > -1) {

            // Get the text that's being pasted.
            var pastedText = e.clipboardData.getData('text/plain');

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
                document.execCommand("insertText", false, pastedText);

                // Prevent the default paste behavior.
                e.preventDefault();
                return false;
            }
        }
        return true;
    }

    function init() {
        document.addEventListener("paste", onPaste);
        _lastScriptVersion = localStorage.getItem('wmeClickSaver_lastVersion');
        localStorage.setItem('wmeClickSaver_lastVersion', _scriptVersion);
        showScriptInfoAlert();
        // check for changes in the edit-panel
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                for (var i = 0; i < mutation.addedNodes.length; i++) {
                    var addedNode = mutation.addedNodes[i];

                    if (addedNode.nodeType === Node.ELEMENT_NODE) {
                        if(addedNode.querySelector(_roadTypeDropDownSelector)) {
                            if(isChecked('csRoadTypeButtonsCheckBox')) addRoadTypeButtons();
                            if(isChecked('csHideAvgSpeedCamerasCheckBox')) hideAvgSpeedCameras();
                            if(isChecked('csInlineRoadTypesCheckBox')) inlineRoadTypeCheckboxes();
                        }
                        if(addedNode.querySelector(_lockDropDownSelector)) {
                            if(isChecked('csLockButtonsCheckBox')) addLockButtons();
                        }
                        if(addedNode.querySelector(_routingTypeDropDownSelector)) {
                            if(isChecked('csRoutingTypeCheckBox')) addRoutingTypeButtons();
                        }
                        if(addedNode.querySelector(_directionDropDownSelector)) {
                            if(isChecked('csDirectionButtonsCheckBox')) addDirectionButtons();
                        }
                        if (addedNode.querySelector(_elevationDropDownSelector)) {
                            if(isChecked('csElevationButtonsCheckBox')) addElevationButtons();
                        }
                    }
                }
            });
        });
        observer.observe(document.getElementById('edit-panel'), { childList: true, subtree: true });
        initUserPanel();
        loadSettingsFromStorage();
        injectCss();
        W.app.modeController.model.bind('change:mode', onModeChanged);
        W.prefs.on("change:isImperial", function() {initUserPanel();loadSettingsFromStorage();});
        updateControls();   // In case of PL w/ segments selected.
        W.selectionManager.events.register("selectionchanged", null, updateControls);

        if (typeof(require) !== "undefined") {
            UpdateObject = require("Waze/Action/UpdateObject");
            AddOrGetCity = require("Waze/Action/AddOrGetCity");
            AddOrGetStreet = require("Waze/Action/AddOrGetStreet");
            MultiAction = require("Waze/Action/MultiAction");
        }
        log('Initialized', 1);
    }

    function bootstrap() {
        if (window.require && W && W.loginManager &&
            W.loginManager.events.register &&
            W.map && W.loginManager.isLoggedIn()) {
            log('Initializing...', 1);
            init();
        } else {
            log('Bootstrap failed. Trying again...', 1);
            setTimeout(function () {
                bootstrap();
            }, 250);
        }
    }

    log('Bootstrap...', 1);
    bootstrap();



    //---------------------------------------------------------------------------------------------
    // ==UserScript==
    // @name         WMEQuickAltDel
    // @namespace    http://tampermonkey.net/
    // @version      0.0.1
    // @description  try to take over the world!
    // @author       Jonathan Angliss
    // @include      /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/.*$/
    // @grant        none
    // ==/UserScript==

    (function() {
        'use strict';

        var UpdateObject;

        function WMEaltStreet_Remove( elemClicked ) {
            var altID = parseInt($(elemClicked.currentTarget).parent()[0].dataset.id);
            var selectedObjs = W.selectionManager.selectedItems;
            selectedObjs.forEach(function(element) {
                if (element.model.type === 'segment') {
                    var segment = element.model;
                    if (segment.attributes.streetIDs.indexOf(altID) !== -1) {
                        var newStreets = [];
                        segment.attributes.streetIDs.forEach(function(sID) {
                            if (altID !== sID) {
                                newStreets.push(sID);
                            }
                        });
                        var sUpdate = new UpdateObject(segment, {streetIDs: newStreets});
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
            W.selectionManager.events.register("selectionchanged", null, updateAltStreetCtrls);
            W.model.actionManager.events.register("afterundoaction",null, updateAltStreetCtrls);
            W.model.actionManager.events.register("hasActions",null, function(){setTimeout(updateAltStreetCtrls, 250);});
            W.model.actionManager.events.register("noActions",null, function(){setTimeout(updateAltStreetCtrls, 250);});
            W.model.actionManager.events.register("afteraction",null, updateAltStreetCtrls);

            if (typeof(require) !== "undefined") {
                UpdateObject = require("Waze/Action/UpdateObject");
            }

            var observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if ($(mutation.target).hasClass('preview')) updateAltStreetCtrls();
                });
            });
            observer.observe(document.getElementById('edit-panel'), { childList: true, subtree: true });
        }

        function updateAltStreetCtrls() {
            if (W.selectionManager.selectedItems.length > 0) {
                var selItems = W.selectionManager.selectedItems;
                var doAltStreets = false;
                for (var i = 0; i < selItems.length; i++) {
                    if (selItems[i].model.type === 'segment') {
                        doAltStreets = true;
                        break;
                    }
                }

                if (doAltStreets) {
                    var mTrObj = $('tr.alt-street');
                    var mLiObj = $('li.alt-street');
                    for (i = 0; i < mTrObj.length; i++) {
                        var element = mTrObj[i];
                        if($(mLiObj[i]).find('i').length === 0){//prevent duplicate entries
                            mLiObj[i].dataset.id = element.dataset.id;
                            var nA = document.createElement("i");
                            nA.className = "fa fa-times-circle";
                            nA.onclick = WMEaltStreet_Remove;
                            nA.style.cssText = "cursor:pointer";
                            mLiObj[i].appendChild(nA);
                        }
                    }
                }
            }
        }

        bootstrap_WMEQuickAltDel();
    })();

})();
