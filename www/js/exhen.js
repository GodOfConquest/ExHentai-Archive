$(document).ready(function() {
	var reader = new Reader();

	function api(action, params, callback) {
		params = $.extend(params, { action: action });

		var ret = $.getJSON('api.php', params, function(resp) {
			if(!resp.ret) {
				alert('API error: ' + resp.message);
			}
			else {
				if($.isFunction(callback)) {
					callback(resp.data);
				}
			}
		});

		return ret;
	}

	function renderTags(container, tagGroups) {
		$('.tag', container).remove();

		for(var ns in tagGroups) {
			var tags = tagGroups[ns];

			for(var x in tags) {
				var tag = tags[x];

				var tagItem = $('<a/>');

                var tagSearch = escapeTag(ns + ':' + tag);
                var url = '?' + $.param({ search: tagSearch });
                tagItem.prop('href', url);

				tagItem.text(tag);
				tagItem.addClass('tag tag-' + ns);
				tagItem.data('tag', tag);
				tagItem.data('ns', ns);
				tagItem.prop('title', ns + ':' + tag);
				container.prepend(tagItem);
			}
		}
	}

    function escapeTag(tag) {
        if(tag.indexOf(' ') >= 0) {
            return '"' + tag + '"'
        }
        else {
            return tag;
        }
    }

	$('.gallery-list').each(function() {
		var galleryList = $(this);
		var page = 0;
		var topPage = 0;
		var loading = false;
		var search = null;
		var xhr = null;
		var loadersBottom = $('.loaders-bottom');
		var loadersTop = $('.loaders-top');
		var searchCount = $('.search-count');
		var searchForm = $('.search-form');
		var order = 'posted';
		var init = false;
		var end = false;
		var randomSeed = 0;
        var unarchived = false;
        var preloadedPages = { };

		function loadPage(fwd) {
			loading = true;
			end = false;

			if(xhr) {
				xhr.abort();
			}

			if(fwd) {
				loadersBottom.addClass('active');
				$('.load-next').removeClass('active');
			}
			else {
				loadersTop.addClass('active');
				$('.load-previous').removeClass('active');
			}

			var loadPage = page;
			if(!fwd) {
				topPage--;
				if(topPage < 0) {
					topPage = 0;
				}
				
				loadPage = topPage;
			}

			var params = { search: search, page: loadPage, order: order };

			if(order === 'random') {
				params.seed = randomSeed;
			}

            if(unarchived) {
                params.unarchived = unarchived;
            }

            function renderResult(result) {
            	var collection = [ ];
				var galleries = result.galleries;
				var topWeight = null;

				$.each(galleries, function(i, gallery) {
					var item = $('.template .gallery-item').clone();
					item.data('gallery', gallery);

                    if(gallery.archived == 1) {
                        var url = '?' + $.param({ action: 'gallery', id: gallery.id, index: 0 });
                    }
                    else {
                        var url = 'http://exhentai.org/g/' + gallery.exhenid + '/' + gallery.hash;
                    }

                    item.prop('href', url);

					if(i == 0) {
						item.addClass('page-break');
						item.data('page', loadPage);
					}

                    if(gallery.archived == 0) {
                        item.addClass('unarchived');
                    }

					$('.title', item).text(gallery.name);
					$('.date', item).text(gallery.posted_formatted);

					if(gallery.ranked_weight) {
						if(topWeight === null) {
							topWeight = gallery.ranked_weight;
						}

						var pc = Math.round((gallery.ranked_weight / topWeight) * 100);
						$('.weight', item).show().text(pc + '%');
					}
					else {
						$('.weight', item).hide();
					}

					if(gallery.thumb) {
						if(gallery.thumb.landscape) {
							item.addClass('landscape');
						}

						item.css({
							backgroundImage: 'url(' + gallery.thumb.url + ')'
						})
					}
					else {
                        if(gallery.archived == 1) {
                            var url = 'api.php?' + $.param({ action: 'gallerythumb', id: gallery.id, index: 0, type: 1 });
                        }
                        else {
                            var url = 'api.php?' + $.param({ action: 'exgallerythumb', id: gallery.id });
                        }

						item.css({
							backgroundImage: 'url(' + url + ')'
						});
					}

					var tagList = $('.tags', item);
					renderTags(tagList, gallery.tags);

					collection.push(item);
				});

				if(fwd) {
					galleryList.append(collection);
				}
				else {
					galleryList.prepend(collection);
				}

				if(galleries.length > 0) {
					if(!history.state || history.state.action == 'galleries') {
						var state = buildHistoryState();
						state.data.page = loadPage;
						setHistoryState(true, state);
					}

					if(fwd) {
						page++;
					}
				}

				if(!result.end) {
					$('.load-next').addClass('active');
				}
				else {
					end = true;
				}

				var displayCount = $('.gallery-item', galleryList).length;
                var totalCount = result.meta.total;


                if(Intl && Intl.NumberFormat) {
                    displayCount = Intl.NumberFormat().format(displayCount);
                    totalCount = Intl.NumberFormat().format(totalCount);
                }

				searchCount.show().text('Displaying ' + displayCount + ' of ' + totalCount + ' results');

				if(topPage != 0) {
					$('.load-previous').addClass('active');
				}
				else {
					$('.load-previous').removeClass('active');
				}

				loadersTop.removeClass('active');
				loadersBottom.removeClass('active');

				loading = false;

				if(fwd && !end) {
					delete preloadedPages[params.page];

					params.page++;
					xhr = api('galleries', params, function(result) {
						preloadedPages[params.page] = result;
					});
				}
            }

            if(preloadedPages[params.page]) {
            	renderResult(preloadedPages[params.page]);
            }
            else {
            	xhr = api('galleries', params, function(result) {
					renderResult(result);
				});
            }
		}

        galleryList.on('click', '.gallery-item', function() {
            var galleryItem = $(this);
            var gallery = galleryItem.data('gallery');

            if(gallery.archived == 0) {
                var url = 'http://exhentai.org/g/' + gallery.exhenid + '/' + gallery.hash;
                window.open(url);
            }
            else {
                reader.open(gallery);    
            }

            return false;
        });

		function setHistoryState(replace, state) {
			var urlParams = { };
			if(state.data.search) urlParams.search = state.data.search;
			if(state.data.page && state.data.page > 0) urlParams.page = state.data.page;
			if(state.data.order != 'posted') urlParams.order = state.data.order;
			//if(state.data.seed) urlParams.seed = state.data.seed;
            if(state.data.unarchived) urlParams.unarchived = state.data.unarchived;

			var url = Object.keys(urlParams).length > 0 ? '?' + $.param(urlParams) : '/';

			if(replace) {
                history.replaceState(state, document.title, url);
			}
			else {
                history.pushState(state, document.title, url);
			}
		}

		function setHistory(replace) {
			var state = buildHistoryState();
			setHistoryState(replace, state);
		}

		function buildHistoryState() {
			var state = { action: 'galleries', data: { search: search, page: page - 1, order: order, unarchived: unarchived } };

			if(order === 'random') {
				state.data.seed = randomSeed;
			}

			return state;
		}

		galleryList.on('sethistory', function(e, replace) {
			setHistory(replace);
		});

		searchForm.submit(function() {
			search = $('.search', searchForm).val();
			searchCount.hide();
			galleryList.empty();
			page = 0;
			topPage = 0;
			preloadedPages = { };
			randomiseSeed();
			loadPage(true);
			setHistory(false);

			return false;
		});

		function randomiseSeed() {
			randomSeed = Math.floor(Math.random() * 0x7ffffff).toString(36);
		}

        $('.unarchived').change(function() {
            unarchived = $(this).prop('checked');

            searchForm.submit();
        });

		$('.input-clear').click(function() {
			if(order === 'weight') {
				order = 'posted';
				setOrderLabel();
			}

			$('.search', searchForm).val('');
			searchForm.submit();
		});

		$('.search-order ul li', searchForm).click(function() {
			var trigger = $(this);
			order = trigger.data('order');

			var menu = $('.search-order', searchForm);
			$('.label', menu).text(trigger.text());

			var menuOuter = $('.menu-outer', menu);
			menuOuter.hide();
			setTimeout(function() { //hack
				menuOuter.removeAttr('style');
			}, 1);

			searchForm.submit();

			return false;
		});

		galleryList.on('click', '.tag', function() {
			var tag = $(this);
            var searchTag = tag.data('ns') + ':' + tag.data('tag');
            searchTag = escapeTag(searchTag);

			$('.search').val(searchTag);
			$('.search-form').submit();

			return false;
		});

		function setOrderLabel() {
			var label = $('.search-order .label', searchForm);

			if(order != 'posted' || label.text() != 'Order') {
				var orderOpt = $('.search-order li[data-order="' + order + '"]');
				label.text(orderOpt.text());
			}
		}

		galleryList.on('loadstate', function(e, data) {
			init = true;

			data = $.extend({ search: '', page: 0, order: order }, data);

			search = data.search;
			page = data.page;
			topPage = page;
			order = data.order;
			randomSeed = data.seed;
            unarchived = data.unarchived;

			if(!randomSeed && order === 'random') {
				randomiseSeed();
			}

			setOrderLabel();
            $('.unarchived').prop('checked', unarchived);

			$('.search').val(search);
			searchCount.hide();
			galleryList.empty();
			loadPage(true);

			if(!history.state || history.state.action != 'galleries') {
				setHistory(false);
			}
		});

		galleryList.on('init', function() {
			if(!init) {
				init = true;

				galleryList.trigger('loadstate', [ { page: 0, search: '' } ]);
			}

			if(!history.state || history.state.action != 'galleries') {
				setHistory(false);
			}
		});

		$('.load-previous .inner').click(function() {
			loadPage(false);
		});

		$('.load-next .inner').click(function() {
			loadPage(true);
		});

		var win = $(window);
		var doc = $(document);
		win.scroll(function() {
			if(!end) {
                var winHeight = win.height();
				if(win.scrollTop() + (winHeight * 1.2) >= doc.height()) {
					if(!loading) {
						loadPage(true);
					}
				}
			}
		});

		var pageUpdateProc = null;
		win.scroll(function() {
			clearTimeout(pageUpdateProc);

			if(!history.state || history.state.action == 'galleries') {
				pageUpdateProc = setTimeout(function() {
					if(!history.state || history.state.action == 'galleries') {
						var scroll = win.scrollTop() + win.height();
						var pageBreaks = $('.page-break', galleryList);
						var lastBreak = null;

						for(var i = 0; i < pageBreaks.length; i++) {
							var pageBreak = pageBreaks.eq(i);

							if(pageBreak.position().top > scroll) {
								break;
							}

							lastBreak = i;
						}

						if(lastBreak !== null) {
							var newPage = pageBreaks.eq(lastBreak).data('page');
							var state = history.state;
							state.data.page = newPage;
							setHistoryState(true, state);
						}
					}
				}, 100);
			}
		});
	});

	function setupDropdowns() {
		var dropdowns = $('.dropdown-button');

		dropdowns.click(function() {
			$(this).toggleClass('active');
		});

		$(document).click(function(e) {
			if(dropdowns.hasClass('active') && dropdowns.has(e.target).length === 0) {
				dropdowns.removeClass('active');
			}
		});

		$('ul li', dropdowns).click(function() {
			$(this).parents('.dropdown-button').removeClass('active');
		});
	}

	setupDropdowns();

	$(window).on('popstate', function(e) {
		if(e.originalEvent.state) {
			switch(e.originalEvent.state.action) {
				case 'galleries': {
					//reader.trigger('close');
					$('.gallery-list').trigger('loadstate', [ e.originalEvent.state.data ]);
					break;
				}
				case 'gallery': {
					//reader.trigger('loadstate', [ e.originalEvent.state.data ]);
					break;
				}
			}
		}
	});

	if(window.location.search == '') {
		$('.gallery-list').trigger('init');
	}
	else {
		var query = decodeQuery();
		if(!query.action || query.action == 'galleries') {
			$('.gallery-list').trigger('loadstate', [ { page: query.page, search: query.search, order: query.order, seed: query.seed, unarchived: query.unarchived } ]);
		}
		else if(query.action == 'gallery') {
			api('gallery', { id: query.id }, function(gallery) {
				//reader.trigger('loadgallery', [ gallery, query.index ])
			});
		}
	}

	function decodeQuery() {
		var ret = {};
		var bits = window.location.search.slice(1).replace(/\+/g, '%20').split('&');
		for(var i in bits)
		{
			var keyvalue = bits[i].split('=');
			ret[decodeURIComponent(keyvalue[0])] = keyvalue.length == 1 ? false : decodeURIComponent(keyvalue[1]);
		}

		return ret;
	}
});
