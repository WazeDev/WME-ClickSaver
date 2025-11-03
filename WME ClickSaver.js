
// ==UserScript==
// @name            Waze Edit Count Monitor
// @namespace       https://greasyfork.org/en/users/45389-mapomatic
// @version         2024.10.28.002
// @description     Displays your daily edit count in the WME toolbar.  Warns if you might be throttled. Extended with additional statistics including session time and map tracking.
// @author          MapOMatic
// @include         /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/?.*$/
// @require         https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @require         https://update.greasyfork.org/scripts/509664/WME%20Utils%20-%20Bootstrap.js
// @license         GNU GPLv3
// @contributionURL https://github.com/WazeDev/Thank-The-Authors
// @grant           GM_xmlhttpRequest
// @grant           GM_addElement
// @grant           GM_addStyle
// @connect         www.waze.com
// @connect         greasyfork.org
// @downloadURL https://update.greasyfork.org/scripts/40313/Waze%20Edit%20Count%20Monitor.user.js
// @updateURL https://update.greasyfork.org/scripts/40313/Waze%20Edit%20Count%20Monitor.meta.js
// ==/UserScript==

/* global bootstrap */

(async function main() {
    'use strict';

    const downloadUrl = 'https://greasyfork.org/scripts/40313-waze-edit-count-monitor/code/Waze%20Edit%20Count%20Monitor.user.js';
    const sdk = await bootstrap({ scriptUpdateMonitor: { downloadUrl } });

    const TOOLTIP_TEXT = 'Your daily edit count from your profile. Click to open your profile.';

    let $outputElem = null;
    let $outputElemContainer = null;
    let userName;
    let savesWithoutIncrease = 0;
    let lastProfile;


    // Session tracking variables
    let sessionStartTime = Date.now();
    let editedSegmentLength = 0;
    let timeTrackingPaused = false; // Pause-Status für Zeit-Tracking
    let timeTrackingVisible = true; // Sichtbarkeit der Zeit-Anzeige (Standard: sichtbar)
    let timeTrackingData = []; // Array für gespeicherte Zeiten
    let pausedTime = 0; // Akkumulierte Pause-Zeit
    let pauseStartTime = 0; // Zeitpunkt, wann die Pause begonnen hat

    // Real-time counter variables
    let $realtimeCounterElem = null;
    let realtimeUpdateInterval = null;

    // Simple real-time counter update function
    function updateRealtimeCounter() {
        if (!$realtimeCounterElem) return;
        
        // Sichtbarkeit der Zeit-Anzeige prüfen - kompletten Container verstecken
        const $realtimeContainer = $realtimeCounterElem.closest('.toolbar-button');
        if (!timeTrackingVisible) {
            $realtimeContainer.hide();
            return;
        } else {
            $realtimeContainer.show();
        }
        
        // Wenn pausiert, Zeit nicht aktualisieren
        if (timeTrackingPaused) {
            return;
        }
        
        const currentSessionTime = Date.now() - sessionStartTime - pausedTime;
        const formattedTime = formatSessionTime(currentSessionTime);
        $realtimeCounterElem.text(formattedTime);
    }

    // Zeit-Tracking Local Storage Funktionen
    function loadTimeTrackingSettings() {
        try {
            const saved = localStorage.getItem('wecm-time-tracking-settings');
            if (saved) {
                const settings = JSON.parse(saved);
                timeTrackingPaused = settings.paused !== undefined ? settings.paused : false;
                timeTrackingVisible = settings.visible !== undefined ? settings.visible : true;
            }
        } catch (error) {
            console.error('Fehler beim Laden der Zeit-Tracking Einstellungen:', error);
        }
    }

    function saveTimeTrackingSettings() {
        try {
            const settings = {
                paused: timeTrackingPaused,
                visible: timeTrackingVisible
            };
            localStorage.setItem('wecm-time-tracking-settings', JSON.stringify(settings));
        } catch (error) {
            console.error('Fehler beim Speichern der Zeit-Tracking Einstellungen:', error);
        }
    }

    function loadTimeTrackingData() {
        try {
            const saved = localStorage.getItem('wecm-time-tracking-data');
            if (saved) {
                timeTrackingData = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Fehler beim Laden der Zeit-Tracking Daten:', error);
            timeTrackingData = [];
        }
    }

    function saveTimeTrackingData() {
        try {
            localStorage.setItem('wecm-time-tracking-data', JSON.stringify(timeTrackingData));
        } catch (error) {
            console.error('Fehler beim Speichern der Zeit-Tracking Daten:', error);
        }
    }

    function saveCurrentSessionTime() {
        const currentSessionTime = Date.now() - sessionStartTime - pausedTime;
        const now = new Date();
        const sessionEntry = {
            timestamp: now.getTime(), // Für Sortierung
            date: now.toLocaleDateString('de-DE'),
            time: now.toLocaleTimeString('de-DE'),
            duration: Math.floor(currentSessionTime / 1000), // In Sekunden für formatDuration
            formattedDuration: formatSessionTime(currentSessionTime),
            segmentKm: editedSegmentLength.toFixed(1),
            segmentCount: editedSegmentLength // Für die Tabelle
        };
        
        timeTrackingData.unshift(sessionEntry); // Neueste Einträge zuerst
        
        // Begrenze auf 100 Einträge
        if (timeTrackingData.length > 100) {
            timeTrackingData = timeTrackingData.slice(0, 100);
        }
        
        saveTimeTrackingData();
        
        // Session zurücksetzen für neue Session
        sessionStartTime = Date.now();
        editedSegmentLength = 0;
        pausedTime = 0;
        pauseStartTime = 0;
        
        // Tabelle aktualisieren falls sie existiert
        if (typeof updateTimeHistoryTable === 'function') {
            updateTimeHistoryTable();
        }
    }



    // Language detection and text localization
    function getLocalizedText() {
        // Detect browser language
        const lang = navigator.language.toLowerCase();
        
        // Determine language
        const isEnglish = lang.startsWith('en');
        const isGerman = lang.startsWith('de');
        const isFrench = lang.startsWith('fr');
        const isSpanish = lang.startsWith('es');
        const isItalian = lang.startsWith('it');
        const isDutch = lang.startsWith('nl');

        return {
            tooltipHeader: isEnglish ? 'Your daily edit count from your profile. Click to open your profile.' : 
                          isGerman ? 'Ihre tägliche Bearbeitungsanzahl aus Ihrem Profil. Klicken Sie, um Ihr Profil zu öffnen.' :
                          isFrench ? 'Votre nombre de modifications quotidiennes de votre profil. Cliquez pour ouvrir votre profil.' :
                          isSpanish ? 'Su recuento diario de ediciones de su perfil. Haga clic para abrir su perfil.' :
                          isItalian ? 'Il tuo conteggio giornaliero di modifiche dal tuo profilo. Clicca per aprire il tuo profilo.' :
                          isDutch ? 'Uw dagelijkse bewerkingsaantal uit uw profiel. Klik om uw profiel te openen.' : 'Ihre tägliche Bearbeitungsanzahl aus Ihrem Profil. Klicken Sie, um Ihr Profil zu öffnen.',
                          
            sessionInfo: isEnglish ? 'Session Info' : 
                        isGerman ? 'Session-Info' :
                        isFrench ? 'Infos session' :
                        isSpanish ? 'Info sesión' :
                        isItalian ? 'Info sessione' :
                        isDutch ? 'Sessie-info' : 'Session-Info',
                        
            basicStats: isEnglish ? 'Basic Statistics' : 
                        isGerman ? 'Grundstatistiken' :
                        isFrench ? 'Stat. de base' :
                        isSpanish ? 'Estadísticas básicas' :
                        isItalian ? 'Statistiche base' :
                        isDutch ? 'Basisstatistieken' : 'Grundstatistiken',
                        
            averageValues: isEnglish ? 'Average Values' : 
                          isGerman ? 'Durchschnittswerte' :
                          isFrench ? 'Moyennes' :
                          isSpanish ? 'Valores promedio' :
                          isItalian ? 'Valori medi' :
                          isDutch ? 'Gemiddelde waarden' : 'Durchschnittswerte',
                          
            mapEdits: isEnglish ? 'Map Edits' : 
                     isGerman ? 'Karten-Edits' :
                     isFrench ? 'Modif. carte' :
                     isSpanish ? 'Ediciones mapa' :
                     isItalian ? 'Modifiche mappa' :
                     isDutch ? 'Kaart bewerkingen' : 'Karten-Edits',
                     
            closures: isEnglish ? 'Closures' : 
                     isGerman ? 'Schließungen' :
                     isFrench ? 'Clôtures' :
                     isSpanish ? 'Cierres' :
                     isItalian ? 'Chiusure' :
                     isDutch ? 'Sluitingen' : 'Schließungen',

            sessionTime: isEnglish ? 'Session time' : 
                        isGerman ? 'Sitzungszeit' :
                        isFrench ? 'Temps session' :
                        isSpanish ? 'Tiempo sesión' :
                        isItalian ? 'Tempo sessione' :
                        isDutch ? 'Sessietijd' : 'Sitzungszeit',
                        
            segmentsEdited: isEnglish ? 'Segments edited' : 
                           isGerman ? 'Segmente bearbeitet' :
                           isFrench ? 'Segments mod.' :
                           isSpanish ? 'Segmentos editados' :
                           isItalian ? 'Segmenti modificati' :
                           isDutch ? 'Segmenten bewerkt' : 'Segmente bearbeitet',

            totalEdits: isEnglish ? 'Total edits' : 
                       isGerman ? 'Total edits' :
                       isFrench ? 'Total modifs' :
                       isSpanish ? 'Total ediciones' :
                       isItalian ? 'Totale modifiche' :
                       isDutch ? 'Totaal bewerkingen' : 'Total edits',
                       
            maxDailyEdits: isEnglish ? 'Max daily edits' : 
                          isGerman ? 'Max Tagesedits' :
                          isFrench ? 'Max quot.' :
                          isSpanish ? 'Máx. diarias' :
                          isItalian ? 'Max giornaliere' :
                          isDutch ? 'Max dagelijks' : 'Max Tagesedits',
                          
            currentStreak: isEnglish ? 'Current streak' : 
                          isGerman ? 'Aktuelle Serie' :
                          isFrench ? 'Série actu.' :
                          isSpanish ? 'Racha actual' :
                          isItalian ? 'Serie attuale' :
                          isDutch ? 'Huidige reeks' : 'Aktuelle Serie',
                          
            days: isEnglish ? 'days' : 
                 isGerman ? 'Tage' :
                 isFrench ? 'j.' :
                 isSpanish ? 'días' :
                 isItalian ? 'giorni' :
                 isDutch ? 'dagen' : 'Tage',

            avgLast7Days: isEnglish ? 'Avg last 7 days' : 
                         isGerman ? 'Ø letzte 7 Tage' :
                         isFrench ? 'Moy. 7j' :
                         isSpanish ? 'Prom. 7 días' :
                         isItalian ? 'Media 7 giorni' :
                         isDutch ? 'Gem. 7 dagen' : 'Ø letzte 7 Tage',
                         
            avgLast30Days: isEnglish ? 'Avg last 30 days' : 
                          isGerman ? 'Ø letzte 30 Tage' :
                          isFrench ? 'Moy. 30j' :
                          isSpanish ? 'Prom. 30 días' :
                          isItalian ? 'Media 30 giorni' :
                          isDutch ? 'Gem. 30 dagen' : 'Ø letzte 30 Tage',

            avgLast90Days: isEnglish ? 'Avg last 90 days' : 
                          isGerman ? 'Ø letzte 90 Tage' :
                          isFrench ? 'Moy. 90j' :
                          isSpanish ? 'Prom. 90 días' :
                          isItalian ? 'Media 90 giorni' :
                          isDutch ? 'Gem. 90 dagen' : 'Ø letzte 90 Tage',

            segmentEdits: isEnglish ? 'Segment edits' : 
                         isGerman ? 'Segment edits' :
                         isFrench ? 'Modif. seg.' :
                         isSpanish ? 'Edic. segmentos' :
                         isItalian ? 'Modif. segmenti' :
                         isDutch ? 'Segment bewerkingen' : 'Segment edits',
                         
            placeEdits: isEnglish ? 'Place edits' : 
                       isGerman ? 'Place edits' :
                       isFrench ? 'Modif. lieux' :
                       isSpanish ? 'Edic. lugares' :
                       isItalian ? 'Modif. luoghi' :
                       isDutch ? 'Plaats bewerkingen' : 'Place edits',
                       
            houseNumberEdits: isEnglish ? 'House number edits' : 
                             isGerman ? 'Hausnummern Edits' :
                             isFrench ? 'Modif. num. maison' :
                             isSpanish ? 'Edic. núm. casa' :
                             isItalian ? 'Modif. num. civici' :
                             isDutch ? 'Huisnummer bewerkingen' : 'Hausnummern Edits',
                             
            totalMapEdits: isEnglish ? 'Total map edits' : 
                          isGerman ? 'Karten-Edits gesamt' :
                          isFrench ? 'Total mod. carte' :
                          isSpanish ? 'Total edic. mapa' :
                          isItalian ? 'Totale modif. mappa' :
                          isDutch ? 'Totaal kaart bewerkingen' : 'Karten-Edits gesamt',

            ursClosed: isEnglish ? 'URs closed' : 
                      isGerman ? 'URs closed' :
                      isFrench ? 'URs clôtu.' :
                      isSpanish ? 'URs cerrados' :
                      isItalian ? 'UR chiusi' :
                      isDutch ? 'URs gesloten' : 'URs closed',
                      
            pursClosed: isEnglish ? 'PURs closed' : 
                       isGerman ? 'PURs closed' :
                       isFrench ? 'PURs clôtu.' :
                       isSpanish ? 'PURs cerrados' :
                       isItalian ? 'PUR chiusi' :
                       isDutch ? 'PURs gesloten' : 'PURs closed',
                       
            mpsClosed: isEnglish ? 'MPs closed' : 
                      isGerman ? 'MPs closed' :
                      isFrench ? 'MPs clôtu.' :
                      isSpanish ? 'MPs cerrados' :
                      isItalian ? 'MP chiusi' :
                      isDutch ? 'MPs gesloten' : 'MPs closed',
                      
            totalClosures: isEnglish ? 'Total closures' : 
                          isGerman ? 'Schließungen gesamt' :
                          isFrench ? 'Total clôtu.' :
                          isSpanish ? 'Total cierres' :
                          isItalian ? 'Totale chiusure' :
                          isDutch ? 'Totaal sluitingen' : 'Schließungen gesamt',

            // Zeit-Tracking Texte
            timeTracking: isEnglish ? 'Time Tracking' : 
                         isGerman ? 'Zeit-Tracking' :
                         isFrench ? 'Suivi du temps' :
                         isSpanish ? 'Seguimiento de tiempo' :
                         isItalian ? 'Tracciamento tempo' :
                         isDutch ? 'Tijdregistratie' : 'Zeit-Tracking',

            enableTimeTracking: isEnglish ? 'Enable time tracking' : 
                               isGerman ? 'Zeit-Tracking aktivieren' :
                               isFrench ? 'Activer le suivi du temps' :
                               isSpanish ? 'Activar seguimiento de tiempo' :
                               isItalian ? 'Attiva tracciamento tempo' :
                               isDutch ? 'Tijdregistratie inschakelen' : 'Zeit-Tracking aktivieren',

            saveCurrentTime: isEnglish ? 'Save Current Time' : 
                            isGerman ? 'Aktuelle Zeit speichern' :
                            isFrench ? 'Sauvegarder le temps actuel' :
                            isSpanish ? 'Guardar tiempo actual' :
                            isItalian ? 'Salva tempo corrente' :
                            isDutch ? 'Huidige tijd opslaan' : 'Aktuelle Zeit speichern',

            timeSaved: isEnglish ? 'Time saved successfully!' : 
                      isGerman ? 'Zeit erfolgreich gespeichert!' :
                      isFrench ? 'Temps sauvegardé avec succès!' :
                      isSpanish ? '¡Tiempo guardado exitosamente!' :
                      isItalian ? 'Tempo salvato con successo!' :
                      isDutch ? 'Tijd succesvol opgeslagen!' : 'Zeit erfolgreich gespeichert!',

            sessionHistory: isEnglish ? 'Session History' : 
                           isGerman ? 'Session-Verlauf' :
                           isFrench ? 'Historique des sessions' :
                           isSpanish ? 'Historial de sesiones' :
                           isItalian ? 'Cronologia sessioni' :
                           isDutch ? 'Sessiegeschiedenis' : 'Session-Verlauf',

            date: isEnglish ? 'Date' : 
                 isGerman ? 'Datum' :
                 isFrench ? 'Date' :
                 isSpanish ? 'Fecha' :
                 isItalian ? 'Data' :
                 isDutch ? 'Datum' : 'Datum',

            duration: isEnglish ? 'Duration' : 
                     isGerman ? 'Dauer' :
                     isFrench ? 'Durée' :
                     isSpanish ? 'Duración' :
                     isItalian ? 'Durata' :
                     isDutch ? 'Duur' : 'Dauer',

            segments: isEnglish ? 'Segments (km)' : 
                     isGerman ? 'Segmente (km)' :
                     isFrench ? 'Segments (km)' :
                     isSpanish ? 'Segmentos (km)' :
                     isItalian ? 'Segmenti (km)' :
                     isDutch ? 'Segmenten (km)' : 'Segmente (km)',

            clearHistory: isEnglish ? 'Clear History' : 
                         isGerman ? 'Verlauf löschen' :
                         isFrench ? 'Effacer l\'historique' :
                         isSpanish ? 'Borrar historial' :
                         isItalian ? 'Cancella cronologia' :
                         isDutch ? 'Geschiedenis wissen' : 'Verlauf löschen',

            confirmClear: isEnglish ? 'Are you sure you want to clear all session history?' : 
                         isGerman ? 'Sind Sie sicher, dass Sie den gesamten Session-Verlauf löschen möchten?' :
                         isFrench ? 'Êtes-vous sûr de vouloir effacer tout l\'historique des sessions?' :
                         isSpanish ? '¿Está seguro de que desea borrar todo el historial de sesiones?' :
                         isItalian ? 'Sei sicuro di voler cancellare tutta la cronologia delle sessioni?' :
                         isDutch ? 'Weet u zeker dat u alle sessiegeschiedenis wilt wissen?' : 'Sind Sie sicher, dass Sie den gesamten Session-Verlauf löschen möchten?',

            confirmDeleteSession: isEnglish ? 'Are you sure you want to delete this session?' : 
                                 isGerman ? 'Sind Sie sicher, dass Sie diese Session löschen möchten?' :
                                 isFrench ? 'Êtes-vous sûr de vouloir supprimer cette session?' :
                                 isSpanish ? '¿Está seguro de que desea eliminar esta sesión?' :
                                 isItalian ? 'Sei sicuro di voler eliminare questa sessione?' :
                                 isDutch ? 'Weet u zeker dat u deze sessie wilt verwijderen?' : 'Sind Sie sicher, dass Sie diese Session löschen möchten?',

            // Neue Texte für Pause und Sichtbarkeit
            pauseTimeTracking: isEnglish ? 'Pause time' : 
                              isGerman ? 'Zeit pausieren' :
                              isFrench ? 'Pause temps' :
                              isSpanish ? 'Pausar tiempo' :
                              isItalian ? 'Pausa tempo' :
                              isDutch ? 'Tijd pauzeren' : 'Zeit pausieren',

            showTimeDisplay: isEnglish ? 'Show time display' : 
                            isGerman ? 'Zeit anzeigen' :
                            isFrench ? 'Afficher le temps' :
                            isSpanish ? 'Mostrar tiempo' :
                            isItalian ? 'Mostra tempo' :
                            isDutch ? 'Tijd tonen' : 'Zeit anzeigen'
        };
    }

    function log(message) {
        console.log('Edit Count Monitor:', message);
    }

    // Hilfsfunktion zur Berechnung von Durchschnittswerten
    function calculateAverage(array) {
        if (!array || array.length === 0) return 0;
        const sum = array.reduce((a, b) => a + b, 0);
        return Math.round(sum / array.length);
    }

    // Hilfsfunktion zur Berechnung der letzten 7 Tage
    function getLast7DaysAverage(dailyEditCount) {
        if (!dailyEditCount || dailyEditCount.length === 0) return 0;
        const last7Days = dailyEditCount.slice(-7);
        return calculateAverage(last7Days);
    }

    // Hilfsfunktion zur Berechnung der letzten 30 Tage
    function getLast30DaysAverage(dailyEditCount) {
        if (!dailyEditCount || dailyEditCount.length === 0) return 0;
        const last30Days = dailyEditCount.slice(-30);
        return calculateAverage(last30Days);
    }

    // Hilfsfunktion zur Berechnung der letzten 90 Tage
    function getLast90DaysAverage(dailyEditCount) {
        if (!dailyEditCount || dailyEditCount.length === 0) return 0;
        const last90Days = dailyEditCount.slice(-90);
        return calculateAverage(last90Days);
    }

    // Hilfsfunktion zur Berechnung des höchsten Tageswerts
    function getMaxDailyEdits(dailyEditCount) {
        if (!dailyEditCount || dailyEditCount.length === 0) return 0;
        return Math.max(...dailyEditCount);
    }

    // Hilfsfunktion zur Berechnung der Streak (aufeinanderfolgende Tage mit Edits)
    function getCurrentStreak(dailyEditCount) {
        if (!dailyEditCount || dailyEditCount.length === 0) return 0;
        let streak = 0;
        for (let i = dailyEditCount.length - 1; i >= 0; i--) {
            if (dailyEditCount[i] > 0) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }

    // Hilfsfunktion zur Formatierung der Sitzungszeit
    function formatSessionTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }

    // Hilfsfunktion zur Berechnung der Distanz zwischen zwei Punkten (Haversine-Formel)
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Erdradius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Segment length tracking (approximation based on edit events)
    function trackSegmentEdits() {
        try {
            // Versuche Segment-Edits zu verfolgen
            // Dies ist eine Approximation, da die genaue Segmentlänge schwer zu ermitteln ist
            sdk.Events.on({ eventName: 'wme-segment-edited', eventHandler: function(segment) {
                if (segment && segment.geometry && segment.geometry.coordinates) {
                    // Grobe Schätzung der Segmentlänge basierend auf Koordinaten
                    const coords = segment.geometry.coordinates;
                    let segmentLength = 0;
                    for (let i = 1; i < coords.length; i++) {
                        segmentLength += calculateDistance(
                            coords[i-1][1], coords[i-1][0],
                            coords[i][1], coords[i][0]
                        );
                    }
                    editedSegmentLength += segmentLength;
                }
            }});
        } catch (error) {
            // Segment tracking nicht verfügbar
        }
    }

    function updateEditCount() {
        sdk.DataModel.Users.getUserProfile({ userName }).then(profile => {
        // Add the counter div if it doesn't exist.
            if ($('#wecm-count').length === 0) {
                $outputElemContainer = $('<div>', { class: 'toolbar-button', style: 'font-weight: bold; font-size: 16px; border-radius: 10px; margin-left: 4px;' });
                const $innerDiv = $('<div>', { class: 'item-container', style: 'padding-left: 10px; padding-right: 10px; cursor: default;' });
                $outputElem = $('<a>', {
                    id: 'wecm-count',
                    href: sdk.DataModel.Users.getUserProfileLink({ userName }),
                    target: '_blank',
                    style: 'text-decoration:none',
                    'data-original-title': TOOLTIP_TEXT
                });
                $innerDiv.append($outputElem);
                $outputElemContainer.append($innerDiv);
                if ($('#toolbar > div > div.secondary-toolbar > div.secondary-toolbar-actions > div.secondary-toolbar-actions-edit').length) {
                // Production WME, as of 4/25/2023
                    $('#toolbar > div > div.secondary-toolbar > div.secondary-toolbar-actions > div.secondary-toolbar-actions-edit').after($outputElemContainer);
                } else {
                // Beta WME, as of 4/25/2023
                    $('#toolbar > div > div.secondary-toolbar > div:nth-child(1)').after($outputElemContainer);
                }
                $outputElem.tooltip({
                    placement: 'auto top',
                    delay: { show: 100, hide: 100 },
                    html: true,
                    template: '<div class="tooltip wecm-tooltip" role="tooltip"><div class="tooltip-arrow"></div>'
                        + '<div class="wecm-tooltip-header"><b></b></div>'
                        + '<div class="wecm-tooltip-body tooltip-inner""></div></div>'
                });

                // Add real-time counter element if it doesn't exist
                if ($('#wecm-realtime-counter').length === 0) {
                    const $realtimeContainer = $('<div>', { 
                        class: 'toolbar-button', 
                        style: 'font-weight: bold; font-size: 14px; border-radius: 10px; margin-left: 4px; background-color: rgba(33, 150, 243, 0.1); border: 1px solid rgba(33, 150, 243, 0.3);' 
                    });
                    const $realtimeInnerDiv = $('<div>', { 
                        class: 'item-container', 
                        style: 'padding-left: 8px; padding-right: 8px; cursor: default;' 
                    });
                    
                    // Get localized tooltip text for real-time counter
                    const lang = navigator.language.toLowerCase();
                    const isEnglish = lang.startsWith('en');
                    const isGerman = lang.startsWith('de');
                    const isFrench = lang.startsWith('fr');
                    const isSpanish = lang.startsWith('es');
                    const isItalian = lang.startsWith('it');
                    const isDutch = lang.startsWith('nl');
                    
                    const realtimeTooltip = isEnglish ? 'Current session time (updated every second)' :
                                          isGerman ? 'Aktuelle Session-Zeit (wird jede Sekunde aktualisiert)' :
                                          isFrench ? 'Temps de session actuel (mis à jour chaque seconde)' :
                                          isSpanish ? 'Tiempo de sesión actual (actualizado cada segundo)' :
                                          isItalian ? 'Tempo sessione corrente (aggiornato ogni secondo)' :
                                          isDutch ? 'Huidige sessietijd (elke seconde bijgewerkt)' : 'Aktuelle Session-Zeit (wird jede Sekunde aktualisiert)';
                    
                    $realtimeCounterElem = $('<span>', {
                        id: 'wecm-realtime-counter',
                        style: 'color: #2196F3; text-decoration: none;',
                        title: realtimeTooltip
                    });
                    
                    $realtimeInnerDiv.append($realtimeCounterElem);
                    $realtimeContainer.append($realtimeInnerDiv);
                    $outputElemContainer.after($realtimeContainer);
                    
                    // Initial update
                    updateRealtimeCounter();
                }
            }

            // log('edit count = ' + editCount + ', UR count = ' + urCount.count);
            // TODO: check all editCountByType values here?
            if (!lastProfile) {
                lastProfile = profile;
            } else if (lastProfile.dailyEditCount[lastProfile.dailyEditCount.length - 1] !== profile.dailyEditCount[profile.dailyEditCount.length - 1]
                    || lastProfile.editCountByType.updateRequests !== profile.editCountByType.updateRequests
                    || lastProfile.editCountByType.mapProblems !== profile.editCountByType.mapProblems
                    || lastProfile.editCountByType.placeUpdateRequests !== profile.editCountByType.placeUpdateRequests
                    || lastProfile.editCountByType.segmentHouseNumbers !== profile.editCountByType.segmentHouseNumbers
                    || lastProfile.totalEditCount !== profile.totalEditCount) {
                savesWithoutIncrease = 0;
            } else {
                savesWithoutIncrease++;
            }

            let textColor;
            let bgColor;
            let warningStyleClass;
            if (savesWithoutIncrease < 5) {
                textColor = '#354148';
                bgColor = 'white';
                warningStyleClass = '';
            } else if (savesWithoutIncrease < 10) {
                textColor = '#354148';
                bgColor = 'yellow';
                warningStyleClass = 'yellow';
            } else {
                textColor = 'white';
                bgColor = 'red';
                warningStyleClass = 'red';
            }
            $outputElemContainer.css('background-color', bgColor);

            $outputElem.css('color', textColor).html(profile.dailyEditCount[profile.dailyEditCount.length - 1].toLocaleString());

            // Berechnung zusätzlicher Statistiken
            const last7DaysAvg = getLast7DaysAverage(profile.dailyEditCount);
            const last30DaysAvg = getLast30DaysAverage(profile.dailyEditCount);
            const last90DaysAvg = getLast90DaysAverage(profile.dailyEditCount);
            const maxDailyEdits = getMaxDailyEdits(profile.dailyEditCount);
            const currentStreak = getCurrentStreak(profile.dailyEditCount);
            const totalMapEdits = profile.editCountByType.segments + profile.editCountByType.venues;
            const totalClosures = profile.editCountByType.updateRequests + profile.editCountByType.placeUpdateRequests + profile.editCountByType.mapProblems;

            // Session-Statistiken
            const editedSegmentKm = editedSegmentLength.toFixed(1);

            // Get localized text
            const texts = getLocalizedText();

            // Bestehende Statistiken
            const totalEditCountText = `<li>${texts.totalEdits}:&nbsp;${(profile.totalEditCount || 0).toLocaleString()}</li>`;
            const urCountText = `<li>${texts.ursClosed}:&nbsp;${(profile.editCountByType.updateRequests || 0).toLocaleString()}</li>`;
            const purCountText = `<li>${texts.pursClosed}:&nbsp;${(profile.editCountByType.placeUpdateRequests || 0).toLocaleString()}</li>`;
            const mpCountText = `<li>${texts.mpsClosed}:&nbsp;${(profile.editCountByType.mapProblems || 0).toLocaleString()}</li>`;
            const segmentEditCountText = `<li>${texts.segmentEdits}:&nbsp;${(profile.editCountByType.segments || 0).toLocaleString()}</li>`;
            const placeEditCountText = `<li>${texts.placeEdits}:&nbsp;${(profile.editCountByType.venues || 0).toLocaleString()}</li>`;
            const hnEditCountText = `<li>${texts.houseNumberEdits}:&nbsp;${(profile.editCountByType.segmentHouseNumbers || 0).toLocaleString()}</li>`;

            // Neue erweiterte Statistiken
            const last7DaysAvgText = `<li>${texts.avgLast7Days}:&nbsp;${last7DaysAvg.toLocaleString()}</li>`;
            const last30DaysAvgText = `<li>${texts.avgLast30Days}:&nbsp;${last30DaysAvg.toLocaleString()}</li>`;
            const last90DaysAvgText = `<li>${texts.avgLast90Days}:&nbsp;${last90DaysAvg.toLocaleString()}</li>`;
            const maxDailyEditsText = `<li>${texts.maxDailyEdits}:&nbsp;${maxDailyEdits.toLocaleString()}</li>`;
            const currentStreakText = `<li>${texts.currentStreak}:&nbsp;${currentStreak}&nbsp;${texts.days}</li>`;
            const totalMapEditsText = `<li>${texts.totalMapEdits}:&nbsp;${totalMapEdits.toLocaleString()}</li>`;
            const totalClosuresText = `<li>${texts.totalClosures}:&nbsp;${totalClosures.toLocaleString()}</li>`;

            // Session-Statistiken
            const editedSegmentText = editedSegmentLength > 0 ? `<li>${texts.segmentsEdited}:&nbsp;${editedSegmentKm}&nbsp;km</li>` : '';

            let warningText = '';
            if (savesWithoutIncrease) {
                warningText = `<div class="wecm-warning ${warningStyleClass}">${savesWithoutIncrease} ${
                    (savesWithoutIncrease > 1) ? 'consecutive saves' : 'save'} without an increase. ${
                    (savesWithoutIncrease >= 5) ? '(Are you throttled?)' : ''}</div>`;
            }

            // Erweiterte Tooltip-Anzeige mit Kategorien
            $outputElem.attr('data-original-title', `${
                texts.tooltipHeader}<br><br><strong>📊 ${texts.basicStats}:</strong><ul>${
                totalEditCountText}${
                maxDailyEditsText}${
                currentStreakText}</ul><strong>📈 ${texts.averageValues}:</strong><ul>${
                last7DaysAvgText}${
                last30DaysAvgText}${
                last90DaysAvgText}</ul><strong>🗺️ ${texts.mapEdits}:</strong><ul>${
                segmentEditCountText}${
                placeEditCountText}${
                hnEditCountText}${
                totalMapEditsText}</ul><strong>🔧 ${texts.closures}:</strong><ul>${
                urCountText}${
                purCountText}${
                mpCountText}${
                totalClosuresText}</ul>${editedSegmentText ? `<strong>📏 ${texts.sessionInfo}:</strong><ul>${editedSegmentText}</ul>` : ''}${warningText}`);
            lastProfile = profile;
        });
    }

    // Fallback-Funktion für Zeit-Tracking Panel
    function createFallbackTimeTrackingPanel(texts, timeTrackingTab) {
        log('WME SDK nicht verfügbar - Zeit-Tracking Tab wird als separates Element erstellt');
        
        // Erstelle einen Button zum Öffnen des Zeit-Tracking Panels
        const timeTrackingButton = $(`
            <div style="
                position: fixed; 
                top: 100px; 
                right: 20px; 
                z-index: 10000; 
                background: #2196F3; 
                color: white; 
                padding: 10px 15px; 
                border-radius: 5px; 
                cursor: pointer; 
                font-weight: bold;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            ">📊 ${texts.timeTracking}</div>
        `);
        
        // Panel für Zeit-Tracking
        const timeTrackingPanel = $(`
            <div id="wecm-time-tracking-panel" style="
                position: fixed; 
                top: 150px; 
                right: 20px; 
                width: 400px; 
                background: white; 
                border: 2px solid #2196F3; 
                border-radius: 8px; 
                box-shadow: 0 4px 20px rgba(0,0,0,0.3); 
                z-index: 10001;
                display: none;
            "></div>
        `);
        
        timeTrackingPanel.append(timeTrackingTab);
        
        // Event Listener für Button
        timeTrackingButton.on('click', function() {
            timeTrackingPanel.toggle();
            if (timeTrackingPanel.is(':visible')) {
                updateTimeHistoryTable();
            }
        });
        
        // Zur Seite hinzufügen
        $('body').append(timeTrackingButton);
        $('body').append(timeTrackingPanel);
        
        // Tabelle initialisieren nachdem Panel im DOM ist
        setTimeout(() => updateTimeHistoryTable(), 50);
    }

    // Zeit-Tracking Tab erstellen
    function createTimeTrackingTab() {
        const texts = getLocalizedText();
        
        // Tab-Inhalt erstellen
        const tabContent = $(`
            <div id="wecm-time-tracking-tab" style="padding: 15px;">
                <div style="margin-bottom: 20px;">
                    <label style="display: flex; align-items: center; font-weight: bold; margin-bottom: 10px;">
                        <input type="checkbox" id="wecm-pause-tracking-checkbox" style="margin-right: 8px;" ${timeTrackingPaused ? 'checked' : ''}>
                        ${texts.pauseTimeTracking}
                    </label>
                    
                    <label style="display: flex; align-items: center; font-weight: bold; margin-bottom: 10px;">
                        <input type="checkbox" id="wecm-show-time-checkbox" style="margin-right: 8px;" ${timeTrackingVisible ? 'checked' : ''}>
                        ${texts.showTimeDisplay}
                    </label>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <button id="wecm-save-time-btn" style="
                        background: #2196F3; 
                        color: white; 
                        border: none; 
                        padding: 10px 20px; 
                        border-radius: 5px; 
                        cursor: pointer; 
                        font-weight: bold;
                        transition: background 0.3s ease;
                    ">${texts.saveCurrentTime}</button>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <h3 style="margin: 0 0 10px 0; color: #2196F3;">${texts.sessionHistory}</h3>
                </div>
                
                <div id="wecm-time-history-table" style="
                    max-height: 300px; 
                    overflow-y: auto; 
                    border: 1px solid #ddd; 
                    border-radius: 5px;
                    margin-bottom: 15px;
                ">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: #f5f5f5; position: sticky; top: 0;">
                            <tr>
                                <th style="padding: 8px; border-bottom: 1px solid #ddd; text-align: left;">${texts.date}</th>
                                <th style="padding: 8px; border-bottom: 1px solid #ddd; text-align: left;">${texts.duration}</th>
                                <th style="padding: 8px; border-bottom: 1px solid #ddd; text-align: left;">Gesamt</th>
                                <th style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; width: 40px;"></th>
                            </tr>
                        </thead>
                        <tbody id="wecm-time-history-body">
                        </tbody>
                    </table>
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <button id="wecm-clear-history-btn" style="
                        background: #f44336; 
                        color: white; 
                        border: none; 
                        padding: 8px 16px; 
                        border-radius: 3px; 
                        cursor: pointer; 
                        font-size: 12px;
                        font-weight: bold;
                    ">${texts.clearHistory}</button>
                </div>
            </div>
        `);

        // Event Listeners hinzufügen
        tabContent.find('#wecm-pause-tracking-checkbox').on('change', function() {
            const wasPaused = timeTrackingPaused;
            timeTrackingPaused = $(this).is(':checked');
            
            if (timeTrackingPaused && !wasPaused) {
                // Pause beginnt - Zeitpunkt merken
                pauseStartTime = Date.now();
            } else if (!timeTrackingPaused && wasPaused) {
                // Pause endet - pausierte Zeit zur Gesamtpause hinzufügen
                pausedTime += Date.now() - pauseStartTime;
                pauseStartTime = 0;
            }
            
            saveTimeTrackingSettings();
            log(`Zeit-Tracking ${timeTrackingPaused ? 'pausiert' : 'fortgesetzt'}`);
        });

        tabContent.find('#wecm-show-time-checkbox').on('change', function() {
            timeTrackingVisible = $(this).is(':checked');
            saveTimeTrackingSettings();
            
            // Sofort die Sichtbarkeit der Zeit-Anzeige aktualisieren - kompletten Container
            const $realtimeContainer = $realtimeCounterElem ? $realtimeCounterElem.closest('.toolbar-button') : null;
            if ($realtimeContainer) {
                if (timeTrackingVisible) {
                    $realtimeContainer.show();
                } else {
                    $realtimeContainer.hide();
                }
            }
            
            log(`Zeit-Anzeige ${timeTrackingVisible ? 'eingeblendet' : 'ausgeblendet'}`);
        });

        tabContent.find('#wecm-save-time-btn').on('click', function() {
            saveCurrentSessionTime();
            updateTimeHistoryTable();
            
            // Feedback für den Benutzer
            const button = $(this);
            const originalText = button.text();
            button.text(texts.timeSaved).css('background', '#4CAF50');
            setTimeout(() => {
                button.text(originalText).css('background', '#2196F3');
            }, 2000);
        });

        tabContent.find('#wecm-clear-history-btn').on('click', function() {
            if (confirm(texts.confirmClear)) {
                timeTrackingData = [];
                saveTimeTrackingData();
                updateTimeHistoryTable();
                log('Zeit-Verlauf gelöscht');
            }
        });

        // Hover-Effekte für Buttons
        tabContent.find('#wecm-save-time-btn').hover(
            function() { $(this).css('background', '#1976D2'); },
            function() { $(this).css('background', '#2196F3'); }
        );

        tabContent.find('#wecm-clear-history-btn').hover(
            function() { $(this).css('background', '#d32f2f'); },
            function() { $(this).css('background', '#f44336'); }
        );

        // Event-Listener für einzelne Session-Löschung (delegiert)
        tabContent.on('click', '.wecm-delete-session-btn', function() {
            const timestamp = parseInt($(this).data('timestamp'));
            const texts = getLocalizedText();
            
            if (confirm(texts.confirmDeleteSession)) {
                // Session aus dem Array entfernen
                timeTrackingData = timeTrackingData.filter(entry => entry.timestamp !== timestamp);
                saveTimeTrackingData();
                updateTimeHistoryTable();
                log('Session gelöscht');
            }
        });

        // Hover-Effekte für Löschen-Buttons (delegiert)
        tabContent.on('mouseenter', '.wecm-delete-session-btn', function() {
            $(this).css('background', '#d32f2f');
        });
        
        tabContent.on('mouseleave', '.wecm-delete-session-btn', function() {
            $(this).css('background', '#f44336');
        });

        // Tabelle sofort beim Erstellen der UI initialisieren
        // updateTimeHistoryTable(); // Entfernt - wird nach DOM-Einfügung aufgerufen

        return tabContent;
    }

    // Zeit-Verlauf Tabelle aktualisieren
    function updateTimeHistoryTable() {
        const tbody = $('#wecm-time-history-body');
        tbody.empty();

        // Entferne vorherige Zusammenfassung
        $('#wecm-time-history-table').next('.wecm-total-summary').remove();

        if (timeTrackingData.length === 0) {
            tbody.append(`
                <tr>
                    <td colspan="4" style="padding: 20px; text-align: center; color: #666; font-style: italic;">
                        Keine Daten verfügbar
                    </td>
                </tr>
            `);
            return;
        }

        // Daten nach Datum sortieren (neueste zuerst)
        const sortedData = [...timeTrackingData].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Gesamtdauer berechnen
        let totalDuration = 0;
        let totalSessions = sortedData.length;

        sortedData.forEach((entry, index) => {
            totalDuration += entry.duration;
            
            const date = new Date(entry.timestamp);
            const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            const duration = formatDuration(entry.duration);
            const totalDurationStr = formatDuration(totalDuration);

            const row = $(`
                <tr style="border-bottom: 1px solid #eee; ${index % 2 === 0 ? 'background: #fafafa;' : ''}" data-session-index="${index}">
                    <td style="padding: 8px; font-size: 12px;">${dateStr}</td>
                    <td style="padding: 8px; font-weight: bold; color: #2196F3;">${duration}</td>
                    <td style="padding: 8px; font-weight: bold; color: #4CAF50;">${totalDurationStr}</td>
                    <td style="padding: 8px; text-align: center;">
                        <button class="wecm-delete-session-btn" data-timestamp="${entry.timestamp}" style="
                            background: #f44336; 
                            color: white; 
                            border: none; 
                            padding: 4px 8px; 
                            border-radius: 3px; 
                            cursor: pointer; 
                            font-size: 12px;
                            font-weight: bold;
                        " title="Session löschen">×</button>
                    </td>
                </tr>
            `);

            tbody.append(row);
        });

        // Gesamtwert unter der Tabelle hinzufügen (ohne grünes Styling)
        const totalSummary = formatDurationDetailed(totalDuration);
        const summaryRow = $(`
            <div class="wecm-total-summary" style="
                margin-top: 15px; 
                padding: 12px; 
                background: #f5f5f5; 
                color: #333; 
                border: 1px solid #ddd;
                border-radius: 8px; 
                text-align: center; 
                font-weight: bold; 
                font-size: 14px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            ">
                Gesamt: ${totalSessions} Sessions<br>${totalSummary}
            </div>
        `);
        
        // Füge die Zusammenfassung nach der Tabelle hinzu
        $('#wecm-time-history-table').after(summaryRow);
    }

    // Dauer formatieren (Stunden:Minuten:Sekunden)
    function formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    // Detaillierte Dauer formatieren (Tage, Stunden, Minuten, Sekunden)
    function formatDurationDetailed(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        let result = [];
        
        // Immer Tage anzeigen, auch wenn 0
        result.push(`${days} ${days === 1 ? 'Tag' : 'Tage'}`);
        
        if (hours > 0) {
            result.push(`${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`);
        }
        if (minutes > 0) {
            result.push(`${minutes} min`);
        }
        // Sekunden immer anzeigen, auch wenn 0 (außer wenn bereits Minuten oder Stunden vorhanden sind)
        if (secs > 0 || (hours === 0 && minutes === 0)) {
            result.push(`${secs} sec`);
        }

        // Verbinde mit "und" für das letzte Element
        if (result.length > 1) {
            const last = result.pop();
            return result.join(', ') + ' und ' + last;
        }
        
        return result[0] || '0 Tage';
    }

    async function init() {
        userName = sdk.State.getUserInfo().userName;

        GM_addStyle(`
            .wecm-tooltip li {text-align: left; margin: 2px 0;}
            .wecm-tooltip ul {margin: 5px 0; padding-left: 20px;}
            .wecm-tooltip strong {color: #2196F3; display: block; margin-top: 8px; margin-bottom: 4px;}
            .wecm-tooltip .wecm-warning {border-radius:8px; padding:3px; margin-top:8px; margin-bottom:5px;}
            .wecm-tooltip .wecm-warning.yellow {background-color:yellow; color:black;}
            .wecm-tooltip .wecm-warning.red {background-color:red; color:white;}
            .wecm-tooltip {max-width: 400px;}
            
            /* Enhanced tooltip styling for sections */
            .wecm-tooltip-section {
                margin-bottom: 12px;
                padding: 8px;
                background-color: rgba(33, 150, 243, 0.05);
                border-radius: 6px;
                border-left: 3px solid #2196F3;
            }
            
            .wecm-section-header {
                font-weight: bold;
                color: #2196F3;
                margin-bottom: 6px;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .wecm-stat-line {
                display: flex;
                justify-content: space-between;
                margin: 4px 0;
                padding: 2px 0;
                border-bottom: 1px dotted rgba(33, 150, 243, 0.2);
            }
            
            .wecm-stat-line:last-child {
                border-bottom: none;
            }
            
            .wecm-stat-value {
                font-weight: bold;
                color: #1976D2;
            }
            
            /* Real-time counter styling */
            #wecm-realtime-counter {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-weight: 600;
                text-shadow: 0 1px 2px rgba(0,0,0,0.1);
                transition: all 0.3s ease;
            }
            
            #wecm-realtime-counter:hover {
                color: #1976D2 !important;
                transform: scale(1.05);
            }
            
            /* Animation for counter updates */
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }
            
            .wecm-counter-update {
                animation: pulse 0.5s ease-in-out;
            }
        `);

        // Zeit-Tracking Einstellungen laden
        loadTimeTrackingSettings();
        loadTimeTrackingData();

        // Zeit-Tracking Tab registrieren
        const texts = getLocalizedText();
        const timeTrackingTab = createTimeTrackingTab();
        
        // Prüfe ob WME SDK verfügbar ist
        if (sdk && sdk.Sidebar && sdk.Sidebar.registerScriptTab) {
            try {
                const { tabLabel, tabPane } = await sdk.Sidebar.registerScriptTab();
                
                // Tab-Label mit Emoji setzen
                tabLabel.textContent = '📊';
                tabLabel.title = texts.timeTracking;
                
                // Tab-Inhalt hinzufügen
                tabPane.appendChild(timeTrackingTab.get(0));
                
                // Tabelle initialisieren nachdem sie im DOM ist
                setTimeout(() => updateTimeHistoryTable(), 50);
                
                // Event Listener für Tab-Aktivierung
                tabLabel.addEventListener('click', function() {
                    // Tabelle aktualisieren wenn Tab geöffnet wird
                    setTimeout(() => updateTimeHistoryTable(), 100);
                });
                
                log('Zeit-Tracking Tab erfolgreich registriert');
            } catch (error) {
                log('Fehler beim Registrieren des Zeit-Tracking Tabs: ' + error.message);
                // Fallback zur alten Methode
                createFallbackTimeTrackingPanel(texts, timeTrackingTab);
            }
        } else {
            // Fallback für Test-Umgebung oder ältere WME-Versionen
            createFallbackTimeTrackingPanel(texts, timeTrackingTab);
        }

        // Segment edit tracking setup
        trackSegmentEdits();

        // Start real-time counter update interval (update every second)
        if (realtimeUpdateInterval) {
            clearInterval(realtimeUpdateInterval);
        }
        realtimeUpdateInterval = setInterval(updateRealtimeCounter, 1000);

        sdk.Events.on({ eventName: 'wme-save-finished', eventHandler: onSaveFinished });
        // Update the edit count first time.
        updateEditCount();
        log('Initialized with extended statistics including session tracking, real-time counter and time tracking tab.');
    }

    function onSaveFinished(result) {
        if (result.success) {
            updateEditCount();
            
            // Automatische Zeit-Speicherung beim erfolgreichen WME-Speichern
            // Nur speichern wenn Zeit-Tracking nicht pausiert ist
            if (!timeTrackingPaused) {
                saveCurrentSessionTime();
            }
        }
    }

    init();
})();
