var Reader = function() {

	var instance = this;

	this.container = $('.reader-container');
	this.gallery = null;
	this.pagesContainer = $('.pages-container', this.container);
	this.pagesInner = $('> .inner', this.pagesContainer);
	this.pages = null;
	this.thumbsContainer = $('.thumbs', this.container);
	this.resize = Math.ceil(window.screen.availWidth / 128) * 128;

	this.open = function(gallery) {
		this.gallery = gallery;

		$('html').addClass('reader-active');
		this.initPages();
		this.loadPage(0);
		this.loadThumbs();
		this.setDetails();
		this.setHistory();
		this.setEvents();
		this.container.show();
	};

	this.initPages = function() {
		for(var i = 0; i < this.gallery.numfiles; i++) {
			var page = $('.template > .page').clone();
			page.data('index', i);
			page.appendTo(this.pagesInner);
		}

		this.pages = $('.page', this.pagesInner);
	};

	this.loadThumbs = function() {
		for(var i = 0; i < this.gallery.numfiles; i++) {
			var thumb = $('<div class="gallery-thumb" />');
			var url = '/api.php?' + $.param({ action: 'gallerythumb', id: this.gallery.id, type: 2, index: i });
			thumb.css({ backgroundImage: 'url(' + url + ')' });
			thumb.data('index', i);
			thumb.appendTo(this.thumbsContainer);
		}
	};

	this.loadPage = function(index) {
		var page = this.pages.eq(index);
		var img = $('img', page);

		if(!page.hasClass('loading')) {
			page.addClass('loading');

			var url = '/api.php?' + $.param({ action: 'archiveimage', id: this.gallery.id, index: index, resize: this.resize });
			img.prop('src', url);
			img.load(this.onImageLoad);
		}
	};

	this.onImageLoad = function() {
		var img = $(this);
		var page = img.parent('.page');
		var index = page.data('index');

		/*
			if the page has loaded above our current scroll position
			then it may shift everything else downwards
		*/
		if(page.height() > window.innerHeight) {
			var pageTop = page.position().top;
			var currentScroll = instance.pagesContainer.scrollTop();
			if(pageTop < currentScroll) {
				var delta = (page.height() - window.innerHeight);

				instance.pagesContainer.scrollTop(currentScroll + delta + 20);
			}
		}

		page.addClass('loaded');
	};

	this.scrollToPage = function(page, bottom) {
		if(this.pagesContainer.is(':animated')) {
			return false;
		}

		var scroll = page.position().top;

		if(bottom) {
			scroll += page.height();
			scroll -= window.innerHeight;
		}
		else {
			scroll += 20; // 20px margin
		}

		this.pagesContainer.animate({ scrollTop: scroll }, 200);
	};

	this.close = function() {

		this.pagesContainer.scrollTop(0);
		this.thumbsContainer.scrollTop(0);

		// clear thumbnails
		this.thumbsContainer.empty();

		// clear pages
		this.pagesInner.empty();

		$('html').removeClass('reader-active');

		$('.gallery-list').trigger('init');

		this.removeEvents();

		this.container.hide();
	};

	this.scrollThumb = function(index) {
		var currentScroll = this.thumbsContainer.scrollTop();

		var height = $('.gallery-thumb', this.thumbsContainer).last().outerHeight(true);
		var newScroll = (height * index);

		// only need to scroll if the thumbnail is out of view
		if(currentScroll > newScroll || newScroll > (currentScroll + this.thumbsContainer.height())) {
			this.thumbsContainer.scrollTop(newScroll);
		}
	};

	this.setDetails = function() {
		var infoContainer = $('.gallery-info', this.container);

		$('.title', infoContainer).text(this.gallery.name);

		if(this.gallery.origtitle && this.gallery.origtitle != this.gallery.name) {
			$('.origtitle', infoContainer).show().text(this.gallery.origtitle);
		}
		else {
			$('.origtitle', infoContainer).hide();
		}

		renderTags($('.tags', infoContainer), this.gallery.tags);
	};

	this.setHistory = function() {
		history.pushState({ action: 'gallery', data: { gallery: this.gallery } }, document.title, '?' + $.param({ action: 'gallery', id: this.gallery.id }));
	};

	this.getCurrentPage = function() {
		var pages = this.pages;

		var scroll = this.pagesContainer.scrollTop();
		var scrollPage = pages.first();

		pages.each(function(i) {
			var page = pages.eq(i);
			if((page.position().top + page.height()) > scroll) {
				scrollPage = page;
				return false;
			}
		});

		return scrollPage;
	};

	this.next = function() {
		var page = this.getCurrentPage();
		var scroll = this.pagesContainer.scrollTop();

		// if we haven't reached the bottom of the page yet, scroll to the bottom
		// allow for 20px , since who's going to care out that?
		if((page.position().top + page.height()) > ((scroll + window.innerHeight) + 20)) {
			if(page.hasClass('loaded')) {
				this.scrollToPage(page, true);
			}
		}
		else {
			// scroll to the bottom of the next page
			if(!page.is(':last-child')) {
				this.scrollToPage(page.next(), false);	
			}
		}
	};

	this.setEvents = function() {
		$(document).on('keydown.reader', function(e) {
			if(e.keyCode === 39 || e.keyCode === 68) { // right, D
				instance.next();
			}
		});
	};

	this.removeEvents = function() {
		$(document).off('keydown.reader');
	};

	$('.close', this.container).click(function() {
		instance.close();
	});

	this.thumbsContainer.on('click', '.gallery-thumb', function() {
		var index = $(this).data('index');
		instance.loadPage(index);

		var page = instance.pages.eq(index);
		instance.scrollToPage(page);
	});

	function updatePagesScroll() {
		var scrollTop = instance.pagesContainer.scrollTop();
		var scrollTopFull = (scrollTop + window.innerHeight);

		instance.pages.each(function(i) {
			var page = instance.pages.eq(i);
			var pageTop = page.position().top;

			if(scrollTopFull > pageTop) { // the bottom of the window is in the top of the page
				if((pageTop + page.height()) > scrollTop) { // the bottom of the page is in the top of the window

					var index = page.data('index');
					instance.scrollThumb(index);

                    // preload next page
                    // currently, preloading only works going forward
                    var nextPage = page.next();
                    if(nextPage.length > 0) {
                        if(!nextPage.hasClass('loading')) {
                            console.log('preloading: ' + nextPage.data('index'));
                            instance.loadPage(nextPage.data('index'));
                        }
                    }

					if(!page.hasClass('loading')) {
						instance.loadPage(index);
						return false;
					}
				}
			}
		});
	}

	var pagesScrollProc = null;
	this.pagesContainer.scroll(function() {
		clearTimeout(pagesScrollProc);

		pagesScrollProc = setTimeout(updatePagesScroll, 200);
	});

    $('.actions-menu li', this.container).click(function() {
        var action = $(this).data('action');

        if(action == 'delete') {
            var key = prompt('Enter access key');
            if(key) {
                api('deletegallery', { id: instance.gallery.id, key: key }, function(data) {
                    instance.close();
                });
            }
        }
        else if(action == 'download') {
            var url = '/api.php?' + $.param({ action: 'download', id: instance.gallery.id });
            window.open(url);
        }
        else if(action == 'similar') {
            var tagList = [ ];
            for(var ns in instance.gallery.tags) {
                for(var i in instance.gallery.tags[ns]) {
                    var tag = ns + ':' + instance.gallery.tags[ns][i];

                    tag = tag.replace('"', '\\\\"');
                    tag = '"' + tag + '"';

                    tagList.push(tag);
                }
            }

            instance.close();

            var search = tagList.join(' | ');

            $('.gallery-list').trigger('loadstate', [ { search: search, order: 'weight' } ]);
        }
        else if(action == 'original') {
            var url = 'http://exhentai.org/g/' + instance.gallery.exhenid + '/' + instance.gallery.hash;
            window.open(url);
        }

        return false;
    });
};