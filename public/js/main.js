document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // 1. NAVBAR SCROLL & SMART HIDE/SHOW EFFECT
  // ==========================================
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateNavbar = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY;
      const drawerOpen = document.querySelector('.mobile-nav.open');

      if (currentY > 60) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
        navbar.classList.remove('nav-hidden');
      }

      if (!drawerOpen) {
        if (currentY > 95 && delta > 6) {
          navbar.classList.add('nav-hidden');
        } else if (delta < -4 || currentY <= 70) {
          navbar.classList.remove('nav-hidden');
        }
      }

      lastScrollY = Math.max(0, currentY);
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateNavbar);
        ticking = true;
      }
    }, { passive: true });
    updateNavbar();
  }

  // ==========================================
  // 1B. PRELOADING SHIMMER SKELETON FOR IMAGES
  // ==========================================
  const allImages = document.querySelectorAll('img:not(.footer-logo-img)');
  allImages.forEach((img) => {
    const parent = img.parentElement;
    const markLoaded = () => {
      img.classList.remove('img-loading');
      img.classList.add('img-loaded');
      if (parent) parent.classList.remove('skeleton-box');
    };

    if (img.complete && img.naturalWidth > 0) {
      img.classList.add('img-loaded');
    } else {
      img.classList.add('img-loading');
      if (parent) parent.classList.add('skeleton-box');
      img.addEventListener('load', markLoaded, { once: true });
      img.addEventListener('error', markLoaded, { once: true });
    }
  });

  // ==========================================
  // 2. HAMBURGER MENU TOGGLE
  // ==========================================
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  const mobileNavClose = document.getElementById('mobileNavClose');
  
  function closeDrawer() {
    if (mobileNav) mobileNav.classList.remove('open');
    if (hamburger) hamburger.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open');
      if (mobileNav.classList.contains('open')) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  // Close when close button is clicked
  if (mobileNavClose) {
    mobileNavClose.addEventListener('click', closeDrawer);
  }

  // Close when clicking outside of the drawer contents (backdrop click)
  if (mobileNav) {
    const drawer = mobileNav.querySelector('.mobile-nav-drawer');
    mobileNav.addEventListener('click', (e) => {
      if (drawer && !drawer.contains(e.target)) {
        closeDrawer();
      }
    });
  }

  // Mobile dropdown triggers
  const mobileTriggers = document.querySelectorAll('.mobile-dropdown-toggle-btn');
  mobileTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const parentLi = trigger.closest('li');
      if (parentLi) {
        const menu = parentLi.querySelector('.mobile-dropdown-menu');
        if (menu) {
          menu.classList.toggle('open');
          trigger.classList.toggle('active');
        }
      }
    });
  });

  // ==========================================
  // 3. INTERSECTION OBSERVER SCROLL REVEALS
  // ==========================================
  const revealElements = document.querySelectorAll('.reveal');
  if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -50px 0px'
    });
    revealElements.forEach(el => revealObserver.observe(el));
  }

  // ==========================================
  // 4. STATS COUNTER ANIMATION
  // ==========================================
  const statNumbers = document.querySelectorAll('.stat-number');
  if (statNumbers.length > 0) {
    const countUp = (el) => {
      const target = parseInt(el.getAttribute('data-target'), 10);
      const suffix = el.getAttribute('data-suffix') || '';
      let count = 0;
      const duration = 2000; // 2 seconds
      const speed = duration / target;
      
      const updateCount = () => {
        const increment = Math.ceil(target / 50); // Divide work
        if (count < target) {
          count += increment;
          if (count > target) count = target;
          el.innerText = count + suffix;
          setTimeout(updateCount, 40);
        } else {
          el.innerText = target + suffix;
        }
      };
      updateCount();
    };

    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          countUp(entry.target);
          statsObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    statNumbers.forEach(num => statsObserver.observe(num));
  }

  // ==========================================
  // 5. FEATURED WORK CAROUSEL
  // ==========================================
  const carouselContainer = document.querySelector('.carousel-container');
  const prevBtn = document.querySelector('.carousel-prev');
  const nextBtn = document.querySelector('.carousel-next');
  if (carouselContainer && prevBtn && nextBtn) {
    let position = 0;
    
    const getSlideWidth = () => {
      const slide = carouselContainer.querySelector('.carousel-slide');
      if (!slide) return 0;
      const style = window.getComputedStyle(slide);
      const marginRight = parseInt(style.marginRight, 10) || 0;
      return slide.offsetWidth + marginRight;
    };

    const getMaxScroll = () => {
      const totalWidth = carouselContainer.scrollWidth;
      const viewportWidth = carouselContainer.parentElement.offsetWidth;
      return totalWidth - viewportWidth;
    };

    nextBtn.addEventListener('click', () => {
      const slideWidth = getSlideWidth();
      const maxScroll = getMaxScroll();
      position += slideWidth;
      if (position > maxScroll) position = maxScroll;
      carouselContainer.style.transform = `translateX(-${position}px)`;
    });

    prevBtn.addEventListener('click', () => {
      const slideWidth = getSlideWidth();
      position -= slideWidth;
      if (position < 0) position = 0;
      carouselContainer.style.transform = `translateX(-${position}px)`;
    });

    // Reset translation on resize to prevent breaking alignment
    window.addEventListener('resize', () => {
      position = 0;
      carouselContainer.style.transform = `translateX(0px)`;
    });

    // Touch swipe support for mobile
    let touchStartX = 0;
    let touchEndX = 0;
    const viewport = carouselContainer.parentElement;

    viewport.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    viewport.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 40) {
        if (diff > 0) {
          // Swipe left — go next
          const slideWidth = getSlideWidth();
          const maxScroll = getMaxScroll();
          position += slideWidth;
          if (position > maxScroll) position = maxScroll;
        } else {
          // Swipe right — go prev
          const slideWidth = getSlideWidth();
          position -= slideWidth;
          if (position < 0) position = 0;
        }
        carouselContainer.style.transform = `translateX(-${position}px)`;
      }
    }, { passive: true });
  }

  // ==========================================
  // 6. TESTIMONIAL AUTO-ROTATE SLIDER
  // ==========================================
  const testimonialSlides = document.querySelectorAll('.testimonial-slide');
  const dotsContainer = document.querySelector('.slider-dots');
  if (testimonialSlides.length > 0 && dotsContainer) {
    let currentSlide = 0;
    let timer = null;

    // Create dots
    testimonialSlides.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.classList.add('slider-dot');
      if (index === 0) dot.classList.add('active');
      dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
      dot.addEventListener('click', () => {
        goToSlide(index);
        resetTimer();
      });
      dotsContainer.appendChild(dot);
    });

    const dots = document.querySelectorAll('.slider-dot');

    const goToSlide = (n) => {
      testimonialSlides[currentSlide].classList.remove('active');
      dots[currentSlide].classList.remove('active');
      
      currentSlide = (n + testimonialSlides.length) % testimonialSlides.length;
      
      testimonialSlides[currentSlide].classList.add('active');
      dots[currentSlide].classList.add('active');
    };

    const nextSlide = () => {
      goToSlide(currentSlide + 1);
    };

    const startTimer = () => {
      timer = setInterval(nextSlide, 6000); // Rotate every 6 seconds
    };

    const resetTimer = () => {
      clearInterval(timer);
      startTimer();
    };

    startTimer();
  }

  // ==========================================
  // 7. VIDEO MODAL PLAYER
  // ==========================================
  const videoCards = document.querySelectorAll('.video-card-trigger');
  const videoModal = document.getElementById('videoModal');
  const videoPlayerContainer = document.getElementById('videoPlayerContainer');
  const modalClose = document.querySelector('.modal-close');

  if (videoCards.length > 0 && videoModal && videoPlayerContainer && modalClose) {
    videoCards.forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const ytUrl = card.getAttribute('data-youtube-url');
        const fileUrl = card.getAttribute('data-video-url');
        
        videoPlayerContainer.innerHTML = ''; // Clear previous content

        if (ytUrl) {
          // Extract YouTube Video ID
          const ytMatch = ytUrl.match(/(?:v=|youtu\.be\/|embed\/)([^&\s?]+)/);
          const ytId = ytMatch ? ytMatch[1] : null;
          if (ytId) {
            videoPlayerContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
          } else {
            videoPlayerContainer.innerHTML = `<div style="color:white; display:flex; align-items:center; justify-content:center; height:100%; font-family:sans-serif;">Invalid YouTube URL</div>`;
          }
        } else if (fileUrl) {
          videoPlayerContainer.innerHTML = `<video src="${fileUrl}" controls autoplay></video>`;
        }

        videoModal.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    });

    const closeModal = () => {
      videoModal.classList.remove('active');
      videoPlayerContainer.innerHTML = ''; // Stop video playback
      document.body.style.overflow = '';
    };

    modalClose.addEventListener('click', closeModal);
    videoModal.addEventListener('click', (e) => {
      if (e.target === videoModal) closeModal();
    });
  }

  // ==========================================
  // 8. PHOTO & ALBUM STACK LIGHTBOX WITH THUMBNAIL STRIP
  // ==========================================
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxCounter = document.getElementById('lightboxCounter');
  const lightboxThumbs = document.getElementById('lightboxThumbs');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  const lightboxClose = document.getElementById('lightboxClose');

  if (lightboxModal && lightboxImg && lightboxClose) {
    let currentPhotoIndex = 0;
    let activePhotoList = [];

    const renderThumbs = () => {
      if (!lightboxThumbs) return;
      lightboxThumbs.innerHTML = '';
      if (activePhotoList.length <= 1) {
        lightboxThumbs.style.display = 'none';
        return;
      }
      lightboxThumbs.style.display = 'flex';
      activePhotoList.forEach((p, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lightbox-thumb-btn' + (idx === currentPhotoIndex ? ' active' : '');
        const im = document.createElement('img');
        im.src = p.src;
        im.alt = `Photo ${idx + 1}`;
        btn.appendChild(im);
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          currentPhotoIndex = idx;
          updateLightboxContent();
        });
        lightboxThumbs.appendChild(btn);
      });
    };

    const updateLightboxContent = () => {
      const currentPhoto = activePhotoList[currentPhotoIndex];
      if (!currentPhoto) return;
      lightboxImg.src = currentPhoto.src;
      if (lightboxCaption) {
        lightboxCaption.innerText = currentPhoto.title || 'Taj Studio Photography';
      }
      if (lightboxCounter) {
        lightboxCounter.innerText = activePhotoList.length > 1
          ? `${currentPhotoIndex + 1} / ${activePhotoList.length}`
          : '';
        lightboxCounter.style.display = activePhotoList.length > 1 ? 'inline-block' : 'none';
      }
      if (lightboxThumbs) {
        const btns = lightboxThumbs.querySelectorAll('.lightbox-thumb-btn');
        btns.forEach((b, i) => b.classList.toggle('active', i === currentPhotoIndex));
      }
    };

    const openLightboxWithList = (list, startIndex = 0) => {
      activePhotoList = list;
      currentPhotoIndex = startIndex;
      renderThumbs();
      updateLightboxContent();
      lightboxModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    // Delegate click on any .photo-item-trigger (supports stacks & single photos)
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('.photo-item-trigger');
      if (!trigger) return;
      e.preventDefault();

      const title = trigger.getAttribute('data-title') || 'Taj Studio Photography';
      const rawStack = trigger.getAttribute('data-stack');
      if (rawStack) {
        try {
          const urls = JSON.parse(rawStack);
          if (Array.isArray(urls) && urls.length > 0) {
            const list = urls.map((u, i) => ({
              src: u,
              title: urls.length > 1 ? `${title} — Photo ${i + 1} of ${urls.length}` : title
            }));
            openLightboxWithList(list, 0);
            return;
          }
        } catch (_) {}
      }

      // Fallback: collect all single .photo-item-trigger elements on page
      const allTriggers = Array.from(document.querySelectorAll('.photo-item-trigger'));
      const list = allTriggers.map((el) => ({
        src: el.getAttribute('data-src') || (el.querySelector('img') ? el.querySelector('img').getAttribute('src') : ''),
        title: el.getAttribute('data-title') || 'Taj Studio Photography'
      }));
      const idx = Math.max(0, allTriggers.indexOf(trigger));
      openLightboxWithList(list, idx);
    });

    const showNextPhoto = () => {
      if (!activePhotoList.length) return;
      currentPhotoIndex = (currentPhotoIndex + 1) % activePhotoList.length;
      updateLightboxContent();
    };

    const showPrevPhoto = () => {
      if (!activePhotoList.length) return;
      currentPhotoIndex = (currentPhotoIndex - 1 + activePhotoList.length) % activePhotoList.length;
      updateLightboxContent();
    };

    if (lightboxNext) lightboxNext.addEventListener('click', showNextPhoto);
    if (lightboxPrev) lightboxPrev.addEventListener('click', showPrevPhoto);

    const closeLightbox = () => {
      lightboxModal.classList.remove('active');
      document.body.style.overflow = '';
    };

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal || e.target.classList.contains('lightbox-container') || e.target.classList.contains('lightbox-img-wrapper')) {
        closeLightbox();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (lightboxModal.classList.contains('active')) {
        if (e.key === 'ArrowRight') showNextPhoto();
        if (e.key === 'ArrowLeft') showPrevPhoto();
        if (e.key === 'Escape') closeLightbox();
      }
    });

    let touchStartX = 0;
    let touchEndX = 0;
    lightboxModal.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    lightboxModal.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      if (touchEndX < touchStartX - 50) showNextPhoto();
      if (touchEndX > touchStartX + 50) showPrevPhoto();
    }, { passive: true });
  }

  // ==========================================
  // 9. CONTACT FORM CLIENT-SIDE VALIDATION
  // ==========================================
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      let isValid = true;
      const name = document.getElementById('name');
      const email = document.getElementById('email');
      const phone = document.getElementById('phone');
      
      // Basic resets
      [name, email, phone].forEach(el => {
        if (el) el.style.borderColor = '';
      });

      if (name && name.value.trim() === '') {
        name.style.borderColor = 'var(--danger)';
        isValid = false;
      }

      if (email && email.value.trim() === '') {
        email.style.borderColor = 'var(--danger)';
        isValid = false;
      } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        email.style.borderColor = 'var(--danger)';
        isValid = false;
      }

      if (phone && phone.value.trim() === '') {
        phone.style.borderColor = 'var(--danger)';
        isValid = false;
      }

      if (!isValid) {
        e.preventDefault();
        alert('Please fill out all required fields correctly.');
      }
    });
  }

  // ==========================================
  // 10. ADMIN: VIDEO TYPE TOGGLE
  // ==========================================
  const youtubeRadio = document.getElementById('video_type_youtube');
  const uploadRadio = document.getElementById('video_type_upload');
  const youtubeGroup = document.getElementById('youtube_url_group');
  const uploadGroup = document.getElementById('upload_files_group');

  if (youtubeRadio && uploadRadio && youtubeGroup && uploadGroup) {
    const toggleFields = () => {
      if (youtubeRadio.checked) {
        youtubeGroup.classList.remove('hidden');
        uploadGroup.classList.add('hidden');
        // Require youtube url input, un-require upload inputs
        const ytInput = youtubeGroup.querySelector('input');
        if (ytInput) ytInput.required = true;
        const uploadInputs = uploadGroup.querySelectorAll('input');
        uploadInputs.forEach(input => input.required = false);
      } else {
        youtubeGroup.classList.add('hidden');
        uploadGroup.classList.remove('hidden');
        // Require video file upload, un-require youtube input
        const ytInput = youtubeGroup.querySelector('input');
        if (ytInput) ytInput.required = false;
        const videoInput = document.getElementById('video_file');
        if (videoInput) videoInput.required = true;
      }
    };

    youtubeRadio.addEventListener('change', toggleFields);
    uploadRadio.addEventListener('change', toggleFields);
    toggleFields(); // Init on load
  }

  // ==========================================
  // 11. ADMIN: DELETE CONFIRMATION
  // ==========================================
  const deleteForms = document.querySelectorAll('.admin-delete-form');
  deleteForms.forEach(form => {
    form.addEventListener('submit', (e) => {
      const confirmDelete = confirm('Are you absolutely sure you want to delete this item? This action is permanent.');
      if (!confirmDelete) {
        e.preventDefault();
      }
    });
  });

  // ==========================================
  // 12. ALERT AUTO-CLOSE
  // ==========================================
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(alert => {
    const closeBtn = alert.querySelector('.alert-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 400);
      });
    }
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (alert.parentElement) {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 400);
      }
    }, 5000);
  });

  // ==========================================
  // 13. HERO AUTOMATIC/MANUAL SLIDER
  // ==========================================
  const heroSliderSection = document.querySelector('.hero-slider-section');
  if (heroSliderSection) {
    const slides = heroSliderSection.querySelectorAll('.hero-slide');
    const prevBtn = heroSliderSection.querySelector('.hero-ctrl-btn.prev');
    const nextBtn = heroSliderSection.querySelector('.hero-ctrl-btn.next');
    const dots = heroSliderSection.querySelectorAll('.hero-dot');
    
    // Read dynamic duration from attributes
    const duration = parseInt(heroSliderSection.getAttribute('data-autoplay-duration')) || 5000;
    
    let currentIndex = 0;
    let autoplayInterval;
    
    const showSlide = (index) => {
      slides[currentIndex].classList.remove('active');
      if (dots.length > 0) dots[currentIndex].classList.remove('active');
      
      currentIndex = (index + slides.length) % slides.length;
      
      slides[currentIndex].classList.add('active');
      if (dots.length > 0) dots[currentIndex].classList.add('active');
      
      // Re-run GSAP word animations on active slide words
      const words = slides[currentIndex].querySelectorAll('.word');
      if (typeof gsap !== 'undefined' && words.length > 0) {
        gsap.killTweensOf(words);
        gsap.fromTo(words, 
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
        );
      }
    };
    
    const startAutoplay = () => {
      stopAutoplay();
      autoplayInterval = setInterval(() => {
        showSlide(currentIndex + 1);
      }, duration);
    };
    
    const stopAutoplay = () => {
      if (autoplayInterval) clearInterval(autoplayInterval);
    };
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        showSlide(currentIndex + 1);
        startAutoplay();
      });
    }
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        showSlide(currentIndex - 1);
        startAutoplay();
      });
    }
    
    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        showSlide(index);
        startAutoplay();
      });
    });
    
    if (slides.length > 1) {
      startAutoplay();

      // Touch swipe support for mobile
      let touchStartX = 0;
      let touchEndX = 0;

      heroSliderSection.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      heroSliderSection.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) { // Min swipe distance
          if (diff > 0) {
            showSlide(currentIndex + 1); // Swipe left = next
          } else {
            showSlide(currentIndex - 1); // Swipe right = prev
          }
          startAutoplay();
        }
      }, { passive: true });
    }
  }

  // ==========================================
  // 14. UGC REELS CONTINUOUS SLIDER + LEFT/RIGHT END BUTTONS
  // ==========================================
  const ugcViewport = document.querySelector('.ugc-carousel-viewport');
  const ugcContainer = document.querySelector('.ugc-carousel-container');
  const ugcPrevBtn = document.querySelector('.ugc-prev');
  const ugcNextBtn = document.querySelector('.ugc-next');

  if (ugcViewport && ugcContainer) {
    const origSlides = Array.from(ugcContainer.querySelectorAll('.ugc-slide'));
    if (origSlides.length > 0) {
      // Clone once for seamless infinite continuous loop
      origSlides.forEach((slide) => {
        const clone = slide.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        ugcContainer.appendChild(clone);
      });

      let scrollPos = ugcViewport.scrollLeft || 0;
      let isPaused = false;
      let resumeTimeout = null;
      const speed = 0.7; // smooth continuous glide

      const stepLoop = () => {
        if (!isPaused) {
          scrollPos += speed;
          const halfWidth = ugcContainer.scrollWidth / 2;
          if (halfWidth > 0 && scrollPos >= halfWidth) {
            scrollPos -= halfWidth;
          }
          ugcViewport.scrollLeft = scrollPos;
        } else {
          scrollPos = ugcViewport.scrollLeft;
        }
        requestAnimationFrame(stepLoop);
      };
      requestAnimationFrame(stepLoop);

      const pauseTemporarily = (ms = 2200) => {
        isPaused = true;
        if (resumeTimeout) clearTimeout(resumeTimeout);
        resumeTimeout = setTimeout(() => {
          scrollPos = ugcViewport.scrollLeft;
          isPaused = false;
        }, ms);
      };

      ugcViewport.addEventListener('mouseenter', () => { isPaused = true; });
      ugcViewport.addEventListener('mouseleave', () => {
        scrollPos = ugcViewport.scrollLeft;
        isPaused = false;
      });
      ugcViewport.addEventListener('touchstart', () => { isPaused = true; }, { passive: true });
      ugcViewport.addEventListener('touchend', () => pauseTemporarily(2500), { passive: true });

      const getStepWidth = () => {
        const slide = ugcContainer.querySelector('.ugc-slide');
        if (!slide) return 240;
        const gap = parseFloat(window.getComputedStyle(ugcContainer).gap || '20') || 20;
        return slide.offsetWidth + gap;
      };

      if (ugcNextBtn) {
        ugcNextBtn.addEventListener('click', () => {
          pauseTemporarily(1800);
          const step = getStepWidth();
          const halfWidth = ugcContainer.scrollWidth / 2;
          let target = ugcViewport.scrollLeft + step;
          if (halfWidth > 0 && target >= halfWidth) {
            ugcViewport.scrollLeft -= halfWidth;
            target -= halfWidth;
          }
          ugcViewport.scrollTo({ left: target, behavior: 'smooth' });
        });
      }

      if (ugcPrevBtn) {
        ugcPrevBtn.addEventListener('click', () => {
          pauseTemporarily(1800);
          const step = getStepWidth();
          const halfWidth = ugcContainer.scrollWidth / 2;
          if (ugcViewport.scrollLeft <= 10 && halfWidth > 0) {
            ugcViewport.scrollLeft += halfWidth;
          }
          const target = Math.max(0, ugcViewport.scrollLeft - step);
          ugcViewport.scrollTo({ left: target, behavior: 'smooth' });
        });
      }
    }
  }

  // ==========================================
  // 15. 21ST.DEV INTERACTIVE ACCORDION, SPOTLIGHT & MAGNETIC UI
  // ==========================================
  const accPanels = document.querySelectorAll('.t21-acc-panel');
  accPanels.forEach((panel) => {
    panel.addEventListener('mouseenter', () => {
      accPanels.forEach((p) => p.classList.remove('active'));
      panel.classList.add('active');
    });
  });

  const spotlightCards = document.querySelectorAll('.t21-spotlight-card');
  spotlightCards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--my', `${e.clientY - rect.top}px`);
    });
  });

  const magneticBtns = document.querySelectorAll('.t21-magnetic');
  magneticBtns.forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.18;
      const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.22;
      btn.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });

  // Smart Viewport Auto-Preview for Video Cards (plays only when visible, avoids black boxes)
  const previewVideos = document.querySelectorAll('.ugc-video-preview, .carousel-video-preview');
  if (previewVideos.length > 0 && 'IntersectionObserver' in window) {
    const vidObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const vid = entry.target;
        if (entry.isIntersecting) {
          vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      });
    }, { threshold: 0.25 });

    previewVideos.forEach((v) => vidObserver.observe(v));
  }
});
