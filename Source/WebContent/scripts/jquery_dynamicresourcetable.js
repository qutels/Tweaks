/* 
   Copyright 2011 Tim Plaisted, Chris Baldwin, Queensland University of Technology

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
   
   version 1.9 author Tim Plaisted 2010, 2011 
   
   UPDATE: 1.9.1 (CCB) -  adds <br>'s when parsing content, fixed div.vtbegenerated instead of span for content descriptions
   
   */
   
function generateUnitMap() {
  jQuery(function($){
    if (window.tweak_bb == null || window.tweak_bb.page_id == null)
      window.tweak_bb = { page_id: "#content_listContainer", row_element: "li" };

    // utility extensions: case insensitive contains and case and leading whitespace insensitive startsWith using regexp (parses from start plus nb rows)
    jQuery.expr[':'].contains = function(a,i,m){
      return jQuery(a).text().toUpperCase().indexOf(m[3].toUpperCase())>=0;
    };
    jQuery.expr[':'].startsWith = function(a,i,m){
      var startsWithRegExp = new RegExp('^\\s*(nb2*:)*\\s*'+jQuery.trim(m[3])+'\\s*', 'i');
      return jQuery(a).text().match(startsWithRegExp);
    };	
    // load headers as parsed several times in script
    var headers = $(tweak_bb.page_id +" > "+tweak_bb.row_element).find(".item h3");
    
    // find id="unitMap" or table in BB item "Unit Map"
    if ($("#unitMap").length == 0)
      headers.filter(":contains(\"Unit Map\")").parents(tweak_bb.row_element).find("div.details table").eq(0).attr("id", "unitMap");
    var $unitMap = $("#unitMap"),	
      $firstRow = $unitMap.find("tr").eq(0),
      numResources = $firstRow.find("td").length-1;
    if (numResources) {
      // benchmark strategies to remove or clone and replace table from DOM while manipulating
      $unitMap.wrap("<div></div>");
      var $unitMapParent = $unitMap.parent();
      $unitMap.remove();

      // set up default col widths. leave 10 for first column
      var colWidth = (100 - 10) / numResources;
      // set up styles and read column headers
      var resourceTypes = new Array();
      $firstRow.addClass("th").find("td:gt(0)").each(function(i){
        resourceTypes.push($.trim($(this).text().replace(/\s+/g," ")));
        $(this).addClass("col"+i);
        if($(this).attr("width") == "") // if no width assigned, spread columns evenly
          $(this).width(colWidth+"%");
      });
      // link settings
      var prependLinks = $unitMap.hasClass("prepend"),
        displayLinkTopicIndexText = $unitMap.hasClass("displayLinkTopicIndexText"),
        displayLinkResourceText = $unitMap.hasClass("displayLinkResourceText"),
        moduleTopicM = $unitMap.hasClass("moduleTopic"),
        moduleStore = "";

      // process rows
      $unitMap.find("tr:gt(0)").each(function(row){
        var sectionTitle = $.trim($(this).find("td:first").text().replace(/\s+/g," "));
        var columnOffset = 1;
        
        // moduleTopic code: collapses Topic folders into Modules
        if (moduleTopicM) {
          if (sectionTitle.indexOf("Module")>-1) {
            // calculate number of topics
            var topics = 0;
            $(this).nextAll("tr").each(function(){
              if($(this).find("td:first").text().indexOf("Topic")>-1)
                topics += 1;
              else
                return false;
            });
            // store this row to combine this row with next
            moduleStore = $(this).find("td:eq(1)").clone().attr("rowspan", topics);
            // hide row content
            $(this).hide();
          } else if (sectionTitle.indexOf("Topic")>-1) {
            if (moduleStore) { // insert stored cell
              $(this).find("td:first").after($(moduleStore).get());
              moduleStore = "";
              columnOffset = 2;
            }
            else
              columnOffset = 1;
            // hide first column
            $(this).find("td:first").hide();
          }/* else {
            $(this).addClass("special");
          }*/
        }

        // normal table processing
        for (var column = 0; column < resourceTypes.length; column++) {
          if (sectionTitle.length && resourceTypes[column].length) {
            headers.filter(":startsWith('"+sectionTitle+": "+resourceTypes[column]+"')").each(function() {

              if(location.href.indexOf("Content.")>0)
                $(this).parents(tweak_bb.row_element).hide();
              
              var thiscell = $unitMap.find("tr:eq("+(row+1)+") td:eq("+(column+columnOffset)+")");
			  thiscell.html(thiscell.html().replace(/^&nbsp;/,""));

              // set up link (if there is one): consider / is there better way that deals with filtering edit mode links ok
              var thislink = $(this).find("a:contains('"+sectionTitle+": "+resourceTypes[column]+"')").clone();
              if (thislink.length)
                thislink = setUpLinkOptions(thislink, thiscell, displayLinkTopicIndexText, displayLinkResourceText, sectionTitle, resourceTypes[column]);
              
              // find details item
              var details = $(this).parents(tweak_bb.row_element).children("div.details");
              
              // attachments (reinsert trailing space outside links)
              var attachments = details.find("ul.attachments a").clone().each(function() {
                          $(this).html($.trim($(this).text()));
                        }).addClass("attachmentLink");
              
              // details field
              var detailsHTML = $.trim(details.find("div.vtbegenerated").find("script").remove().end().html());
              if (detailsHTML.length)
                detailsHTML = "<div class=\"insertDetails\">"+detailsHTML+"</div>";
                
                
              // add to cell
              if(prependLinks)
                thiscell.prepend(" ").prepend(thislink).prepend(attachments).prepend(detailsHTML).append("<br>");
              else
                thiscell.append(" ").append(thislink).append(attachments).append(detailsHTML).append("<br>");
            });
          }
        }
      });
      // clean up IE CSS issue
      if($.browser.msie)
        $unitMap.find("ul").css("margin","1px 0 1px 15px");
        
      // process attachment links
      $unitMap.find(".attachmentLink").attr("target", "_blank").each(function() { unWrapLink(this); }).after("<span>&nbsp; </span>");
      
      // reattach to DOM
      $unitMapParent.append($unitMap);
    }
  });
}

function setUpLinkOptions(thislink, thiscell, displayLinkTopicIndexText, displayLinkResourceText, sectionTitle, resourceTypesColumn) {
	// link display options
	if (displayLinkTopicIndexText && !displayLinkResourceText)
		thislink.text(thislink.text().replace(resourceTypesColumn+" ", ""));
	else if (!displayLinkTopicIndexText && displayLinkResourceText)
		thislink.text(thislink.text().replace(sectionTitle+": ", ""));
	else if (!displayLinkTopicIndexText && !displayLinkResourceText)
		thislink.text(thislink.text().replace(sectionTitle+": "+resourceTypesColumn+" ", ""));
		
	// highlighting and trim
	if (thislink.text().indexOf("NB:")>=0) {	
		thislink.text(thislink.text().replace("NB:", ""));
		thiscell.addClass("NB");
	} else if (thislink.text().indexOf("NB2:")>=0) {	
		thislink.text(thislink.text().replace("NB2:", ""));
		thiscell.addClass("NB2");
	}

	thislink.text(jQuery.trim(thislink.text()));
	
	
	return thislink;
}

function unWrapLink(link) { 
	var this_href=jQuery(link).attr("href"); 
	if (jQuery(link).attr("href").indexOf("contentWrapper") > 0)
		jQuery(link).attr("href", unescape(this_href.substr(this_href.search("href=")+5, this_href.length)).replace("amp;", "")); 
}

generateUnitMap();