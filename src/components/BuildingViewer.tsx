"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Upload } from 'lucide-react';
import type { BuildingData, Room } from './types';

const BuildingViewer: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [floorIndex, setFloorIndex] = useState(0);
  const [isWireframe, setIsWireframe] = useState(false);
  const [buildingData, setBuildingData] = useState<BuildingData | null>(null);
  const [error, setError] = useState('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const result = e.target?.result;
        if (typeof result === 'string') {
          const data = JSON.parse(result) as BuildingData;
          setBuildingData(data);
          setError('');
        }
      } catch (err) {
        setError('Invalid JSON file format');
        console.error('Error parsing JSON:', err);
      }
    };
    reader.onerror = () => {
      setError('Error reading file');
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (!buildingData || !mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    
    renderer.setSize(800, 600);
    renderer.setClearColor(0xf0f0f0);
    mountRef.current.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 10, 10);
    scene.add(directionalLight);

    // Add controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Set camera position
    camera.position.set(50, 50, 100);
    camera.lookAt(0, 0, 0);

    // Function to create a room mesh
    const createRoom = (
      coords: [number, number][],
      height: number,
      color: number
    ): THREE.Mesh => {
      const shape = new THREE.Shape();
      
      // Move to first point
      shape.moveTo(coords[0][0], coords[0][1]);
      
      // Draw lines to subsequent points
      for (let i = 1; i < coords.length; i++) {
        shape.lineTo(coords[i][0], coords[i][1]);
      }

      const extrudeSettings = {
        steps: 1,
        depth: height,
        bevelEnabled: false
      };

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      const material = new THREE.MeshPhongMaterial({ 
        color: color,
        wireframe: isWireframe,
        transparent: true,
        opacity: 0.8
      });

      return new THREE.Mesh(geometry, material);
    };

    const roomColors: Record<string, number> = {
      'Office': 0x87CEEB,
      'Kitchen': 0xFFA07A,
      'Restroom': 0x98FB98,
      'Elevator Shaft': 0xDDA0DD,
      'Stairway': 0xF0E68C,
      'Corridor & Elevator Lobby': 0xFFE4E1,
      'Mechanical Shaft': 0xB8860B,
      'Electrical Room': 0xCD853F,
      'Entry Lobby': 0xADD8E6
    };

    // Clear previous geometry
    scene.clear();
    scene.add(ambientLight);
    scene.add(directionalLight);

    // Add rooms for selected floor
    const currentFloor = buildingData[floorIndex];
    if (currentFloor && currentFloor.rooms) {
      const floorHeight = currentFloor.floor_height;
      currentFloor.rooms.forEach((room: Room) => {
        const coords = room.room_shape.coords;
        const height = 10; // You might want to calculate this based on floor heights
        const color = roomColors[room.room_type] || 0x808080;
        const roomMesh = createRoom(coords, height, color);
        roomMesh.position.y = floorHeight;
        scene.add(roomMesh);
      });
    }

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = 800 / 600;
      camera.updateProjectionMatrix();
      renderer.setSize(800, 600);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [buildingData, floorIndex, isWireframe]);

  return (
    <Card className="p-4 w-full max-w-4xl">
      <div className="flex flex-col gap-4">
        {!buildingData ? (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
            <Upload className="w-12 h-12 mb-4 text-gray-400" />
            <label className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer">
              Upload JSON File
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {error && <p className="mt-2 text-red-500">{error}</p>}
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <div className="space-x-2">
                <button 
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
                  onClick={() => setFloorIndex(prev => Math.max(0, prev - 1))}
                  disabled={floorIndex === 0}
                >
                  Previous Floor
                </button>
                <button 
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
                  onClick={() => setFloorIndex(prev => Math.min(buildingData.length - 1, prev + 1))}
                  disabled={floorIndex === buildingData.length - 1}
                >
                  Next Floor
                </button>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isWireframe}
                    onChange={() => setIsWireframe(prev => !prev)}
                    className="form-checkbox"
                  />
                  <span>Wireframe Mode</span>
                </label>
                <button 
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  onClick={() => setBuildingData(null)}
                >
                  Load New File
                </button>
              </div>
            </div>
            <div ref={mountRef} className="w-full h-[600px] border rounded" />
            <div className="text-center">
              Floor {floorIndex + 1} of {buildingData.length}
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

export default BuildingViewer;