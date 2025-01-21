/* index.html */
const CATEGORY_NAME = {
	'latest': "Latest",
	"exhibitions": "Exhibitions",
	"publications": "Publications",
	"math_student": "As a Math Student",
	"featured": "Featured",
	"sketches": "Early Work",
};

const CATEGORY_MENU = {
	'latest': [
		{'surrealistic_paintings': {
			"name": "Surrealistic Paintings",
			"next": ["moments_of_delight", "topological_crochet"],
		}},
		{'topological_crochet': {
			"name": "Topological Crochet",
			"next": ["surrealistic_paintings", "polyhedramatics_the_dance"],
		}},
	],
	'exhibitions': [
		{'polyhedramatics_the_dance': {
            "name": "Polyhedramatics: the Dance",
            "next": ["topological_crochet", "shining_beauty_of_mathematics"]
        }},
		{'shining_beauty_of_mathematics': {
			"name": "Shining Beauty of Mathematics",
			"next": ["polyhedramatics_the_dance", "cuhk_math_website_revamp"],
		}},
	],
	'publications': [
		{'cuhk_math_website_revamp': {
			"name": "Website: Department of Mathematics, CUHK",
			"next": ["shining_beauty_of_mathematics", "IMOment_newsletter_for_IMO_2016"],
		}},
		{'IMOment_newsletter_for_IMO_2016': {
			"name": "IMOment: Newsletters for the 57th International Mathematics Olympiad 2016",
			"next": ["cuhk_math_website_revamp", "major_ugf"],
		}},
	],
	'math_student': [
		{'major_ugf': {
			"name": "Major: UGF",
			"next": ["IMOment_newsletter_for_IMO_2016", "purquoi_imaginary_in_my_week_of_finals"],
		}},
		{'purquoi_imaginary_in_my_week_of_finals': {
			"name": "Purquoi Imaginary: In My Week of Finals",
			"next": ["major_ugf", "attack_on_minions"],
		}},
	],
	'featured': [
		{"attack_on_minions": {
			"name": "Attack on Minions!",
			"next": ["purquoi_imaginary_in_my_week_of_finals", "never_forget"],
		}},
		{"never_forget": {
			"name": "Never Forget",
			"next": ["attack_on_minions", "lunch_time_escape"],
		}}
	],
	'sketches': [
		{'lunch_time_escape': {
			"name": "Lunch Time Escape",
			"next": ["never_forget", "if_pusheen_is_my_cat"]
		}},
		{'if_pusheen_is_my_cat': {
			"name": "If Pusheen Is My Cat",
			"next": ["lunch_time_escape", "because_its_cute"]
		}},
		{'because_its_cute': {
			"name": "Because It's Cute",
			"next": ["if_pusheen_is_my_cat", "love_of_miyazaki"]
		}},
		{'love_of_miyazaki': {
			"name": "Love of Miyazaki",
			"next": ["because_its_cute", "moments_of_delight"]
		}},
		{'moments_of_delight': {
			"name": "Moments of Delight",
			"next": ["love_of_miyazaki", "surrealistic_paintings"],
		}},
	],
};

const ALBUM_MENU = Object.values(CATEGORY_MENU)
    .flat() // Combine all arrays into one
    .reduce((acc, obj) => Object.assign(acc, obj), {});

function display_album_covers() {
	for (var cat in CATEGORY_MENU) {
		var cat_html = '';
		for (let i = 0; i < CATEGORY_MENU[cat].length; i++) {
			var album = Object.keys(CATEGORY_MENU[cat][i])[0];
			var align = ((i % 2)? "left": "right");
            var href = ("href" in ALBUM_MENU[album])? ALBUM_MENU[album]['href']: "album/" + album + ".html"

			var album_div ='<div class="col-sm-6 album_div ' + align + '"> ' +
                                '<a href="' + href + '" > ' + 
								    '<img class="album_cover" src="navigation/album_cover_' + album + '.jpg"> ' +
                                '</a> ' +
							'</div> ';
			if (i % 2) {
				cat_html += album_div + '</div>';	
			} else {
				cat_html += '<div class="row">' + album_div;
			}
		}
		if (CATEGORY_MENU[cat].length > 0) {
			$("#cat_" + cat).html(cat_html);
		}
	}
}

function load_navigation(path, page_album_name) {
	$("#navigation_block").load(path + "page_navigation_template.html", function() {
		var album_links = $("#nav_album_links");

		for (var cat in CATEGORY_MENU) {
			var nav_category = $("#template_nav_category").clone();

			nav_category.attr("id", "nav_category_" + cat);
			nav_category.find("button").text("δ " + CATEGORY_NAME[cat] + " δ");
			nav_category.find("button").attr("onclick", "show_category_albums('" + cat + "')");

			for (let i = 0; i < CATEGORY_MENU[cat].length; i++) {
				var album = Object.keys(CATEGORY_MENU[cat][i])[0];
				var album_title = ALBUM_MENU[album]['name'];

				var tab = $("#template_nav_album_tab").clone();
				tab.attr("id", "nav_album_" + album);
				tab.find("a").text(album_title);
				tab.find("a").attr("href", path + album + ".html");
				
				tab.show();
				nav_category.find(".cat_group").append(tab);
			}

			nav_category.show();
			album_links.append(nav_category);
		}

		var home_path = (path == "")? "../" : ""
		$("#nav_home").attr("href", home_path + "index.html");
		$("#nav_about").attr("href", home_path + "about.html");
		
		show_exploration_albums();
		for (var cat in CATEGORY_MENU) {
			for (let i = 0; i < CATEGORY_MENU[cat].length; i++) {
				if (page_album_name == Object.keys(CATEGORY_MENU[cat][i])[0]) {
					show_category_albums(cat);
					$("#nav_album_" + page_album_name).find("a").html(
						"<span style=\"color:auto\">▸ </span>" + ALBUM_MENU[page_album_name]['name']
					);
					$("#nav_album_" + page_album_name).find("a").removeAttr("href");
				}
			}
		}
	});
}

function open_navigation() {
	$("#main_content").css("margin-left", "25%");
	$("#navigation_bar").css("width", "25%");
	$("#navigation_bar").css("display", "block");
	$("#nav_button").css("display", "none");
}

function close_navigation() {
	$("#main_content").css("margin-left", "0%");
	$("#navigation_bar").css("display", "none");
	$("#nav_button").css("display", "inline-block");
}

function show_exploration_albums() {
 	$('#nav_album_links').each(function() {
        let $a = $(this);

        if (!$a.hasClass('w3-show')) {
            $a.addClass('w3-show');
            $a.prev().addClass('w3-light-grey'); // Target the previous sibling
        } else {
            $a.removeClass('w3-show');
            $a.prev().removeClass('w3-light-grey');
        }
    });
}

function show_category_albums(cat) {
 	$('#nav_category_' + cat + " .cat_group").each(function() {
        let $a = $(this);

        if (!$a.hasClass('w3-show')) {
            $a.addClass('w3-show');
            $a.prev().addClass('w3-light-grey'); // Target the previous sibling
        } else {
            $a.removeClass('w3-show');
            $a.prev().removeClass('w3-light-grey');
        }
    });
}