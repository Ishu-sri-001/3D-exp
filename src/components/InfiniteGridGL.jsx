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
  const [isScrolling, setIsScrolling] = useState(false);
  const [smoothScroll, setSmoothScroll] = useState(false);

  // Grid configuration
  const ROWS = 5;
  const COLS = 5;
  const VISIBLE_ROWS = 1.5;
  const VISIBLE_COLS = 4;
  
  // Card dimensions for proper 4x1.5 viewport
  const cardWidth = 100 / VISIBLE_COLS; // 25 units
  const cardHeight = 100 / VISIBLE_ROWS; // 66.67 units

  // Sample image sources (you can replace with your actual images)
  const imageSources = [
   '/img1.webp',
  '/img2.jpg',
  '/img3.jpg',
  '/img4.webp',
  '/img5.webp',
  '/img6.jpg',
  '/img7.jpg',
  '/img8.webp',
  '/img9.jpg',
  '/img10.jpg',
  '/img11.jpg',
  '/img12.jpg',
  '/img13.jpg',
  '/img14.jpg',
  '/img15.jpg',
  '/img16.jpg',
  '/img17.jpg',
  '/img18.jpg',
  '/img19.png',
  '/img20.jpg',
  '/img21.jpg',
  '/img22.jpg',
  '/img23.jpg',
  '/img24.jpg',
  '/img25.webp'
  ];

  // Column speed multipliers
  const getColumnSpeedMultiplier = (colIndex) => {
  switch (colIndex) {
    case 3: return 0.4;   // 4th column - 2nd fastest
    case 2: return 0.35;   // 3rd column - 3rd fastest
    case 1: return 0.3;   // 2nd column - 4th fastest
    case 0: return 0.25;   // 1st column - 5th fastest (very slow)
    case 4: return 0.2;   // 5th column - slowest
    default: return 1.0;
  }
};


  // Preload all textures
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    
    imageSources.forEach((src, index) => {
      if (!textureCache.current.has(index)) {
        const texture = loader.load(
          src,
          () => {
            // Texture loaded successfully
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
          },
          undefined,
          (error) => {
            console.warn(`Failed to load texture ${index}:`, error);
          }
        );
        textureCache.current.set(index, texture);
      }
    });
  }, []);

  // Get or create a mesh from the pool
  const getMeshFromPool = useCallback((imageIndex) => {
    if (!sceneRef.current) return null;

    // Try to get from pool
    let mesh = meshPoolRef.current.pop();
    
    if (!mesh) {
      // Create new mesh if pool is empty
      const geometry = new THREE.PlaneGeometry(cardWidth * 0.95, cardHeight * 0.95);
      const material = new THREE.MeshBasicMaterial({ side: THREE.FrontSide });
      mesh = new THREE.Mesh(geometry, material);
    }
    
    // Update texture
    const texture = textureCache.current.get(imageIndex);
    if (texture && mesh.material) {
      mesh.material.map = texture;
      mesh.material.needsUpdate = true;
    }
    
    // Add to scene if not already added
    if (!mesh.parent) {
      sceneRef.current.add(mesh);
    }
    
    return mesh;
  }, [cardWidth, cardHeight]);

  // Return mesh to pool
  const returnMeshToPool = useCallback((mesh) => {
    if (!mesh || !sceneRef.current) return;
    
    // Remove from scene
    sceneRef.current.remove(mesh);
    
    // Reset properties
    mesh.position.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);
    mesh.visible = true;
    
    // Return to pool
    meshPoolRef.current.push(mesh);
  }, []);

  // Generate visible items for infinite scrolling
  const generateVisibleItems = useCallback(() => {
    const items = [];
    const bufferMultiplier = 2; // Reduced buffer for better performance
    
    // Calculate visible range with buffer
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

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    
    // Orthographic camera for proper 4x1.5 viewport
    const aspect = window.innerWidth / window.innerHeight;
    // Orthographic camera for proper 4x1.5 viewport
    const frustumWidth = VISIBLE_COLS * cardWidth;  // 4 * 25 = 100
    const frustumHeight = VISIBLE_ROWS * cardHeight; // 1.5 * 66.67 = 100
    
    const camera = new THREE.OrthographicCamera(
      -frustumWidth / 2, frustumWidth / 2,
      frustumHeight / 2, -frustumHeight / 2,
      0.1, 1000
    );
    
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x1f2937);
    mountRef.current.appendChild(renderer.domElement);
    
    // Store references
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    
    camera.position.z = 5;

    // Handle resize
    const handleResize = () => {
      const newAspect = window.innerWidth / window.innerHeight;
      const newFrustumWidth = frustumHeight * newAspect;
      
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
      
      // Cleanup
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      // Dispose of cached textures
      textureCache.current.forEach(texture => texture.dispose());
      textureCache.current.clear();
      
      // Dispose of meshes in pool
      meshPoolRef.current.forEach(mesh => {
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
      });
      meshPoolRef.current = [];
      
      // Clear active meshes
      activeMeshesRef.current.clear();
      
      renderer.dispose();
    };
  }, []);

  // Update mesh positions and visibility
  useEffect(() => {
    if (!sceneRef.current) return;

    const visibleItems = generateVisibleItems();
    const newActiveMeshes = new Map();
    
    // Update existing meshes and create new ones
    visibleItems.forEach(item => {
      let mesh = activeMeshesRef.current.get(item.id);
      
      if (!mesh) {
        // Create new mesh for this item
        mesh = getMeshFromPool(item.imageIndex);
        if (!mesh) return;
      }
      
      // Update position
      const finalX = item.x - scrollPosition.x;
      const finalY = -(item.y - (scrollPosition.y * item.speedMultiplier));
      mesh.position.set(finalX, finalY, 0);
      
      // Apply smooth scroll scale
      const scale = smoothScroll ? 1.02 : 1;
      mesh.scale.setScalar(scale);
      
      // Ensure correct texture
      const texture = textureCache.current.get(item.imageIndex);
      if (texture && mesh.material && mesh.material.map !== texture) {
        mesh.material.map = texture;
        mesh.material.needsUpdate = true;
      }
      
      mesh.visible = true;
      newActiveMeshes.set(item.id, mesh);
    });
    
    // Return unused meshes to pool
    activeMeshesRef.current.forEach((mesh, id) => {
      if (!newActiveMeshes.has(id)) {
        returnMeshToPool(mesh);
      }
    });
    
    // Update active meshes reference
    activeMeshesRef.current = newActiveMeshes;
    
  }, [scrollPosition, smoothScroll, generateVisibleItems, getMeshFromPool, returnMeshToPool]);

  // Animation loop for smooth rendering
  useEffect(() => {
    let animationId;
    
    const animate = () => {
      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  // Handle scroll with throttling
  const handleScroll = useCallback((e) => {
    e.preventDefault();
    
    const deltaX = e.deltaX || 0;
    const deltaY = e.deltaY || 0;
    
    // Enhanced scroll speed when smooth scrolling is enabled
    const scrollMultiplier = smoothScroll ? 3 : 1;
    
    setScrollPosition(prev => ({
      x: prev.x + (deltaX * scrollMultiplier * 0.5),
      y: prev.y + (deltaY * scrollMultiplier * 0.5)
    }));
    
    setIsScrolling(true);
  }, [smoothScroll]);

  // Handle click to enable smooth scrolling
  const handleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setSmoothScroll(true);
    setTimeout(() => setSmoothScroll(false), 2000);
  }, []);

  // Handle scroll end
  useEffect(() => {
    let timeoutId;
    if (isScrolling) {
      timeoutId = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    }
    return () => clearTimeout(timeoutId);
  }, [isScrolling]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      const speed = smoothScroll ? 15 : 5;
      
      switch (e.key) {
        case 'ArrowUp':
          setScrollPosition(prev => ({ ...prev, y: prev.y - speed }));
          break;
        case 'ArrowDown':
          setScrollPosition(prev => ({ ...prev, y: prev.y + speed }));
          break;
        case 'ArrowLeft':
          setScrollPosition(prev => ({ ...prev, x: prev.x - speed }));
          break;
        case 'ArrowRight':
          setScrollPosition(prev => ({ ...prev, x: prev.x + speed }));
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [smoothScroll]);

// Animate mesh scale when scrolling
// useEffect(() => {
//   let animationFrameId;

//   const animateScale = () => {
//     activeMeshesRef.current.forEach((mesh) => {
//       const targetScale = isScrolling ? 0.8 : 1.0;
//       const currentScale = mesh.scale.x;
//       const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.1);
//       mesh.scale.setScalar(newScale);
//     });

//     animationFrameId = requestAnimationFrame(animateScale);
//   };

//   animateScale();

//   return () => {
//     cancelAnimationFrame(animationFrameId);
//   };
// }, [isScrolling]);



  return (
    <div className="w-screen h-screen overflow-hidden bg-black relative">
      {/* Three.js mount point */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
        onWheel={handleScroll}
        onClick={handleClick}
        style={{ outline: 'none' }}
        tabIndex={0}
      />
      
      {/* Scroll position indicator */}
      {/* <div className="absolute bottom-8 right-8 text-white text-sm bg-black bg-opacity-50 p-4 rounded">
        <div>X: {Math.round(scrollPosition.x)}</div>
        <div>Y: {Math.round(scrollPosition.y)}</div>
        {smoothScroll && <div className="text-green-400">Fast Mode ON</div>}
        <div className="text-xs text-gray-400 mt-1">
          Active: {activeMeshesRef.current.size} | Pool: {meshPoolRef.current.length}
        </div>
      </div> */}
      
    </div>
  );
};

export default ThreeJSInfiniteGrid;