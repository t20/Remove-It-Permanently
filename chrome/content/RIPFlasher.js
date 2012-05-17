/* ***** BEGIN LICENSE BLOCK *****

 * Version: NPL 1.1/GPL 2.0/LGPL 2.1

 *

 * The contents of this file are subject to the Netscape Public License

 * Version 1.1 (the "License"); you may not use this file except in

 * compliance with the License. You may obtain a copy of the License at

 * http://www.mozilla.org/NPL/

 *

 * Software distributed under the License is distributed on an "AS IS" basis,

 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License

 * for the specific language governing rights and limitations under the

 * License.

 *

 * The Original Code is mozilla.org code.

 *

 * The Initial Developer of the Original Code is 

 * Netscape Communications Corporation.

 * Portions created by the Initial Developer are Copyright (C) 2001

 * the Initial Developer. All Rights Reserved.

 *

 * Contributor(s):

 *   Joe Hewitt <hewitt@netscape.com> (original author)

 *

 *

 * Alternatively, the contents of this file may be used under the terms of

 * either the GNU General Public License Version 2 or later (the "GPL"), or

 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),

 * in which case the provisions of the GPL or the LGPL are applicable instead

 * of those above. If you wish to allow use of your version of this file only

 * under the terms of either the GPL or the LGPL, and not to allow others to

 * use your version of this file under the terms of the NPL, indicate your

 * decision by deleting the provisions above and replace them with the notice

 * and other provisions required by the GPL or the LGPL. If you do not delete

 * the provisions above, a recipient may use your version of this file under

 * the terms of any one of the NPL, the GPL or the LGPL.

 *

 * ***** END LICENSE BLOCK ***** */



/***************************************************************

* RIPFlasher ---------------------------------------------------

*   Object for controlling a timed flashing animation which 

*   paints a border around an element.

* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

* REQUIRED IMPORTS:

****************************************************************/



//////////// global variables /////////////////////



var gRIPFlasherRegistry = [];



//////////// global constants ////////////////////



////////////////////////////////////////////////////////////////////////////

//// class Flasher

function inIFlasherAlt()

{

  this.wrappedJSObject = this;

  return this;

};



inIFlasherAlt.prototype =

{

   mColor : "#990000",

   mThickness : 3,

   mInvert : false,



   get color() { return this.mColor; },

   set color(val) {this.mColor = val; },



   get thickness() { return this.mThickness; },

   set thickness(val) {this.mThickness = val; },



   get invert() { return this.mInvert; },

   set invert(val) {this.mInvert = val; },



   scrollElementIntoView : function(node)

   {

   },



   drawElementOutline : function(nodeToHighlight)

   {



        if  (this.mInvert)

        {

            var oldBackColor = nodeToHighlight.style.backgroundColor;

            nodeToHighlight.style.backgroundColor = nodeToHighlight.style.foregroundColor;

            nodeToHighlight.style.foregroundColor = oldBackColor;

        }



        var oldborderColor = nodeToHighlight.style.borderColor;

        nodeToHighlight.setAttribute("rip-style-bordercolor-backup", oldborderColor);

        nodeToHighlight.style.borderColor = this.mColor;



        var oldBorderStyle = nodeToHighlight.style.borderStyle;

        nodeToHighlight.setAttribute("rip-style-borderstyle-backup", oldBorderStyle);

        nodeToHighlight.style.borderStyle = "solid";



        var oldBorderWidth = nodeToHighlight.style.borderWidth;

        nodeToHighlight.setAttribute("rip-style-borderwidth-backup", oldBorderWidth);

        nodeToHighlight.style.borderWidth = this.mThickness + "px";

        



   },



   repaintElement : function(nodeToHighlight)

   {

        if  (this.mInvert)

        {

            var oldBackColor = nodeToHighlight.style.backgroundColor;

            nodeToHighlight.style.backgroundColor = nodeToHighlight.style.foregroundColor;

            nodeToHighlight.style.foregroundColor = oldBackColor;

        }



        var oldBorderColor = nodeToHighlight.getAttribute("rip-style-bordercolor-backup");

        if (oldBorderColor != undefined)

        {

            nodeToHighlight.style.borderColor = oldBorderColor;

        }



        var oldBorderStyle = nodeToHighlight.getAttribute("rip-style-borderstyle-backup");

        if (oldBorderStyle != undefined)

        {

            nodeToHighlight.style.borderStyle = oldBorderStyle;

        }



        var oldBorderWidth = nodeToHighlight.getAttribute("rip-style-borderwidth-backup");

        if (oldBorderWidth != undefined)

        {

            nodeToHighlight.style.borderWidth = oldBorderWidth;

        }

   }

};



function RIPFlasher()

{

    var aColor = RipPrefUtils.getPref("rip.blink.border-color");

    var aThickness = RipPrefUtils.getPref("rip.blink.border-width");

    var aDuration = RipPrefUtils.getPref("rip.blink.duration");

    var aSpeed = RipPrefUtils.getPref("rip.blink.speed");

    var aInvert = RipPrefUtils.getPref("rip.blink.invert");



// For now use alternative Flasher as built in one in Firefox 4.0 seems broken.



   this.mShell = new inIFlasherAlt();

  

  
    
  if (aColor == undefined)
  {
    alert("Blink border color undefined");
  }
  else 
  {
     this.mShell.color = aColor;
  }
  
  this.mShell.thickness = aThickness;

  this.mShell.invert = aInvert;

  this.duration = aDuration;

  this.mSpeed = aSpeed;



  this.register();

};



RIPFlasher.prototype =

{

  ////////////////////////////////////////////////////////////////////////////

  //// Initialization



  mFlashTimeout: null,

  mElement:null,

  mRegistryId: null,

  mFlashes: 0,

  mStartTime: 0,

  mDuration: 0,

  mSpeed: 0,

  mShell: null,



  ////////////////////////////////////////////////////////////////////////////

  //// Properties



  get flashing() { return this.mFlashTimeout != null; },

  

  get element() { return this.mElement; },

  set element(val) 

  { 

    if (val && val.nodeType == Node.ELEMENT_NODE) {

      this.mElement = val; 

      this.mShell.scrollElementIntoView(val);

    } else 

      throw "Invalid node type.";

  },



  get color() { return this.mShell.color; },

  set color(aVal) { return this.mShell.color = aVal; },



  get thickness() { return this.mShell.thickness; },

  set thickness(aVal) { this.mShell.thickness = aVal; },



  get duration() { return this.mDuration; },

  set duration(aVal) { this.mDuration = aVal; },



  get speed() { return this.mSpeed; },

  set speed(aVal) { this.mSpeed = aVal; },



  get invert() { return this.mShell.invert; },

  set invert(aVal) { this.mShell.invert = aVal; },



  // :::::::::::::::::::::::::::::::::::::::::::::::::::::::::

  // :::::::::::::::::::: Methods ::::::::::::::::::::::::::::

  // :::::::::::::::::::::::::::::::::::::::::::::::::::::::::



  register: function()

  {

    var length = gRIPFlasherRegistry.length;

    gRIPFlasherRegistry[length] = this;

    this.mRegistryId = length;

  },



  start: function(aDuration, aSpeed, aHold)

  {

    this.mUDuration = aDuration ? aDuration*1000 : this.mDuration;

    this.mUSpeed = aSpeed ? aSpeed : this.mSpeed

    this.mHold = aHold;

    this.mFlashes = 0;

    this.mStartTime = new Date();

    this.doFlash();

  },



  doFlash: function()

  {

    if (this.mHold || this.mFlashes%2) {

      this.paintOn();

    } else {

      this.paintOff();

    }

    this.mFlashes++;



    if (this.mUDuration < 0 || new Date() - this.mStartTime < this.mUDuration) {

      this.mFlashTimeout = window.setTimeout("gRIPFlasherRegistry["+this.mRegistryId+"].doFlash()", this.mUSpeed);

    } else {

      this.stop();

    }

},



  stop: function()

  {

    if (this.flashing) {

      window.clearTimeout(this.mFlashTimeout);

      this.mFlashTimeout = null;

      this.paintOff();

    }

  },



  paintOn: function()

  {

    this.mShell.drawElementOutline(this.mElement);

  },



  paintOff: function()

  {

    this.mShell.repaintElement(this.mElement);

  }



};



