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

  // Grid configuration
  const ROWS = 5;
  const COLS = 5;
  const VISIBLE_ROWS = 1.5;
  const VISIBLE_COLS = 4;
  const cardWidth = 100 / VISIBLE_COLS;
  const cardHeight = 100 / VISIBLE_ROWS;

  const imageSources = [
    '/img1.webp', '/img2.jpg', '/img3.jpg', '/img4.webp', '/img5.webp',
    '/img6.jpg', '/img7.jpg', '/img8.webp', '/img9.jpg', '/img10.jpg',
    '/img11.jpg', '/img12.jpg', '/img13.jpg', '/img14.jpg', '/img15.jpg',
    '/img16.jpg', '/img17.jpg', '/img18.jpg', '/img19.png', '/img20.jpg',
    '/img21.jpg', '/img22.jpg', '/img23.jpg', '/img24.jpg', '/img25.webp'
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
    e.preventDefault();
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current) return;
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
  }, [smoothScroll]);

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
    }
  }, []);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    imageSources.forEach((src, index) => {
      if (!textureCache.current.has(index)) {
        const texture = loader.load(
          src,
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
    </div>
  );
};

export default ThreeJSInfiniteGrid;