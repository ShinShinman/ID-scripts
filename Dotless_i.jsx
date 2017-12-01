// This script for Indesign CS inserts a "dotless i" character at the insertion point.
// You can replace the number in parentheses below with the Unicode character that you want to "type"
// For example, to type a double-wave character instead of a "dotless i" change 0x0131 to 0x2248
// Make sure you save this file as a Text-only file
// For more information, see http://indesignsecrets.com/plug-ins-and-scripts///
//if (app.selection[0].constructor.name == "InsertionPoint"){ 	with (app.selection[0].insertionPoints[0]){ // insertion point 				contents = String.fromCharCode(0x0131); // dotless i 	} }//End of script.