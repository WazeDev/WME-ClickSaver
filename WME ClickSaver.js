// ==UserScript==
// @name            WME ClickSaver
// @namespace       https://greasyfork.org/users/45389
// @version         2025.03.06.000
// @description     Various UI changes to make editing faster and easier.
// @author          MapOMatic
// @include         /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/?.*$/
// @license         GNU GPLv3
// @connect         sheets.googleapis.com
// @connect         greasyfork.org
// @contributionURL https://github.com/WazeDev/Thank-The-Authors
// @grant           GM_xmlhttpRequest
// @grant           GM_addElement
// @require         https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @require         https://update.greasyfork.org/scripts/509664/WME%20Utils%20-%20Bootstrap.js
// ==/UserScript==

/* global I18n */
/* global WazeWrap */
/* global bootstrap */

/* eslint-disable max-classes-per-file */

(function main() {
    'use strict';

    const updateMessage = 'Updated to use the new WME SDK. You will need to update keyboard shortcuts if you use them:<br/>- toggle 1-way/2-way segment drawing<br/>- copy map center coordinates';
    const scriptName = GM_info.script.name;
    const scriptVersion = GM_info.script.version;
    const downloadUrl = 'https://greasyfork.org/scripts/369629-wme-clicksaver/code/WME%20ClickSaver.user.js';
    const forumUrl = 'https://www.waze.com/forum/viewtopic.php?f=819&t=199894';
    const translationsUrl = 'https://sheets.googleapis.com/v4/spreadsheets/1ZlE9yhNncP9iZrPzFFa-FCtYuK58wNOEcmKqng4sH1M/values/ClickSaver';
    const apiKey = 'YTJWNVBVRkplbUZUZVVGMFl6aFVjMjVOTW0wNU5GaG5kVE40TUZoNWJVZEhWbU5rUjNacVdtdFlWUT09';
    const DEC = s => atob(atob(s));
    let sdk;

    // This function is injected into the page.
    async function clicksaver(argsObject) {
        /* eslint-disable object-curly-newline */
        const roadTypeDropdownSelector = 'wz-select[name="roadType"]';
        const roadTypeChipSelector = 'wz-chip-select[class="road-type-chip-select"]';
        // const PARKING_SPACES_DROPDOWN_SELECTOR = 'select[name="estimatedNumberOfSpots"]';
        // const PARKING_COST_DROPDOWN_SELECTOR = 'select[name="costType"]';
        const settingsStoreName = 'clicksaver_settings';
        const defaultTranslation = {
            roadTypeButtons: {
                St: { text: 'St' },
                PS: { text: 'PS' },
                mH: { text: 'mH' },
                MH: { text: 'MH' },
                Fw: { text: 'Fw' },
                Rmp: { text: 'Rmp' },
                OR: { text: 'OR' },
                PLR: { text: 'PLR' },
                PR: { text: 'PR' },
                Fer: { text: 'Fer' },
                WT: { text: 'WT' },
                PB: { text: 'PB' },
                Sw: { text: 'Sw' },
                RR: { text: 'RR' },
                RT: { text: 'RT' },
                Pw: { text: 'Pw' }
            },
            prefs: {
                dropdownHelperGroup: 'DROPDOWN HELPERS',
                roadTypeButtons: 'Add road type buttons',
                useOldRoadColors: 'Use old road colors (requires refresh)',
                setStreetCityToNone: 'Set Street/City to None (new seg\'s only)',
                // eslint-disable-next-line camelcase
                setStreetCityToNone_Title: 'NOTE: Only works if connected directly or indirectly'
                    + ' to a segment with State / Country already set.',
                setCityToConnectedSegCity: 'Set City to connected segment\'s City',
                parkingCostButtons: 'Add PLA cost buttons',
                parkingSpacesButtons: 'Add PLA estimated spaces buttons',
                timeSaversGroup: 'TIME SAVERS',
                discussionForumLinkText: 'Discussion Forum',
                showAddAltCityButton: 'Show "Add alt city" button',
                showSwapDrivingWalkingButton: 'Show "Swap driving<->walking segment type" button',
                // eslint-disable-next-line camelcase
                showSwapDrivingWalkingButton_Title: 'Swap between driving-type and walking-type segments. WARNING! This will DELETE and recreate the segment. Nodes may need to be reconnected.',
                addCompactColors: 'Add colors to compact mode road type buttons'
            },
            swapSegmentTypeWarning: 'This will DELETE the segment and recreate it. Any speed data will be lost, and nodes will need to be reconnected. This message will only be displayed once. Continue?',
            // eslint-disable-next-line camelcase
            swapSegmentTypeError_Paths: 'Paths must be removed from segment before changing between driving and pedestrian road type.',
            addAltCityButtonText: 'Add alt city'
        };

        // Road types defined in the WME SDK documentation
        const wmeRoadType = {
            ALLEY: 22,
            FERRY: 15,
            FREEWAY: 3,
            MAJOR_HIGHWAY: 6,
            MINOR_HIGHWAY: 7,
            OFF_ROAD: 8,
            PARKING_LOT_ROAD: 20,
            PEDESTRIAN_BOARDWALK: 10,
            PRIMARY_STREET: 2,
            PRIVATE_ROAD: 17,
            RAILROAD: 18,
            RAMP: 4,
            RUNWAY_TAXIWAY: 19,
            STAIRWAY: 16,
            STREET: 1,
            WALKING_TRAIL: 5,
            WALKWAY: 9
        };
        const roadTypeSettings = {
            St: { id: wmeRoadType.STREET, wmeColor: '#ffffeb', svColor: '#ffffff', category: 'streets', visible: true },
            PS: { id: wmeRoadType.PRIMARY_STREET, wmeColor: '#f0ea58', svColor: '#cba12e', category: 'streets', visible: true },
            Pw: { id: wmeRoadType.ALLEY, wmeColor: '#64799a', svColor: '#64799a', category: 'streets', visible: false },
            mH: { id: wmeRoadType.MINOR_HIGHWAY, wmeColor: '#69bf88', svColor: '#ece589', category: 'highways', visible: true },
            MH: { id: wmeRoadType.MAJOR_HIGHWAY, wmeColor: '#45b8d1', svColor: '#c13040', category: 'highways', visible: true },
            Fw: { id: wmeRoadType.FREEWAY, wmeColor: '#c577d2', svColor: '#387fb8', category: 'highways', visible: false },
            Rmp: { id: wmeRoadType.RAMP, wmeColor: '#b3bfb3', svColor: '#58c53b', category: 'highways', visible: false },
            OR: { id: wmeRoadType.OFF_ROAD, wmeColor: '#867342', svColor: '#82614a', category: 'otherDrivable', visible: false },
            PLR: { id: wmeRoadType.PARKING_LOT_ROAD, wmeColor: '#ababab', svColor: '#2282ab', category: 'otherDrivable', visible: true },
            PR: { id: wmeRoadType.PRIVATE_ROAD, wmeColor: '#beba6c', svColor: '#00ffb3', category: 'otherDrivable', visible: true },
            Fer: { id: wmeRoadType.FERRY, wmeColor: '#d7d8f8', svColor: '#ff8000', category: 'otherDrivable', visible: false },
            RR: { id: wmeRoadType.RAILROAD, wmeColor: '#c62925', svColor: '#ffffff', category: 'nonDrivable', visible: false },
            RT: { id: wmeRoadType.RUNWAY_TAXIWAY, wmeColor: '#ffffff', svColor: '#00ff00', category: 'nonDrivable', visible: false },
            WT: { id: wmeRoadType.WALKING_TRAIL, wmeColor: '#b0a790', svColor: '#00ff00', category: 'pedestrian', visible: false },
            PB: { id: wmeRoadType.PEDESTRIAN_BOARDWALK, wmeColor: '#9a9a9a', svColor: '#0000ff', category: 'pedestrian', visible: false },
            Sw: { id: wmeRoadType.STAIRWAY, wmeColor: '#999999', svColor: '#b700ff', category: 'pedestrian', visible: false }
        };

        /* eslint-enable object-curly-newline */
        let _settings = {};
        let trans; // Translation object

        // function log(message) {
        //     console.log('ClickSaver:', message);
        // }

        function logDebug(message) {
            console.debug('ClickSaver:', message);
        }

        // function logWarning(message) {
        //     console.warn('ClickSaver:', message);
        // }

        // function logError(message) {
        //     console.error('ClickSaver:', message);
        // }

        function isChecked(checkboxId) {
            return $(`#${checkboxId}`).is(':checked');
        }

        function isSwapPedestrianPermitted() {
            const userInfo = sdk.State.getUserInfo();
            const rank = userInfo.rank + 1;
            return rank >= 4 || (rank === 3 && userInfo.isAreaManager);
        }

        function setChecked(checkboxId, checked) {
            $(`#${checkboxId}`).prop('checked', checked);
        }
        function loadSettingsFromStorage() {
            const loadedSettings = $.parseJSON(localStorage.getItem(settingsStoreName));
            const defaultSettings = {
                lastVersion: null,
                roadButtons: true,
                roadTypeButtons: ['St', 'PS', 'mH', 'MH', 'Fw', 'Rmp', 'PLR', 'PR', 'PB'],
                parkingCostButtons: true,
                parkingSpacesButtons: true,
                setNewPLRStreetToNone: true,
                setNewPLRCity: true,
                setNewPRStreetToNone: false,
                setNewPRCity: false,
                setNewRRStreetToNone: true, // added by jm6087
                setNewRRCity: false, // added by jm6087
                setNewPBStreetToNone: true, // added by jm6087
                setNewPBCity: true, // added by jm6087
                setNewORStreetToNone: false,
                setNewORCity: false,
                addAltCityButton: true,
                addSwapPedestrianButton: false,
                useOldRoadColors: false,
                warnOnPedestrianTypeSwap: true,
                addCompactColors: true,
                shortcuts: {}
            };
            _settings = { ...defaultSettings, ...loadedSettings };

            setChecked('csRoadTypeButtonsCheckBox', _settings.roadButtons);
            if (_settings.roadTypeButtons) {
                Object.keys(roadTypeSettings).forEach(roadTypeAbbr1 => {
                    setChecked(`cs${roadTypeAbbr1}CheckBox`, _settings.roadTypeButtons.indexOf(roadTypeAbbr1) !== -1);
                });
            }

            if (_settings.roadButtons) {
                $('.csRoadTypeButtonsCheckBoxContainer').show();
            } else {
                $('.csRoadTypeButtonsCheckBoxContainer').hide();
            }
            // setChecked('csParkingSpacesButtonsCheckBox', _settings.parkingSpacesButtons);
            // setChecked('csParkingCostButtonsCheckBox', _settings.parkingCostButtons);
            setChecked('csSetNewPLRCityCheckBox', _settings.setNewPLRCity);
            setChecked('csClearNewPLRCheckBox', _settings.setNewPLRStreetToNone);
            setChecked('csSetNewPRCityCheckBox', _settings.setNewPRCity);
            setChecked('csClearNewPRCheckBox', _settings.setNewPRStreetToNone);
            setChecked('csSetNewRRCityCheckBox', _settings.setNewRRCity);
            setChecked('csClearNewRRCheckBox', _settings.setNewRRStreetToNone); // added by jm6087
            setChecked('csSetNewPBCityCheckBox', _settings.setNewPBCity);
            setChecked('csClearNewPBCheckBox', _settings.setNewPBStreetToNone); // added by jm6087
            setChecked('csSetNewORCityCheckBox', _settings.setNewORCity);
            setChecked('csClearNewORCheckBox', _settings.setNewORStreetToNone);
            setChecked('csUseOldRoadColorsCheckBox', _settings.useOldRoadColors);
            setChecked('csAddAltCityButtonCheckBox', _settings.addAltCityButton);
            setChecked('csAddSwapPedestrianButtonCheckBox', _settings.addSwapPedestrianButton);
            setChecked('csAddCompactColorsCheckBox', _settings.addCompactColors);
        }

        function saveSettingsToStorage() {
            const settings = {
                lastVersion: argsObject.scriptVersion,
                roadButtons: _settings.roadButtons,
                parkingCostButtons: _settings.parkingCostButtons,
                parkingSpacesButtons: _settings.parkingSpacesButtons,
                setNewPLRCity: _settings.setNewPLRCity,
                setNewPLRStreetToNone: _settings.setNewPLRStreetToNone,
                setNewPRCity: _settings.setNewPRCity,
                setNewPRStreetToNone: _settings.setNewPRStreetToNone,
                setNewRRCity: _settings.setNewRRCity,
                setNewRRStreetToNone: _settings.setNewRRStreetToNone,
                setNewPBCity: _settings.setNewPBCity,
                setNewPBStreetToNone: _settings.setNewPBStreetToNone,
                setNewORCity: _settings.setNewORCity,
                setNewORStreetToNone: _settings.setNewORStreetToNone,
                useOldRoadColors: _settings.useOldRoadColors,
                addAltCityButton: _settings.addAltCityButton,
                addSwapPedestrianButton: _settings.addSwapPedestrianButton,
                warnOnPedestrianTypeSwap: _settings.warnOnPedestrianTypeSwap,
                addCompactColors: _settings.addCompactColors,
                shortcuts: {}
            };
            sdk.Shortcuts.getAllShortcuts().forEach(shortcut => {
                settings.shortcuts[shortcut.shortcutId] = shortcut.shortcutKeys;
            });
            settings.roadTypeButtons = [];
            Object.keys(roadTypeSettings).forEach(roadTypeAbbr => {
                if (_settings.roadTypeButtons.indexOf(roadTypeAbbr) !== -1) {
                    settings.roadTypeButtons.push(roadTypeAbbr);
                }
            });
            localStorage.setItem(settingsStoreName, JSON.stringify(settings));
            logDebug('Settings saved');
        }

        function isPedestrianTypeSegment(segment) {
            const pedRoadTypes = Object.values(roadTypeSettings)
                .filter(roadType => roadType.category === 'pedestrian')
                .map(roadType => roadType.id);
            return pedRoadTypes.includes(segment.roadType);
        }

        function getConnectedSegmentIDs(segmentId) {
            return [
                ...sdk.DataModel.Segments.getConnectedSegments({ segmentId, reverseDirection: false }),
                ...sdk.DataModel.Segments.getConnectedSegments({ segmentId, reverseDirection: true })
            ].map(segment => segment.id);
        }

        function getFirstConnectedSegmentAddress(segmentId) {
            const nonMatches = [];
            const segmentIDsToSearch = [segmentId];
            const hasAddress = id => !sdk.DataModel.Segments.getAddress({ segmentId: id }).isEmpty;
            while (segmentIDsToSearch.length > 0) {
                const startSegmentID = segmentIDsToSearch.pop();
                const connectedSegmentIDs = getConnectedSegmentIDs(startSegmentID);
                const hasAddrSegmentId = connectedSegmentIDs.find(hasAddress);
                if (hasAddrSegmentId) return sdk.DataModel.Segments.getAddress({ segmentId: hasAddrSegmentId });

                nonMatches.push(startSegmentID);
                connectedSegmentIDs.forEach(segmentID => {
                    if (nonMatches.indexOf(segmentID) === -1 && segmentIDsToSearch.indexOf(segmentID) === -1) {
                        segmentIDsToSearch.push(segmentID);
                    }
                });
            }
            return null;
        }

        function setStreetAndCity(setCity) {
            const selection = sdk.Editing.getSelection();

            selection?.ids.forEach(segmentId => {
                if (sdk.DataModel.Segments.getAddress({ segmentId }).isEmpty) {
                    const addr = getFirstConnectedSegmentAddress(segmentId);
                    if (addr) {
                        // Process the city
                        const newCityProperties = {
                            cityName: setCity && !addr.city?.isEmpty ? addr.city.name : '',
                            countryId: addr.country.id,
                            stateId: addr.state.id
                        };
                        let newCityId = sdk.DataModel.Cities.getCity(newCityProperties)?.id;
                        if (newCityId == null) {
                            newCityId = sdk.DataModel.Cities.addCity(newCityProperties);
                        }

                        // Process the street
                        const newStreetProperties = {
                            cityId: newCityId,
                            streetName: ''
                        };
                        let newPrimaryStreetId = sdk.DataModel.Streets.getStreet(newStreetProperties)?.id;
                        if (newPrimaryStreetId == null) {
                            newPrimaryStreetId = sdk.DataModel.Streets.addStreet(newStreetProperties).id;
                        }

                        // Update the segment with the new street
                        sdk.DataModel.Segments.updateAddress({ segmentId, primaryStreetId: newPrimaryStreetId });
                    }
                }
            });
        }

        class WaitForElementError extends Error { }

        function waitForElem(selector) {
            return new Promise((resolve, reject) => {
                function checkIt(tries = 0) {
                    if (tries < 150) { // try for about 3 seconds;
                        const elem = document.querySelector(selector);
                        setTimeout(() => {
                            if (!elem) {
                                checkIt(++tries);
                            } else {
                                resolve(elem);
                            }
                        }, 20);
                    } else {
                        reject(new WaitForElementError(`Element was not found within 3 seconds: ${selector}`));
                    }
                }
                checkIt();
            });
        }

        async function waitForShadowElem(parentElemSelector, shadowElemSelectors) {
            const parentElem = await waitForElem(parentElemSelector);
            return new Promise((resolve, reject) => {
                shadowElemSelectors.forEach((shadowElemSelector, idx) => {
                    function checkIt(parent, tries = 0) {
                        if (tries < 150) { // try for about 3 seconds;
                            const shadowElem = parent.shadowRoot.querySelector(shadowElemSelector);
                            setTimeout(() => {
                                if (!shadowElem) {
                                    checkIt(parent, ++tries);
                                } else if (idx === shadowElemSelectors.length - 1) {
                                    resolve({ shadowElem, parentElem });
                                } else {
                                    checkIt(shadowElem, 0);
                                }
                            }, 20);
                        } else {
                            reject(new WaitForElementError(`Shadow element was not found within 3 seconds: ${shadowElemSelector}`));
                        }
                    }
                    checkIt(parentElem);
                });
            });
        }

        async function onAddAltCityButtonClick() {
            const segmentId = sdk.Editing.getSelection().ids[0];
            const addr = sdk.DataModel.Segments.getAddress({ segmentId });

            $('wz-button[class="add-alt-street-btn"]').click();
            await waitForElem('wz-autocomplete.alt-street-name');

            // Set the street name field
            let result = await waitForShadowElem('wz-autocomplete.alt-street-name', ['wz-text-input']);
            result.shadowElem.focus();
            result.shadowElem.value = addr?.street?.name ?? '';

            // Clear the city name field
            result = await waitForShadowElem('wz-autocomplete.alt-city-name', ['wz-text-input']);
            result.shadowElem.focus();
            result.shadowElem.value = null;
        }

        function onRoadTypeButtonClick(roadType) {
            const selection = sdk.Editing.getSelection();

            WS.SDKMultiActionHack.groupActions(() => {
                selection?.ids.forEach(segmentId => {
                    // Check for same roadType is necessary to prevent an error.
                    if (sdk.DataModel.Segments.getById({ segmentId }).roadType !== roadType) {
                        sdk.DataModel.Segments.updateSegment({ segmentId, roadType });
                    }
                });

                if (roadType === roadTypeSettings.PLR.id && isChecked('csClearNewPLRCheckBox')) {
                    setStreetAndCity(isChecked('csSetNewPLRCityCheckBox'));
                } else if (roadType === roadTypeSettings.PR.id && isChecked('csClearNewPRCheckBox')) {
                    setStreetAndCity(isChecked('csSetNewPRCityCheckBox'));
                } else if (roadType === roadTypeSettings.RR.id && isChecked('csClearNewRRCheckBox')) {
                    setStreetAndCity(isChecked('csSetNewRRCityCheckBox'));
                } else if (roadType === roadTypeSettings.PB && isChecked('csClearNewPBCheckBox')) {
                    setStreetAndCity(isChecked('csSetNewPBCityCheckBox'));
                } else if (roadType === roadTypeSettings.OR.id && isChecked('csClearNewORCheckBox')) {
                    setStreetAndCity(isChecked('csSetNewORCityCheckBox'));
                }
            });
        }

        function addRoadTypeButtons() {
            const segmentId = sdk.Editing.getSelection()?.ids[0];
            if (segmentId == null) return;
            const sdkSeg = sdk.DataModel.Segments.getById({ segmentId });
            if (!sdkSeg) return;
            const isPed = isPedestrianTypeSegment(sdkSeg);
            const $dropDown = $(roadTypeDropdownSelector);
            $('#csRoadTypeButtonsContainer').remove();
            const $container = $('<div>', { id: 'csRoadTypeButtonsContainer', class: 'cs-rt-buttons-container', style: 'display: inline-table;' });
            const $street = $('<div>', { id: 'csStreetButtonContainer', class: 'cs-rt-buttons-group' });
            const $highway = $('<div>', { id: 'csHighwayButtonContainer', class: 'cs-rt-buttons-group' });
            const $otherDrivable = $('<div>', { id: 'csOtherDrivableButtonContainer', class: 'cs-rt-buttons-group' });
            const $nonDrivable = $('<div>', { id: 'csNonDrivableButtonContainer', class: 'cs-rt-buttons-group' });
            const $pedestrian = $('<div>', { id: 'csPedestrianButtonContainer', class: 'cs-rt-buttons-group' });
            const divs = {
                streets: $street,
                highways: $highway,
                otherDrivable: $otherDrivable,
                nonDrivable: $nonDrivable,
                pedestrian: $pedestrian
            };
            Object.keys(roadTypeSettings).forEach(roadTypeKey => {
                if (_settings.roadTypeButtons.includes(roadTypeKey)) {
                    const roadTypeSetting = roadTypeSettings[roadTypeKey];
                    const isDisabled = $dropDown[0].hasAttribute('disabled') && $dropDown[0].getAttribute('disabled') === 'true';
                    if (!isDisabled && ((roadTypeSetting.category === 'pedestrian' && isPed) || (roadTypeSetting.category !== 'pedestrian' && !isPed))) {
                        const $div = divs[roadTypeSetting.category];
                        $div.append(
                            $('<div>', {
                                class: `btn cs-rt-button cs-rt-button-${roadTypeKey} btn-positive`,
                                title: I18n.t('segment.road_types')[roadTypeSetting.id]
                            })
                                .text(trans.roadTypeButtons[roadTypeKey].text)
                                .prop('checked', roadTypeSetting.visible)
                                .data('rtId', roadTypeSetting.id)
                                .click(function rtbClick() { onRoadTypeButtonClick($(this).data('rtId')); })
                        );
                    }
                }
            });
            if (isPed) {
                $container.append($pedestrian);
            } else {
                $container.append($street).append($highway).append($otherDrivable).append($nonDrivable);
            }
            $dropDown.before($container);
        }

        // Function to add an event listener to the chip select for the road type in compact mode
        function addCompactRoadTypeChangeEvents() {
            const chipSelect = document.getElementsByClassName('road-type-chip-select')[0];
            chipSelect.addEventListener('chipSelected', evt => {
                const rtValue = evt.detail.value;
                onRoadTypeButtonClick(rtValue);
            });
        }

        // Function to add road type colors to the chips in compact mode
        async function addCompactRoadTypeColors() {
            // TODO: Clean this up. Was combined from two functions.
            try {
                if (sdk.Settings.getUserSettings().isCompactMode
                    && isChecked('csAddCompactColorsCheckBox')
                    && sdk.Editing.getSelection()) {
                    const useOldColors = _settings.useOldRoadColors;
                    await waitForElem('.road-type-chip-select wz-checkable-chip');
                    $('.road-type-chip-select wz-checkable-chip').addClass('cs-compact-button');
                    Object.values(roadTypeSettings).forEach(roadType => {
                        const bgColor = useOldColors ? roadType.svColor : roadType.wmeColor;
                        const rtChip = $(`.road-type-chip-select wz-checkable-chip[value=${roadType.id}]`);
                        if (rtChip.length !== 1) return;
                        waitForShadowElem(`.road-type-chip-select wz-checkable-chip[value='${roadType.id}']`, ['div']).then(result => {
                            const $elem = $(result.shadowElem);
                            const padding = $elem.hasClass('checked') ? '0px 3px' : '0px 4px';
                            $elem.css({ backgroundColor: bgColor, padding, color: 'black' });
                        });
                    });

                    const result = await waitForShadowElem('.road-type-chip-select wz-checkable-chip[checked=""]', ['div']);
                    $(result.shadowElem).css({ border: 'black 2px solid', padding: '0px 3px' });

                    $('.road-type-chip-select wz-checkable-chip').each(function updateRoadTypeChip() {
                        const style = {};
                        if (this.getAttribute('checked') === 'false') {
                            style.border = '';
                            style.padding = '0px 4px';
                        } else {
                            style.border = 'black 2px solid';
                            style.padding = '0px 3px';
                        }
                        $(this.shadowRoot.querySelector('div')).css(style);
                    });
                }
            } catch (ex) {
                if (ex instanceof WaitForElementError) {
                    // waitForElem will throw an error if Undo causes a deselection. Ignore it.
                } else {
                    throw ex;
                }
            }
        }

        // function isPLA(item) {
        //     return (item.model.type === 'venue') && item.model.attributes.categories.includes('PARKING_LOT');
        // }

        // function addParkingSpacesButtons() {
        //     const $dropDown = $(PARKING_SPACES_DROPDOWN_SELECTOR);
        //     const selItems = W.selectionManager.getSelectedFeatures();
        //     const item = selItems[0];

        //     // If it's not a PLA, exit.
        //     if (!isPLA(item)) return;

        //     $('#csParkingSpacesContainer').remove();
        //     const $div = $('<div>', { id: 'csParkingSpacesContainer' });
        //     const dropdownDisabled = $dropDown.attr('disabled') === 'disabled';
        //     const optionNodes = $(`${PARKING_SPACES_DROPDOWN_SELECTOR} option`);

        //     for (let i = 0; i < optionNodes.length; i++) {
        //         const $option = $(optionNodes[i]);
        //         const text = $option.text();
        //         const selected = $option.val() === $dropDown.val();
        //         $div.append(
        //             // TODO css
        //             $('<div>', {
        //                 class: `btn waze-btn waze-btn-white${selected ? ' waze-btn-blue' : ''}${dropdownDisabled ? ' disabled' : ''}`,
        //                 style: 'margin-bottom: 5px; height: 22px; padding: 2px 8px 0px 8px; margin-right: 3px;'
        //             })
        //                 .text(text)
        //                 .data('val', $option.val())
        //                 // eslint-disable-next-line func-names
        //                 .hover(() => { })
        //                 .click(function onParkingSpacesButtonClick() {
        //                     if (!dropdownDisabled) {
        //                         $(PARKING_SPACES_DROPDOWN_SELECTOR).val($(this).data('val')).change();
        //                         addParkingSpacesButtons();
        //                     }
        //                 })
        //         );
        //     }

        //     $dropDown.before($div);
        //     $dropDown.hide();
        // }

        // function addParkingCostButtons() {
        //     const $dropDown = $(PARKING_COST_DROPDOWN_SELECTOR);
        //     const selItems = W.selectionManager.getSelectedFeatures();
        //     const item = selItems[0];

        //     // If it's not a PLA, exit.
        //     if (!isPLA(item)) return;

        //     $('#csParkingCostContainer').remove();
        //     const $div = $('<div>', { id: 'csParkingCostContainer' });
        //     const dropdownDisabled = $dropDown.attr('disabled') === 'disabled';
        //     const optionNodes = $(`${PARKING_COST_DROPDOWN_SELECTOR} option`);
        //     for (let i = 0; i < optionNodes.length; i++) {
        //         const $option = $(optionNodes[i]);
        //         const text = $option.text();
        //         const selected = $option.val() === $dropDown.val();
        //         $div.append(
        //             $('<div>', {
        //                 class: `btn waze-btn waze-btn-white${selected ? ' waze-btn-blue' : ''}${dropdownDisabled ? ' disabled' : ''}`,
        //                 // TODO css
        //                 style: 'margin-bottom: 5px; height: 22px; padding: 2px 8px 0px 8px; margin-right: 4px;'
        //             })
        //                 .text(text !== '' ? text : '?')
        //                 .data('val', $option.val())
        //                 // eslint-disable-next-line func-names
        //                 .hover(() => { })
        //                 .click(function onParkingCostButtonClick() {
        //                     if (!dropdownDisabled) {
        //                         $(PARKING_COST_DROPDOWN_SELECTOR).val($(this).data('val')).change();
        //                         addParkingCostButtons();
        //                     }
        //                 })
        //         );
        //     }

        //     $dropDown.before($div);
        //     $dropDown.hide();
        // }

        function addAddAltCityButton() {
            const selection = sdk.Editing.getSelection();
            if (!selection) return;

            // Only show the button if every segment has the same primary city and street.
            if (selection.ids.length > 1) {
                const firstStreetId = sdk.DataModel.Segments.getAddress({ segmentId: selection.ids[0] })?.street?.id;
                if (!selection.ids
                    .map(segmentId => sdk.DataModel.Segments.getAddress({ segmentId }))
                    .every(addr => addr.street?.id === firstStreetId)) {
                    return;
                }
            }

            const id = 'csAddAltCityButton';
            if ($(`#${id}`).length === 0) {
                $('div.address-edit').prev('wz-label').append(
                    $('<a>', {
                        href: '#',
                        // TODO css
                        style: 'float: right;text-transform: none;'
                            + 'font-family: "Helvetica Neue", Helvetica, "Open Sans", sans-serif;color: #26bae8;'
                            + 'font-weight: normal;'
                    }).text(trans.addAltCityButtonText).click(onAddAltCityButtonClick)
                );
            }
        }

        function addSwapPedestrianButton() { // Added displayMode argument to identify compact vs. regular mode.
            const id = 'csSwapPedestrianContainer';
            $(`#${id}`).remove();
            const selection = sdk.Editing.getSelection();
            if (selection?.ids.length === 1 && selection.objectType === 'segment') {
                // TODO css
                const $container = $('<div>', { id, style: 'white-space: nowrap;float: right;display: inline;' });
                const $button = $('<div>', {
                    id: 'csBtnSwapPedestrianRoadType',
                    title: '',
                    // TODO css
                    style: 'display:inline-block;cursor:pointer;'
                });
                $button.append('<i class="w-icon w-icon-streetview w-icon-lg"></i><i class="fa fa-arrows-h fa-lg" style="color: #e84545;vertical-align: top;"></i><i class="w-icon w-icon-car w-icon-lg"></i>')
                    .attr({
                        title: trans.prefs.showSwapDrivingWalkingButton_Title
                    });
                $container.append($button);

                // Insert swap button in the correct location based on display mode.
                const $label = $('#segment-edit-general > form > div > div.road-type-control > wz-label');
                $label.css({ display: 'inline' }).append($container);

                $('#csBtnSwapPedestrianRoadType').click(onSwapPedestrianButtonClick);
            }
        }

        function onSwapPedestrianButtonClick() {
            if (_settings.warnOnPedestrianTypeSwap) {
                _settings.warnOnPedestrianTypeSwap = false;
                saveSettingsToStorage();
                if (!confirm(trans.swapSegmentTypeWarning)) {
                    return;
                }
            }

            const originalSegment = sdk.DataModel.Segments.getById({ segmentId: sdk.Editing.getSelection().ids[0] });

            // Copy the selected segment geometry and attributes, then delete it.
            const oldPrimaryStreetId = originalSegment.primaryStreetId;
            const oldAltStreetIds = originalSegment.alternateStreetIds;

            WS.SDKMultiActionHack.groupActions(() => {
                const newRoadType = isPedestrianTypeSegment(originalSegment) ? wmeRoadType.STREET : wmeRoadType.WALKING_TRAIL;
                try {
                    sdk.DataModel.Segments.deleteSegment({ segmentId: originalSegment.id });
                } catch (ex) {
                    if (ex instanceof sdk.Errors.InvalidStateError) {
                        WazeWrap.Alerts.error(scriptName, 'Something prevents this segment from being deleted.');
                        return;
                    }
                }

                // create the replacement segment in the other segment type (pedestrian -> road & vice versa)

                const newSegmentId = sdk.DataModel.Segments.addSegment({ geometry: originalSegment.geometry, roadType: newRoadType });

                sdk.DataModel.Segments.updateAddress({
                    segmentId: newSegmentId,
                    primaryStreetId: oldPrimaryStreetId,
                    alternateStreetIds: oldAltStreetIds
                });

                sdk.Editing.setSelection({ selection: { ids: [newSegmentId], objectType: 'segment' } });
            });
        }

        /* eslint-disable no-bitwise, no-mixed-operators */
        function shadeColor2(color, percent) {
            const f = parseInt(color.slice(1), 16);
            const t = percent < 0 ? 0 : 255;
            const p = percent < 0 ? percent * -1 : percent;
            const R = f >> 16;
            const G = f >> 8 & 0x00FF;
            const B = f & 0x0000FF;
            return `#${(0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 + (Math.round((t - G) * p) + G)
                * 0x100 + (Math.round((t - B) * p) + B)).toString(16).slice(1)}`;
        }
        /* eslint-enable no-bitwise, no-mixed-operators */

        function buildRoadTypeButtonCss() {
            const lines = [];
            const useOldColors = _settings.useOldRoadColors;
            Object.keys(roadTypeSettings).forEach(roadTypeAbbr => {
                const roadType = roadTypeSettings[roadTypeAbbr];
                const bgColor = useOldColors ? roadType.svColor : roadType.wmeColor;
                let output = `.cs-rt-buttons-container .cs-rt-button-${roadTypeAbbr} {background-color:${
                    bgColor};box-shadow:0 2px ${shadeColor2(bgColor, -0.5)};border-color:${shadeColor2(bgColor, -0.15)};}`;
                output += ` .cs-rt-buttons-container .cs-rt-button-${roadTypeAbbr}:hover {background-color:${
                    shadeColor2(bgColor, 0.2)}}`;
                lines.push(output);
            });
            return lines.join(' ');
        }

        function injectCss() {
            const css = [
                // Road type button formatting
                '.csRoadTypeButtonsCheckBoxContainer {margin-left:15px;}',
                '.cs-rt-buttons-container {margin-bottom:5px;height:21px;}',
                '.cs-rt-buttons-container .cs-rt-button {font-size:11px;line-height:20px;color:black;padding:0px 4px;height:20px;'
                + 'margin-right:2px;border-style:solid;border-width:1px;}',
                buildRoadTypeButtonCss(),
                '.btn.cs-rt-button:active {box-shadow:none;transform:translateY(2px)}',
                'div .cs-rt-buttons-group {float:left; margin: 0px 5px 5px 0px;}',
                '#sidepanel-clicksaver .controls-container {padding:0px;}',
                '#sidepanel-clicksaver .controls-container label {white-space: normal;}',
                '#sidepanel-clicksaver {font-size:13px;}',

                // Compact moad road type button formatting.
                '.cs-compact-button[checked="false"] {opacity: 0.65;}',

                // Lock button formatting
                '.cs-group-label {font-size: 11px; width: 100%; font-family: Poppins, sans-serif;'
                + ' text-transform: uppercase; font-weight: 700; color: #354148; margin-bottom: 6px;}'
            ].join(' ');
            $(`<style type="text/css">${css}</style>`).appendTo('head');
        }

        function createSettingsCheckbox(id, settingName, labelText, titleText, divCss, labelCss, optionalAttributes) {
            const $container = $('<div>', { class: 'controls-container' });
            const $input = $('<input>', {
                type: 'checkbox', class: 'csSettingsCheckBox', name: id, id, 'data-setting-name': settingName
            }).appendTo($container);
            const $label = $('<label>', { for: id }).text(labelText).appendTo($container);
            // TODO css
            if (divCss) $container.css(divCss);
            // TODO css
            if (labelCss) $label.css(labelCss);
            if (titleText) $container.attr({ title: titleText });
            if (optionalAttributes) $input.attr(optionalAttributes);
            return $container;
        }

        async function initUserPanel() {
            const $roadTypesDiv = $('<div>', { class: 'csRoadTypeButtonsCheckBoxContainer' });
            $roadTypesDiv.append(
                createSettingsCheckbox('csUseOldRoadColorsCheckBox', 'useOldRoadColors', trans.prefs.useOldRoadColors)
            );
            Object.keys(roadTypeSettings).forEach(roadTypeAbbr => {
                const roadType = roadTypeSettings[roadTypeAbbr];
                const id = `cs${roadTypeAbbr}CheckBox`;
                const title = I18n.t('segment.road_types')[roadType.id];
                $roadTypesDiv.append(
                    createSettingsCheckbox(id, 'roadType', title, null, null, null, {
                        'data-road-type': roadTypeAbbr
                    })
                );
                if (['PLR', 'PR', 'RR', 'PB', 'OR'].includes(roadTypeAbbr)) { // added RR & PB by jm6087
                    $roadTypesDiv.append(
                        // TODO css
                        createSettingsCheckbox(
                            `csClearNew${roadTypeAbbr}CheckBox`,
                            `setNew${roadTypeAbbr}StreetToNone`,
                            trans.prefs.setStreetCityToNone,
                            trans.prefs.setStreetCityToNone_Title,
                            { paddingLeft: '20px', marginRight: '4px' },
                            { fontStyle: 'italic' }
                        ),
                        createSettingsCheckbox(
                            `csSetNew${roadTypeAbbr}CityCheckBox`,
                            `setNew${roadTypeAbbr}City`,
                            trans.prefs.setCityToConnectedSegCity,
                            '',
                            { paddingLeft: '30px', marginRight: '4px' },
                            { fontStyle: 'italic' }
                        )
                    );
                }
            });

            const $panel = $('<div>', { id: 'sidepanel-clicksaver' }).append(
                $('<div>', { class: 'side-panel-section>' }).append(
                    // TODO css
                    $('<div>', { style: 'margin-bottom:8px;' }).append(
                        $('<div>', { class: 'form-group' }).append(
                            $('<label>', { class: 'cs-group-label' }).text(trans.prefs.dropdownHelperGroup),
                            $('<div>').append(
                                createSettingsCheckbox(
                                    'csRoadTypeButtonsCheckBox',
                                    'roadButtons',
                                    trans.prefs.roadTypeButtons
                                )
                            ).append($roadTypesDiv),
                            createSettingsCheckbox(
                                'csAddCompactColorsCheckBox',
                                'addCompactColors',
                                trans.prefs.addCompactColors
                            )
                        ),
                        $('<label>', { class: 'cs-group-label' }).text(trans.prefs.timeSaversGroup),
                        $('<div>', { style: 'margin-bottom:8px;' }).append(
                            createSettingsCheckbox(
                                'csAddAltCityButtonCheckBox',
                                'addAltCityButton',
                                trans.prefs.showAddAltCityButton
                            ),
                            isSwapPedestrianPermitted() ? createSettingsCheckbox(
                                'csAddSwapPedestrianButtonCheckBox',
                                'addSwapPedestrianButton',
                                trans.prefs.showSwapDrivingWalkingButton
                            ) : ''
                        )
                    )
                )
            );

            $panel.append(
                // TODO css
                $('<div>', { style: 'margin-top:20px;font-size:10px;color:#999999;' }).append(
                    $('<div>').text(`v. ${argsObject.scriptVersion}${argsObject.scriptName.toLowerCase().includes('beta') ? ' beta' : ''}`),
                    $('<div>').append(
                        $('<a>', { href: argsObject.forumUrl, target: '__blank' }).text(trans.prefs.discussionForumLinkText)
                    )
                )
            );

            const { tabLabel, tabPane } = await sdk.Sidebar.registerScriptTab();
            $(tabLabel).text('CS');
            $(tabPane).append($panel);
            // Decrease spacing around the tab contents.
            $(tabPane).parent().css({ 'padding-top': '0px', 'padding-left': '8px' });

            // Add change events
            $('#csRoadTypeButtonsCheckBox').change(function onRoadTypeButtonCheckChanged() {
                if (this.checked) {
                    $('.csRoadTypeButtonsCheckBoxContainer').show();
                } else {
                    $('.csRoadTypeButtonsCheckBoxContainer').hide();
                }
                saveSettingsToStorage();
            });
            $('.csSettingsCheckBox').change(function onSettingsCheckChanged() {
                const { checked } = this;
                const settingName = $(this).data('setting-name');
                if (settingName === 'roadType') {
                    const roadType = $(this).data('road-type');
                    const array = _settings.roadTypeButtons;
                    const index = array.indexOf(roadType);
                    if (checked && index === -1) {
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
            if ($(roadTypeDropdownSelector).length > 0) {
                if (isChecked('csRoadTypeButtonsCheckBox')) addRoadTypeButtons();
            }
            addCompactRoadTypeColors();
            if (isSwapPedestrianPermitted() && isChecked('csAddSwapPedestrianButtonCheckBox')) {
                addSwapPedestrianButton();
            }
            // if ($(PARKING_SPACES_DROPDOWN_SELECTOR).length > 0 && isChecked('csParkingSpacesButtonsCheckBox')) {
            //     addParkingSpacesButtons(); // TODO - add option setting
            // }
            // if ($(PARKING_COST_DROPDOWN_SELECTOR).length > 0 && isChecked('csParkingCostButtonsCheckBox')) {
            //     addParkingCostButtons(); // TODO - add option setting
            // }
        }

        function replaceWord(target, searchWord, replaceWithWord) {
            return target.replace(new RegExp(`\\b${searchWord}\\b`, 'g'), replaceWithWord);
        }

        function titleCase(word) {
            return word.charAt(0).toUpperCase() + word.substring(1).toLowerCase();
        }
        function mcCase(word) {
            return word.charAt(0).toUpperCase() + word.charAt(1).toLowerCase()
                + word.charAt(2).toUpperCase() + word.substring(3).toLowerCase();
        }
        function upperCase(word) {
            return word.toUpperCase();
        }

        function processSubstring(target, substringRegex, processFunction) {
            const substrings = target.match(substringRegex);
            if (substrings) {
                for (let idx = 0; idx < substrings.length; idx++) {
                    const substring = substrings[idx];
                    const newSubstring = processFunction(substring);
                    target = replaceWord(target, substring, newSubstring);
                }
            }
            return target;
        }

        function onPaste(e) {
            const targetNode = e.target;
            if (targetNode.name === 'streetName' || targetNode.className.includes('street-name')) {
                // Get the text that's being pasted.
                let pastedText = e.clipboardData.getData('text/plain');

                // If pasting text in ALL CAPS...
                if (/^[^a-z]*$/.test(pastedText)) {
                    [
                        // Title case all words first.
                        [/\b[a-zA-Z]+(?:'S)?\b/g, titleCase],

                        // Then process special cases.
                        [/\bMC\w+\b/ig, mcCase], // e.g. McCaulley
                        [/\b(?:I|US|SH|SR|CH|CR|CS|PR|PS)\s*-?\s*\d+\w*\b/ig, upperCase], // e.g. US-25, US25
                        /* eslint-disable-next-line max-len */
                        [/\b(?:AL|AK|AS|AZ|AR|CA|CO|CT|DE|DC|FM|FL|GA|GU|HI|ID|IL|IN|IA|KS|KY|LA|ME|MH|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|MP|OH|OK|OR|PW|PA|PR|RI|SC|SD|TN|TX|UT|VT|VI|VA|WA|WV|WI|WY)\s*-?\s*\d+\w*\b/ig, upperCase], // e.g. WV-52
                        [/\b(?:NE|NW|SE|SW)\b/ig, upperCase]
                    ].forEach(item => {
                        pastedText = processSubstring(pastedText, item[0], item[1]);
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
                return defaultTranslation;
            }
            let locale = I18n.currentLocale().toLowerCase();
            if (!argsObject.translations.hasOwnProperty(locale)) {
                locale = 'en-us';
            }
            return argsObject.translations[locale];
        }

        function errorHandler(callback) {
            try {
                callback();
            } catch (ex) {
                console.error(`${argsObject.scriptName}:`, ex);
            }
        }

        /**
         * This event handler is necessary to adjust the styling of the selected
         * compact road type chip when the user changes it.
         */
        function onSegmentsChanged() {
            addCompactRoadTypeColors();
        }

        async function onCopyCoordinatesShortcut() {
            try {
                const center = sdk.Map.getMapCenter();
                const output = `${center.lat.toFixed(5)}, ${center.lon.toFixed(5)}`;
                await navigator.clipboard.writeText(output);
                WazeWrap.Alerts.info('WME ClickSaver', `Map center coordinate copied to clipboard:\n${output}`);
                // console.debug('Map coordinates copied to clipboard:', center);
            } catch (err) {
                console.error('Failed to copy map center coordinates to clipboard: ', err);
            }
        }

        function onToggleDrawNewRoadsAsTwoWayShortcut() {
            const options = sdk.Settings.getUserSettings();
            options.isCreateRoadsAsTwoWay = !options.isCreateRoadsAsTwoWay;
            sdk.Settings.setUserSettings(options);
            WazeWrap.Alerts.info('WME ClickSaver', `New segments will be drawn as ${options.isCreateRoadsAsTwoWay ? 'two-way' : 'one-way'}.`);
        }

        function createShortcut(shortcutId, description, callback) {
            let shortcutKeys = _settings.shortcuts?.[shortcutId] ?? null;
            if (shortcutKeys && sdk.Shortcuts.areShortcutKeysInUse({ shortcutKeys })) {
                shortcutKeys = null;
            }
            sdk.Shortcuts.createShortcut({
                shortcutId,
                shortcutKeys,
                description,
                callback
            });
        }

        async function init() {
            logDebug('Initializing...');

            trans = getTranslationObject();
            Object.keys(roadTypeSettings).forEach(rtName => {
                roadTypeSettings[rtName].text = trans.roadTypeButtons[rtName].text;
            });

            document.addEventListener('paste', onPaste);

            sdk.Events.trackDataModelEvents({ dataModelName: 'segments' });
            sdk.Events.on({
                eventName: 'wme-data-model-objects-changed',
                eventHandler: () => errorHandler(onSegmentsChanged)
            });
            sdk.Events.on({
                eventName: 'wme-selection-changed',
                eventHandler: () => errorHandler(updateControls)
            });

            // check for changes in the edit-panel
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const addedNode = mutation.addedNodes[i];

                        if (addedNode.nodeType === Node.ELEMENT_NODE) {
                            // Checks to identify if this is a segment in regular display mode.
                            if (addedNode.querySelector(roadTypeDropdownSelector)) {
                                if (isChecked('csRoadTypeButtonsCheckBox')) addRoadTypeButtons();
                                if (isSwapPedestrianPermitted() && isChecked('csAddSwapPedestrianButtonCheckBox')) {
                                    addSwapPedestrianButton();
                                }
                            }
                            // Checks to identify if this is a segment in compact display mode.
                            if (addedNode.querySelector(roadTypeChipSelector)) {
                                if (isChecked('csRoadTypeButtonsCheckBox')) addCompactRoadTypeChangeEvents();
                                if (isSwapPedestrianPermitted() && isChecked('csAddSwapPedestrianButtonCheckBox')) {
                                    addSwapPedestrianButton();
                                }
                            }
                            // if (addedNode.querySelector(PARKING_SPACES_DROPDOWN_SELECTOR) && isChecked('csParkingSpacesButtonsCheckBox')) {
                            //     addParkingSpacesButtons();
                            // }
                            // if (addedNode.querySelector(PARKING_COST_DROPDOWN_SELECTOR)
                            //     && isChecked('csParkingCostButtonsCheckBox')) {
                            //     addParkingCostButtons();
                            // }
                            if (addedNode.querySelector('.side-panel-section') && isChecked('csAddAltCityButtonCheckBox')) {
                                addAddAltCityButton();
                            }
                        }
                    }
                });
            });

            observer.observe(document.getElementById('edit-panel'), { childList: true, subtree: true });
            await initUserPanel();
            loadSettingsFromStorage();
            createShortcut('toggleTwoWaySegDrawingShortcut', 'Toggle new segment two-way drawing', onToggleDrawNewRoadsAsTwoWayShortcut);
            createShortcut('copyCoordinatesShortcut', 'Copy map center coordinates', onCopyCoordinatesShortcut);
            window.addEventListener('beforeunload', saveSettingsToStorage, false);
            injectCss();
            updateControls(); // In case of PL w/ segments selected.

            logDebug('Initialized');
        }

        function skipLoginDialog(tries = 0) {
            if (sdk || tries === 1000) return;
            if ($('wz-button.do-login').length) {
                $('wz-button.do-login').click();
                return;
            }
            setTimeout(skipLoginDialog, 100, ++tries);
        }
        skipLoginDialog();

        sdk = await bootstrap({ scriptUpdateMonitor: { downloadUrl } });

        init();
    } // END clicksaver function (used to be injected, now just runs as a function)

    // function exists(...objects) {
    //     return objects.every(object => typeof object !== 'undefined' && object !== null);
    // }

    function injectScript(argsObject) {
        // 3/31/2023 - removing script injection due to loading errors that I can't track down ("require is not defined").
        // Not sure if injection is needed anymore. I believe it was to get around an issue with Greasemonkey / Firefox.
        clicksaver(argsObject);
        // if (exists(require, $)) {
        //     GM_addElement('script', {
        //         textContent: `(function(){${clicksaver.toString()}\n clicksaver(${JSON.stringify(argsObject).replace('\'', '\\\'')})})();`
        //     });
        // } else {
        //     setTimeout(() => injectScript(argsObject), 250);
        // }
    }

    function setValue(object, path, value) {
        const pathParts = path.split('.');
        for (let i = 0; i < pathParts.length - 1; i++) {
            const pathPart = pathParts[i];
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
        const translations = {};
        let iRow;
        let iCol;
        const languages = arrayIn[0].map(lang => lang.toLowerCase());
        for (iCol = 1; iCol < languages.length; iCol++) {
            translations[languages[iCol]] = {};
        }
        for (iRow = 1; iRow < arrayIn.length; iRow++) {
            const row = arrayIn[iRow];
            const propertyPath = row[0];
            for (iCol = 1; iCol < row.length; iCol++) {
                setValue(translations[languages[iCol]], propertyPath, row[iCol]);
            }
        }
        return translations;
    }

    function loadTranslations() {
        if (typeof $ === 'undefined') {
            setTimeout(loadTranslations, 250);
            console.debug('ClickSaver:', 'jQuery not ready. Retry loading translations...');
        } else {
            // This call retrieves the data from the translations spreadsheet and then injects
            // the main code into the page.  If the spreadsheet call fails, the default English
            // translation is used.
            const args = {
                scriptName,
                scriptVersion,
                forumUrl
            };
            $.getJSON(`${translationsUrl}?${DEC(apiKey)}`).then(res => {
                args.translations = convertTranslationsArrayToObject(res.values);
                console.debug('ClickSaver:', 'Translations loaded.');
            }).fail(() => {
                console.error('ClickSaver: Error loading translations spreadsheet. Using default translation (English).');
                args.useDefaultTranslation = true;
            }).always(() => {
                // Leave this document.ready function. Some people randomly get a "require is not defined" error unless the injectMain function
                // is called late enough.  Even with a "typeof require !== 'undefined'" check.
                $(document).ready(() => {
                    injectScript(args);
                });
            });
        }
    }

    function sandboxBootstrap() {
        if (WazeWrap?.Ready) {
            WazeWrap.Interface.ShowScriptUpdate(scriptName, scriptVersion, updateMessage, forumUrl);
        } else {
            setTimeout(sandboxBootstrap, 250);
        }
    }

    // Go ahead and start loading translations, and inject the main code into the page.
    loadTranslations();

    // Start the "sandboxed" code.
    sandboxBootstrap();

    // ***********************************************************************
    // MultiAction hack code written by r0den, slightly modified by mapomatic
    // This can be removed if/when the SDK supports MultiAction natively.
    // ***********************************************************************
    const WS = {};

    // eslint-disable-next-line func-names
    WS.SDKMultiActionHack = (function() {
        function getUnsafeWindow() {
            return 'unsafeWindow' in window ? window.unsafeWindow : window;
        }

        class Interceptor {
            constructor(target, methodName, interceptor) {
                this._target = target;
                this._methodName = methodName;
                this._interceptor = interceptor;
                this._isEnabled = false;

                this.managedInterceptor = (...args) => (this._isEnabled
                    ? this._interceptor(((...args1) => this.invokeOriginal(...args1)), ...args)
                    : this.invokeOriginal(...args));

                this.initialize();
            }

            initialize() {
                this._originalMethod = this._target[this._methodName];
                this._target[this._methodName] = this.managedInterceptor;
            }

            invokeOriginal(...args) {
                return this._originalMethod.apply(this._target, args);
            }

            enable() {
                this._isEnabled = true;
            }

            disable() {
                this._isEnabled = false;
            }
        }

        function getMultiAction(actions) {
            // eslint-disable-next-line func-names
            const MultiAction = (function() {
                try {
                    return getUnsafeWindow().require('Waze/Action/MultiAction');
                } catch (error) {
                    return null;
                }
            })();

            if (!MultiAction) throw new Error('Unable to retrieve MultiAction');

            return new MultiAction(actions);
        }

        class TransactionManager {
            constructor(actionManager) {
                this._actionManager = actionManager;
                this._actionsInTransaction = [];
                this._undoableActionsInTransaction = [];
                this._hasActiveTransaction = false;

                this._interceptor = new Interceptor(actionManager, 'add', (invokeOriginal, action) => {
                    if (!this.isTransactionOpen) return invokeOriginal(action);

                    if (action.undoSupported()) {
                        let result;
                        let executed = false;

                        new Interceptor(action, 'doAction', (invokeOriginal1, ...args) => (executed ? result : ((executed = true), (result = invokeOriginal1(...args))))).enable();

                        new Interceptor(action, 'undoAction', (invokeOriginal1, ...args) => {
                            const undoResult = invokeOriginal1(...args);
                            executed = false;
                            result = undefined;
                            return undoResult;
                        }).enable();

                        action.doAction(this._actionManager.dataModel);
                        this._undoableActionsInTransaction.push(action);
                    }

                    this._actionsInTransaction.push(action);
                    return true;
                });

                this._interceptor.enable();
            }

            closeTransaction() {
                this._hasActiveTransaction = false;
                return this.getTransactionActions();
            }

            openTransaction() {
                this._actionsInTransaction = [];
                this._undoableActionsInTransaction = [];
                this._hasActiveTransaction = true;
            }

            get isTransactionOpen() {
                return this._hasActiveTransaction;
            }

            beginTransaction() {
                this.openTransaction();
            }

            getTransactionActions() {
                return this._actionsInTransaction;
            }

            commitTransaction(description) {
                const actions = this.closeTransaction();
                const multiAction = getMultiAction(actions);

                if (multiAction) {
                    if (description) multiAction._description = description;
                    this._interceptor.invokeOriginal(multiAction);
                } else {
                    actions.forEach(action => this._interceptor.invokeOriginal(action));
                }
            }

            cancelTransaction() {
                this._undoableActionsInTransaction.forEach(action => action.undoAction(this._actionManager.dataModel));
                this.closeTransaction();
            }
        }

        const unsafeWin = getUnsafeWindow();
        let transactionManager;

        unsafeWin.SDK_INITIALIZED.then(() => {
            transactionManager = new TransactionManager(unsafeWin.W.model.actionManager);
        });

        return {
            beginTransaction: () => transactionManager.beginTransaction(),
            commitTransaction: description => transactionManager.commitTransaction(description),
            cancelTransaction: () => transactionManager.cancelTransaction(),
            groupActions(actionFn, description) {
                transactionManager.beginTransaction();
                try {
                    actionFn();
                    transactionManager.commitTransaction(description);
                } catch (error) {
                    transactionManager.cancelTransaction();
                    throw error;
                }
            }
        };
    })();
})();
