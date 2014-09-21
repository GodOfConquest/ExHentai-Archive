$(document).ready(function() {
	$('.search').each(function() {
		var input = $(this);
		var keywordXhr = null;
		var list = $('.suggestions');
		var term = null;
		var selectionStart = null;

		this.form.autocomplete = 'off';

		function getTerm() {
			return input.val().slice(0, selectionStart).trim();
		}

		input.keydown(function(e) {
			if(e.keyCode === 38) { //arrow up
				var selected = $('li.active', list);
				if(selected.length > 0) {
					if(selected.is(':not(:first-child)')) {
						selected.removeClass('active').prev().addClass('active');
					}
				}
				else {
					$('li', list).first().addClass('active');
				}

				return false;
			}
			else if(e.keyCode === 40) { //arrow down
				var selected = $('li.active', list);
				if(selected.length > 0) {
					if(selected.is(':not(:last-child)')) {
						selected.removeClass('active').next().addClass('active');
					}
				}
				else {
					$('li', list).first().addClass('active');
				}

				return false;
			}
			else if(e.keyCode === 13) { //enter
				var selected = $('li.active', list);
				if(selected.length > 0) {
					selected.click();
					return false;
				}

                list.empty();
                list.removeClass('active');
			}
			else if(e.keyCode === 27) { //esc
				list.empty();
				list.removeClass('active');
			}
		});

		input.keyup(function(e) {
			selectionStart = this.selectionStart;
			var newTerm = getTerm();

			if(keywordXhr) {
				keywordXhr.abort();
			}

			if(e.keyCode === 13 || e.keyCode === 27) { //enter, esc

			}
			else if(newTerm && newTerm.length > 1 && newTerm != term) {
				term = newTerm;

				keywordXhr = api('suggested', { term: term }, function(keywords) {
					list.empty();
					list.removeClass('active');

					if(keywords.length > 0) {
						var termBits = term.split(' ');

						for(var i in keywords) {
							var keyword = keywords[i];
							var itemHtml = keyword;
							var ignoreWord = false;

							for(var x in termBits) {
								var tempTerm = termBits.slice(x).join(' ');
								if(keyword.indexOf(tempTerm) >= 0) {
									if(keyword !== tempTerm) {
										var regex = new RegExp(tempTerm);
										itemHtml = itemHtml.split(regex).join('<span class="highlight">' + tempTerm + '</span>');
									}
									else {
										ignoreWord = true;
									}

									break;
								}
							}

							if(!ignoreWord) {
								var li = $('<li/>');
								li.data('keyword', keyword);
								li.html(itemHtml);
								li.appendTo(list);
							}
						}

						if($('> *', list).length > 0) {
							list.addClass('active');
						}
					}
				});
			}
			else if(getTerm() != term) {
				list.empty();
				list.removeClass('active');
			}
		});

		list.on('click', 'li', function() {
			var item = $(this);
			var keyword = item.data('keyword');
			var value = input.val();
			var pre = value.slice(0, selectionStart);

			var keywordBits = keyword.split(' ');
			var preBits = pre.split(' ').reverse();

			var newPre = '';

			for(var i in preBits) {
				if(i === 0) {
					continue;
				}

				var found = false;
				for(var x in keywordBits) {
					if(keywordBits[x].indexOf(preBits[i]) === 0) {
						found = true;
						delete keywordBits[x];
					}
				}

				if(!found) {
					newPre = preBits.slice(i).reverse().join(' ');
					newPre += ' ';
					break;
				}
			}

			newPre += escapeTag(keyword);

			if(newPre) {
				var newValue = newPre + value.slice(selectionStart);

				input.val(newValue);
				list.removeClass('active');
				input.focus();
				$('.search-form').submit();
			}

			return false;
		});

		function closeList() {
			if(keywordXhr) {
				keywordXhr.abort();
			}

			list.removeClass('active');
		}

		input.parent('form').submit(closeList);
	});
});