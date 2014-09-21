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

		if(!page.data('loading')) {
			page.data('loading', true);

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

	this.scrollToPage = function(page) {
		var scroll = page.position().top;
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

					if(!page.data('loading')) {
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
};