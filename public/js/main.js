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
  // 8. PHOTO LIGHTBOX WITH NAVIGATION
  // ==========================================
  const photoItems = document.querySelectorAll('.photo-item-trigger');
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  const lightboxClose = document.getElementById('lightboxClose');

  if (photoItems.length > 0 && lightboxModal && lightboxImg && lightboxClose) {
    let currentPhotoIndex = 0;
    const photoList = [];

    // Collect all photos in this gallery
    photoItems.forEach((item, index) => {
      photoList.push({
        src: item.getAttribute('data-src') || item.querySelector('img').getAttribute('src'),
        title: item.getAttribute('data-title') || ''
      });

      item.addEventListener('click', (e) => {
        e.preventDefault();
        currentPhotoIndex = index;
        openLightbox();
      });
    });

    const openLightbox = () => {
      updateLightboxContent();
      lightboxModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    const updateLightboxContent = () => {
      const currentPhoto = photoList[currentPhotoIndex];
      lightboxImg.src = currentPhoto.src;
      if (lightboxCaption) {
        lightboxCaption.innerText = currentPhoto.title || 'Taj Studio Photography';
      }
    };

    const showNextPhoto = () => {
      currentPhotoIndex = (currentPhotoIndex + 1) % photoList.length;
      updateLightboxContent();
    };

    const showPrevPhoto = () => {
      currentPhotoIndex = (currentPhotoIndex - 1 + photoList.length) % photoList.length;
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

    // Keyboard Navigation
    document.addEventListener('keydown', (e) => {
      if (lightboxModal.classList.contains('active')) {
        if (e.key === 'ArrowRight') showNextPhoto();
        if (e.key === 'ArrowLeft') showPrevPhoto();
        if (e.key === 'Escape') closeLightbox();
      }
    });

    // Touch Swipe Support
    let touchStartX = 0;
    let touchEndX = 0;
    
    lightboxModal.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightboxModal.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });

    const handleSwipe = () => {
      if (touchEndX < touchStartX - 50) {
        showNextPhoto(); // Swipe left
      }
      if (touchEndX > touchStartX + 50) {
        showPrevPhoto(); // Swipe right
      }
    };
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
  // 14. UGC REELS CAROUSEL AUTOMATIC SEAMLESS SCROLL
  // ==========================================
  const ugcViewport = document.querySelector('.ugc-carousel-viewport');
  const ugcContainer = document.querySelector('.ugc-carousel-container');
  const ugcPrevBtn = document.querySelector('.ugc-prev');
  const ugcNextBtn = document.querySelector('.ugc-next');
  
  if (ugcViewport && ugcContainer) {
    const duration = parseInt(ugcViewport.getAttribute('data-autoplay-speed')) || 4000;
    
    // Duplicate slides dynamically in JS for endless seamless scroll
    const slides = Array.from(ugcContainer.querySelectorAll('.ugc-slide'));
    if (slides.length > 0) {
      // Clone them once to make it seamless
      slides.forEach(slide => {
        const clone = slide.cloneNode(true);
        ugcContainer.appendChild(clone);
      });
      
      // Calculate speed based on setting duration: 
      // If duration is 4000ms, speed = 1000/4000 = 0.25 pixels per frame (~15px/sec)
      let speed = 1000 / duration; 
      if (speed <= 0 || isNaN(speed)) speed = 0.5;
      
      let scrollPos = 0;
      let isHovered = false;
      let animFrameId;
      
      const tick = () => {
        if (!isHovered) {
          scrollPos += speed;
          
          // Half width is the exact original width of the slides
          const originalWidth = ugcContainer.scrollWidth / 2;
          
          if (scrollPos >= originalWidth) {
            scrollPos = 0; // Wrap around instantly (invisible snap)
          }
          ugcViewport.scrollLeft = scrollPos;
        }
        animFrameId = requestAnimationFrame(tick);
      };
      
      // Start loop
      tick();
      
      // Hover bindings to pause marquee on hover
      const pauseMarquee = () => { isHovered = true; };
      const resumeMarquee = () => { isHovered = false; };
      
      ugcViewport.addEventListener('mouseenter', pauseMarquee);
      ugcViewport.addEventListener('mouseleave', resumeMarquee);
      ugcViewport.addEventListener('mouseover', pauseMarquee);
      ugcViewport.addEventListener('mouseout', resumeMarquee);
      
      // Manual Next/Prev click updates position smoothly
      const getSlideWidth = () => {
        const slide = ugcContainer.querySelector('.ugc-slide');
        if (!slide) return 320;
        const style = window.getComputedStyle(slide);
        const marginRight = parseInt(style.marginRight, 10) || 0;
        return slide.offsetWidth + marginRight;
      };
      
      if (ugcNextBtn) {
        ugcNextBtn.addEventListener('click', () => {
          const slideWidth = getSlideWidth();
          scrollPos += slideWidth;
          const originalWidth = ugcContainer.scrollWidth / 2;
          if (scrollPos >= originalWidth) {
            scrollPos -= originalWidth;
          }
          ugcViewport.scrollLeft = scrollPos;
        });
      }
      
      if (ugcPrevBtn) {
        ugcPrevBtn.addEventListener('click', () => {
          const slideWidth = getSlideWidth();
          scrollPos -= slideWidth;
          if (scrollPos < 0) {
            const originalWidth = ugcContainer.scrollWidth / 2;
            scrollPos += originalWidth;
          }
          ugcViewport.scrollLeft = scrollPos;
        });
      }
      
      window.addEventListener('resize', () => {
        scrollPos = 0;
        ugcViewport.scrollLeft = 0;
      });
    }
  }
});
