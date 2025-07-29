'use client'
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';



const InfiniteGridImg = () => {
  const containerRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });
  const [isScrolling, setIsScrolling] = useState(false);
  const [smoothScroll, setSmoothScroll] = useState(false);

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

  
  // Grid configuration
  const ROWS = 5;
  const COLS = 5;
  const VISIBLE_ROWS = 1.5;
  const VISIBLE_COLS = 4;
  
  // Card dimensions based on viewport
  const cardWidth = 100 / VISIBLE_COLS; // 25vw for 4 cards visible
  const cardHeight = 100 / VISIBLE_ROWS; // 66.67vh for 1.5 cards visible
  
  // Column speed multipliers for missionary layout
  // 4th column fastest, then 3rd, 2nd, 1st, 5th slowest
  const getColumnSpeedMultiplier = (colIndex) => {
    switch (colIndex) {
      case 3: return 1.4;   // 4th column (index 3) - fastest
      case 2: return 1.2;   // 3rd column (index 2) - 2nd fastest
      case 1: return 1.0;   // 2nd column (index 1) - 3rd fastest
      case 0: return 0.8;   // 1st column (index 0) - 4th fastest
      case 4: return 0.6;   // 5th column (index 4) - slowest
      default: return 1.0;
    }
  };
  
  // Generate grid items for a specific column
  const generateColumnItems = useCallback((colIndex) => {
    const items = [];
    const bufferMultiplier = 4;
    const speedMultiplier = getColumnSpeedMultiplier(colIndex);
    
    // Calculate effective scroll position for this column
    const effectiveScrollY = scrollPosition.y * speedMultiplier;
    
    const startRow = Math.floor(effectiveScrollY / cardHeight) - bufferMultiplier;
    const endRow = Math.ceil((effectiveScrollY + 100) / cardHeight) + bufferMultiplier;
    
    for (let row = startRow; row <= endRow; row++) {
      // Calculate actual position using modulo for infinite effect
      const actualRow = ((row % ROWS) + ROWS) % ROWS;
      
      items.push({
        id: `${colIndex}-${row}`,
        y: row * cardHeight,
        actualCol: colIndex,
        actualRow,
      });
    }
    
    return items;
  }, [scrollPosition.y, cardHeight]);
  
  // Handle scroll
  const handleScroll = useCallback((e) => {
    if (!containerRef.current) return;
    
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
  
  // Handle click to enable smooth scrolling - fixed to prevent image selection
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
  
  // Generate items for horizontal scrolling (columns that are visible)
  const getVisibleColumns = useCallback(() => {
    const bufferMultiplier = 2;
    const startCol = Math.floor(scrollPosition.x / cardWidth) - bufferMultiplier;
    const endCol = Math.ceil((scrollPosition.x + 100) / cardWidth) + bufferMultiplier;
    
    const columns = [];
    for (let col = startCol; col <= endCol; col++) {
      const actualCol = ((col % COLS) + COLS) % COLS;
      columns.push({
        col,
        actualCol,
        x: col * cardWidth
      });
    }
    
    return columns;
  }, [scrollPosition.x, cardWidth]);
  
  const visibleColumns = getVisibleColumns();
  
  return (
    <div className="w-[100vw] h-[100vh] overflow-hidden bg-gray-900 relative">
      {/* Instructions */}
      {/* <div className="absolute top-[2vh] left-[2vw] z-10 text-white text-[1.5vh] bg-black bg-opacity-50 p-[1vh] rounded">
        <p>Click anywhere to enable fast smooth scrolling</p>
        <p>Use mouse wheel or arrow keys to navigate</p>
        <p>Scrolls infinitely in all directions</p>
        <p>Missionary layout: Col4 fastest → Col3 → Col2 → Col1 → Col5 slowest</p>
      </div> */}
      
      {/* Grid Container */}
      <div
        ref={containerRef}
        className="w-full h-full relative cursor-grab active:cursor-grabbing select-none"
        onWheel={handleScroll}
        onClick={handleClick}
        style={{
          transition: smoothScroll ? 'none' : 'transform 0.1s ease-out'
        }}
      >
        {/* Render each column separately */}
        {visibleColumns.map((column) => {
          const columnItems = generateColumnItems(column.actualCol);
          const speedMultiplier = getColumnSpeedMultiplier(column.actualCol);
          
          return (
            <div
              key={`column-${column.col}`}
              className="absolute"
              style={{
                left: `${column.x - scrollPosition.x}vw`,
                width: `${cardWidth}vw`,
                height: '100vh',
                top: 0
              }}
            >
              {columnItems.map((item) => (
                <div
                  key={item.id}
                  className="absolute overflow-hidden px-[1vw] py-[1.5vw]   transition-shadow duration-300 select-none"
                  style={{
                    left: 0,
                    top: `${item.y - (scrollPosition.y * speedMultiplier)}vh`,
                    width: `${cardWidth}vw`,
                    height: `${cardHeight}vh`,
                    transform: smoothScroll ? 'scale(1.02)' : 'scale(1)',
                    transition: smoothScroll ? 'transform 0.2s ease-out' : 'none'
                  }}
                >
                  <div className='w-full h-full select-none'>
                    <Image
                      width={900}
                      height={900}
                      src={imageSources[(item.actualCol * ROWS + item.actualRow) % imageSources.length]}
                      alt={`Grid item ${item.actualCol}-${item.actualRow}`}
                      className="w-full h-full object-cover select-none pointer-events-none"
                      draggable={false}
                    />
                  </div> 
                </div>
              ))}
            </div>
          );
        })}
      </div>
      
      {/* Scroll position indicator */}
      <div className="absolute bottom-[2vh] right-[2vw] text-white text-[1.2vh] bg-black bg-opacity-50 p-[1vh] rounded">
        <div>X: {Math.round(scrollPosition.x)}vw</div>
        <div>Y: {Math.round(scrollPosition.y)}vh</div>
        {smoothScroll && <div className="text-green-400">Fast Mode ON</div>}
      </div>
      
      {/* Loading indicator when scrolling */}
      {/* {isScrolling && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[4vh] h-[4vh] border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      )} */}
    </div>
  );
};

export default InfiniteGridImg;