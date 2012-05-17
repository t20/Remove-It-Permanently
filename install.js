/* ***** BEGIN LICENSE BLOCK *****

 * Version: MPL 1.1/GPL 2.0/LGPL 2.1

 *

 * The contents of this file are subject to the Mozilla Public License Version

 * 1.1 (the "License"); you may not use this file except in compliance with

 * the License. You may obtain a copy of the License at

 * http://www.mozilla.org/MPL/

 *

 * Software distributed under the License is distributed on an "AS IS" basis,

 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License

 * for the specific language governing rights and limitations under the

 * License.

 *

 * The Original Code is ForecastFox.

 *

 * The Initial Developer of the Original Code is

 * Jon Stritar <jstritar@MIT.EDU>.

 * Portions created by the Initial Developer are Copyright (C) 2005

 * the Initial Developer. All Rights Reserved.

 *

 * Contributor(s):

 * Jon Stritar <jstritar@MIT.EDU>

 *

 * Alternatively, the contents of this file may be used under the terms of

 * either the GNU General Public License Version 2 or later (the "GPL"), or

 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),

 * in which case the provisions of the GPL or the LGPL are applicable instead

 * of those above. If you wish to allow use of your version of this file only

 * under the terms of either the GPL or the LGPL, and not to allow others to

 * use your version of this file under the terms of the MPL, indicate your

 * decision by deleting the provisions above and replace them with the notice

 * and other provisions required by the GPL or the LGPL. If you do not delete

 * the provisions above, a recipient may use your version of this file under

 * the terms of any one of the MPL, the GPL or the LGPL.

 *

 * ***** END LICENSE BLOCK ***** */

 

// package constants

const DISPLAY_NAME   = "Remove it Permanently";

const NAME           = "rip";

const KEY            = "/" + NAME;

const GUID           = "{1dbc4a33-ea62-4330-966c-7bdad3455322}";

const VERSION        = "1.0.6.10";

const LOCALE_LIST    = ["en-US", "fr-FR", "it-IT", "de-DE"];

const JAR_FILE       = NAME + ".jar";

const PREFS_FILE     = "default-config.xml";

const CONTENT_FOLDER = "content/" + NAME + "/";



var err = null;



// begin the install

initInstall(NAME, KEY, VERSION);



var mainDir = getFolder("Profile", "extensions/" + GUID);

var chromeDir = getFolder(mainDir, "chrome");



addFile(KEY, VERSION, "chrome/"+JAR_FILE, chromeDir, null);



// Add the defaults folder

 var defaultDir = getFolder(mainDir, "store");

 addFile(KEY, VERSION, "store/"+PREFS_FILE, defaultDir, null);



// Register the chrome URLs

registerChrome(Install.CONTENT | PROFILE_CHROME, getFolder(chromeDir, JAR_FILE), "content/"+NAME+"/");

registerChrome(Install.SKIN | PROFILE_CHROME, getFolder(chromeDir, JAR_FILE), "skin/classic/"+NAME+"/");



for (var x = 0; x < LOCALE_LIST.length; x++)

  registerChrome(Install.LOCALE | PROFILE_CHROME, getFolder(chromeDir, JAR_FILE), "locale/"+LOCALE_LIST[x]+"/"+NAME+"/");



// Now install..

if (getLastError() == SUCCESS) {

  err = performInstall();

  if ((err == SUCCESS) || (err == 999))

    alert(DISPLAY_NAME + " " + VERSION + " has been installed successfully!\nPlease restart to enable the extension.");

}

else

  cancelInstall();