const RIP_GUID = "{1dbc4a33-ea62-4330-966c-7bdad3455322}";

const RIP = "rip";

const RIP_CONFIG_NAME = "config.xml";

const RIP_VERSION = "1.0";

const RIP_NOTIFY_STATE_DOCUMENT = Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT;



function RipPage()
{

    this.name = null;

    this.url = null;

    this.enabled = true;

    this.itemsToRemove = new Array();

    this.itemsComment = new Array();

    this.stats = 0;

};



var gRipCache = null;





var RemoveItPermanently =

{

  arrayFlashing : new Array(),



  load: function()

  {

     try

     {

         try

         {

            gBrowser.addProgressListener(ripListener, RIP_NOTIFY_STATE_DOCUMENT);

         }

         catch (e)   // Some window's (ie. XUL dialogs) don't have a getBrowser so we just ignore these windows

         {

            ;

         }



         RemoveItPermanently.checkPreferences();



         var menuPopup = window.document.getElementById("menu_EditPopup");

         if (menuPopup != undefined)

         {

             menuPopup.addEventListener("popupshowing", RemoveItPermanently.editMenuShowing, false);

         }



         var contextPopup = window.document.getElementById("contentAreaContextMenu");

         if (contextPopup != undefined)

         {

             contextPopup.addEventListener("popupshowing", RemoveItPermanently.contextMenuShowing, false);

         }



         try

         {

            var appcontent = document.getElementById("appcontent");



            if (appcontent)

            {

                appcontent.addEventListener("DOMContentLoaded", RemoveItPermanently.onPageLoaded, false);

            }

            else

            {

                //RemoveItPermanently.debugMessage("appContent not found in document, Rip not loaded!?");

            }

         }

         catch (e)

         {

             RemoveItPermanently.handleErrors(e);

         }



        // Now actually read the config.xml file

        var istream = null;

        try

        {

            istream = RemoveItPermanently.getReadStream(RIP_CONFIG_NAME);

        }

        catch (exc)

        {

	        try

	        {

	            istream = RemoveItPermanently.getNewReadStream(RIP_CONFIG_NAME);

	        }

	        catch (exc)

	        {

	           try

	           {

	                istream = RemoveItPermanently.getReadStream("default-config.xml");

	           }

	           catch (excp)

	           {

	                RemoveItPermanently.handleErrors(excp); // If we can't read the default config something is wrong

	                return null; // If we can't read the config file it does not matter

	           }

	        }

        }

         // Make sure we have a cache to load config into

         RemoveItPermanently.checkCache();



         gRipCache = RemoveItPermanently.loadStream(gRipCache, istream);



         window.removeEventListener("load", RemoveItPermanently.load, false);



         //RemoveItPermanently.logMessage("RIP load complete");

     }

     catch (gexc) {};



     return gRipCache;

  },



  checkPreferences: function()

  {

      RemoveItPermanently.setDefaultPref("rip.editmenu.undo", Components.interfaces.nsIPrefBranch.PREF_BOOL, true);

      RemoveItPermanently.setDefaultPref("rip.separaterbefore.menu", Components.interfaces.nsIPrefBranch.PREF_BOOL, true);

      RemoveItPermanently.setDefaultPref("rip.separaterafter.menu", Components.interfaces.nsIPrefBranch.PREF_BOOL, true);

      RemoveItPermanently.setDefaultPref("rip.allow.inside.iframes", Components.interfaces.nsIPrefBranch.PREF_BOOL, true);

      RemoveItPermanently.setDefaultPref("rip.advanced.context.menu", Components.interfaces.nsIPrefBranch.PREF_BOOL, true);

      RemoveItPermanently.setDefaultPref("rip.debug.alert", Components.interfaces.nsIPrefBranch.PREF_BOOL, false);

      RemoveItPermanently.setDefaultPref("rip.blink.border-color", Components.interfaces.nsIPrefBranch.PREF_STRING, "#CC0000");

      RemoveItPermanently.setDefaultPref("rip.blink.border-width", Components.interfaces.nsIPrefBranch.PREF_INT, 2);

      RemoveItPermanently.setDefaultPref("rip.blink.duration", Components.interfaces.nsIPrefBranch.PREF_INT, 1200);

      RemoveItPermanently.setDefaultPref("rip.blink.speed", Components.interfaces.nsIPrefBranch.PREF_INT, 100);

      RemoveItPermanently.setDefaultPref("rip.blink.invert", Components.interfaces.nsIPrefBranch.PREF_BOOL, false);

      RemoveItPermanently.setDefaultPref("rip.iframe.on.framemenu", Components.interfaces.nsIPrefBranch.PREF_BOOL, false);

      RemoveItPermanently.setDefaultPref("rip.statusbar.icon", Components.interfaces.nsIPrefBranch.PREF_BOOL, true);

  },



  // If we don't have any defaults set then create them with the appropriate values!

  setDefaultPref: function(prefName, prefType, value)

  {

      var prefToSet = RipPrefUtils.getPref(prefName);

      if (prefToSet == null)

      {

          RipPrefUtils.setPrefWithType(prefName, prefType, value);

      }

  },



  loadFile: function(ripCacheToLoad, fileToLoad)

  {

      var istream = RemoveItPermanently.getStream(fileToLoad);



      return RemoveItPermanently.loadStream(ripCacheToLoad, istream);

  },



  loadStream: function(ripCacheToLoad, istream)

  {

     var doc = null;

     var parser = new DOMParser();

     try

     {

        // Note the DOM Parser parseFromStream does not seem to work

        doc = parser.parseFromStream(istream, null, istream.available(), "text/xml");



        // The XPath does not seem to work correctly so just get the root for now, change later

        var pXPE = new XPathEvaluator();

        var nodes = pXPE.evaluate("/", doc, null, 0, null);

        

        var configVer = doc.firstChild.getAttribute("version");

        if (configVer != RIP_VERSION)

        {

            RemoveItPermanently.debugMessage("Incorrect version of Config file");

            return null;

        }



        if (nodes != null)

        {

            for (var node = null; (node = nodes.iterateNext()); )

            {

                var configs = 0;

                var configNode = null;



                for(; (configNode = node.childNodes[configs]); configs++)

                {

                    var pages = 0;

                    var pageNode = null;



                    for(; (pageNode = configNode.childNodes[pages]); pages++)

                    {

                        if (pageNode.nodeName == "Page")

                        {

                            var page = new RipPage();

                            var i = 0;

                            var xpathNode = null;



                            for (; (xpathNode = pageNode.childNodes[i]); i++)

                            {

                                try

                                {

                                    if (xpathNode.nodeName == "XPath")

                                    {

                                        // If we have an childNode under the XPathNode

                                        if (xpathNode.firstChild != null)

                                        {

                                            var nodeValue = xpathNode.firstChild.nodeValue;

                                            if ((nodeValue != null) && (nodeValue.length > 0))

                                            {

                                                page.itemsToRemove.push(nodeValue);

                                            }

                                        }



                                        // Add optional XPath comment if there is one!

                                        var xpathComment = xpathNode.getAttribute("comment");

                                        if (xpathComment == null)

                                        {

                                            xpathComment = "";

                                        }

                                        page.itemsComment.push(xpathComment);

                                    }

                                }

                                catch (e){}

                            }



                            var nameNode = pageNode.getAttributeNode("name");

                            page.name = nameNode.value;

                            var urlNode = pageNode.getAttributeNode("url");

                            page.url = urlNode.value;

                            page.enabled = pageNode.getAttribute("enabled") == true.toString();



                             // Only add if we haven't already!

                            var originalpage = RemoveItPermanently.findPage(page.url);



                            if (originalpage == null)

                            {

                                ripCacheToLoad.push(page);

                            }

                        }

                    }

                }

            }

        }

     }

     catch (e)

     {

       RemoveItPermanently.handleErrors(e);

       return null;

     }



     return ripCacheToLoad;

    },



    setRipCache: function(updatedRipCache)

    {

       gRipCache = updatedRipCache;

    },



   onPageLoaded: function(e)

   {

     try

     {

     	 var pageURL = null; 

         if (e.originalTarget.location != null)

         {

	         pageURL = e.originalTarget.location.href;

		 }

		 var page = null;

		 if (pageURL != null)

		 { 

         	page = RemoveItPermanently.findPage(pageURL);

         }



         if (page != null)

         {

              if (page.enabled)

              {

                  page.stats = 0;

                  for (var i=0; i < page.itemsToRemove.length; i++)

                  {

                      page.stats += RemoveItPermanently.removeItem(e.originalTarget, page.itemsToRemove[i]);

                  }

              }

         }



         var iRipIFrameOnFrameMenu = RipPrefUtils.getPref("rip.iframe.on.framemenu");

         if (iRipIFrameOnFrameMenu)

         {

             var menuitem = document.getElementById("rip-do-add-frame-popup");

             var menupopup = document.getElementById("frame").firstChild;

             menuitem.parentNode.removeChild(menuitem);

             menupopup.appendChild(menuitem);

         }



         //RemoveItPermanently.logMessage("RIP DOMContentLoaded complete");

     }

     catch (e)

     {

        RemoveItPermanently.handleErrors(e);

     }

  },



  // Inspired by the excellent nukehtml!

  hookUpMouseHighlighing: function(doc, menuid, xpathValue, label)

  {

    var menuitem = doc.getElementById(menuid);

    if (menuitem != null)

    {

    	menuitem.setAttribute('onmouseover', 'RemoveItPermanently.onMouseOver(event)');

	    menuitem.setAttribute('onmouseout', 'RemoveItPermanently.onMouseOut(event)');

	    menuitem.setAttribute('savedXPath', xpathValue);



	    if (label != null)

	    {

	        menuitem.setAttribute('label', label);

	    }

	}



  },



  onMouseOver: function(event)

  {

        var menuitem = event.target;

        var xpath = menuitem.getAttribute('savedXPath');

        

        RemoveItPermanently.logMessage("onMouseOver: " + gContextMenu);

        

        var doc = gContextMenu.target.ownerDocument;

        RemoveItPermanently.changeItemDisplayStyle(doc, xpath, "flashstart");



        try

        {

           window.status = xpath;

        }

        catch (e)

        {

        }

  },



  onMouseOut: function(event)

  {

        var menuitem = event.target;

        var xpath = menuitem.getAttribute('savedXPath');



        RemoveItPermanently.logMessage("onMouseOut: " + gContextMenu );

        

        if (gContextMenu)

        {

	        var doc = gContextMenu.target.ownerDocument;

    	    RemoveItPermanently.changeItemDisplayStyle(doc, xpath, "flashstop");

		}

  },



  editMenuShowing: function()

  {

     var editMenuUndo = RipPrefUtils.getPref("rip.editmenu.undo");



     if (editMenuUndo)

     {

         var menuitem = window.document.getElementById("menu_rip-edit-undolast");



         if (menuitem)

         {

             menuitem.hidden = (RemoveItPermanently.getCurrentPage() == null);

         }

     }

  },



  updateStatusBar: function()

  {

     var statusbaritem = window.document.getElementById("rip-status-bar");



     if (statusbaritem)

     {

        var showStatusBarIcon = RipPrefUtils.getPref("rip.statusbar.icon");

        if (showStatusBarIcon)

        {

            statusbaritem.setAttribute("hidden", (RemoveItPermanently.getCurrentPage() == null));

        }

     }

  },



  downloadRIP: function()

  {

     var obj = gContextMenu.target;

     var ripFile = obj.href;



     new RIPScriptDownloader(ripFile).start();

  },



  doChangeURL: function(menuitem)

  {

      //menuitem.setAttribute('checked','true');



      // If we are currently RIPping some page change it to the one now selected.

      var currentPage = RemoveItPermanently.getCurrentPage();

      if (currentPage != null)

      {

          var selectedURL = RemoveItPermanently.getSelectedURL();

          // If we have changed the selecteURL for the page update it and save it!

          if (selectedURL != null && selectedURL != "" && selectedURL != currentPage.url)

          {

              currentPage.url = selectedURL;



              // Save the change to the current page!

              RemoveItPermanently.save();

          }

      }

  },



  getCheckedMenuItem: function()

  {

     var selectedURLMenuItem = null;

     if (RemoveItPermanently.isChecked("rip-url-all-similar"))

     {

         selectedURLMenuItem = window.document.getElementById("rip-url-all-similar");

     }

     else if (RemoveItPermanently.isChecked("rip-url-this-page"))

     {

         selectedURLMenuItem = window.document.getElementById("rip-url-this-page");

     }

     else if (RemoveItPermanently.isChecked("rip-url-all-website"))

     {

         selectedURLMenuItem = window.document.getElementById("rip-url-all-website");

     }

     else if (RemoveItPermanently.isChecked("rip-url-all-domain"))

     {

         selectedURLMenuItem = window.document.getElementById("rip-url-all-domain");

     }



     return selectedURLMenuItem;

  },



  getSelectedURL: function()

  {

     var selectedURLMenuItem = RemoveItPermanently.getCheckedMenuItem();



     if (selectedURLMenuItem != null)

     {

        var selectedURL = selectedURLMenuItem.getAttribute("data");



        return selectedURL;

     }



     return null;

  },



  isChecked: function(menuname)

  {

    var selectedURLMenuItem = window.document.getElementById(menuname);

    if (selectedURLMenuItem.getAttribute("checked") == "true")

    {

        return true;

    }



    return false;

  },



  contextMenuShowing: function()

  {

     var obj = gContextMenu.target;

     var iFrame = gContextMenu.inFrame;

     var url = obj.ownerDocument.URL;

     



     var downloadMenuItem = window.document.getElementById("rip-do-download-rip-popup");

     if (downloadMenuItem)

     {

        downloadMenuItem.hidden = !(obj.tagName.toLowerCase() == "a" && obj.href.indexOf(".rip") >= 0);

        if (!downloadMenuItem.hidden)

        {

           var labelValue = downloadMenuItem.getAttribute("originalLabel");

           if (labelValue != null)

           {

               var ripName = RemoveItPermanently.parseRipName(obj.href);

               var newLabelValue = labelValue + " " + ripName;

               downloadMenuItem.setAttribute("label", newLabelValue);

           }

        }

     }



     var menuitem = window.document.getElementById("menu_rip-undolast");

     if (menuitem)

     {  // Use the target window we are currently on, so we can do undo in iframes etc.

         menuitem.hidden = (RemoveItPermanently.findPage(url) == null);

     }



     menuitem = window.document.getElementById("rip-do-add-popup");

     var allowRipInsideIFrames = RipPrefUtils.getPref("rip.allow.inside.iframes");

     if (menuitem)

     {

         menuitem.hidden = iFrame && !allowRipInsideIFrames;

     }





     var framemenuitem = window.document.getElementById("rip-do-add-frame-popup");

     if (framemenuitem)

     {

        framemenuitem.hidden = !iFrame;



        if (iFrame)

        {

             var frameNode = obj.ownerDocument.defaultView.frameElement;

             if (frameNode.nodeName == "FRAME") // We can't remove a complete frame as we would have to

             {                                  // change the parent frameset cols/rows string which would be very complex to do!

                framemenuitem.hidden = true;

             }

        }

     }



     var separaterBefore = RipPrefUtils.getPref("rip.separaterbefore.menu");

     menuitem = window.document.getElementById("rip-separater-beforemenu");

     if (menuitem)

     {

         menuitem.hidden = !separaterBefore;

     }



     var separaterAfter = RipPrefUtils.getPref("rip.separaterafter.menu");

     menuitem = window.document.getElementById("rip-separater-aftermenu");

     if (menuitem)

     {

         menuitem.hidden = !separaterAfter;

     }



     var advancedContextMenu = RipPrefUtils.getPref("rip.advanced.context.menu");

     menuitem = window.document.getElementById("rip-menu-custom");

     if (menuitem)

     {

        menuitem.hidden = !advancedContextMenu;

     }

     var menuOwnerDoc = window.document;



        // build the advanced Context Menu.

        // Only deal with the source element of the IFrame rather than the IFrame itself!

     if (iFrame && !allowRipInsideIFrames)

     {

         obj = obj.ownerDocument.defaultView.frameElement;

     }

     else if (iFrame)       // Hook up highlighting of the IFrame!

     {

         var iFrameNode = obj.ownerDocument.defaultView.frameElement;

         var iFrameXPathValue = RemoveItPermanently.nodeToXPath(iFrameNode);



         RemoveItPermanently.hookUpMouseHighlighing(menuOwnerDoc, "rip-do-add-frame-popup", iFrameXPathValue, null);

     }



     if(obj)

     {

         var xPathValue = RemoveItPermanently.nodeToXPath(obj);

         RemoveItPermanently.hookUpMouseHighlighing(menuOwnerDoc, "rip-do-add-popup", xPathValue, null);



         if (advancedContextMenu)

         {

             var allsimilarpages = RemoveItPermanently.getAllSimilar(obj.ownerDocument);

             var allwebsite = RemoveItPermanently.getAllWebSite(obj.ownerDocument);

             var alldomain = RemoveItPermanently.getAllDomain(obj.ownerDocument);



             var thisPageMenuitem = window.document.getElementById("rip-url-this-page");

             var allSimilarMenuitem = window.document.getElementById("rip-url-all-similar");

             var allWebsiteMenuitem = window.document.getElementById("rip-url-all-website");

             var allDomainMenuitem = window.document.getElementById("rip-url-all-domain");



             thisPageMenuitem.setAttribute("data" , url);

             allSimilarMenuitem.setAttribute("data" , allsimilarpages);



             

             allWebsiteMenuitem.setAttribute("data" , allwebsite);

             allDomainMenuitem.setAttribute("data" , alldomain);



             var resetlabel=true;

             var currentPage = RemoveItPermanently.getCurrentPage();

             if (currentPage != null)

             {

                thisPageMenuitem.setAttribute("checked", "false");

                allSimilarMenuitem.setAttribute("checked", "false");

                allWebsiteMenuitem.setAttribute("checked", "false");

                allDomainMenuitem.setAttribute("checked", "false");



                if (currentPage.url == allsimilarpages)

                {

                     // Check All Similar Nodes

                     menuitem = allSimilarMenuitem;

                }

                else if (currentPage.url == allwebsite)

                {

                    // Check all website

                     menuitem = allWebsiteMenuitem;

                }

                else if (currentPage.url == alldomain)

                {

                    // Check all domain

                     menuitem = allDomainMenuitem;

                }

                else

                {

                    menuitem = thisPageMenuitem;



                    if (currentPage.url != url)

                    {

                        thisPageMenuitem.setAttribute("label", currentPage.url);

                        resetlabel = false;

                    }

                }

             }

             else

             {

                 menuitem = null;

             }



             if (menuitem)

             {

                 menuitem.setAttribute("checked", "true");

             }



             if (resetlabel)

             {

                 thisPageMenuitem.setAttribute("label", thisPageMenuitem.getAttribute("reallabel"));

             }

             



             var allSimilarNodes = RemoveItPermanently.getAllNodeWithAttributes(obj);

             var immediateUsefulParent = RemoveItPermanently.getImmediateUsefulParent(obj);

             var allParentAttributes = RemoveItPermanently.getAllParentWithAttributes(obj);

             var allIFrames = "//iframe";

             var googleAdSense = "//table[.//font/text()='Ads by Google']";



             RemoveItPermanently.hookUpMouseHighlighing(menuOwnerDoc, "rip-url-xpath-1", xPathValue, "This item only");

             RemoveItPermanently.hookUpMouseHighlighing(menuOwnerDoc, "rip-url-xpath-2", allSimilarNodes, "All similar items (" + allSimilarNodes + ")");

             RemoveItPermanently.hookUpMouseHighlighing(menuOwnerDoc, "rip-url-xpath-3", immediateUsefulParent, "Parent item only");

             RemoveItPermanently.hookUpMouseHighlighing(menuOwnerDoc, "rip-url-xpath-4", allParentAttributes, "All similar parent items (" + allParentAttributes + ")");

             RemoveItPermanently.hookUpMouseHighlighing(menuOwnerDoc, "rip-url-remove-all-iframes", allIFrames, null);

             RemoveItPermanently.hookUpMouseHighlighing(menuOwnerDoc, "rip-url-remove-google-adsense", googleAdSense, null);

         }

     }

  },

  // All similar pages 

  getAllSimilar: function(doc)

  {

    var result = doc.location.protocol + "//" + doc.location.host + doc.location.pathname + "*";



    return result;

  },



  getAllWebSite: function(doc)

  {

    var result = doc.location.protocol + "//" + doc.location.host + "*";



    return result;

  },



  getAllDomain: function(doc)

  {

     var domainName = doc.domain;   // Assume this is the domain unless there are more than one '.' between the other elements

                                    // Must figure out a better way to do this!!!



     var firstDot = domainName.indexOf('.',0);

     if (firstDot >= 0)

     {

         var secondDot = domainName.indexOf('.', firstDot+1);

         if (secondDot > 0)

         {

             domainName = domainName.substring(firstDot+1);

         }

     }



     var result = doc.location.protocol + "//*"+ domainName + "*";



    return result;

  },



  getImmediateUsefulParent: function(obj)

  {

    var result = RemoveItPermanently.nodeToXPath(obj.offsetParent);



    return result;

  },



  getAllParentWithAttributes: function(obj)

  {

    var result = RemoveItPermanently.getAllNodeWithAttributes(obj.offsetParent);



    return result;

  },



  getAllNodeWithAttributes: function(obj)

  {

      var result = "//" + obj.nodeName;

      var classAttr = obj.attributes["class"];

      if (classAttr != null)

      {

         result = result + "[@class='" + classAttr.value + "']";

      }

      else  // Go through all the attributes and remove ones like src and id but keep all others !

      {

         var numAttributes = obj.attributes.length;

         var firstAttr = true;

         for (var i = 0; i < numAttributes; i++)

         {

             var attrToTest = obj.attributes[i];

             if (attrToTest.nodeName == 'src')

             {

                 continue;

             }

             if (attrToTest.nodeName == 'id')

             {

                 continue;

             }

             if (attrToTest.nodeName == 'alt')

             {

                 continue;

             }

             if (attrToTest.nodeName == 'area')

             {

                 continue;

             }

             if (attrToTest.value == '')    // Ignore empty attributes also

             {

                 continue;

             }



             if (firstAttr)

             {

                result = result + "[";

                firstAttr = false;

             }

             else

             {

                result = result + " and ";

             }



             result = result + "@" + attrToTest.nodeName + "=" + "'" + attrToTest.value + "'";

         }



         if (firstAttr == false)

         {

            result = result + "]";

         }

      }



      return result.toLowerCase();

  },



  getCurrentPage: function()

  {

     try

     {

         var pageURL = gBrowser.selectedBrowser.webNavigation.currentURI.asciiSpec;



         var page = RemoveItPermanently.findPage(pageURL);



         if (page != null)

         {

             return page;

         }

     }

     catch (e)

     {

     }



     return null;

  },



  doUndoLast: function(e)

  {

     try

     {

        var obj = null;

        try

        {

            obj = gContextMenu.target;

        }

        catch (e)

        {}



        var pageUrlToUndo = null;

        var doc = null;



        // If we have a context menu use the page it is pointing at otherwise use the current selected browser url.

        if(obj != null)

        {

            doc = obj.ownerDocument;

            pageUrlToUndo = doc.URL;

        }

        else

        {

            pageUrlToUndo = gBrowser.selectedBrowser.webNavigation.currentURI.asciiSpec;

            doc = window._content.document;

        }



        var currentPage = RemoveItPermanently.findPage(pageUrlToUndo);

        if (currentPage != null)

        {

            var lastXPathValue = currentPage.itemsToRemove.pop();



                // Remove the last comment also!

            currentPage.itemsComment.pop();

            if (currentPage.itemsToRemove.length == 0)  // If we have removed all the items remove this item from the cache

            {

                var index = RemoveItPermanently.findPageIndex(currentPage.url);

                if (index >= 0)

                {

                    gRipCache.splice(index, 1);

                }



                RemoveItPermanently.updateStatusBar();

            }



            var iCountRestored = RemoveItPermanently.showItem(doc, lastXPathValue);



            currentPage.stats -= iCountRestored;



            RemoveItPermanently.save();

        }

      }

      catch (e)

      {

          RemoveItPermanently.handleErrors(e);

          return -1;

      }



      return false;

  },





    checkCache: function()

    {

       if (gRipCache == null)

       {

          gRipCache = new Array();

       }

    },



    save: function()

    {

        RemoveItPermanently.checkCache();



        try

        {

            var doc = document.implementation.createDocument("", "Config", null);



            for (var i = 0; i < gRipCache.length; i++)

            {

                var pageObj = gRipCache[i];

                if (pageObj != null)

                {

                    var pageNode = RemoveItPermanently.createPageNode(doc, pageObj);



                    doc.firstChild.appendChild(doc.createTextNode("\n\t"));

                    doc.firstChild.appendChild(pageNode);

                }

            }



            doc.firstChild.appendChild(doc.createTextNode("\n"));

            doc.firstChild.setAttribute("version", RIP_VERSION);



            var configStream = RemoveItPermanently.getNewWriteStream(RIP_CONFIG_NAME);

            new XMLSerializer().serializeToStream(doc, configStream, "utf-8");

            configStream.close();

        }

        catch (e)

        {

            RemoveItPermanently.handleErrors(e);

        }

   },



   createPageNode: function(doc, pageObj)

   {

        var pageNode = doc.createElement("Page");



        for (var j = 0; j < pageObj.itemsToRemove.length; j++)

        {

                var xpathNode = doc.createElement("XPath");



                var xpathComment = "";

                try

                {

                    xpathComment = pageObj.itemsComment[j];

                    xpathNode.setAttribute("comment", xpathComment);

                }

                catch (e) {};



                xpathNode.appendChild(doc.createTextNode(pageObj.itemsToRemove[j]));



                pageNode.appendChild(doc.createTextNode("\n\t\t"));

                pageNode.appendChild(xpathNode);

        }



        pageNode.appendChild(doc.createTextNode("\n\t"));



        pageNode.setAttribute("name", pageObj.name);

        pageNode.setAttribute("url", pageObj.url);

        pageNode.setAttribute("enabled", pageObj.enabled);



        return pageNode;

   },



   savePage: function(pageObj, file)

   {

        var doc = document.implementation.createDocument("", "Config", null);

        var pageNode = RemoveItPermanently.createPageNode(doc, pageObj);



        doc.firstChild.appendChild(doc.createTextNode("\n\t"));

        doc.firstChild.appendChild(pageNode);



        doc.firstChild.appendChild(doc.createTextNode("\n"))

        doc.firstChild.setAttribute("version", RIP_VERSION);



        try

        {

            var configStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);



            configStream.init(file, 0x02 | 0x08 | 0x20, 420, 0);

            new XMLSerializer().serializeToStream(doc, configStream, "utf-8");



            configStream.close();

        }

        catch (e)

        {

            RemoveItPermanently.handleErrors(e);

        }

   },



   doAddXPath: function(menuitem)

   {

        if (menuitem != null)

        {

            var xPathValue = menuitem.getAttribute('savedXPath');

            var obj = gContextMenu.target;



            // Now get the URL from the appropriate selected menu:

            var url = RemoveItPermanently.getSelectedURL();

            if (url == null)

            {

                url = obj.ownerDocument.URL;

            }



            RemoveItPermanently.doRipNodeGivenXPath(obj, xPathValue, url);

        }

   },



   doAddCurrentFrame: function()

   {

      if (gContextMenu)

      {

         var obj = gContextMenu.target;



         if(obj)

         {

            var frameNode = obj.ownerDocument.defaultView.frameElement;



            // Since, we are trying to remove an IFrame we must make sure the URL picked for the IFrame is not

            // the current url (which is the Iframe url itself but rather the page url)



            var thisPageMenuitem = window.document.getElementById("rip-url-this-page");

            thisPageMenuitem.setAttribute("data" , null);



            RemoveItPermanently.doRipNode(frameNode);

         }

      }

   },



   doAddCurrentObject: function()

   {

      if (gContextMenu)

      {

         var obj = gContextMenu.target;



         RemoveItPermanently.doRipNode(obj);

      }

  },



  doRipNode : function(obj)

  {

     if (obj)

     {

         // Now figure out the XPath query that would return this target if ran on the entire page

         var xPathValue = RemoveItPermanently.nodeToXPath(obj);

         var selectedURL = RemoveItPermanently.getSelectedURL();

         if (selectedURL == null || selectedURL == "")

         {

            selectedURL = obj.ownerDocument.URL;

         }



         RemoveItPermanently.doRipNodeGivenXPath(obj, xPathValue, selectedURL);

     }

  },



  doRipNodeGivenXPath : function(obj, xPathValue, url)

  {

     try

     {

         // Now use this XPath to find and remove the node, basically so the user know what he is letting himself in for!

         var countRemoved =  RemoveItPermanently.removeItem(obj.ownerDocument, xPathValue);



         RemoveItPermanently.storeItem(obj.ownerDocument, xPathValue, url);



         RemoveItPermanently.updateStatusBar();



         var currentPage = RemoveItPermanently.getCurrentPage();

         if (currentPage != null)

         {

            currentPage.stats+=countRemoved;

         }

     }

     catch (e)

     {

         RemoveItPermanently.handleErrors(e);

     }

  },



  storeItem: function(document, xPathValue, pageURL)

  {

      var page = RemoveItPermanently.findPageWithWildcards(pageURL);



      if (page == null)

      {

          var name = document.title;

          if (name == null || name.length == 0)

          {

              name = pageURL;

          }

          page = RemoveItPermanently.createPage(pageURL, name);

      }



      page.itemsToRemove.push(xPathValue);

      page.itemsComment.push("");   // Empty comment for now!



      RemoveItPermanently.save();

  },



  findPageWithWildcards: function(urlWithWildcards)

  {

    if (urlWithWildcards.indexOf('*',0) >= 0)

    {

        RemoveItPermanently.checkCache();



        for (var i = 0; i < gRipCache.length; i++)

        {

          var page = gRipCache[i];

          if (page != null)

          {

            // If we have already added a page with this wildcard

              if (page.url == urlWithWildcards)

              {

                  return page;

              }



              var urlPattern = RemoveItPermanently.convert2RegExp(urlWithWildcards);



              // If we find a match then upgrade the url to the current item ie. introduce wildcards into the url!

              if (urlPattern.test(page.url))

              {

                  page.url = urlWithWildcards;

                  return page;

              }



              // Page name can be a regular expression to use on the URL.

              var pattern = RemoveItPermanently.convert2RegExp(page.url);



              if (pattern.test(urlWithWildcards))

              {

                  return page;

              }

          }

        }



        return null;

    }

    else

    {

        return RemoveItPermanently.findPage(urlWithWildcards);

    }

  },



  findPage: function(urlToFind)

  {

     var index = RemoveItPermanently.findPageIndex(urlToFind);

     if (index == -1)

     {

         return null;

     }

     return gRipCache[index];

  },



  findPageIndex: function(urlToFind)

  {

      RemoveItPermanently.checkCache();



      for (var i = 0; i < gRipCache.length; i++)

      {

          var page = gRipCache[i];

          if (page != null)

          {

              // Page name can be a regular expression to use on the URL.

              var pattern = RemoveItPermanently.convert2RegExp(page.url);



              if (pattern.test(urlToFind))

              {

                  return i;

              }

          }

      }



      return -1;

  },



  createPage: function(pageURL, name)

  {

      var result = new RipPage();



      result.name = name;

      result.url = pageURL;

      result.enabled = true;



      gRipCache.push(result);



      return result;

  },



  doOptions: function()

  {

     var currentPage = RemoveItPermanently.getCurrentPage();

     if (currentPage != null)

     {

        window.openDialog("chrome://rip/content/rip-options.xul", "rip-options", "resizable,centerscreen,modal", gRipCache, currentPage.url);

     }

     else

     {

        window.openDialog("chrome://rip/content/rip-options.xul", "rip-options", "resizable,centerscreen,modal", gRipCache);

     }

  },



  showAll: function()

  {

     var currentPage = RemoveItPermanently.getCurrentPage();

     if (currentPage != null)

     {

          for (var i=0; i < currentPage.itemsToRemove.length; i++)

          {

              RemoveItPermanently.showItem(window._content.document, currentPage.itemsToRemove[i]);

          }

     }

  },



  doUndoAll: function()

  {

        RemoveItPermanently.showAll();



        var currentPage = RemoveItPermanently.getCurrentPage();

        var index = RemoveItPermanently.findPageIndex(currentPage.url);



        if (index >= 0)

        {

            gRipCache.splice(index, 1);

        }



        RemoveItPermanently.updateStatusBar();



        RemoveItPermanently.save();

  },



  fillInTooltip: function(tooltip)

  {

      var currentPage = RemoveItPermanently.getCurrentPage();

      if (currentPage != null)

      {

          window.document.getElementById("rip-tooltip-vbox").collapsed = false;

          window.document.getElementById("rip-tooltip-page-matched").setAttribute("value", currentPage.url);

          window.document.getElementById("rip-tooltip-ripped-count").setAttribute("value", currentPage.itemsToRemove.length);

          window.document.getElementById("rip-tooltip-page-stats").setAttribute("value", currentPage.stats);

      }

      else

      {

          window.document.getElementById("rip-tooltip-vbox").collapsed = true;

      }

  },



  handleErrors:  function (e)

  {

     RemoveItPermanently.debugMessage("Error Ripping Page: \n\n" + e.toString());

  },



  nodeToXPath: function(element)

  {

      var result="";



      var curNode = element;



      do

      {

          var curNodeXPath = RemoveItPermanently.xPathForSingleElement(curNode);

          result = curNodeXPath + result;

          curNode = curNode.parentNode;



          result = "/" + result;

      }

      while (curNode.parentNode != null); // So weird problem at the root of the document to handle it this way



      return result.toLowerCase();

  },



  xPathForSingleElement: function(element)

  {

       if (element == null)

       {

          return "";

       }



       if (element.parentNode != null)

       {

          var iXPathIndex = RemoveItPermanently.xPathForIndex(element.parentNode, element);



          if (iXPathIndex == -1)        // Some error occurred return ""

          {

              return "";

          }

          else if (iXPathIndex == 0)    // If 0 then we are the only element of our type in our parent so return no index.

          {

              return element.nodeName;

          }

          else

          {

              return element.nodeName + "[" + iXPathIndex + "]";

          }

        }



        return element.nodeName;

    },



    xPathForIndex: function(parentNode, ourNode)

    {

        var arrayChildren = RemoveItPermanently.findChildrenWithName(parentNode, ourNode.nodeName);

        if (arrayChildren != null)

        {

            if (arrayChildren.length == 1)  // We are the only node

            {

               return 0;

            }



            for (var i=0; i < arrayChildren.length; i++)

            {

                var item = arrayChildren[i];



                // If we now find ourselves we now know the index of ourselves

                if (item == ourNode)

                {

                   return i+1;

                }

            }

        }



        return -1;

    },



    findChildrenWithName: function(parentNode, nodeName)

    {

       var childrenFound = new Array();



       var childNodes = parentNode.childNodes;



       for (var i=0; i< childNodes.length; i++)

       {

           var childNode = childNodes.item(i);



           if ((childNode.nodeName == nodeName) && (RemoveItPermanently.nodeIsValidForXPath(childNode)))

           {

              childrenFound.push(childNode);

           }

       }



       return childrenFound;

    },



    // Some in the Mozilla model don't seem to be evaluated as part of the XPath evualate but seem to part of the DOM Model

    // specifically, I have notified that some gRipCache which have document type nodes cause problems.



    nodeIsValidForXPath: function(nodeToCheck)

    {

       if (nodeToCheck.nodeType == 10) // A Document type node should not be included as it can mess up the XPAth query

       {

           return false;



       }

       return true;

    },



    changeItemDisplayStyle: function(document, xpathQuery, style)

    {

         var iNumberChanged = 0;

         var flasher = null;

         var oldStyle = null;

         try

         {

             var pXPE = new XPathEvaluator(); 

             var nodesFound = pXPE.evaluate(xpathQuery, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,null);

             

             // Do a list rather than a single item so a clever user who knows XPath can remove multiple items simulateously



             for (var i=0; i < nodesFound.snapshotLength; i++)

             {

                 // Hide the node we find!

                 var nodeToRemove = nodesFound.snapshotItem(i);



                 iNumberChanged++;

                 

                 if (style == 'none')

                 {

                    oldStyle = nodeToRemove.style.display;

                    nodeToRemove.setAttribute("rip-style-backup", oldStyle);



                    nodeToRemove.style.display = style;

                 }

                 else if (style == 'flashstart')

                 {

                    flasher = new RIPFlasher();

                    flasher.element = nodeToRemove;

                    flasher.start();



                    RemoveItPermanently.arrayFlashing.push(flasher);



                 }

                 else if (style == 'flashstop')

                 {

                    flasher = RemoveItPermanently.arrayFlashing.pop();

                    if (flasher != null)

                    {

                        flasher.stop();

                    }

                 }

                 else

                 {

                    oldStyle = nodeToRemove.getAttribute("rip-style-backup");

                    if (oldStyle != undefined)  // Use the given backup style

                    {

                        nodeToRemove.style.display = oldStyle;

                    }

                    else    // Otherwise just set to whatever we think might have been the style

                    {

                        nodeToRemove.style.display = style;

                    }

                 }

             }

         }

         catch (e)

         {

             RemoveItPermanently.handleErrors(e);

             return -1;

         }



         return iNumberChanged;

    },



    removeItem: function(document, xpathQuery)

    {

        return RemoveItPermanently.changeItemDisplayStyle(document, xpathQuery, 'none');

    },



    showItem: function(document, xpathQuery)

    {

        return RemoveItPermanently.changeItemDisplayStyle(document, xpathQuery, 'inline');   // Probably need a cache of what this item was originally

    },



    debugMessage: function(message)

    {

         var debugAlert = RipPrefUtils.getPref("rip.debug.alert");



         if (debugAlert)

         {

            alert(message);

         }

         else

         {

            RemoveItPermanently.logMessage(message);

         }

    },





    getReadStream: function (fileName)

    {

        var file =  RemoveItPermanently.getFile(fileName);



        return RemoveItPermanently.getStream(file);

    },



    getNewReadStream: function (fileName)

    {

        var file =  RemoveItPermanently.getNewFile(fileName);



        return RemoveItPermanently.getStream(file);

    },



    getStream: function(theFile)

    {

        var stream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);



        stream.init(theFile, 0x01 , 00004, null);



        var sInputStream = Components.classes["@mozilla.org/network/buffered-input-stream;1"].createInstance(Components.interfaces.nsIBufferedInputStream);

        sInputStream.init(stream, 1000);



        return sInputStream;

    },





    getWriteStream: function(fileName)

    {

        var file = RemoveItPermanently.getFile(fileName);



        var stream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);



        stream.init(file, 0x02 | 0x08 | 0x20, 420, 0);



        return stream;

    },



    getNewWriteStream: function(fileName)

    {

        var file = RemoveItPermanently.getNewFile(fileName);



        var stream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);



        stream.init(file, 0x02 | 0x08 | 0x20, 420, 0);



        return stream;

    },



    getNewFile: function (fileName)

    {

        var file = RemoveItPermanently.getNewDir();

        file.append(fileName);

        return file;

    },

    

    getFile: function (fileName)

    {

        var file = RemoveItPermanently.getDir();

        file.append(fileName);

        return file;

    },



    getNewDir: function ()

    {

        var file = Components.classes["@mozilla.org/file/directory_service;1"]

                                .getService(Components.interfaces.nsIProperties)

                                .get("ProfD", Components.interfaces.nsILocalFile);

                                

        file.append("rip_store");

        if( !file.exists() || !file.isDirectory() ) 

        {   // if it doesn't exist, create

		   file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0777);

		}

        

        

        return file;

    },

    

    getDir: function ()

    {

        var file = Components.classes["@mozilla.org/file/directory_service;1"]

                                .getService(Components.interfaces.nsIProperties)

                                .get("ProfD", Components.interfaces.nsILocalFile);



        file.append("extensions");

        file.append(RIP_GUID);

        file.append("store");



        return file;

     },



    parseRipName: function(name)

    {

        name = name.substring(0, name.indexOf(".rip"));

        name = name.substring(name.lastIndexOf("/") + 1);

        return name;

    },



    logMessage: function(logString)

    {

        aConsoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);



    	if(aConsoleService)

    	{

	    	aConsoleService.logStringMessage("RIP: " + logString);

	    }

    },



     // Converts a pattern in this programs simple notation to a regular expression.

     // thanks AdBlock! http://www.mozdev.org/source/browse/adblock/adblock/

     convert2RegExp: function( pattern )

     {

        var s = new String(pattern);

        var res = new String("^");



        for (var i = 0 ; i < s.length ; i++)

        {

            switch(s[i])

            {

                case '*' :

                        res += ".*";

                        break;



                case '.' :

                case '?' :

                case '^' :

                case '$' :

                case '+' :

                case '{' :

                case '[' :

                case '|' :

                case '(' :

                case ')' :

                case ']' :

                        res += "\\" + s[i];

                        break;



                case '\\' :

                        res += "\\\\";

                        break;



                case ' ' :

                        // Remove spaces from URLs.

                        break;



                default :

                        res += s[i];

                        break;

            }

        }



        return new RegExp(res + '$', "i");

    }

}



var ripListener =

{

  QueryInterface: function(aIID)

  {

    if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||

        aIID.equals(Components.interfaces.nsISupportsWeakReference) ||

        aIID.equals(Components.interfaces.nsIXULBrowserWindow) ||

        aIID.equals(Components.interfaces.nsISupports))

     return this;

   throw Components.results.NS_NOINTERFACE;

  },



  onStateChange: function(aProgress, aRequest, aFlag, aStatus)

  {

  },



  onLocationChange: function(aProgress, aRequest, aURI)

  {

     try

     {

       RemoveItPermanently.updateStatusBar();

     }

     catch (exp) {};

  },



  // For definitions of the remaining functions see XulPlanet.com

  onProgressChange: function() {},

  onStatusChange: function() {},

  onSecurityChange: function() {},

  onLinkIconAvailable: function() {}

}



// Thanks Greasemonkey for the majority of this code

function RIPScriptDownloader(url) {

	var dm = Components.classes["@mozilla.org/download-manager;1"].getService(Components.interfaces.nsIDownloadManager)

	var ioservice = Components.classes["@mozilla.org/network/io-service;1"].getService();

	var sourceUri = ioservice.newURI(url, null, null);

	var targetFile = getTempFile();

	var targetUri = ioservice.newFileURI(targetFile)

	var persist = makeWebBrowserPersist();

	var sysListener = null;

	var download = null;

	var self = this;

	var timerId = null;



	this.start = function() {

		try {

			dm.addDownload(0, sourceUri, targetUri, RemoveItPermanently.parseRipName(sourceUri.spec), null, null, null, persist);

			dm.open(window._content, targetFile.path);



			download = dm.getDownload(targetFile.path);

			download.persist = persist;



			persist.saveURI(sourceUri, null, null, null, null, targetFile);



			// this seems like a huge hack, but it was actually the most reliable

			// way I could find to determine when downloading is complete

			timerId = window.setInterval(checkLoad, 200);

		}

		catch (e) {

			handleErrors(e);

		}

	}



    function getTempFile() {

    	var file = Components.classes["@mozilla.org/file/directory_service;1"]

    				.getService(Components.interfaces.nsIProperties)

    				.get("TmpD", Components.interfaces.nsILocalFile);



    	file.append(new Date().getTime());



    	return file;

    }



	function makeWebBrowserPersist()

    {

        const persistContractID = "@mozilla.org/embedding/browser/nsWebBrowserPersist;1";

        const persistIID = Components.interfaces.nsIWebBrowserPersist;

        return Components.classes[persistContractID].createInstance(persistIID);

    }



	function checkLoad() {

		// if the download is complete, stop.

		if (download.percentComplete == 100) {

			window.clearInterval(timerId);

			handleLoad();

		}

		// if not complete yet, double-check that somebody hasn't cancelled it

		else if (dm.getDownload(targetFile.path) == null) {

			// the download is no longer active

			window.clearInterval(timerId);

			return;

		}

		// otherwise, do nothing. downloading continues.

	}



	function handleLoad()

	{

		closeDownloadManager();



		// validate that we downloaded ok

		if (!targetFile.exists() || targetFile.fileSize == 0) {

			RemoveItPermanently.handleError("The file does not exist or was removed.");

			return;

		}



        RemoveItPermanently.loadFile(gRipCache, targetFile);



        if (gRipCache.length > 0)

        {

            var lastPage = gRipCache[gRipCache.length-1];



            window.openDialog("chrome://rip/content/rip-options.xul", "rip-options", "resizable,centerscreen,modal", gRipCache, lastPage.url);



            RemoveItPermanently.save();

        }

	}



	function closeDownloadManager() {

		var wm = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);

		var en = wm.getEnumerator("");

		var n = 0;

		var dlm = null;



		while (en.hasMoreElements()) {

			var w = en.getNext();



			if (w.location.href == "chrome://mozapps/content/downloads/downloads.xul") {

				dlm = w;

				break;

			}

		}



		if (dlm != null) {

			dlm.close();

		}

	}



}


// do the init on load

window.addEventListener("load",RemoveItPermanently.load, false);

