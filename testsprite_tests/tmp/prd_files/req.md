I am facing a critical performance anomaly on the Course Page (M101) and all other courses .

The Symptoms:

    Device Discrepancy: When I simulate Mobile Mode, the site is smooth. However, on Desktop/PC View, the video playback lags significantly, and the UI becomes unresponsive.

    Animation Quality: The current animations are visually poor and very laggy (low FPS/choppy). They look unprofessional and heavy.

Task 1: Investigate Desktop Rendering Overload
The fact that it works on Mobile but dies on PC suggests we are rendering too many heavy elements simultaneously on the large screen.

    Audit the Video Player List: Are we eagerly mounting <iframe> or heavy components for the entire sidebar list on Desktop?

    Expensive CSS: Check for excessive use of backdrop-filter: blur, heavy box-shadows, or complex renderings that multiply on a large screen.

    Solution: Refactor the Video/Lecture List to implement Strict Lazy Loading. Only the active video should be in the DOM. The rest must be lightweight placeholders until clicked.

Task 2: Overhaul the Animations
The animations are "very bad" and stuttering.

    Fix: Replace the current jerky animations. Use CSS Transitions (transform/opacity) or optimized Framer Motion settings.

    Requirement: Animations must run at 60fps. Eliminate any layout thrashing (animating height/width on the list items).

    Style: Make it sleek. Simple fade-ins and scale effects.

Output:

    Explain why the PC version was lagging while mobile worked (Likely the sidebar/list rendering).

    Provide the FIXED Code for the course page logic and the animation styles
