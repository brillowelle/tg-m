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
      Smooth Scrolling
      ========================================*/
    (function () {
        // Wheel and keyboard scrolling are eased; touch scrolling stays native
        if (typeof Lenis === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        const lenis = new Lenis({ autoRaf: true, lerp: 0.1, allowNestedScroll: true });
        if (typeof ScrollTrigger !== "undefined") lenis.on("scroll", ScrollTrigger.update);
        window.lenis = lenis;

        // Same-page links glide to their target; scroll-margin-top on the target sets the gap under the header
        document.addEventListener("click", function (event) {
            const link = event.target.closest("a[href*='#']");
            if (!link || event.defaultPrevented || link.target === "_blank") return;
            if (link.pathname !== location.pathname || link.search !== location.search || link.hash.length < 2) return;

            const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
            if (!target) return;
            event.preventDefault();
            lenis.scrollTo(target);
            history.pushState(null, "", link.hash);
        });
    })();

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
      Home Sections Reveal
      ========================================*/
    (function () {
        if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        document.querySelectorAll(".home-services__grid, .home-why__list, .home-team__grid, .home-tech__grid, .svc-symptoms, .svc-steps, .svc-features").forEach(function (grid) {
            grid.classList.add("is-waiting");
            new IntersectionObserver(function (entries, observer) {
                if (!entries[0].isIntersecting) return;
                grid.classList.replace("is-waiting", "is-inview");
                observer.disconnect();
            }, { threshold: 0.12 }).observe(grid);
        });
    })();

    /*======================================
      Service Detail: Section Rail
      ========================================*/
    (function () {
        const rail = document.querySelector(".svc-rail");
        if (!rail) return;

        const links = Array.from(rail.querySelectorAll("a[href^='#']"));
        const sections = links.map(function (link) { return document.querySelector(link.getAttribute("href")); });
        let current = null;

        function update() {
            // The active section is the last one whose top has passed a line below the sticky header
            const line = window.innerHeight * 0.3;
            let index = 0;
            sections.forEach(function (section, i) {
                if (section && section.getBoundingClientRect().top <= line) index = i;
            });
            // The last section is short, so mark it once the page bottom is reached
            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) index = sections.length - 1;
            if (links[index] === current) return;
            if (current) current.classList.remove("is-active");
            current = links[index];
            current.classList.add("is-active");
            // On small screens the rail scrolls sideways, so keep the active chip in view
            const list = current.closest("ol");
            if (list.scrollWidth > list.clientWidth) current.scrollIntoView({ block: "nearest", inline: "center" });
        }

        let ticking = false;
        window.addEventListener("scroll", function () {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function () { update(); ticking = false; });
        }, { passive: true });
        update();
    })();

    /*======================================
      Service Detail: Vision Simulator
      ========================================*/
    (function () {
        document.querySelectorAll(".svc-sim").forEach(function (sim) {
            const range = sim.querySelector(".svc-sim__range");
            range.addEventListener("input", function () {
                sim.classList.remove("is-hinting");
                sim.style.setProperty("--pos", range.value + "%");
            });

            // One sweep when the simulator first appears, to show that it can be dragged
            if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
            new IntersectionObserver(function (entries, observer) {
                if (!entries[0].isIntersecting) return;
                sim.classList.add("is-hinting");
                sim.addEventListener("animationend", function () { sim.classList.remove("is-hinting"); }, { once: true });
                observer.disconnect();
            }, { threshold: 0.6 }).observe(sim);
        });
    })();

    /*======================================
      FAQ Shortcuts
      ========================================*/
    document.querySelectorAll("[data-faq-open]").forEach(function (link) {
        link.addEventListener("click", function (event) {
            const answer = document.querySelector(link.getAttribute("href"));
            if (!answer || typeof bootstrap === "undefined") return;

            event.preventDefault();
            bootstrap.Collapse.getOrCreateInstance(answer, { toggle: false }).show();
            const item = answer.closest(".home-faq__item");
            if (window.lenis) window.lenis.scrollTo(item);
            else item.scrollIntoView({ block: "start" });
        });
    });

    /*======================================
      Footer Pointer Light
      ========================================*/
    (function () {
        const footer = document.querySelector(".footer-3__area-common");
        if (!footer || !window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        const light = document.createElement("span");
        light.className = "footer-fx";
        light.setAttribute("aria-hidden", "true");
        footer.prepend(light);

        let frame = 0;
        footer.addEventListener("pointermove", function (event) {
            if (frame) return;
            frame = requestAnimationFrame(function () {
                frame = 0;
                const box = footer.getBoundingClientRect();
                const x = event.clientX - box.left;
                const y = event.clientY - box.top;
                footer.style.setProperty("--fx-x", x + "px");
                footer.style.setProperty("--fx-y", y + "px");
                footer.classList.add("is-lit");
            });
        });
        footer.addEventListener("pointerleave", function () {
            footer.classList.remove("is-lit");
        });
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
    document.querySelectorAll(".client-testimonial__slider").forEach(function (slider) {
        new Swiper(slider, {
            slidesPerView: 2,
            spaceBetween: 30,
            loop: true,
            pagination: {
                // dots only where the section is styled for them
                el: slider.closest(".home-reviews") ? slider.querySelector(".client-testimonial__slider-dot") : null,
                clickable: true,
            },
            autoplay: {
                delay: 3000,
            },
             // Responsive breakpoints
            breakpoints: {
                1200: {
                    slidesPerView: Number(slider.dataset.perView) || 2,
                },
                768: {
                    slidesPerView: 2,
                },
                0: {
                    slidesPerView: 1,
                },
            },
        });
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