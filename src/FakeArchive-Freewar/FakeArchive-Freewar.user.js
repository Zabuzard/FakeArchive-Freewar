// ==UserScript==
// @name        FakeArchive-Freewar
// @namespace   Zabuza
// @description Enables the message archive when the user is no sponsor, that is saving messages and viewing them afterwards.
// @include     *.freewar.de/freewar/internal/main.php*
// @version     1
// @require https://code.jquery.com/jquery-3.2.0.min.js
// @grant       none
// ==/UserScript==

/*
 * Checks whether the browser does support webstorage or not.
 * @returns True if it is supported, false if not
 */
function isSupportingWebStorage() {
	return typeof(Storage) !== "undefined";
}

/*
 * Builds the key used in the local storage according to the given key identifier.
 * @param key The key which identifies the key used in the local storage to build
 * @returns The key used in the local storage which corresponds
 *    to the given key identifier
 */
function buildKey(key) {
	return storageKeys.keyIndex + storageKeys[key];
}

/*
 * Gets the value of the item given by its key from the local storage.
 * @returns The value of item given by its key or null if not defined
 */
function getItem(key) {
	var keyOfStorage = buildKey(key);
	var value = localStorage.getItem(keyOfStorage);
	if (value === null || value === '' || value == 'undefined') {
		return null;
	} else if (value.toLowerCase() == 'true') {
		return true;
	} else if (value.toLowerCase() == 'false') {
		return false;
	} else {
		return value;
	}
}

/*
 * Sets the value of the item given by its key in the local storage.
 * @param key The key of the item to set
 * @param value The value to set
 */
function setItem(key, value) {
	localStorage.setItem(buildKey(key), value);
}

/*
 * Fills the given value with leading zeros until it has a
 * size of at least two characters.
 * @param value The value to fill up
 * @returns The filled value
 */
function fillWithZerosUpToTwo(value) {
	var valueAsText = value + '';

	if (valueAsText.length === 1) {
		return '0' + valueAsText;
	}

	if (valueAsText.length === 0) {
		return '00';
	}

	return valueAsText;
}

/*
 * Checks whether the archive is currently opened or not.
 * @returns True if it is opened, false if not
 */
function isArchiveOpened() {
	var presenceElement = $('p.maincaption a[href*="action=showlastreport"]').parent();
	if (presenceElement.length <= 0) {
		return false;
	}

	var presenceRaw = $(presenceElement).html();
	return presenceRaw.includes(' / Archiv');
}

/*
 * Saves the given set of messages as the archive.
 * @param messages An array of messages to save as the archive.
 *    A message holds the keys 'id', 'timestamp' and 'content'.
 */
function saveAsArchive(messages) {
	var messagesRaw = [];

	for (i = 0; i < messages.length; i++) {
		var message = messages[i];
		messagesRaw.push(message.id + messageFormat.valueSeparator +
			message.timestamp + messageFormat.valueSeparator +
			message.content);
	}

	var archiveRaw = messagesRaw.join(messageFormat.entrySeparator);
	setItem('messages', archiveRaw);
}

/*
 * Gets an array containing all archived messages.
 * @returns An array containing all archived messages.
 *    A message holds the keys 'id', 'timestamp' and 'content'.
 */
function getArchivedMessages() {
	var archiveRaw = getItem('messages');
	if (archiveRaw === null) {
		archiveRaw = '';
		setItem('messages', archiveRaw);
	}

	var messages = [];

	if (archiveRaw.length <= 0) {
		// Return an empty array as there are no messages
		return messages;
	}

	var messagesRaw = archiveRaw.split(messageFormat.entrySeparator);
	for (i = 0; i < messagesRaw.length; i++) {
		var messageRaw = messagesRaw[i];
		var messageData = messageRaw.split(messageFormat.valueSeparator);

		var id = Number(messageData[0]);
		var timestamp = Number(messageData[1]);
		var content = messageData[2];
		messages.push({'id': id, 'timestamp': timestamp, 'content': content});
	}

	return messages;
}

/*
 * Appends the given message to the archive.
 * @param id The id of the message to append
 * @param timestamp The timestamp of the message to append
 * @param content The content of the message to append
 */
function appendMessageToArchive(id, timestamp, content) {
	var messages = getArchivedMessages();
	messages.push({'id': id, 'timestamp': timestamp, 'content': content});
	saveAsArchive(messages);
}

/*
 * Removes the given message from the archive.
 * @param event An event object with a parameter named 'data' holding
 *    a parameter 'id' which is the id of the message to remove and a parameter 'refresh'
 *    which indicates if the method should refresh the page afterwards or not
 */
function removeMessageFromArchive(event) {
	var id = event.data.id;
	var messages = getArchivedMessages();

	// Find the element
	var indexOfElement = -1;
	for (i = 0; i < messages.length; i++) {
		var message = messages[i];
		if (message.id == id) {
			indexOfElement = i;
			break;
		}
	}

	// There is no such element
	if (indexOfElement == -1) {
		return;
	}

	// Remove the element
	messages.splice(indexOfElement, 1);

	// Save the archive
	saveAsArchive(messages);

	if (event.data.refresh) {
		location.reload();
	}
}

/*
 * Archives the given message.
 * @param event An event object with a parameter named 'data' holding a parameter 'content'
 *    which contains the content of the message to archive, a parameter 'timestamp' with
 *    the timestamp of the message and a parameter 'id' which holds the id of the message.
 */
function archiveMessage(event) {
	var id = Number(event.data.id);
	var timestamp = Number(event.data.timestamp);
	var content = event.data.content;

	appendMessageToArchive(id, timestamp, content);
}

/*
 * Appends the given message to the document by inserting it after the given anchor element.
 * @param message The message object to append which holds keys 'content' and 'timestamp'
 * @param number The number of the message
 * @param anchorElement The element to append the message to
 */
function appendMessageToDocument(message, number, anchorElement) {
	var id = message.id;
	var timestamp = message.timestamp;
	var content = message.content;

	var date = new Date(timestamp);
	var dateText = fillWithZerosUpToTwo(date.getDate()) + '.' +
		fillWithZerosUpToTwo(date.getMonth() + 1) +
		' um ' + fillWithZerosUpToTwo(date.getHours()) + ':' +
		fillWithZerosUpToTwo(date.getMinutes()) + ' Uhr';

	var removeAnchor = '<a href="javascript: void(0);" class="removeMessageFromArchive"><input type="hidden" value="' +
		id + '">(löschen)</a>';

	$(anchorElement).after('<p class="maincaption2">Nachricht (' +
		number + ') vom ' + dateText + ': ' + removeAnchor +
		'</p><br/>' + content + '<br/><br/>');
}

/*
 * Applies the handler for removing messages from the archive to the dynamic created anchors.
 */
function applyRemoveMessageFromArchiveHandler() {
	$('a.removeMessageFromArchive').each(function() {
		// Extract the message id from a wrapper and delete it afterwards
		var idWrapper = $(this).find('input');
		var id = Number(idWrapper.val());
		$(idWrapper).remove();

		$(this).click({'id': id, 'refresh': true}, removeMessageFromArchive);
	});
}

/*
 * Creates and loads the viewer service.
 */
function loadViewerService() {
	var messages = getArchivedMessages();
	// Abort if there are no messages
	if (messages.length <= 0) {
		return;
	}

	// Get the anchor to append messages to
	var anchorElement = $('a[href="main.php"]:contains("Zurück")');

	// First add an additional exit anchor which will be at the bottom in the end
	$(anchorElement).after('<a href="main.php">Zurück</a>');

	// Reversly append all messages to the document such that the newest
	// element is at the top and will be added as last element
	for (i = messages.length - 1; i >= 0; i--) {
		var message = messages[i];
		var number = i + 1;

		appendMessageToDocument(message, number, anchorElement);
	}

	$(anchorElement).after('<br/><br/>');

	applyRemoveMessageFromArchiveHandler();
}

/*
 * Creates and loads the saver service.
 */
function loadSaverService() {
	// Apply the save action to every message element
	$('p.maincaption2 a[href*="action=archive&mode=store"').each(function() {
		// Extract the id of the message
		var fullSaveAnchor = $(this).attr('href');
		var idPattern = /.*store_msg=(\d+).*/i;
		var idMatches = idPattern.exec(fullSaveAnchor);
		var id = idMatches[1];

		// Extract the content of the message by searching it in the full text
		var fullText = $(this).parent('p').parent().html();
		var contentPattern = new RegExp(
			'<a.+?href=.*?action=archive.{1,7}mode=store.*?store_msg=' + id +
			'.*?<\/p><br\\s*?\/*?>(.+?)<br\\s*?\/*?><br\\s*?\/*?>(?:<p.+class=".??maincaption2.??".+?>|' +
			'<a.+?href="main\.php".??>Weiter</a>|' +
			'<a.+href=.*read_msg=' + id + ')', 'i');
		var contentMatches = contentPattern.exec(fullText);
		var content = contentMatches[1];

		// Create timestamp
		var timestamp = Date.now();

		// Exchange the save anchor with an own save action
		$(this).attr('href', 'javascript: void(0);');
		$(this).removeAttr('onclick');
		// Add the save handler
		$(this).click({'id': id, 'timestamp': timestamp, 'content': content}, archiveMessage);
	});
}

/*
 * Creates and loads the service.
 */
function loadService() {
	if (isArchiveOpened()) {
		loadViewerService();
	} else {
		loadSaverService();
	}
}

// Storage key constants
var storageKeys = {};
storageKeys.keyIndex = 'archive_';
storageKeys.messages = 'messages';

// Item entry format constants
var messageFormat = {};
messageFormat.valueSeparator = ';/-;';
messageFormat.entrySeparator = ';?-;';

// Load the service
loadService();