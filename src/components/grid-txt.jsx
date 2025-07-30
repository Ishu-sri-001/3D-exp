'use client'
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';

const ThreeJSInfiniteGrid = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const meshPoolRef = useRef([]);
  const activeMeshesRef = useRef(new Map());
  const textureCache = useRef(new Map());
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });
  const [smoothScroll, setSmoothScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const [hoverText, setHoverText] = useState('');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredItem, setHoveredItem] = useState(null);

  // Enhanced smooth scrolling state
  const targetScrollPosition = useRef({ x: 0, y: 0 });
  const currentScrollPosition = useRef({ x: 0, y: 0 });
  const scrollVelocity = useRef({ x: 0, y: 0 });
  const isScrolling = useRef(false);

  // Touch/drag state
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const lastScrollTime = useRef(0);
  const scrollSpeedDecayRef = useRef(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  // Grid configuration
  const ROWS = 5;
  const COLS = 5;
  const VISIBLE_ROWS = 1.5;
  const VISIBLE_COLS = 4;
  const cardWidth = 100 / VISIBLE_COLS;
  const cardHeight = 100 / VISIBLE_ROWS;

  const imageSources = [
    { src: '/img1.webp', text: 'Beautiful Mountain Landscape', link: 'https://example.com/mountain' },
    { src: '/img2.jpg', text: 'Ocean Sunset View', link: 'https://example.com/sunset' },
    { src: '/img3.jpg', text: 'City Skyline at Night', link: 'https://example.com/city' },
    { src: '/img4.webp', text: 'Forest Adventure Trail', link: 'https://example.com/forest' },
    { src: '/img5.webp', text: 'Desert Sand Dunes', link: 'https://example.com/desert' },
    { src: '/img6.jpg', text: 'Tropical Beach Paradise', link: 'https://example.com/beach' },
    { src: '/img7.jpg', text: 'Snow-capped Peaks', link: 'https://example.com/snow' },
    { src: '/img8.webp', text: 'Urban Street Art', link: 'https://example.com/art' },
    { src: '/img9.jpg', text: 'Peaceful Lake Reflection', link: 'https://example.com/lake' },
    { src: '/img10.jpg', text: 'Ancient Castle Ruins', link: 'https://example.com/castle' },
    { src: '/img11.jpg', text: 'Vibrant Flower Garden', link: 'https://example.com/garden' },
    { src: '/img12.jpg', text: 'Starry Night Sky', link: 'https://example.com/stars' },
    { src: '/img13.jpg', text: 'Rustic Country Road', link: 'https://example.com/road' },
    { src: '/img14.jpg', text: 'Modern Architecture', link: 'https://example.com/architecture' },
    { src: '/img15.jpg', text: 'Wildlife Safari Scene', link: 'https://example.com/safari' },
    { src: '/img16.jpg', text: 'Cozy Fireplace Corner', link: 'https://example.com/cozy' },
    { src: '/img17.jpg', text: 'Misty Morning Hills', link: 'https://example.com/hills' },
    { src: '/img18.jpg', text: 'Abstract Color Burst', link: 'https://example.com/abstract' },
    { src: '/img19.png', text: 'Vintage Car Collection', link: 'https://example.com/vintage' },
    { src: '/img20.jpg', text: 'Autumn Leaf Patterns', link: 'https://example.com/autumn' },
    { src: '/img21.jpg', text: 'Waterfall Cascade', link: 'https://example.com/waterfall' },
    { src: '/img22.jpg', text: 'Space Nebula View', link: 'https://example.com/space' },
    { src: '/img23.jpg', text: 'Cherry Blossom Festival', link: 'https://example.com/blossom' },
    { src: '/img24.jpg', text: 'Industrial Design Elements', link: 'https://example.com/industrial' },
    { src: '/img25.webp', text: 'Magical Northern Lights', link: 'https://example.com/lights' }
  ];

  const getColumnSpeedMultiplier = (colIndex) => {
    switch (colIndex) {
      case 3: return 0.095;
      case 2: return 0.09;
      case 1: return 0.08;
      case 0: return 0.07;
      case 4: return 0.06;
      default: return 1.0;
    }
  };

  // Mouse move handler for hover detection
  const handleMouseMove = useCallback((e) => {
    if (!cameraRef.current || !rendererRef.current || isDragging.current) return;

    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    mouse.current.set(x, y);
    setMousePosition({ x: e.clientX, y: e.clientY });

    raycaster.current.setFromCamera(mouse.current, cameraRef.current);
    
    const meshes = Array.from(activeMeshesRef.current.values());
    const intersects = raycaster.current.intersectObjects(meshes);

    if (intersects.length > 0) {
      const intersectedMesh = intersects[0].object;
      
      // Find the item data for this mesh
      let foundItem = null;
      activeMeshesRef.current.forEach((mesh, id) => {
        if (mesh === intersectedMesh) {
          const visibleItems = generateVisibleItems();
          foundItem = visibleItems.find(item => item.id === id);
        }
      });

      if (foundItem) {
        const imageData = imageSources[foundItem.imageIndex];
        setHoverText(imageData.text);
        setHoveredItem(foundItem);
        rendererRef.current.domElement.style.cursor = 'pointer';
      }
    } else {
      setHoverText('');
      setHoveredItem(null);
      rendererRef.current.domElement.style.cursor = isDragging.current ? 'grabbing' : 'grab';
    }
  }, []);

  // Click handler for navigation
  const handleMeshClick = useCallback((e) => {
    if (isDragging.current || !hoveredItem) return;

    const imageData = imageSources[hoveredItem.imageIndex];
    if (imageData.link) {
      window.open(imageData.link, '_blank');
    }
  }, [hoveredItem]);

  // Smooth scroll animation loop
  useEffect(() => {
    let animationId;
    
    const updateScrollPosition = () => {
      const current = currentScrollPosition.current;
      const target = targetScrollPosition.current;
      const velocity = scrollVelocity.current;
      
      // Smooth interpolation factor - higher = snappier, lower = smoother
      const lerpFactor = isDragging.current ? 0.25 : 0.15;
      const velocityDecay = 0.95;
      
      // Calculate the difference
      const deltaX = target.x - current.x;
      const deltaY = target.y - current.y;
      
      // Apply momentum when not dragging
      if (!isDragging.current) {
        target.x += velocity.x;
        target.y += velocity.y;
        velocity.x *= velocityDecay;
        velocity.y *= velocityDecay;
      }
      
      // Smooth interpolation
      current.x += deltaX * lerpFactor;
      current.y += deltaY * lerpFactor;
      
      // Update state if position changed significantly
      const threshold = 0.1;
      if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold || 
          Math.abs(velocity.x) > 0.1 || Math.abs(velocity.y) > 0.1) {
        setScrollPosition({ x: current.x, y: current.y });
        isScrolling.current = true;
      } else {
        isScrolling.current = false;
      }
      
      animationId = requestAnimationFrame(updateScrollPosition);
    };
    
    updateScrollPosition();
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  const handlePointerStart = useCallback((e) => {
    isDragging.current = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    lastPointer.current = { x: clientX, y: clientY };
    lastScrollTime.current = performance.now();
    
    // Reset velocity when starting drag
    scrollVelocity.current = { x: 0, y: 0 };
    setSmoothScroll(true);
    
    // Hide hover text when dragging starts
    setHoverText('');
    setHoveredItem(null);
    
    e.preventDefault();
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current) {
      handleMouseMove(e);
      return;
    }
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - lastPointer.current.x;
    const deltaY = clientY - lastPointer.current.y;
    const scrollMultiplier = smoothScroll ? 2.5 : 1;

    // Calculate drag speed for scaling
    const now = performance.now();
    const timeDelta = Math.max(now - lastScrollTime.current, 1);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const speed = distance / timeDelta * 16;
    setScrollSpeed(Math.min(speed * 0.1, 1));

    // Update target position and track velocity
    const adjustedDeltaX = -deltaX * scrollMultiplier * 0.05;
    const adjustedDeltaY = -deltaY * scrollMultiplier * 0.25;
    
    targetScrollPosition.current.x += adjustedDeltaX;
    targetScrollPosition.current.y += adjustedDeltaY;
    
    // Track velocity for momentum
    scrollVelocity.current.x = adjustedDeltaX * 0.8;
    scrollVelocity.current.y = adjustedDeltaY * 0.8;

    lastPointer.current = { x: clientX, y: clientY };
    lastScrollTime.current = now;
    
    // Clear existing decay timeout and set new one
    if (scrollSpeedDecayRef.current) clearTimeout(scrollSpeedDecayRef.current);
    scrollSpeedDecayRef.current = setTimeout(() => setScrollSpeed(0), 100);
    
    e.preventDefault();
  }, [smoothScroll, handleMouseMove]);

  const handlePointerEnd = useCallback((e) => {
    isDragging.current = false;
    setSmoothScroll(false);
    
    // Gradual speed decay instead of instant
    setTimeout(() => setScrollSpeed(0), 150);
    
    if (scrollSpeedDecayRef.current) {
      clearTimeout(scrollSpeedDecayRef.current);
      scrollSpeedDecayRef.current = null;
    }
    e.preventDefault();
  }, []);

  const handleScroll = useCallback((e) => {
    e.preventDefault();
    const deltaX = e.deltaX || 0;
    const deltaY = e.deltaY || 0;
    const scrollMultiplier = smoothScroll ? 2.5 : 1;

    // Calculate scroll speed for scaling
    const totalDelta = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const speed = Math.min(totalDelta * 0.008, 1);
    setScrollSpeed(speed);

    // Apply smooth scroll adjustments
    const adjustedDeltaX = deltaX * scrollMultiplier * 0.05;
    const adjustedDeltaY = deltaY * scrollMultiplier * 0.4;
    
    targetScrollPosition.current.x += adjustedDeltaX;
    targetScrollPosition.current.y += adjustedDeltaY;
    
    // Add some momentum to wheel scrolling
    scrollVelocity.current.x += adjustedDeltaX * 0.3;
    scrollVelocity.current.y += adjustedDeltaY * 0.3;

    // Clear existing decay timeout and set new one
    if (scrollSpeedDecayRef.current) clearTimeout(scrollSpeedDecayRef.current);
    scrollSpeedDecayRef.current = setTimeout(() => setScrollSpeed(0), 100);
  }, [smoothScroll]);

  const handleClick = useCallback((e) => {
    if (!isDragging.current) {
      setSmoothScroll(true);
      handleMeshClick(e);
    }
  }, [handleMeshClick]);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    imageSources.forEach((imageData, index) => {
      if (!textureCache.current.has(index)) {
        const texture = loader.load(
          imageData.src,
          () => {
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
          },
          undefined,
          (error) => console.warn(`Failed to load texture ${index}:`, error)
        );
        textureCache.current.set(index, texture);
      }
    });
  }, []);

  const getMeshFromPool = useCallback((imageIndex) => {
    if (!sceneRef.current) return null;
    let mesh = meshPoolRef.current.pop();
    if (!mesh) {
      const geometry = new THREE.PlaneGeometry(cardWidth * 0.98, cardHeight * 0.98);
      const material = new THREE.MeshBasicMaterial({ side: THREE.FrontSide });
      mesh = new THREE.Mesh(geometry, material);
    }
    const texture = textureCache.current.get(imageIndex);
    if (texture && mesh.material) {
      mesh.material.map = texture;
      mesh.material.needsUpdate = true;
    }
    if (!mesh.parent) sceneRef.current.add(mesh);
    return mesh;
  }, [cardWidth, cardHeight]);

  const returnMeshToPool = useCallback((mesh) => {
    if (!mesh || !sceneRef.current) return;
    sceneRef.current.remove(mesh);
    mesh.position.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);
    mesh.visible = true;
    meshPoolRef.current.push(mesh);
  }, []);

  const generateVisibleItems = useCallback(() => {
    const items = [];
    const bufferMultiplier = 2;
    const startCol = Math.floor(scrollPosition.x / cardWidth) - bufferMultiplier;
    const endCol = Math.ceil((scrollPosition.x + 100) / cardWidth) + bufferMultiplier;

    for (let col = startCol; col <= endCol; col++) {
      const actualCol = ((col % COLS) + COLS) % COLS;
      const speedMultiplier = getColumnSpeedMultiplier(actualCol);
      const effectiveScrollY = scrollPosition.y * speedMultiplier;
      const startRow = Math.floor(effectiveScrollY / cardHeight) - bufferMultiplier;
      const endRow = Math.ceil((effectiveScrollY + 100) / cardHeight) + bufferMultiplier;

      for (let row = startRow; row <= endRow; row++) {
        const actualRow = ((row % ROWS) + ROWS) % ROWS;

        items.push({
          id: `${col}-${row}`,
          x: col * cardWidth,
          y: row * cardHeight,
          actualCol,
          actualRow,
          speedMultiplier,
          imageIndex: (actualCol * ROWS + actualRow) % imageSources.length
        });
      }
    }

    return items;
  }, [scrollPosition.x, scrollPosition.y, cardWidth, cardHeight]);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const frustumWidth = VISIBLE_COLS * cardWidth;
    const frustumHeight = VISIBLE_ROWS * cardHeight;

    const camera = new THREE.OrthographicCamera(
      -frustumWidth / 2, frustumWidth / 2,
      frustumHeight / 2, -frustumHeight / 2,
      0.1, 1000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor('black');
    mountRef.current.appendChild(renderer.domElement);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    camera.position.z = 5;
    camera.position.x = -cardWidth / 2;
    camera.position.y = cardHeight / 1.32;

    // Initialize scroll positions
    targetScrollPosition.current = { x: 0, y: 0 };
    currentScrollPosition.current = { x: 0, y: 0 };

    const handleResize = () => {
      const aspect = window.innerWidth / window.innerHeight;
      const newFrustumWidth = frustumHeight * aspect;
      camera.left = -newFrustumWidth / 2;
      camera.right = newFrustumWidth / 2;
      camera.top = frustumHeight / 2;
      camera.bottom = -frustumHeight / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      textureCache.current.forEach(texture => texture.dispose());
      textureCache.current.clear();
      meshPoolRef.current.forEach(mesh => {
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
      });
      meshPoolRef.current = [];
      activeMeshesRef.current.clear();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;
    const visibleItems = generateVisibleItems();
    const newActiveMeshes = new Map();

    visibleItems.forEach(item => {
      let mesh = activeMeshesRef.current.get(item.id);
      if (!mesh) {
        mesh = getMeshFromPool(item.imageIndex);
        if (!mesh) return;
      }
      const finalX = item.x - scrollPosition.x;
      const finalY = -(item.y - (scrollPosition.y * item.speedMultiplier));
      mesh.position.set(finalX, finalY, 0);
      mesh.visible = true;
      newActiveMeshes.set(item.id, mesh);
    });

    activeMeshesRef.current.forEach((mesh, id) => {
      if (!newActiveMeshes.has(id)) returnMeshToPool(mesh);
    });

    activeMeshesRef.current = newActiveMeshes;
  }, [scrollPosition, generateVisibleItems, getMeshFromPool, returnMeshToPool]);

  useEffect(() => {
    let animationFrameId;

    const animate = () => {
      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      // Handle scaling based on scroll speed with smoother transitions
      const targetScale = 1.0 - (scrollSpeed * 0.09);

      activeMeshesRef.current.forEach(mesh => {
        const currentScale = mesh.scale.x;
        const lerpSpeed = scrollSpeed === 0 ? 0.15 : 0.08;
        const newScale = THREE.MathUtils.lerp(currentScale, targetScale, lerpSpeed);
        mesh.scale.setScalar(newScale);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [scrollSpeed]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-black relative">
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
        onWheel={handleScroll}
        onClick={handleClick}
        onMouseDown={handlePointerStart}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerEnd}
        onMouseLeave={handlePointerEnd}
        onTouchStart={handlePointerStart}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerEnd}
        tabIndex={0}
        style={{ outline: 'none' }}
      />
      
      {/* Hover Text Tooltip */}
      {hoverText && (
        <div
          className="fixed pointer-events-none z-50  text-white px-3 py-2 rounded-lg text-sm font-medium backdrop-blur-sm bg-black/20 border border-white/20"
          style={{
            left: mousePosition.x - 20,
            top: mousePosition.y + 15,
            transform: mousePosition.x > window.innerWidth - 200 ? 'translateX(-100%) translateX(-15px)' : 'none'
          }}
        >
          {hoverText}
        </div>
      )}
    </div>
  );
};

export default ThreeJSInfiniteGrid;