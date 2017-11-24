//DESCRIPTION: convert footnotes to dynamic (cross-referenced) endnotes
// Peter Kahrel -- www.kahrel.plus.com

//#target indesign;

// Only CS4 and later
if (parseInt (app.version) > 5 && app.documents.length > 0)
	try {foot_to_end (app.documents[0], "endnote___")}
		catch (e) {alert (e.message + " (line " + e.line + ")")};

//-----------------------------------------------------------------------------------------------

function foot_to_end (doc, stylename)
	{
	app.scriptPreferences.enableRedraw = false;
	var showmessage = create_message_window (30);
	showmessage.show();
	showmessage.txt.text = 'Preparing...';
	
	app.activeDocument.textPreferences.smartTextReflow = true;
	app.activeDocument.textPreferences.addPages = AddPageOptions.END_OF_STORY;
	app.activeDocument.textPreferences.limitToMasterTextFrames = false;

	fix_trailing_space ();
	var endnote, footn, endnote_link, cue;
	var note_styles = add_styles (stylename);
	var storyIDs = [], stories = find_stories (doc);

	for (var j = 0; j < stories.length; j++)
		{
		if (stories[j].footnotes.length > 0)
			{
			stories[j].insertionPoints[-1].contents = '\rNotes';
			footn = stories[j].footnotes;
			for (var i = 0; i < footn.length; i++)
				{
				showmessage.txt.text = 'Stories ' + j + '/Notes ' + i;
				stories[j].insertionPoints[-1].contents = '\r';
				endnote = footn[i].texts[0].move (LocationOptions.after, stories[j].insertionPoints[-1]);
				endnote.applyParagraphStyle (note_styles.first, false);
				if (i == 0)
					{
					endnote.numberingContinue = false;
					endnote.numberingStartAt = 1;
					}
				if (endnote.paragraphs.length > 1)
					{
					endnote.paragraphs.itemByRange (1,-1).applyParagraphStyle (note_styles.next, false);
					}
				endnote_link = doc.paragraphDestinations.add (endnote.insertionPoints[0]);
				cue = doc.crossReferenceSources.add (footn[i].storyOffset, note_styles.cr_format);
				doc.hyperlinks.add (cue, endnote_link, {visible: false});
				} // for
			delete_notemarkers (stories[j]);
			storyIDs.push (stories[j].id);
			} //if
		} // for
	doc.crossReferenceSources.everyItem().update();
	if (storyIDs.length > 0) showmessage.close();
	check_overset (storyIDs);
	}


function check_overset (IDs)
{
	var parent_page = parseInt (app.version) < 7 ? 'parent' : 'parentPage';
	var mess = "";
	for (var i = 0; i < IDs.length; i++) {
		if (app.activeDocument.stories.itemByID(IDs[i]).overflows) {
			mess += app.activeDocument.stories.itemByID(IDs[i]).textContainers.pop()[parent_page].name + '\r';
		}
	}
	if (mess != "") {
		mess = "The conversion caused overset frames on the pages listed below. Resolve the overset situations, then update the crossreferences.\r\r" + mess;
		var f = File ('~/Desktop/footnote_to_endnote_problems.txt');
		f.encoding = 'UTF-8';
		f.open ('w');
		f.write (mess);
		f.close();
		f.execute();
	}
}


function find_stories (doc)
	{
	var array = [];
	// no selection: return all stories
	if (app.selection.length == 0)
		return doc.stories.everyItem().getElements();
	else
		try {app.selection[0].parentStory; return [app.selection[0].parentStory]}
			catch (e) {alert ("Invalid selection", "Convert footnotes", true); exit ()}
	}


function delete_notemarkers (scope)
	{
	app.findGrepPreferences = app.changeGrepPreferences = null;
	app.findChangeGrepOptions.includeFootnotes = true;
	app.findGrepPreferences.findWhat = '~F';
	scope.changeGrep ();
	}


function add_styles ()
	{
	var doc = app.activeDocument;

	// If the document doesn't use a char. style for the note references,
	// create one and use the formatting set in the Footnote Options window
	
	if (doc.footnoteOptions.footnoteMarkerStyle == doc.characterStyles[0])
		{
		var char_style = doc.characterStyles.item ('endnote_marker');
		if (char_style == null)
			char_style = doc.characterStyles.add ({name: 'endnote_marker'});
		//char_style.position = Position[String(doc.footnoteOptions.markerPositioning).replace('_MARKER', "")];
		char_style.position = Position.SUPERSCRIPT;
		doc.footnoteOptions.footnoteMarkerStyle = char_style;
		}
	else
		var char_style = doc.footnoteOptions.footnoteMarkerStyle;

	// If the document doesn't use a dedicated footnote paragraph style,
	// create one and base it on [Basic Paragraph], otherwise use the set footnote style
	// for the endnotes. We need two styles: one for the first paragraph of the note,
	// which is numbered, another for any following paragraphs in the same note.

	if (doc.footnoteOptions.footnoteTextStyle.name[0] == '[')
		{
		if (!doc.paragraphStyles.item ('endnote').isValid) {
			doc.paragraphStyles.add ({name: 'endnote', basedOn: doc.paragraphStyles[1]});
		}
		doc.footnoteOptions.footnoteTextStyle = doc.paragraphStyles.item ('endnote');
		}
	var endnote = doc.footnoteOptions.footnoteTextStyle;
	
	var endnote_numbered = doc.paragraphStyles.item (endnote.name + ' numbered');
	if (!endnote_numbered.isValid)
		{
		endnote_numbered = doc.paragraphStyles.add ({name: endnote.name + ' numbered', basedOn: endnote});
		endnote_numbered.bulletsAndNumberingListType = ListType.numberedList;
		endnote_numbered.numberingFormat = app.documents[0].footnoteOptions.footnoteNumberingStyle;
		endnote_numbered.numberingExpression = '^#';
		endnote_numbered.numberingContinue = true;
		}

	var cr = doc.crossReferenceFormats.item ('endnote_marker');
	if (!cr.isValid)
		{
		cr = doc.crossReferenceFormats.add ({name: 'endnote_marker'});
		cr.appliedCharacterStyle = char_style;
		cr.buildingBlocks.add (BuildingBlockTypes.paragraphNumberBuildingBlock);
		}
		
	return {first: endnote_numbered, next: endnote, cr_format: cr}
	}


function fix_trailing_space ()
	{
	app.findGrepPreferences = app.changeGrepPreferences = null;
	app.findGrepPreferences.findWhat = '\\s+\\z';
	app.findGrepPreferences.appliedParagraphStyle = app.activeDocument.footnoteOptions.footnoteTextStyle;
	app.activeDocument.changeGrep();
	}


function create_message_window (le)
    {
	var dlg = Window.find ("palette", "Foonotes to Endnotes");
	if (dlg == null)
		{
		dlg = new Window ("palette", "Foonotes to Endnotes", undefined,{closeButton: false});
		dlg.txt = dlg.add ('statictext', undefined, " ");
		dlg.txt.characters = le;
	}
	return dlg
	}
