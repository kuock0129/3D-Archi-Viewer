"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { Upload } from 'lucide-react';
import type { BuildingData, Room } from './types';

const BuildingViewer: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isWireframe, setIsWireframe] = useState(false);
  const [isMaterialMode, setIsMaterialMode] = useState(false);
  const [buildingData, setBuildingData] = useState<BuildingData | null>(null);
  const [error, setError] = useState('');
  const [showLabels, setShowLabels] = useState(true);


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


    // Create CSS2D renderer for labels
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(800, 600);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    mountRef.current.appendChild(labelRenderer.domElement);

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(50, 50, 50);
    scene.add(ambientLight);
    scene.add(directionalLight);

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Calculate building bounds
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    buildingData.forEach(floor => {
      floor.rooms.forEach(room => {
        room.room_shape.coords.forEach(([x, z]) => {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minZ = Math.min(minZ, z);
          maxZ = Math.max(maxZ, z);
        });
      });
    });

    const centerX = (maxX + minX) / 2;
    const centerZ = (maxZ + minZ) / 2;



    // Create glass material for curtain walls
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      metalness: 0.1,
      roughness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide
    });

    // Create concrete material
    const concreteMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xcccccc,
      metalness: 0.1,
      roughness: 0.8,
      side: THREE.DoubleSide
    });




    // Create room label
    const createRoomLabel = (room: Room, position: THREE.Vector3, floorNum: number): CSS2DObject => {
      const div = document.createElement('div');
      div.className = 'label';
      div.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
      div.style.color = 'white';
      div.style.padding = '5px';
      div.style.borderRadius = '4px';
      div.style.fontSize = '12px';
      div.style.pointerEvents = 'none';
      div.style.whiteSpace = 'pre-line';
      
      const content = [
        `Type: ${room.room_type}`,
        `Floor: ${floorNum}`,
        `Coords: ${JSON.stringify(room.room_shape.coords[0])}`,
        room.room_id ? `ID: ${room.room_id}` : '',
        room.room_name ? `Name: ${room.room_name}` : ''
      ].filter(Boolean).join('\n');
      
      div.textContent = content;
      
      const label = new CSS2DObject(div);
      label.position.copy(position);
      return label;
    };

    // // Create floor level plane
    // const createLevelPlane = (height: number): THREE.Mesh => {
    //   const width = maxX - minX;
    //   const depth = maxZ - minZ;
    //   const geometry = new THREE.PlaneGeometry(width * 1.2, depth * 1.2);
    //   const material = new THREE.MeshBasicMaterial({
    //     color: 0x87CEEB,
    //     transparent: true,
    //     // opacity: 0.15,
    //     opacity: 0.0,
    //     side: THREE.DoubleSide
    //   });
      
    //   const plane = new THREE.Mesh(geometry, material);
    //   plane.rotation.x = -Math.PI / 2;
    //   plane.position.set(0, height, 0);
    //   return plane;
    // };

    const createRoom = (room: Room, floorHeight: number, floorNum: number): THREE.Group => {
      const group = new THREE.Group();
      
      // Create room shape
      const shape = new THREE.Shape();
      const coords = room.room_shape.coords.map(([x, z]) => [-1 * (x - centerX), z - centerZ]);
      
      shape.moveTo(coords[0][0], coords[0][1]);
      for (let i = 1; i < coords.length; i++) {
        shape.lineTo(coords[i][0], coords[i][1]);
      }

      const height = 10;
      const extrudeSettings = {
        steps: 1,
        depth: height,
        bevelEnabled: false
      };

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      
      let materials: THREE.Material[];
      if (isMaterialMode) {
        const isGlassWalled = room.room_type.toLowerCase() === 'office' || 
                             room.room_type.toLowerCase() === 'entry lobby';
        
        if (isGlassWalled) {
          // Create materials array for different faces
          materials = [
            concreteMaterial, // Floor
            glassMaterial,    // Walls
            concreteMaterial  // Ceiling
          ];
          
          // Create a mesh with multiple materials
          const mesh = new THREE.Mesh(geometry, materials);
          mesh.rotation.x = Math.PI / 2;
          mesh.position.set(0, floorHeight, 0);
          group.add(mesh);
        } else {
          // Use concrete material for other rooms
          const mesh = new THREE.Mesh(geometry, concreteMaterial);
          mesh.rotation.x = Math.PI / 2;
          mesh.position.set(0, floorHeight, 0);
          group.add(mesh);
        }
      } else {
        // Original color box mode
        const material = new THREE.MeshPhongMaterial({ 
          color: roomColors[room.room_type] || 0x808080,
          wireframe: isWireframe,
          transparent: true,
          opacity: 0.8
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = Math.PI / 2;
        mesh.position.set(0, floorHeight, 0);
        group.add(mesh);
      }

      // Add label (keep existing label code)
      if (showLabels) {
        const avgX = coords.reduce((sum, [x]) => sum + x, 0) / coords.length;
        const avgZ = coords.reduce((sum, [, z]) => sum + z, 0) / coords.length;
        const labelPosition = new THREE.Vector3(avgX, floorHeight + 5, avgZ);
        const label = createRoomLabel(room, labelPosition, floorNum);
        group.add(label);
      }

      return group;
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

    // Clear scene
    scene.clear();
    scene.add(ambientLight);
    scene.add(directionalLight);

    // Create ground plane
    // const groundSize = Math.max(maxX - minX, maxZ - minZ) * 1.5;
    // const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
    // const groundMaterial = new THREE.MeshStandardMaterial({ 
    //   color: 0xcccccc,
    //   side: THREE.DoubleSide,
    //   transparent: true,
    //   opacity: 0.0
    // });
    // const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    // ground.rotation.x = -Math.PI / 2;
    // ground.position.y = 0;
    // scene.add(ground);

    // Building group
    const buildingGroup = new THREE.Group();

    // Add rooms and level planes starting from ground level (y=0)
    buildingData.forEach((floor, index) => {
      // Start from height 0 instead of letting first floor go below ground
      const floorHeight = index * 10;
      
      // Add level plane
      // const levelPlane = createLevelPlane(floorHeight);
      // buildingGroup.add(levelPlane);
      
      // Add rooms with labels
      floor.rooms.forEach(room => {
        const roomGroup = createRoom(room, floorHeight, index);
        buildingGroup.add(roomGroup);
      });
    });

    scene.add(buildingGroup);

    // Position camera
    const buildingHeight = buildingData.length * 10;
    const maxDimension = Math.max(maxX - minX, maxZ - minZ);
    camera.position.set(maxDimension * 1.5, buildingHeight * 1.2, maxDimension * 1.5);
    camera.lookAt(0, buildingHeight / 2, 0);

    // Animation loop with label renderer
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = 800 / 600;
      camera.updateProjectionMatrix();
      renderer.setSize(800, 600);
      labelRenderer.setSize(800, 600);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
        mountRef.current.removeChild(labelRenderer.domElement);
      }
    };
  }, [buildingData, isWireframe, showLabels, isMaterialMode]);

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
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isMaterialMode}
                    onChange={() => setIsMaterialMode(prev => !prev)}
                    className="form-checkbox"
                  />
                  <span>Material Mode</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showLabels}
                    onChange={() => setShowLabels(prev => !prev)}
                    className="form-checkbox"
                  />
                  <span>Show Labels</span>
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
              Total Floors: {buildingData.length}
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

export default BuildingViewer;