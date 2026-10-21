// IT help posters: the settings. Edit a room or a problem here to change it for everyone. A change made on the page
// (Room details) is kept only in that browser.
(function () {
  'use strict';
  const ITP = (window.ITP = window.ITP || {});

  // The portal signs people in and hands them to Ticketing. A room's QR code goes through it, so the code works
  // whatever Ticketing's own address is, and anyone not signed in signs in first and lands back on the form.
  ITP.PORTAL_URL = 'https://portal.apps.energymatrix.com.au';
  ITP.TICKETING_APP = 'ticketing';
  // Email here becomes a ticket (Ticketing reads the mailbox).
  ITP.SERVICE_DESK = 'servicedesk@energymatrix.com.au';

  // The offices the rooms are in, in the order the page lists them.
  ITP.SITES = [
    { id: 'VIC', name: 'Victoria' },
    { id: 'WA', name: 'Western Australia' },
  ];

  // What a room has, until it is set for that room. Every room starts with these.
  const KIT = {
    connect: 'the cable on the table (HDMI or USB-C)',
    input: 'HDMI 1',
    speaker: 'the room speakerphone',
    camera: 'the room camera',
    teamsRoom: false,
  };

  // The rooms, as Outlook's room list has them. The words go straight into the posters, so write them as they read
  // in a sentence:
  //   site      one of ITP.SITES.
  //   name      the room as people in that office call it, for the posters ("Teams in the Boardroom").
  //   directory the room's name in Outlook's room list. Tickets use it, so IT can tell VIC's Boardroom from WA's.
  //   mailbox   the room's address in Outlook, for reference. It is not put in the QR codes, to keep them small.
  //   where     where the room is, added to the ticket ("Level 2"). Optional.
  //   connect   what a laptop plugs into: "Plug in <connect>".
  //   input     the input the room screen should be on, for the "nothing on the screen" fix. Empty leaves the step out.
  //   speaker   the room's speakerphone, as Teams lists it under the arrow beside Mic.
  //   camera    the room's camera, as Teams lists it under the arrow beside Camera.
  //   teamsRoom true when the room has a Microsoft Teams Rooms touch panel that joins the meeting itself.
  ITP.ROOMS = [
    { ...KIT, id: 'vic-boardroom', site: 'VIC', name: 'Boardroom', directory: 'EMG VIC Boardroom', mailbox: 'emg_vic_boardroom@energymatrix.com.au', where: '' },
    { ...KIT, id: 'vic-meeting-room', site: 'VIC', name: 'Meeting Room', directory: 'EMG VIC Meeting Room', mailbox: 'emg_vic_meeting_room@energymatrix.com.au', where: '' },
    { ...KIT, id: 'vic-port-apartment', site: 'VIC', name: 'Port Apartment', directory: 'Port Apartment (VIC)', mailbox: 'portaprtmentvic@energymatrix.com.au', where: 'Melbourne, Victoria' },
    { ...KIT, id: 'wa-boardroom', site: 'WA', name: 'Boardroom', directory: 'EMG WA Boardroom', mailbox: 'EMG_WA_Boardroom@energymatrix.com.au', where: '' },
    { ...KIT, id: 'wa-meeting-room', site: 'WA', name: 'Meeting Room', directory: 'EMG WA Meeting Room', mailbox: 'EMG_WA_Meeting_Room@energymatrix.com.au', where: '' },
  ];

  // The problems a QR code can report. category and subcategory are names as Ticketing lists them under
  // Administration > Categories (names, not ids, because ids differ between databases). {room} becomes the room's
  // name in Outlook (directory), so a ticket says which office it came from.
  ITP.ISSUES = [
    { id: 'general', label: "Something isn't working", short: 'Anything else', subject: '{room}: something isn\'t working', category: 'Facilities / AV', subcategory: 'Conference room AV issue' },
    { id: 'teams', label: 'Teams call problem', short: 'Teams call', subject: '{room}: Teams call problem', category: 'Facilities / AV', subcategory: 'Conference room AV issue' },
    { id: 'display', label: "No picture, or can't share", short: 'Screen or sharing', subject: '{room}: no picture or can\'t share', category: 'Facilities / AV', subcategory: 'Conference room AV issue' },
    { id: 'audio', label: 'No sound, or the mic isn\'t working', short: 'Sound or mic', subject: '{room}: sound or mic not working', category: 'Facilities / AV', subcategory: 'Conference room AV issue' },
    { id: 'camera', label: "Camera isn't working", short: 'Camera', subject: '{room}: camera not working', category: 'Facilities / AV', subcategory: 'Conference room AV issue' },
    { id: 'wifi', label: 'Wi-Fi or internet', short: 'Wi-Fi', subject: '{room}: Wi-Fi or internet problem', category: 'Network & Connectivity', subcategory: 'Wi-Fi' },
    { id: 'other', label: 'Something else in the room', short: 'Something else', subject: '{room}: something else', category: 'Facilities / AV', subcategory: 'Other' },
  ];

  // Ticketing's New Ticket priorities. Medium is its default, so a QR code leaves Medium out of the link.
  ITP.PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
})();
