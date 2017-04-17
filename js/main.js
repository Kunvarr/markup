console.info('works');

var
    allowedPhoneCodes = {
        start: [
            3, 5, 6, 7, 9
        ],
        finish: [
            // mobile
            39, 50, 63, 66, 67, 68, 69, 70, 73, 76, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99,
            // landline
            // 31, 32, 33, 34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48,
            // 49, 51, 52, 53, 54, 55, 56, 57, 58, 59, 61, 62, 64, 65, 69
        ],
    },
    allowdPhonesRegex = new RegExp('^('+allowedPhoneCodes.start.join('|')+'|'+allowedPhoneCodes.finish.join('|')+')$');

	initPhoneMask = function () {
		$("[data-phone-mask]").mask("+38 (099) 999-99-99", {
            onchange: function (buffer, i) {
                var code = buffer[6]+buffer[7];
                if (code != '__') {
                    if (!allowdPhonesRegex.test(buffer[6])) {
                        buffer[6] = '_';
                        --i;
                    } else if (buffer[7] != '_' && !allowdPhonesRegex.test(code)) {
                        buffer[6] = buffer[7] = '_';
                        i -= 2;
                    }
                }
                return [buffer, i];
            }
        });
	},

	showNotification = function (message, type, duration) {
        var viewWidth = (window.innerWidth || $(window).width());

		if (typeof duration == 'undefined')
			duration = 2500;
		if (typeof type == 'undefined')
			type = 'success';

		if (message && message.length) {
			toastr[type](message, '', {
                preventDuplicates: true,
                progressBar: true,
                timeOut: duration,
                positionClass: (viewWidth < 769 ? 'toast-bottom-full-width' : 'toast-bottom-left')
            });
		}
	},

	fatalErrorHandler = function () {
		showNotification(langMessages.T_FATAL_ERROR, 'error', 2000);
	},

    sklonenie = function ($n, $forms) {
        return $n%10==1&&$n%100!=11?$forms[0]:($n%10>=2&&$n%10<=4&&($n%100<10||$n%100>=20)?$forms[1]:$forms[2]);
    },

    addToBasket = function (button) {
        button = $(button);
        var id = button.attr('data-id'),
            url = button.attr('data-url') || false,
            isBasketPage = (typeof basketActionsHandler == 'function');

        if (!id) return;

        if (isBasketPage) {
            BX.showWait($basketContainer[0]);
            $('html, body').animate({scrollTop: 200}, 200);
        }

        $.post(SITE_TEMPLATE_PATH+'/ajax/basket.php?action=add|smallBasket', { product: id })
            .done(function (smallBasketContent) {
                if (url) document.location = url;
                $('[data-small-basket-reloadable]').html(smallBasketContent);
                if (isBasketPage) basketActionsHandler();
            })
            .error(fatalErrorHandler);


        if (!url && !isBasketPage) $('#basket_success').modal('show');
    },

    // unified code for 'Show more' buttons
    ajaxItemsLoading = false,

    loadNextPage = function (ob) {
        if(ajaxItemsLoading)
            return;

        var loadedPages = [], lastPage = 1,
            curPage = 1, pagenNum = 1,
            url, nextPage;

        lastPage = parseInt(ob.attr("data-pages-count"));
        curPage = parseInt(ob.attr("data-cur-page"));
        loadedPages = (ob.attr("data-loaded-pages") || ''+curPage).split(',');
        pagenNum = ob.attr("data-pagen-num");
        url = ob.attr("data-url");
        nextPage = curPage+1;

        loadedPages = $.map(loadedPages, function(val,i) {
            return parseInt(val);
        });

        if(nextPage > lastPage)
            return;

        ajaxItemsLoading = true;
        ob.addClass("in-progress");

        var replaceParams = {
            pass_header: 'Y'
        };
        replaceParams[ob.attr('data-ajax-flag')] = 'Y';
        replaceParams['PAGEN_'+pagenNum] = nextPage;

        $.get(BX.util.add_url_param(window.location.href, replaceParams))
            .done(function(result){
                $(result).insertBefore(ob.attr("data-container"));
                
                initSliders();
                initPopovers();

                curPage = nextPage;
                ob.attr("data-cur-page", nextPage);
                loadedPages.push(nextPage);
                ob.attr('data-loaded-pages', loadedPages.join(','));

                var pager = ob.parents('.container').find('.bx-pagination-container ul');

                if(parseInt(nextPage) >= parseInt(lastPage)) {
                    ob.hide();

                    if (pager.length)
                        pager.hide();

                    if (ob.parent().attr('data-hide-on-empty') == 'true')
                        ob.parent().hide();
                } else {
                    if (pager.length)
                        updatePager(curPage, pagenNum, loadedPages, lastPage, pager);

                    var perPage = parseInt(ob.attr('data-per-page')),
                        items = ob.attr('data-item-name'),
                        forms = (ob.attr('data-item-forms') || '').split(',');

                    if (perPage > 0) {
                        var current = parseInt(ob.attr('data-items-left'));
                        if (current > 0) {
                            current = current-perPage;
                            ob.attr('data-items-left', current);

                            var printMoreCnt = (current >= perPage ? perPage : current);
                            ob.find('.left-count').text(printMoreCnt);
                            if (items)
                                ob.find('.left-count-message')
                                    .text(items + sklonenie(printMoreCnt, forms));
                        }
                    }
                }
            })
            .fail(fatalErrorHandler)
            .always(function(){
                ajaxItemsLoading = false;
                ob.removeClass("in-progress");
            });
    },

    updatePager = function(curPage, pagenNum, loadedPages, lastPage, $container) {
        var itemTpl = '<li><a href="#HREF#"><span>#NUM#</span></a></li>',
            activeItemTpl = '<li class="bx-active"><span>#NUM#</span></li>',
            dotsTpl = '<li><span>...</span></li>',
            activeDotsTpl = '<li class="bx-active"><span>...</span></li>',
            firstPage = 1,
            pageOffset = 1,
            updatedList = '',
            replaceParams = {};

        //replaceParams['PAGEN_'+pagenNum] = "#NUM#";
        //var baseHref = BX.util.add_url_param(window.location.href, replaceParams);

        var baseHref = window.location.href.replace(new RegExp(/(page-(\d+)\/)/), '') + 'page-#NUM#/';


        if (curPage <= 2 || curPage >= lastPage-1)
            pageOffset = 2;
        if (curPage == lastPage)
            pageOffset = 3;

        for (var i = firstPage; i <= lastPage; i++) {

            var isActive = (loadedPages.indexOf(i) != -1);

            if (!isActive) var itemHref = baseHref.replace('#NUM#', i);
            if (i == 1 && !isActive) itemHref = itemHref.replace(/(&?|\??)PAGEN_[0-9]=1/, '')
            if (i == 1 || i == lastPage || (i <= curPage+pageOffset && i >= curPage-pageOffset ) ) {
                updatedList += (isActive ? activeItemTpl : itemTpl)
                    .replace('#NUM#', i+'')
                    .replace('#HREF#', itemHref || '');
            }
            else if (
                (i == Math.ceil((curPage-pageOffset)/2) && curPage > pageOffset) ||
                (i == Math.floor(((lastPage - (curPage + pageOffset) )/2) + curPage) && curPage < lastPage-(pageOffset+1))
            )
            {
                updatedList += (isActive ? activeDotsTpl : dotsTpl)
                    .replace('#NUM#', i+'')
                    .replace('#HREF#', itemHref || '');
            }
        }

        $container.html(
            ($container.find('li.bx-pag-prev').prop('outerHTML') || '')
            + updatedList
            + ($container.find('li.bx-pag-next').prop('outerHTML') || '')
        );
    },

    initSliders = function () {
        $("[data-slider-init]").each(function () {
            // owl carousel crashes when only 1 item given
            if ($(this).children().length > 1 && !$(this).hasClass('owl-loaded')) {
                var milliseconds = parseInt($(this).attr('data-rotate-time'))*1000;
                $(this).owlCarousel({
                    items: 1,
                    nav: true,
                    navText: ['<img src="'+SITE_TEMPLATE_PATH+'/img/arrow.png">', '<img src="'+SITE_TEMPLATE_PATH+'/img/arrow.png">'],
                    dots: true,
                    loop: true,
                    autoplay: milliseconds > 0,
                    autoplayTimeout: milliseconds,
                    autoplayHoverPause: true
                });
            }
        });
    },

    initCustomSelects = function () {

        // Select
        $('.slct').click(function () {
            var dropBlock = $(this).parent().find('.drop');
            if (dropBlock.is(':hidden')) {
                dropBlock.slideDown(100);

                $(this).addClass('active');

                $('.drop').find('li').click(function () {

                    var selectResult = $(this).html();

                    //$(this).parent().parent().find('input').val(selectResult);
                    $(this).parent().parent().find('.slct').removeClass('active').html(selectResult);

                    dropBlock.slideUp(100);
                });

            } else {
                $(this).removeClass('active');
                dropBlock.slideUp(100);
            }

            return false;
        });
    },

    iniTextToggleButtons = function () {
        // 'show more' toggle buttons appearence
        $('[data-height-toggle]').each(function () {
            var btn = $(this),
                scopeElement = btn.parents('[data-height-scope]'),
                clippedElement = scopeElement.find('[data-clipped-height]'),
                clipped = clippedElement.height(),
                real = scopeElement.find('[data-real-height]').height();

            btn[real > 0 && real > clipped ? 'show' : 'hide']().removeAttr('data-height-toggle');

            if (real > 0 && real < clipped) {
                clippedElement.removeClass('clipped-text').addClass('full-text');
            }
        });
    },

    initPopovers = function () {

        var popoversToInit = $('.popover-init'),
            popoverTimer,
            hoverReturn = false,
            lastHover = null;
        popoversToInit.popover({
            trigger: "manual" , html: true,
            placement: function (context, source) {
                var position = $(source).parents('.body').offset();

                if (!position) {
                    position = $(source).parents('.labels-scope').offset();
                }

                if (!position) {
                    return 'top';
                }

                if (position.left > window.innerWidth-450) {
                    return "left";
                }

                if (position.left < window.innerWidth-450) {
                    return "right";
                }

                if (position.top < 110){
                    return "bottom";
                }

                return "top";
            }
        })
            .on("mouseenter", function () {
                // ugly, optimize?
                if (lastHover === this) {
                    hoverReturn = true;
                } else {
                    hoverReturn = false;
                }
                lastHover = this;

                clearTimeout(popoverTimer);

                var $this = $(this);
                popoverTimer = setTimeout(function () {
                    if ($this.parents('.product_label').find(".popover").is(':visible')) {
                        return;
                    }

                    $this.popover("show");
                    $this.parents('.product_label').find(".popover").on("mouseleave", function () {
                        setTimeout(function () {
                            if (!hoverReturn) {
                                $this.popover('hide');
                            }
                        }, 50);
                    });
                }, 1000);
            }).on("mouseleave", function () {
                hoverReturn = false;
                clearTimeout(popoverTimer);
                var _this = this;
                setTimeout(function () {
                    if (!$(".popover:hover").length) {
                        $(_this).popover("hide");
                    }
                }, 50);
        });
        popoversToInit.removeClass('popover-init');
        /*
        Disabled
        
        var labelToInit = $('.label-init');
        labelToInit.hover(function () {
            if ($('html').hasClass('bx-touch')) {
                return;
            }

            $(this).find('.label-right, .label-left').each(function () {
                var label = $(this),
                    w = label.width()-20;
                label.css((label.hasClass('label-right') ? 'right' : 'left'), -w);
            })
        }, function () {
            $(this).find('.label-right, .label-left').removeAttr('style');
        });
        labelToInit.removeClass('label-init');
        */
    },

    initCountdown= function () {
        if (!$.fn.countdown) {
            return;
        }

        $('.countdown').each(function () {
            var $this = $(this),
                countTime = $this.attr('data-date-to');

            if (!!countTime) {
                $this.countdown(countTime, function (ev) {
                    var units = {
                        day: sklonenie(ev.offset.totalDays, [
                            langMessages.GS_DAY_1, langMessages.GS_DAY_2, langMessages.GS_DAY_3
                        ]),
                        hour: sklonenie(ev.offset.hours, [
                            langMessages.GS_HOUR_1, langMessages.GS_HOUR_2, langMessages.GS_HOUR_3
                        ]),
                        minute: sklonenie(ev.offset.minutes, [
                            langMessages.GS_MINUTE_1, langMessages.GS_MINUTE_2, langMessages.GS_MINUTE_3
                        ]),
                        second: sklonenie(ev.offset.seconds, [
                            langMessages.GS_SECOND_1, langMessages.GS_SECOND_2, langMessages.GS_SECOND_3
                        ])
                    };
                    $this.html(ev.strftime(
                        '<div class="count-item"><span class="count-time">%D</span><span class="count-unit">'
                        + units.day
                        + '</span></div>'
                        + '<div class="count-item"><span class="count-time">%H</span><span class="count-unit">'
                        + units.hour
                        + '</span></div>'
                        + '<div class="count-item"><span class="count-time">%M</span><span class="count-unit">'
                        + units.minute
                        + '</span></div>'
                        + '<div class="count-item"><span class="count-time">%S</span><span class="count-unit">'
                        + units.second
                        + '</span></div>'
                    ));
                });
            }
        });
    },

    initCustomAjaxForms = function () {

        var isAjaxFormLoading = false;
        $('[data-custom-ajax-form]').on('submit', function (e) {
            e.preventDefault();
            e.stopPropagation();

            if (isAjaxFormLoading)
                return;

            var form = $(this),
                formParent = form.parents('[data-ajax-loader-scope]');

            isAjaxFormLoading = true;
            BX.showWait(formParent[0]);

            $.post(form.attr('action'), form.serialize())
                .done(function (result) {
                    try { result = JSON.parse(result); } catch (e) {}

                    if (result && typeof result.state != 'undefined') {
                        if (!result.state) {
                            for (k in result.errors) {
                                form.find('[name='+result.errors[k]+']').addClass('is-error');
                            }
                        } else {
                            var successBlock = formParent.find('[data-show-on-success]');
                            if (result.successText) {
                                successBlock.html(result.successText);
                            }
                            formParent.find('[data-hide-on-success]').hide();
                            successBlock.removeClass('hide').show();
                        }

                        if (!!result.errorMessage) {
                            showNotification(result.errorMessage, 'warning', 4000);
                        }
                    }

                    BX.closeWait();
                    BX.onCustomEvent('onAjaxSuccess');
                })
                .error(fatalErrorHandler)
                .always(function () {
                    isAjaxFormLoading = false;
                });
        });
    },
    
    initAjaxMenu = function () {
        var menuTimer = null;
        $('[data-ajax-menu]').hover(function () {
            var $_this = $(this);

            if (!$_this.data('loaded')) {
                $_this.find('.children_menu').load(
                    SITE_TEMPLATE_PATH+'/ajax/submenu.php?section='+$_this.data('section')
                );
                $_this.data('loaded', true);
            }
            
            menuTimer = setTimeout(function () {
                $_this.find('.children_menu').fadeIn('fast', function () {
                    $_this.addClass('has_children');
                });
            }, 500);
        }, function () {
            clearTimeout(menuTimer);
            $(this).find('.children_menu').hide();
            $(this).removeClass('has_children');
        });
    }
    ;

function compositeUnsensitiveActions()
{
    // redefine default loader
    BX.showWait = function (node, isFixed) {
        node = BX(node) || document.body || document.documentElement;
        if ($('#dynamic_wait').length) {
            $('#dynamic_wait').fadeOut('fast', function () {
                $(this).remove();
            });
        }
        return $('<div class="loader-wrapper '+(isFixed ? 'is-fixed' :'')+'" id="dynamic_wait">\
            <div class="wifi-symbol">\
                <div class="wifi-circle second"></div>\
                <div class="wifi-circle third"></div>\
                <div class="wifi-circle fourth"></div>\
            </div></div>')
            .appendTo(node).fadeIn(200);
    };

    BX.closeWait = function () {
        $('#dynamic_wait').fadeOut(300, function(){ $('#dynamic_wait').remove(); });
    };

    $('input.is-error, textarea.is-error').on('keyup', function () {
        $(this).removeClass('is-error');
    });

    $(document).on('click', '[data-add-to-basket]', function (e) { e.preventDefault(); addToBasket(this); });

    $('#basket_success').on('show.bs.modal', function() {
        $(document).trigger('mousemove');
    });

    $(document).on('click', '.tabs_header > .tab_header', function () {
        var header = $(this),
            tabName = header.attr('data-tab-name');

        if (header.hasClass('is-active'))
            return;

        header.addClass('is-active').siblings().removeClass('is-active');
        $('.tab_content[data-tab-name='+tabName+']').addClass('is-active').siblings().removeClass('is-active');
    });

    initCustomAjaxForms();
}

function compositeSensitiveActions()
{
    window.compositeLoaded = true;
    initPhoneMask();
    initSliders();
    initAjaxMenu();
    initCustomSelects();
    iniTextToggleButtons();
    initPopovers();
    initCountdown();
    defaultCode();

    $('[name=sessid], #sessid').val(BX.message('bitrix_sessid'));

    // ajax forms support
    BX.addCustomEvent('onAjaxSuccess', function () {
        initPhoneMask();
        $('[name=sessid], #sessid').val(BX.message('bitrix_sessid'));

        //errors hightlight
        $('label.is-error').next().addClass('is-error');
        $('input.is-error, textarea.is-error, .is-error input').on('keyup', function(){
            var $this = $(this);
            $this.removeClass('is-error');
            $this.parents('.is-error').removeClass('is-error');
        });
    });

}


/* Markup pseudo BX */
BX = {};
BX.ready = function (cb){
    $(document).ready(cb);
};
BX.message = function () {

};
BX.addCustomEvent = function () {

};


BX.ready(compositeUnsensitiveActions);

if (window.frameCacheVars !== undefined) {
    BX.addCustomEvent("onFrameDataReceived" , compositeSensitiveActions);
} else {
    BX.ready(compositeSensitiveActions);
}



// markup default code ahead

var defaultCode = function() {

    $('.review_button').click(function () {
        $('.review-modal > .mymodal').addClass('active');
        $('.review-modal').fadeIn(300);
    });

    $("a.scroll-to").on('click', function(e) {
        e.preventDefault();
        var hash = this.hash;

        $('html, body').animate({
            scrollTop: $(hash).offset().top
        }, 300, function(){
            window.location.hash = hash;
        });
    });

    $('nav li.has_children').on('mouseover', function () {
        var $this = $(this),
            carousel = $this.find('.owl-carousel');

        if (carousel.length) {

            if (carousel.hasClass('is-refreshed'))
                return;

            var obCarousel = carousel.data('owlCarousel'),
                minH = 300,
                maxH = 500,
                maxChildHeight = 0,
                resultH;

            $this.find('.children_menu').each(function () {
                var childH = $(this).height();
                if (childH > maxChildHeight) {
                    maxChildHeight = childH;
                }
            });
            resultH = (maxChildHeight > maxH ? maxH-100 : (maxChildHeight < minH ? minH-50 : maxChildHeight-50));

            carousel.height(resultH).find('.ithem a').height(resultH-20);
            carousel.parent().height((maxChildHeight < minH ? minH : maxChildHeight));

            obCarousel._width = carousel.width();
            obCarousel.invalidate('width');
            obCarousel.refresh();

            carousel.find('.owl-stage').css('line-height', (resultH-20)+'px');
            carousel.addClass('is-refreshed')
        }
    });

    $(".show-more-text a").on("click", function(e) {
        e.preventDefault();

        var $this = $(this),
            $content = $this.parent().prev("div.truncate-content"),
            buttonText;

        if ($content.hasClass('full-text')) {
            buttonText = "Open";
            $content.css('height', '140px');
        } else {
            buttonText = "Close";
            $content.css('height', $content.find('[data-real-height]').height());
        };

        $content.toggleClass("clipped-text full-text");
        $this.text(buttonText);
    });

    // close custom select on outside click
    $(document.body).on('click', function () {
        $('.slct.active').removeClass('active').parent().find('.drop').slideUp(100);
    })

    // filter option open/close
    $(".ithem_header").click(function () {
        if ($(this).hasClass('ithem_price')) {
            return;
        }

        if ( $(this).hasClass('active') ) {
            $(this).removeClass('active');
            $(this).parent().find(".ithem_content").hide(300);
        }else{
            $(this).addClass('active');
            $(this).parent().find(".ithem_content").show(300);
        }
    });

    // mobile filter open/close
    $(".filter .headinng").click(function () {

        // only for modile & tablets
        if ((window.innerWidth || $(window).width()) > 992)
            return;

        if ( $(this).hasClass('active') ) {
            $(this).removeClass('active');
            $(".filter_body").hide(300);
        }else{
            $(this).addClass('active');
            $(".filter_body").show(300);
        }
    });

    $('[data-callback]').click(function () {
        $('.callback > .mymodal').addClass('active');
        $('.callback').fadeIn(300);
    });

    $('.modal_close').click(function () {
        $(this).parent().parent().parent().fadeOut(300);
        $(this).parent().parent().removeClass('active');
    });

    /*$('.modal_wrapper').click(function(){
     $(this).find('.mymodal').removeClass('active');
     $(this).fadeOut(300);
     });*/

    $(".menu_mobile").click(function () {
        if ($(this).hasClass('active')) {
            $(".site_container").removeClass('active');
            $(this).removeClass('active');
            $("#slide-menu").removeClass('active');
            $("body").removeClass('active');
            $('.site_container_outer').hide(100);
        } else {
            $(this).addClass('active');
            $(".site_container").addClass('active');
            $("#slide-menu").addClass('active');
            $("body").addClass('active');
            $('.site_container_outer').show(100);
        }
    });

    var mobileMenuClose = function () {
        $(".site_container").removeClass('active');
        $("#slide-menu").removeClass('active');
        $(".menu_mobile").removeClass('active');
        $("body").removeClass('active');
        $('.site_container_outer').hide(100);
    };
    $(document).mouseup(function (e) {
        if ($("#slide-menu").hasClass('active') && !$('.mymodal').hasClass('active')) {
            var container = $("#slide-menu");
            if (container.has(e.target).length === 0) {
                mobileMenuClose()
            }
        }
    });
    $('.site_container_outer').on('click', function () {
        if ($("#slide-menu").hasClass('active') && !$('.mymodal').hasClass('active')) {
            var container = $("#slide-menu");
            if (container.has(e.target).length === 0) {
                mobileMenuClose();
            }
        }
    });


    $(".has_children").click(function () {
        if ($(this).hasClass('active')) {
            $(this).removeClass('active');
            $(this).next('.mobile_children').hide(100);
        } else {
            $(this).addClass('active');
            $(this).next('.mobile_children').show(100);
        }
    });

    $('.product_count').bind("change keyup input click", function () {
        if (this.value.match(/[^0-9]/g)) {
            this.value = this.value.replace(/[^0-9]/g, '');
        }
    });
};



/*
Temporary disabled

document.addEventListener('touchstart', handleTouchStart, false);
document.addEventListener('touchmove', handleTouchMove, false);

var xDown = null;                                                        
var yDown = null;                                                        

function handleTouchStart(evt) {                                         
    xDown = evt.touches[0].clientX;                                      
    yDown = evt.touches[0].clientY;                                      
};                                                

function handleTouchMove(evt) {
    if ( ! xDown || ! yDown ) {
        return;
    }

    var xUp = evt.touches[0].clientX;                                    
    var yUp = evt.touches[0].clientY;

    var xDiff = xDown - xUp;
    var yDiff = yDown - yUp;
 
    if ( Math.abs( xDiff ) > Math.abs( yDiff ) ) {
        if ( xDiff > 0 ) {
    		if ( $("#slide-menu").hasClass('active') && !$('.mymodal').hasClass('active') ) {
		        $(".site_container").removeClass('active');
				$("#slide-menu").removeClass('active');
				$(".menu_mobile").removeClass('active');
				$("body").removeClass('active');
				$('.site_container_outer').hide(100);
		    }
        } else {
        	if ( !$("#slide-menu").hasClass('active') && !$('.mymodal').hasClass('active') ) {
		        $(".menu_mobile").addClass('active');
				$(".site_container").addClass('active');
				$("#slide-menu").addClass('active');
				$("body").addClass('active');
				$('.site_container_outer').show(100);
		    }
        }                       
    } else {
        if ( yDiff > 0 ) {
            
        } else { 
            
        }                                                                 
    }
    xDown = null;
    yDown = null;                                             
};
*/