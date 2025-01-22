/* album page */

const SOCIAL_MEDIA_ICON = {
	"fb": "../resource/facebook.png",
	"ig": "../resource/instagram.png",
  "website": "../resource/website.png"
};

function load_banner(album_name) {
    $(".banner-block").load("page_banner_template.html", function() {
        fill_in_header(album_name);
        var left = ALBUM_MENU[album_name]['next'][0];
        var right = ALBUM_MENU[album_name]['next'][1];
        $(".next_banner.left").attr("onclick", 'location.href="./' + left + '.html"');
        $(".next_banner.left").attr("title", ALBUM_MENU[left]['name']);
        
        $(".next_banner.right").attr("onclick", 'location.href="./' + right + '.html"');
        $(".next_banner.right").attr("title", ALBUM_MENU[right]['name']);
    });
}
            
function fill_in_header(album_name) {
    $("#nav_album_name").text(" " + ALBUM_MENU[album_name]["name"] + " ");
    $(".center_banner").attr("src", "../navigation/album_cover_" + album_name + ".jpg"); 
}

function _fill_in_image_tile(album_name, item) {
      var item_name = Object.keys(item)[0];

      var image_tile = $("#template_image_tile").clone();

      image_tile.removeAttr("id");
      image_tile.attr("data-image-url", album_name + '/' + item_name);
      image_tile.attr("data-social-media-icon", item[item_name]["social_media"]);
      image_tile.attr("data-post-url", item[item_name]["link"]);


      $(image_tile).find("img").attr("src", album_name + '/' + item_name);
      $(image_tile).find(".imagetext").text(item[item_name]["title"]);
      $(image_tile).find(".imagemeta").text(item[item_name]["meta"]);

      if (item[item_name]["display"] == "full-width") {
        $(image_tile).addClass("full-width");
      }
      
      image_tile.show();
      return image_tile;
}

function fill_in_image_tiles(album_name) {
    $.getJSON("album_items.json", function(data){
      var items = data[album_name];

      for (let i = 0; i < items.length; i++) {
        var item = items[i];
        var image_tile = _fill_in_image_tile(album_name, item);
        $(".page_board .row").append(image_tile);
      }
    
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        console.log("error: " + textStatus);
        console.log("incoming Text: " + jqXHR.responseText);
    })
    ;
}

function fill_in_image_tiles_in_rows(album_name) {
    $.getJSON("album_items.json", function(data){
      var items = data[album_name];

      var curr_idx = -1;
      var curr_obj = $("<div></div>");

      for (let i = 0; i < items.length; i++) {
        var item = items[i];
        var image_tile = _fill_in_image_tile(album_name, item);
        var item_name = Object.keys(item)[0];

          // append a new row object
          if (item[item_name]["row"] != curr_idx) {
            $(".page_board").append(curr_obj);
            curr_obj = $("<div class='row'></row>");
          }
          curr_obj.append(image_tile);
          curr_idx = item[item_name]["row"];
      }
      $(".page_board").append(curr_obj);
    
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        console.log("error: " + textStatus);
        console.log("incoming Text: " + jqXHR.responseText);
    })
    ;
}

function show_image_modal(t) {
  $(".img-magnifier-glass").remove();
  $('#social-media-link img').attr('src', "");

    $('#imageview').attr('src', $(t).attr('data-image-url'));
    $('#social-media-link img').attr('src', SOCIAL_MEDIA_ICON[$(t).attr('data-social-media-icon')]);
    $('#imagetext .text').text($(t).find('.imagetext').text());
    $('#imagemeta .text').text($(t).find('.imagemeta').text());

    if ($(t).hasClass("full-width")) {
      $("#image .modal-dialog").css("width", "1200px");
      
    } else {
      $("#image .modal-dialog").css("width", "800px");

    }
    $('#image').modal('show');

    // add magnify
    // magnify("imageview", 1.2);

    var post_url = $(t).attr('data-post-url');
    if (post_url) {
      $('#social-media-link').attr('href', $(t).attr('data-post-url'));
      $('#social-media-link').attr('target', "_blank");
      
    } else {
      console.log('no', post_url);
      $('#social-media-link').removeAttr('href');
      $('#social-media-link').removeAttr("target");
    }
}
function close_image_modal(t) {
    $('#image').modal('hide');
}
function next_image_modal(indicator) {
  var curr_img_url = $("#imageview").attr("src");
  var curr_tile = $(".image-tile[data-image-url='" + curr_img_url + "']");
  var target_tile = (indicator == -1)? curr_tile.prev(".image-tile"): curr_tile.next(".image-tile");

  if (!target_tile.length) {
    if (indicator == -1) {
      target_tile =  curr_tile.parent().prev(".row").find(".image-tile").last();
    } else {
      target_tile = curr_tile.parent().next(".row").find(".image-tile").first();
    } 
  }
  if (target_tile.length) {
    show_image_modal(target_tile);
  }
  else {
    console.log(curr_tile)
  }
  
}

function magnify(imgID, zoom) {
  var img, glass, w, h, bw;
  img = document.getElementById(imgID);
  /*create magnifier glass:*/

  if (!glass) {
	  glass = document.createElement("DIV");
	  glass.setAttribute("class", "img-magnifier-glass");
  }
  glass.style.display = "show";

  /*insert magnifier glass:*/
  img.parentElement.insertBefore(glass, img);
  /*set background properties for the magnifier glass:*/
  glass.style.backgroundImage = "url('" + img.src + "')";
  glass.style.backgroundRepeat = "no-repeat";
  glass.style.backgroundSize = (img.width * zoom) + "px " + (img.height * zoom) + "px";
  bw = 3;
  w = glass.offsetWidth / 2;
  h = glass.offsetHeight / 2;
 
  /*execute a function when someone moves the magnifier glass over the image:*/
  glass.addEventListener("mousemove", moveMagnifier);
  img.addEventListener("mousemove", moveMagnifier);
  // img.addEventListener("mouseleave", removeMagnifier);

  /*and also for touch screens:*/
  glass.addEventListener("touchmove", moveMagnifier);
  img.addEventListener("touchmove", moveMagnifier);
  
  function moveMagnifier(e) {
    var pos, x, y;
    /*prevent any other actions that may occur when moving over the image*/
    // e.preventDefault();

    /*get the cursor's x and y positions:*/
    pos = getCursorPos(e);
    x = pos.x;
    y = pos.y;
    /*prevent the magnifier glass from being positioned outside the image:*/
    if (x > img.width - (w / zoom)) {x = img.width - (w / zoom);}
    if (x < w / zoom) {x = w / zoom;}
    if (y > img.height - (h / zoom)) {y = img.height - (h / zoom);}
    if (y < h / zoom) {y = h / zoom;}
    /*set the position of the magnifier glass:*/
    glass.style.left = (x - w) + "px";
    glass.style.top = (y - h) + "px";
    /*display what the magnifier glass "sees":*/
    glass.style.backgroundPosition = "-" + ((x * zoom) - w + bw) + "px -" + ((y * zoom) - h + bw) + "px";
  }
  function getCursorPos(e) {
    var a, x = 0, y = 0;
    e = e || window.event;
    /*get the x and y positions of the image:*/
    a = img.getBoundingClientRect();
    /*calculate the cursor's x and y coordinates, relative to the image:*/
    x = e.pageX - a.left;
    y = e.pageY - a.top;
    /*consider any page scrolling:*/
    x = x - window.pageXOffset;
    y = y - window.pageYOffset;
    return {x : x, y : y};
  }
}