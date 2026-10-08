(function ($) {
    "use strict";
   /*======================================
   Data Css js
   ========================================*/
    $("[data-background]").each(function() {
        $(this).css(
            "background-image",
            "url( " + $(this).attr("data-background") + "  )"
        );
    });

    class GSAPAnimation {
        static Init() {
            /*title-animation*/
            $('.title-animation').length && this.sectionTitleAnimation('.title-animation'); 
        }
        
        static sectionTitleAnimation(activeClass) {
            let sectionTitleLines = gsap.utils.toArray(activeClass);

            sectionTitleLines.forEach(sectionTextLine => {
                const tl = gsap.timeline({
                    scrollTrigger: {
                        trigger: sectionTextLine,
                        start: 'top 90%',
                        end: 'bottom 60%',
                        scrub: false,
                        markers: false,
                        toggleActions: 'play none none none'
                    }
                });

                const itemSplitted = new SplitText(sectionTextLine, { type: "chars, words" });
                gsap.set(sectionTextLine, { perspective: 100 });
                itemSplitted.split({ type: "words" })
                tl.from(itemSplitted.words, {
                    opacity: 0, 
                    autoAlpha: 0, 
                    transformOrigin: "top center -50",
                    y: "10px",
                    duration: 0.9,
                    stagger: 0.1,
                    ease: "power2.out",
                });
            });
        }
    }

    class RRDEVS {
        static LoadedAfter() {
            $(".odometer").waypoint(
                function () {
                    var element = $(this.element);
                    var countNumber = element.attr("data-count");
                    setTimeout(function() {
                        element.html(countNumber);
                    }, 1000); // 1000 milliseconds delay (1 second)
                },
                {
                    offset: "100%",
                    triggerOnce: true,
                }
            );

            /*GSAPAnimation*/
            GSAPAnimation.Init();
        }
    }

    $(window).on('load', RRDEVS.LoadedAfter);

    window.addEventListener('resize', function() {
        gsap.globalTimeline.clear();
    });

    /*======================================
      Home Hero Animation
      ========================================*/
    (function () {
        const hero = document.querySelector(".home-hero");
        if (!hero) return;

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        // After 3s the CSS fallback has already shown the hero, so don't hide it again
        if (reduceMotion || performance.now() > 3000 || typeof gsap === "undefined" || typeof SplitText === "undefined") {
            hero.classList.add("is-ready", "is-animated");
            return;
        }

        const title = new SplitText(hero.querySelector(".home-hero__title"), { type: "words" });
        const text = new SplitText(hero.querySelector(".home-hero__text"), { type: "words" });
        title.words.forEach(function (word) {
            const mask = document.createElement("div");
            mask.className = "home-hero__mask";
            word.parentNode.insertBefore(mask, word);
            mask.appendChild(word);
        });
        hero.classList.add("is-ready");

        const tl = gsap.timeline({ defaults: { ease: "power3.out" }, onComplete: finish });
        tl.from(title.words, { yPercent: 115, duration: 0.9, stagger: 0.07, ease: "power4.out" })
            .from(text.words, { y: 14, opacity: 0, duration: 0.6, stagger: 0.025 }, 0.4)
            .from(".home-hero__actions .rr-btn", { y: 24, opacity: 0, duration: 0.6, stagger: 0.12 }, 0.8)
            .from(".home-hero__media", { scale: 0.92, opacity: 0, duration: 1 }, 0.2)
            .from(".home-hero__media img", { y: 50, opacity: 0, duration: 1.1 }, 0.45)
            .from(".home-hero__stats", { y: 40, opacity: 0, duration: 0.8 }, 0.9)
            .from(".home-hero__stat", { y: 16, opacity: 0, duration: 0.5, stagger: 0.1 }, 1.1)
            .from(".home-hero__stat-icon", { scale: 0.4, opacity: 0, duration: 0.6, stagger: 0.1, ease: "back.out(2)" }, 1.15);

        // Restores the original markup and hands hover/idle motion back to CSS
        function finish() {
            if (hero.classList.contains("is-animated")) return;
            tl.kill();
            title.revert();
            text.revert();
            gsap.set(".home-hero__actions .rr-btn, .home-hero__media, .home-hero__media img, .home-hero__stats, .home-hero__stat, .home-hero__stat-icon", { clearProps: "all" });
            hero.classList.add("is-animated");
            // Counter trigger points were measured while the strip was still offset
            if (typeof Waypoint !== "undefined") Waypoint.refreshAll();
        }
        window.addEventListener("resize", finish);
    })();

    /*======================================
      Home Services Reveal
      ========================================*/
    (function () {
        const grid = document.querySelector(".home-services__grid");
        if (!grid || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        grid.classList.add("is-waiting");
        new IntersectionObserver(function (entries, observer) {
            if (!entries[0].isIntersecting) return;
            grid.classList.replace("is-waiting", "is-inview");
            observer.disconnect();
        }, { threshold: 0.12 }).observe(grid);
    })();

    /*======================================
      Mobile Menu Js
      ========================================*/
    $("#mobile-menu").meanmenu({
        meanMenuContainer: ".mobile-menu",
        meanScreenWidth: "1199",
        meanExpand: ['<i class="fa-regular fa-angle-right"></i>'],
    });

    /*======================================
      Sidebar Toggle
      ========================================*/
    $(".offcanvas__close,.offcanvas__overlay").on("click", function () {
        $(".offcanvas__area").removeClass("info-open");
        $(".offcanvas__overlay").removeClass("overlay-open");
    });
    // Scroll to bottom then close navbar
    $(window).scroll(function(){
        if($("body").scrollTop() > 0 || $("html").scrollTop() > 0) {
            $(".offcanvas__area").removeClass("info-open");
            $(".offcanvas__overlay").removeClass("overlay-open");
        }
    });
    $(".sidebar__toggle").on("click", function () {
        $(".offcanvas__area").addClass("info-open");
        $(".offcanvas__overlay").addClass("overlay-open");
    });

    /*======================================
      Sticky Header Js
      ========================================*/
    $(window).scroll(function () {
        if ($(this).scrollTop() > 10) {
            $("#header-sticky").addClass("rr-sticky");
        } else {
            $("#header-sticky").removeClass("rr-sticky");
        }
    });

    /*======================================
      MagnificPopup video view
      ========================================*/
    $(".popup-video").magnificPopup({
        type: "iframe",
    });

    /*client-testimonial__slider***/
    let clienttestimonial__slider = new Swiper(".client-testimonial__slider", {
        slidesPerView: 2,
        spaceBetween: 30,
        loop: true,
        clickable: true,
        autoplay: {
            delay: 3000,
        },
         // Responsive breakpoints
        breakpoints: {
            1200: {
                slidesPerView: 2,
            },
            768: {
                slidesPerView: 2,
            },
            0: {
                slidesPerView: 1,
            },
        },
    });

    /*doctor__slider***/
    let doctor__slider = new Swiper(".doctor__slider", {
        slidesPerView: 1,
        spaceBetween: 30,
        loop: true,
        clickable: true,
        pagination: {
            el: ".doctor__slider-dot",
            clickable: true,
        },
        autoplay: {
            delay: 3000,
        },
        breakpoints: {
            1200: {
                slidesPerView: 3,
            },
            768: {
                slidesPerView: 2,
            },
            0: {
                slidesPerView: 1,
            },
        },
    });

    $('.pricing-appointment__form-select select').niceSelect();
    $( "#datepicker" ).datepicker({
        dateFormat: "yy/mm/dd"
    });

    /* Popular Causes Progress Bar ***/
    if ($(".count-bar").length) {
        $(".count-bar").appear(
            function() {
                var el = $(this);
                var percent = el.data("percent");
                $(el).css("width", percent).addClass("counted");
            }, {
                accY: -50
            }
        );
    }

})(jQuery);

$(document).on('mouseover','.footer__cta-item',function() {
    $(this).addClass('feature-card-active');
    $('.footer__cta-item').removeClass('feature-card-active');
    $(this).addClass('feature-card-active');
});